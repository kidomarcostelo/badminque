"""Match orchestration and rating update service.

Coordinates match score recording, pure rating engine execution,
idempotent persistence, and offline batch fold recomputation.
Conforms to ADR 0001, ADR 0002, and architecture-methodology.md.
"""

import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from badminque_api.domain.rating.dubr import (
    rating_delta_to_dubr_delta,
    rating_to_dubr,
)
from badminque_api.domain.rating.engine import (
    MIN_POINTS_FOR_RATING,
    BadminqueRatingEngine,
    PlayerRatingState,
    RatingDeltaResult,
)
from badminque_api.domain.rating.k_decay import calculate_rd
from badminque_api.domain.rating.mov import MatchFormat
from badminque_api.exceptions import EntityNotFoundError
from badminque_api.models.match import MatchRecord
from badminque_api.models.player import RosterPlayer
from badminque_api.schemas.match import (
    DisciplineEnum,
    MatchRecordCreate,
    PlayerRatingDeltaResponse,
)
from badminque_api.schemas.sync import BatchSyncRequest, BatchSyncResponse


class MatchService:
    """Orchestrates match score recording, player rating updates, and batch sync."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def record_match(
        self,
        club_id: uuid.UUID,
        match_data: MatchRecordCreate,
    ) -> tuple[MatchRecord, list[PlayerRatingDeltaResponse]]:
        """Record a completed match, calculate DUBR rating deltas, and persist updates.

        Idempotency: If a match with match_data.id already exists, returns the existing
        record without applying rating adjustments a second time.
        """
        # 1. Idempotency check: see if match was already recorded
        existing_match = await self.session.get(MatchRecord, match_data.id)
        if existing_match is not None:
            return existing_match, []

        # 2. Fetch all participants from database
        all_player_ids = list(match_data.team_a_player_ids) + list(
            match_data.team_b_player_ids
        )
        players_stmt = select(RosterPlayer).where(
            RosterPlayer.club_id == club_id,
            RosterPlayer.id.in_(all_player_ids),
        )
        player_entities = (await self.session.scalars(players_stmt)).all()
        player_by_id = {p.id: p for p in player_entities}

        for pid in all_player_ids:
            if pid not in player_by_id:
                raise EntityNotFoundError(
                    f"Roster player {pid} not found in club {club_id}"
                )

        # 3. Prepare rating states based on discipline
        is_doubles = match_data.discipline == DisciplineEnum.DOUBLES
        sets_scores = list(
            zip(match_data.team_a_scores, match_data.team_b_scores, strict=True)
        )
        match_format = MatchFormat(match_data.format.value)

        delta_results: Sequence[RatingDeltaResult]
        if is_doubles:
            p_a1 = player_by_id[match_data.team_a_player_ids[0]]
            p_a2 = player_by_id[match_data.team_a_player_ids[1]]
            p_b1 = player_by_id[match_data.team_b_player_ids[0]]
            p_b2 = player_by_id[match_data.team_b_player_ids[1]]

            state_a1 = PlayerRatingState(
                player_id=str(p_a1.id),
                name=p_a1.name,
                rating=p_a1.doubles_rating,
                rd=calculate_rd(p_a1.doubles_matches_played),
                matches_played=p_a1.doubles_matches_played,
            )
            state_a2 = PlayerRatingState(
                player_id=str(p_a2.id),
                name=p_a2.name,
                rating=p_a2.doubles_rating,
                rd=calculate_rd(p_a2.doubles_matches_played),
                matches_played=p_a2.doubles_matches_played,
            )
            state_b1 = PlayerRatingState(
                player_id=str(p_b1.id),
                name=p_b1.name,
                rating=p_b1.doubles_rating,
                rd=calculate_rd(p_b1.doubles_matches_played),
                matches_played=p_b1.doubles_matches_played,
            )
            state_b2 = PlayerRatingState(
                player_id=str(p_b2.id),
                name=p_b2.name,
                rating=p_b2.doubles_rating,
                rd=calculate_rd(p_b2.doubles_matches_played),
                matches_played=p_b2.doubles_matches_played,
            )

            (res_a1, res_a2), (res_b1, res_b2) = (
                BadminqueRatingEngine.calculate_doubles_rating_update(
                    team_a=(state_a1, state_a2),
                    team_b=(state_b1, state_b2),
                    sets_scores=sets_scores,
                    match_format=match_format,
                )
            )
            delta_results = [res_a1, res_a2, res_b1, res_b2]
        else:
            p_a = player_by_id[match_data.team_a_player_ids[0]]
            p_b = player_by_id[match_data.team_b_player_ids[0]]

            state_a = PlayerRatingState(
                player_id=str(p_a.id),
                name=p_a.name,
                rating=p_a.singles_rating,
                rd=calculate_rd(p_a.singles_matches_played),
                matches_played=p_a.singles_matches_played,
            )
            state_b = PlayerRatingState(
                player_id=str(p_b.id),
                name=p_b.name,
                rating=p_b.singles_rating,
                rd=calculate_rd(p_b.singles_matches_played),
                matches_played=p_b.singles_matches_played,
            )

            res_a, res_b = BadminqueRatingEngine.calculate_singles_rating_update(
                player_a=state_a,
                player_b=state_b,
                sets_scores=sets_scores,
                match_format=match_format,
            )
            delta_results = [res_a, res_b]

        # 4. Insert new MatchRecord
        new_match = MatchRecord(
            id=match_data.id,
            club_night_id=match_data.club_night_id,
            court_id=match_data.court_id,
            discipline=match_data.discipline.value,
            format=match_data.format.value,
            team_a_player_ids=[str(pid) for pid in match_data.team_a_player_ids],
            team_b_player_ids=[str(pid) for pid in match_data.team_b_player_ids],
            team_a_scores=match_data.team_a_scores,
            team_b_scores=match_data.team_b_scores,
            recorded_at=match_data.recorded_at,
            sequence_num=match_data.sequence_num,
            status="SYNCED",
        )
        self.session.add(new_match)

        # 5. Update player ratings and matches_played in database
        total_match_points = sum(match_data.team_a_scores) + sum(
            match_data.team_b_scores
        )
        is_voided = total_match_points < MIN_POINTS_FOR_RATING

        response_deltas: list[PlayerRatingDeltaResponse] = []
        for delta in delta_results:
            pid = uuid.UUID(delta.player_id)
            player = player_by_id[pid]
            if is_doubles:
                player.doubles_rating = delta.post_rating
                if not is_voided:
                    player.doubles_matches_played += 1
                matches_after = player.doubles_matches_played
            else:
                player.singles_rating = delta.post_rating
                if not is_voided:
                    player.singles_matches_played += 1
                matches_after = player.singles_matches_played

            response_deltas.append(
                PlayerRatingDeltaResponse(
                    player_id=player.id,
                    player_name=player.name,
                    pre_rating=delta.pre_rating,
                    post_rating=delta.post_rating,
                    rating_delta=delta.rating_delta,
                    pre_dubr=round(rating_to_dubr(delta.pre_rating), 3),
                    post_dubr=round(rating_to_dubr(delta.post_rating), 3),
                    dubr_delta=round(rating_delta_to_dubr_delta(delta.rating_delta), 3),
                    k_factor=delta.k_factor,
                    rd_after=delta.rd_after,
                    is_provisional=delta.is_provisional,
                    matches_played_after=matches_after,
                )
            )

        try:
            await self.session.commit()
            await self.session.refresh(new_match)
            return new_match, response_deltas
        except IntegrityError:
            await self.session.rollback()
            existing_match = await self.session.get(MatchRecord, match_data.id)
            if existing_match is not None:
                return existing_match, []
            raise

    async def sync_batch(
        self,
        club_id: uuid.UUID,
        batch_request: BatchSyncRequest,
    ) -> BatchSyncResponse:
        """Process an offline batch of matches chronologically and update ratings."""
        if not batch_request.matches:
            return BatchSyncResponse(
                synced_count=0,
                ignored_duplicates_count=0,
                status="success",
                deltas={},
            )

        # 1. Identify which match IDs are already stored (idempotent ON CONFLICT)
        incoming_ids = [m.id for m in batch_request.matches]
        existing_stmt = select(MatchRecord.id).where(MatchRecord.id.in_(incoming_ids))
        existing_ids = set((await self.session.scalars(existing_stmt)).all())

        seen_ids = set(existing_ids)
        unique_new_matches = []
        ignored_count = 0

        for m in batch_request.matches:
            if m.id in seen_ids:
                ignored_count += 1
            else:
                seen_ids.add(m.id)
                unique_new_matches.append(m)

        # 2. Sort newly arriving matches chronologically: (recorded_at, sequence_num)
        sorted_matches = sorted(
            unique_new_matches,
            key=lambda m: (m.recorded_at, m.sequence_num),
        )

        all_batch_deltas: dict[str, list[PlayerRatingDeltaResponse]] = {}
        for match_item in sorted_matches:
            _, deltas = await self.record_match(club_id, match_item)
            all_batch_deltas[str(match_item.id)] = deltas

        return BatchSyncResponse(
            synced_count=len(unique_new_matches),
            ignored_duplicates_count=ignored_count,
            status="success",
            deltas=all_batch_deltas,
        )
