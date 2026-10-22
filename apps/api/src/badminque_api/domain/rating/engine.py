"""Pure domain rating calculation engine and batch recomputation fold.

Conforms to docs/research/rating-algorithm-spec.md and architecture-methodology.md.
Pure Python standard library with zero external dependencies.
Deterministic, synchronous, zero side-effects.
"""

from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from badminque_api.domain.rating.invariants import (
    RATING_FLOOR,
    assert_non_inversion,
    enforce_non_inversion,
)
from badminque_api.domain.rating.k_decay import (
    ESTABLISHED_MATCH_THRESHOLD,
    K_FACTOR_ESTABLISHED,
    K_FACTOR_PROVISIONAL,
    K_HALF_LIFE,
    RD_INITIAL,
    RD_MIN,
    apply_inactivity_inflation,
    calculate_k_factor,
    calculate_rd,
    is_provisional,
)
from badminque_api.domain.rating.mov import (
    FAVORITE_DAMPING,
    MAX_MOV_MULTIPLIER,
    MIN_MOV_MULTIPLIER,
    MatchFormat,
    calculate_margin_of_victory_multiplier,
    get_match_format_weight,
)
from badminque_api.domain.rating.soft_mean import (
    WEAK_LINK_GAMMA,
    calculate_expected_win_probability,
    calculate_weak_link_soft_mean,
)

# Core domain constants per rating-algorithm-spec.md
INITIAL_RATING_BASELINE: float = 1500.0
MIN_POINTS_FOR_RATING: int = 11


class Discipline(str, Enum):
    """Match discipline distinguishing singles and doubles."""

    SINGLES = "SINGLES"
    DOUBLES = "DOUBLES"


@dataclass(slots=True, frozen=True)
class PlayerRatingState:
    """Immutable rating state for a player within a single discipline."""

    player_id: str
    name: str = ""
    rating: float = INITIAL_RATING_BASELINE
    rd: float = RD_INITIAL
    matches_played: int = 0
    last_played_at: datetime | None = None

    @property
    def is_provisional(self) -> bool:
        """True if the rating is provisional (<8 matches)."""
        return is_provisional(self.matches_played)

    @property
    def confidence_interval(self) -> tuple[float, float]:
        """95% confidence interval for skill rating: rating +/- 1.96 * RD."""
        margin = 1.96 * self.rd
        return (round(self.rating - margin, 1), round(self.rating + margin, 1))


_DEFAULT_RATING_SENTINEL: PlayerRatingState = PlayerRatingState(player_id="")


@dataclass(slots=True, frozen=True)
class PlayerProfileState:
    """Immutable player profile maintaining separate singles and doubles states."""

    player_id: str
    name: str = ""
    singles: PlayerRatingState = _DEFAULT_RATING_SENTINEL
    doubles: PlayerRatingState = _DEFAULT_RATING_SENTINEL

    def __post_init__(self) -> None:
        if self.singles is _DEFAULT_RATING_SENTINEL or not self.singles.player_id:
            object.__setattr__(
                self,
                "singles",
                PlayerRatingState(
                    player_id=self.player_id,
                    name=self.name,
                    rating=INITIAL_RATING_BASELINE,
                    rd=RD_INITIAL,
                    matches_played=0,
                    last_played_at=None,
                ),
            )
        if self.doubles is _DEFAULT_RATING_SENTINEL or not self.doubles.player_id:
            object.__setattr__(
                self,
                "doubles",
                PlayerRatingState(
                    player_id=self.player_id,
                    name=self.name,
                    rating=INITIAL_RATING_BASELINE,
                    rd=RD_INITIAL,
                    matches_played=0,
                    last_played_at=None,
                ),
            )

    @classmethod
    def create_default(cls, player_id: str, name: str = "") -> "PlayerProfileState":
        """Factory creating a default profile with unrated starting baselines."""
        return cls(
            player_id=player_id,
            name=name,
            singles=PlayerRatingState(
                player_id=player_id,
                name=name,
                rating=INITIAL_RATING_BASELINE,
                rd=RD_INITIAL,
                matches_played=0,
                last_played_at=None,
            ),
            doubles=PlayerRatingState(
                player_id=player_id,
                name=name,
                rating=INITIAL_RATING_BASELINE,
                rd=RD_INITIAL,
                matches_played=0,
                last_played_at=None,
            ),
        )

    def get_state_for_discipline(self, discipline: Discipline) -> PlayerRatingState:
        """Return the rating state for the requested discipline."""
        if discipline == Discipline.SINGLES:
            return self.singles
        return self.doubles

    def with_updated_discipline(
        self,
        discipline: Discipline,
        updated_state: PlayerRatingState,
    ) -> "PlayerProfileState":
        """Return a copy with one discipline updated without bleeding into the other."""
        if updated_state.player_id != self.player_id:
            raise ValueError(
                f"Mismatched player_id in updated_state: expected {self.player_id}, "
                f"got {updated_state.player_id}"
            )
        if discipline == Discipline.SINGLES:
            return PlayerProfileState(
                player_id=self.player_id,
                name=self.name,
                singles=updated_state,
                doubles=self.doubles,
            )
        return PlayerProfileState(
            player_id=self.player_id,
            name=self.name,
            singles=self.singles,
            doubles=updated_state,
        )


@dataclass(slots=True, frozen=True)
class RatingDeltaResult:
    """Immutable calculation result of a rating update for a single player."""

    player_id: str
    pre_rating: float
    post_rating: float
    rating_delta: float
    k_factor: float
    rd_after: float
    is_provisional: bool


@dataclass(slots=True, frozen=True)
class RatingMatchInput:
    """Immutable match input for rating recomputation and chronological folding."""

    match_id: str
    recorded_at: datetime
    sequence_num: int
    discipline: Discipline
    format: MatchFormat
    team_a_player_ids: tuple[str, ...]
    team_b_player_ids: tuple[str, ...]
    team_a_scores: tuple[int, ...]
    team_b_scores: tuple[int, ...]


def calculate_doubles_rating_update(
    team_a: tuple[PlayerRatingState, PlayerRatingState],
    team_b: tuple[PlayerRatingState, PlayerRatingState],
    sets_scores: list[tuple[int, int]],
    match_format: MatchFormat = MatchFormat.SINGLE_21,
) -> tuple[
    tuple[RatingDeltaResult, RatingDeltaResult],
    tuple[RatingDeltaResult, RatingDeltaResult],
]:
    """Compute individual rating updates for a completed doubles match.

    Mathematical formula (docs/research/rating-algorithm-spec.md Section 3.3):
        R_team,A = soft_mean(R_A1, R_A2)
        R_team,B = soft_mean(R_B1, R_B2)
        E_A1 = expected_win_probability(R_A1, R_team,B)
        E_A2 = expected_win_probability(R_A2, R_team,B)
        delta_p = round(K_p * W_format * M * (S - E_p), 2)
    """
    if len(team_a) != 2 or len(team_b) != 2:
        raise ValueError("Doubles match requires exactly 2 players per team")

    all_player_ids = [
        team_a[0].player_id,
        team_a[1].player_id,
        team_b[0].player_id,
        team_b[1].player_id,
    ]
    if len(set(all_player_ids)) != 4:
        raise ValueError(
            f"All 4 player IDs in doubles match must be distinct, got {all_player_ids}"
        )
    if not sets_scores:
        raise ValueError("Match must have at least one completed set score")

    for score_a, score_b in sets_scores:
        if score_a < 0 or score_b < 0:
            raise ValueError(
                f"Set scores must be non-negative, got ({score_a}, {score_b})"
            )

    # Anti-gaming / voided match rule: fewer than 11 points voided from rating
    total_match_points = sum(sa + sb for sa, sb in sets_scores)
    if total_match_points < MIN_POINTS_FOR_RATING:
        void_results_a = (
            RatingDeltaResult(
                player_id=team_a[0].player_id,
                pre_rating=team_a[0].rating,
                post_rating=team_a[0].rating,
                rating_delta=0.0,
                k_factor=calculate_k_factor(team_a[0].matches_played),
                rd_after=team_a[0].rd,
                is_provisional=team_a[0].is_provisional,
            ),
            RatingDeltaResult(
                player_id=team_a[1].player_id,
                pre_rating=team_a[1].rating,
                post_rating=team_a[1].rating,
                rating_delta=0.0,
                k_factor=calculate_k_factor(team_a[1].matches_played),
                rd_after=team_a[1].rd,
                is_provisional=team_a[1].is_provisional,
            ),
        )
        void_results_b = (
            RatingDeltaResult(
                player_id=team_b[0].player_id,
                pre_rating=team_b[0].rating,
                post_rating=team_b[0].rating,
                rating_delta=0.0,
                k_factor=calculate_k_factor(team_b[0].matches_played),
                rd_after=team_b[0].rd,
                is_provisional=team_b[0].is_provisional,
            ),
            RatingDeltaResult(
                player_id=team_b[1].player_id,
                pre_rating=team_b[1].rating,
                post_rating=team_b[1].rating,
                rating_delta=0.0,
                k_factor=calculate_k_factor(team_b[1].matches_played),
                rd_after=team_b[1].rd,
                is_provisional=team_b[1].is_provisional,
            ),
        )
        return (void_results_a, void_results_b)

    for score_a, score_b in sets_scores:
        if score_a == score_b:
            raise ValueError(
                f"Individual set score cannot be tied: got ({score_a}, {score_b})"
            )

    a_sets_won = sum(1 for sa, sb in sets_scores if sa > sb)
    b_sets_won = sum(1 for sa, sb in sets_scores if sb > sa)
    if a_sets_won == b_sets_won:
        raise ValueError("Match sets cannot be tied; a decisive winner is required")

    team_a_won = a_sets_won > b_sets_won
    a1, a2 = team_a
    b1, b2 = team_b

    eff_team_a = calculate_weak_link_soft_mean(a1.rating, a2.rating)
    eff_team_b = calculate_weak_link_soft_mean(b1.rating, b2.rating)

    total_pts_a = sum(sa for sa, _ in sets_scores)
    total_pts_b = sum(sb for _, sb in sets_scores)
    games_played = len(sets_scores)

    if team_a_won:
        pts_win, pts_lose = total_pts_a, total_pts_b
        rating_diff_win_lose = eff_team_a - eff_team_b
        s_a, s_b = 1.0, 0.0
    else:
        pts_win, pts_lose = total_pts_b, total_pts_a
        rating_diff_win_lose = eff_team_b - eff_team_a
        s_a, s_b = 0.0, 1.0

    mov_multiplier = calculate_margin_of_victory_multiplier(
        points_winner=pts_win,
        points_loser=pts_lose,
        games_played=games_played,
        rating_diff_winner_minus_loser=rating_diff_win_lose,
    )
    format_weight = get_match_format_weight(match_format)

    # Process Team A individual updates against opposing team effective rating
    results_a_list: list[RatingDeltaResult] = []
    for player in (a1, a2):
        exp_win = calculate_expected_win_probability(player.rating, eff_team_b)
        k_factor = calculate_k_factor(player.matches_played)
        raw_delta = round(
            k_factor * format_weight * mov_multiplier * (s_a - exp_win), 2
        )

        post_rating = enforce_non_inversion(
            pre_rating=player.rating,
            raw_post_rating=player.rating + raw_delta,
            won_match=team_a_won,
            floor=RATING_FLOOR,
        )
        effective_delta = round(post_rating - player.rating, 2)
        assert_non_inversion(player.rating, post_rating, won_match=team_a_won)

        matches_after = player.matches_played + 1
        rd_after = round(calculate_rd(matches_after), 1)
        results_a_list.append(
            RatingDeltaResult(
                player_id=player.player_id,
                pre_rating=player.rating,
                post_rating=post_rating,
                rating_delta=effective_delta,
                k_factor=k_factor,
                rd_after=rd_after,
                is_provisional=is_provisional(matches_after),
            )
        )

    # Process Team B individual updates against opposing team effective rating
    results_b_list: list[RatingDeltaResult] = []
    for player in (b1, b2):
        exp_win = calculate_expected_win_probability(player.rating, eff_team_a)
        k_factor = calculate_k_factor(player.matches_played)
        raw_delta = round(
            k_factor * format_weight * mov_multiplier * (s_b - exp_win), 2
        )

        post_rating = enforce_non_inversion(
            pre_rating=player.rating,
            raw_post_rating=player.rating + raw_delta,
            won_match=(not team_a_won),
            floor=RATING_FLOOR,
        )
        effective_delta = round(post_rating - player.rating, 2)
        assert_non_inversion(player.rating, post_rating, won_match=(not team_a_won))

        matches_after = player.matches_played + 1
        rd_after = round(calculate_rd(matches_after), 1)
        results_b_list.append(
            RatingDeltaResult(
                player_id=player.player_id,
                pre_rating=player.rating,
                post_rating=post_rating,
                rating_delta=effective_delta,
                k_factor=k_factor,
                rd_after=rd_after,
                is_provisional=is_provisional(matches_after),
            )
        )

    return (
        (results_a_list[0], results_a_list[1]),
        (results_b_list[0], results_b_list[1]),
    )


def calculate_singles_rating_update(
    player_a: PlayerRatingState,
    player_b: PlayerRatingState,
    sets_scores: list[tuple[int, int]],
    match_format: MatchFormat = MatchFormat.SINGLE_21,
) -> tuple[RatingDeltaResult, RatingDeltaResult]:
    """Compute individual rating updates for a completed singles match.

    Mathematical formula (docs/research/rating-algorithm-spec.md Section 3.2):
        delta_A = round(K_A * W_format * M * (S_A - E_A), 2)
        delta_B = round(K_B * W_format * M * (S_B - E_B), 2)
    """
    if player_a.player_id == player_b.player_id:
        raise ValueError("Singles match requires 2 distinct players")
    if not sets_scores:
        raise ValueError("Match must have at least one completed set score")

    for score_a, score_b in sets_scores:
        if score_a < 0 or score_b < 0:
            raise ValueError(
                f"Set scores must be non-negative, got ({score_a}, {score_b})"
            )

    total_match_points = sum(sa + sb for sa, sb in sets_scores)
    if total_match_points < MIN_POINTS_FOR_RATING:
        void_res_a = RatingDeltaResult(
            player_id=player_a.player_id,
            pre_rating=player_a.rating,
            post_rating=player_a.rating,
            rating_delta=0.0,
            k_factor=calculate_k_factor(player_a.matches_played),
            rd_after=player_a.rd,
            is_provisional=player_a.is_provisional,
        )
        void_res_b = RatingDeltaResult(
            player_id=player_b.player_id,
            pre_rating=player_b.rating,
            post_rating=player_b.rating,
            rating_delta=0.0,
            k_factor=calculate_k_factor(player_b.matches_played),
            rd_after=player_b.rd,
            is_provisional=player_b.is_provisional,
        )
        return void_res_a, void_res_b

    for score_a, score_b in sets_scores:
        if score_a == score_b:
            raise ValueError(
                f"Individual set score cannot be tied: got ({score_a}, {score_b})"
            )

    a_sets_won = sum(1 for sa, sb in sets_scores if sa > sb)
    b_sets_won = sum(1 for sa, sb in sets_scores if sb > sa)
    if a_sets_won == b_sets_won:
        raise ValueError("Match sets cannot be tied; a decisive winner is required")

    player_a_won = a_sets_won > b_sets_won
    total_pts_a = sum(sa for sa, _ in sets_scores)
    total_pts_b = sum(sb for _, sb in sets_scores)
    games_played = len(sets_scores)

    if player_a_won:
        pts_win, pts_lose = total_pts_a, total_pts_b
        rating_diff_win_lose = player_a.rating - player_b.rating
        s_a, s_b = 1.0, 0.0
    else:
        pts_win, pts_lose = total_pts_b, total_pts_a
        rating_diff_win_lose = player_b.rating - player_a.rating
        s_a, s_b = 0.0, 1.0

    mov_multiplier = calculate_margin_of_victory_multiplier(
        points_winner=pts_win,
        points_loser=pts_lose,
        games_played=games_played,
        rating_diff_winner_minus_loser=rating_diff_win_lose,
    )
    format_weight = get_match_format_weight(match_format)

    e_a = calculate_expected_win_probability(player_a.rating, player_b.rating)
    e_b = 1.0 - e_a

    k_a = calculate_k_factor(player_a.matches_played)
    k_b = calculate_k_factor(player_b.matches_played)

    raw_delta_a = round(k_a * format_weight * mov_multiplier * (s_a - e_a), 2)
    raw_delta_b = round(k_b * format_weight * mov_multiplier * (s_b - e_b), 2)

    post_rating_a = enforce_non_inversion(
        pre_rating=player_a.rating,
        raw_post_rating=player_a.rating + raw_delta_a,
        won_match=player_a_won,
        floor=RATING_FLOOR,
    )
    post_rating_b = enforce_non_inversion(
        pre_rating=player_b.rating,
        raw_post_rating=player_b.rating + raw_delta_b,
        won_match=(not player_a_won),
        floor=RATING_FLOOR,
    )

    effective_delta_a = round(post_rating_a - player_a.rating, 2)
    effective_delta_b = round(post_rating_b - player_b.rating, 2)

    assert_non_inversion(player_a.rating, post_rating_a, won_match=player_a_won)
    assert_non_inversion(player_b.rating, post_rating_b, won_match=(not player_a_won))

    matches_after_a = player_a.matches_played + 1
    matches_after_b = player_b.matches_played + 1

    rd_after_a = round(calculate_rd(matches_after_a), 1)
    rd_after_b = round(calculate_rd(matches_after_b), 1)

    res_a = RatingDeltaResult(
        player_id=player_a.player_id,
        pre_rating=player_a.rating,
        post_rating=post_rating_a,
        rating_delta=effective_delta_a,
        k_factor=k_a,
        rd_after=rd_after_a,
        is_provisional=is_provisional(matches_after_a),
    )
    res_b = RatingDeltaResult(
        player_id=player_b.player_id,
        pre_rating=player_b.rating,
        post_rating=post_rating_b,
        rating_delta=effective_delta_b,
        k_factor=k_b,
        rd_after=rd_after_b,
        is_provisional=is_provisional(matches_after_b),
    )
    return res_a, res_b


def apply_retirement_forfeiture(
    sets_scores: list[tuple[int, int]],
    retiring_team: int,
    target_score: int = 21,
) -> tuple[list[tuple[int, int]], bool]:
    """Apply the anti-gaming retirement forfeiture rule per spec Section 7.1.

    Parameters:
        sets_scores: Sequence of (team_a_score, team_b_score) played so far.
        retiring_team: 1 if Team A / Player A retired, 2 if Team B / Player B retired.
        target_score: Score to which non-retiring team is awarded the set (default 21).

    Returns:
        (completed_sets_scores, is_voided):
        - If total points played across all sets is < 11, match is voided (True).
        - If >= 11 points were completed, the retiring side forfeits remaining
          points in the active set to target_score (False).
    """
    if retiring_team not in (1, 2):
        raise ValueError(f"retiring_team must be 1 or 2, got {retiring_team}")
    if not sets_scores:
        raise ValueError("sets_scores must contain at least one set")
    for score_a, score_b in sets_scores:
        if score_a < 0 or score_b < 0:
            raise ValueError(
                f"Set scores must be non-negative, got ({score_a}, {score_b})"
            )

    total_points = sum(sa + sb for sa, sb in sets_scores)
    if total_points < MIN_POINTS_FOR_RATING:
        return (list(sets_scores), True)

    adjusted_scores = list(sets_scores)
    last_sa, last_sb = adjusted_scores[-1]

    if retiring_team == 1:
        awarded_sb = max(last_sb, target_score)
        adjusted_scores[-1] = (last_sa, awarded_sb)
    else:
        awarded_sa = max(last_sa, target_score)
        adjusted_scores[-1] = (awarded_sa, last_sb)

    return (adjusted_scores, False)


def _apply_inactivity_if_applicable(
    player_state: PlayerRatingState,
    match_recorded_at: datetime,
) -> PlayerRatingState:
    """Apply dormancy inflation if player inactive > 30 days per Section 3.5.2."""
    if player_state.last_played_at is None:
        return player_state

    t_last = player_state.last_played_at
    t_match = match_recorded_at
    if t_last.tzinfo is not None and t_match.tzinfo is None:
        t_last = t_last.replace(tzinfo=None)
    elif t_last.tzinfo is None and t_match.tzinfo is not None:
        t_match = t_match.replace(tzinfo=None)

    delta_seconds = (t_match - t_last).total_seconds()
    if delta_seconds <= 0:
        return player_state

    days_inactive = int(delta_seconds // 86400)
    if days_inactive <= 30:
        return player_state

    inflated_rd = apply_inactivity_inflation(
        player_state.rd, days_inactive=days_inactive
    )
    return PlayerRatingState(
        player_id=player_state.player_id,
        name=player_state.name,
        rating=player_state.rating,
        rd=inflated_rd,
        matches_played=player_state.matches_played,
        last_played_at=player_state.last_played_at,
    )


class BadminqueRatingEngine:
    """Domain rating engine orchestrating match recomputation and invariants."""

    # Public mathematical constants
    K_MAX: float = K_FACTOR_PROVISIONAL
    K_MIN: float = K_FACTOR_ESTABLISHED
    K_HALF_LIFE: float = K_HALF_LIFE
    RD_INITIAL: float = RD_INITIAL
    RD_MIN: float = RD_MIN
    ESTABLISHED_THRESHOLD: int = ESTABLISHED_MATCH_THRESHOLD
    WEAK_LINK_GAMMA: float = WEAK_LINK_GAMMA
    M_MIN: float = MIN_MOV_MULTIPLIER
    M_MAX: float = MAX_MOV_MULTIPLIER
    FAVORITE_DAMPING: float = FAVORITE_DAMPING
    RATING_FLOOR: float = RATING_FLOOR
    INITIAL_RATING_BASELINE: float = INITIAL_RATING_BASELINE

    calculate_doubles_rating_update = staticmethod(calculate_doubles_rating_update)
    calculate_singles_rating_update = staticmethod(calculate_singles_rating_update)
    apply_retirement_forfeiture = staticmethod(apply_retirement_forfeiture)

    @classmethod
    def fold_match(
        cls,
        profiles: dict[str, PlayerProfileState],
        match: RatingMatchInput,
    ) -> tuple[dict[str, PlayerProfileState], list[RatingDeltaResult]]:
        """Fold a single match, updating only the affected discipline in the profile."""
        if not match.team_a_scores or not match.team_b_scores:
            raise ValueError("Match must have at least one set score")
        if len(match.team_a_scores) != len(match.team_b_scores):
            raise ValueError(
                f"Mismatched score lengths: team_a has {len(match.team_a_scores)}, "
                f"team_b has {len(match.team_b_scores)}"
            )

        if match.discipline == Discipline.SINGLES:
            len_a = len(match.team_a_player_ids)
            len_b = len(match.team_b_player_ids)
            if len_a != 1 or len_b != 1:
                raise ValueError(
                    f"Singles match requires 1 player per team, got "
                    f"team_a={len_a}, team_b={len_b}"
                )
        elif match.discipline == Discipline.DOUBLES:
            len_a = len(match.team_a_player_ids)
            len_b = len(match.team_b_player_ids)
            if len_a != 2 or len_b != 2:
                raise ValueError(
                    f"Doubles match requires 2 players per team, got "
                    f"team_a={len_a}, team_b={len_b}"
                )

        # Ensure all participants exist in profiles map
        updated_profiles = dict(profiles)
        all_ids = list(match.team_a_player_ids) + list(match.team_b_player_ids)
        for pid in all_ids:
            if pid not in updated_profiles:
                updated_profiles[pid] = PlayerProfileState.create_default(player_id=pid)

        sets_scores = list(zip(match.team_a_scores, match.team_b_scores, strict=True))
        total_match_points = sum(sa + sb for sa, sb in sets_scores)
        is_voided = total_match_points < MIN_POINTS_FOR_RATING
        results_list: list[RatingDeltaResult] = []

        if match.discipline == Discipline.SINGLES:
            p_a_initial = updated_profiles[match.team_a_player_ids[0]].singles
            p_b_initial = updated_profiles[match.team_b_player_ids[0]].singles

            p_a = _apply_inactivity_if_applicable(p_a_initial, match.recorded_at)
            p_b = _apply_inactivity_if_applicable(p_b_initial, match.recorded_at)

            res_a, res_b = cls.calculate_singles_rating_update(
                player_a=p_a,
                player_b=p_b,
                sets_scores=sets_scores,
                match_format=match.format,
            )
            results_list = [res_a, res_b]

            if is_voided:
                new_state_a = p_a_initial
                new_state_b = p_b_initial
            else:
                new_state_a = PlayerRatingState(
                    player_id=res_a.player_id,
                    name=p_a.name,
                    rating=res_a.post_rating,
                    rd=res_a.rd_after,
                    matches_played=p_a.matches_played + 1,
                    last_played_at=match.recorded_at,
                )
                new_state_b = PlayerRatingState(
                    player_id=res_b.player_id,
                    name=p_b.name,
                    rating=res_b.post_rating,
                    rd=res_b.rd_after,
                    matches_played=p_b.matches_played + 1,
                    last_played_at=match.recorded_at,
                )

            updated_profiles[res_a.player_id] = updated_profiles[
                res_a.player_id
            ].with_updated_discipline(Discipline.SINGLES, new_state_a)
            updated_profiles[res_b.player_id] = updated_profiles[
                res_b.player_id
            ].with_updated_discipline(Discipline.SINGLES, new_state_b)

        elif match.discipline == Discipline.DOUBLES:
            a1_initial = updated_profiles[match.team_a_player_ids[0]].doubles
            a2_initial = updated_profiles[match.team_a_player_ids[1]].doubles
            b1_initial = updated_profiles[match.team_b_player_ids[0]].doubles
            b2_initial = updated_profiles[match.team_b_player_ids[1]].doubles

            a1 = _apply_inactivity_if_applicable(a1_initial, match.recorded_at)
            a2 = _apply_inactivity_if_applicable(a2_initial, match.recorded_at)
            b1 = _apply_inactivity_if_applicable(b1_initial, match.recorded_at)
            b2 = _apply_inactivity_if_applicable(b2_initial, match.recorded_at)

            (r_a1, r_a2), (r_b1, r_b2) = cls.calculate_doubles_rating_update(
                team_a=(a1, a2),
                team_b=(b1, b2),
                sets_scores=sets_scores,
                match_format=match.format,
            )
            results_list = [r_a1, r_a2, r_b1, r_b2]

            for res, old_state, orig_state in [
                (r_a1, a1, a1_initial),
                (r_a2, a2, a2_initial),
                (r_b1, b1, b1_initial),
                (r_b2, b2, b2_initial),
            ]:
                if is_voided:
                    new_state = orig_state
                else:
                    new_state = PlayerRatingState(
                        player_id=res.player_id,
                        name=old_state.name,
                        rating=res.post_rating,
                        rd=res.rd_after,
                        matches_played=old_state.matches_played + 1,
                        last_played_at=match.recorded_at,
                    )
                updated_profiles[res.player_id] = updated_profiles[
                    res.player_id
                ].with_updated_discipline(Discipline.DOUBLES, new_state)

        return updated_profiles, results_list

    @classmethod
    def fold_batch(
        cls,
        initial_profiles: dict[str, PlayerProfileState],
        matches: list[RatingMatchInput],
    ) -> tuple[dict[str, PlayerProfileState], dict[str, list[RatingDeltaResult]]]:
        """Deterministically fold an offline batch of matches sorted chronologically.

        Sorting key: (recorded_at, sequence_num)
        Mathematical formula (rating-algorithm-spec.md Section 6.1):
            S_final = foldl(apply_match, S_initial, sort_by_timestamp(matches))
        """
        sorted_matches = sorted(matches, key=lambda m: (m.recorded_at, m.sequence_num))
        current_profiles = dict(initial_profiles)
        batch_results: dict[str, list[RatingDeltaResult]] = {}

        for match in sorted_matches:
            current_profiles, delta_results = cls.fold_match(current_profiles, match)
            batch_results[match.match_id] = delta_results

        return current_profiles, batch_results
