'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  calculateDoublesMatchDeltas,
  type MatchRecord,
  type MatchRecordingResult,
  type RosterPlayer,
} from '@badminque/core';
import { storageService } from '../../services/storageService';
import type { CourtStationData } from './types';

export interface UseCourtsOptions {
  roster: RosterPlayer[];
  onRosterChange?: () => Promise<void> | void;
}

export interface UseCourtsResult {
  courts: CourtStationData[];
  activeScoreCourt: CourtStationData | null;
  activeCustomMatchCourtId: number | null;
  openScoreModal: (courtId: number) => void;
  closeScoreModal: () => void;
  openCustomMatchModal: (courtId: number) => void;
  closeCustomMatchModal: () => void;
  dispatchCourt: (courtId: number) => Promise<void>;
  stageCustomMatch: (
    courtId: number,
    teamA: [RosterPlayer, RosterPlayer],
    teamB: [RosterPlayer, RosterPlayer]
  ) => void;
  setCourtIdle: (courtId: number) => void;
  submitScore: (
    courtId: number,
    winner: 'A' | 'B',
    winningScore: number,
    losingScore: number
  ) => Promise<MatchRecordingResult>;
}

const DEFAULT_INITIAL_COURTS: CourtStationData[] = [
  {
    courtId: 1,
    name: 'Court 1 • Show Court',
    state: 'IDLE',
    elapsedSeconds: 0,
    teamA: null,
    teamB: null,
  },
  {
    courtId: 2,
    name: 'Court 2 • Center',
    state: 'IDLE',
    elapsedSeconds: 0,
    teamA: null,
    teamB: null,
  },
  {
    courtId: 3,
    name: 'Court 3 • Far Side',
    state: 'IDLE',
    elapsedSeconds: 0,
    teamA: null,
    teamB: null,
  },
];

function pairTop4Players(
  candidates: RosterPlayer[]
): { teamA: [RosterPlayer, RosterPlayer]; teamB: [RosterPlayer, RosterPlayer] } | null {
  if (candidates.length < 4) {
    return null;
  }
  const sorted = [...candidates].sort((firstPlayer, secondPlayer) => {
    return secondPlayer.doubles_rating - firstPlayer.doubles_rating;
  });
  const p1 = sorted[0];
  const p2 = sorted[1];
  const p3 = sorted[2];
  const p4 = sorted[3];
  if (!p1 || !p2 || !p3 || !p4) {
    return null;
  }
  return {
    teamA: [p1, p4],
    teamB: [p2, p3],
  };
}

export function useCourts(options: UseCourtsOptions): UseCourtsResult {
  const { roster, onRosterChange } = options;
  const [courts, setCourts] = useState<CourtStationData[]>(DEFAULT_INITIAL_COURTS);
  const [activeScoreCourtId, setActiveScoreCourtId] = useState<number | null>(null);
  const [activeCustomMatchCourtId, setActiveCustomMatchCourtId] = useState<number | null>(null);

  const courtsRef = useRef<CourtStationData[]>(courts);
  courtsRef.current = courts;

  // Live timer tick for active courts
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setCourts((prevCourts) =>
        prevCourts.map((court) => {
          if (court.state === 'IN_MATCH' || court.state === 'SCORE_ENTRY') {
            return {
              ...court,
              elapsedSeconds: court.elapsedSeconds + 1,
            };
          }
          return court;
        })
      );
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  const openScoreModal = useCallback((courtId: number): void => {
    setActiveScoreCourtId(courtId);
    const nextCourts = courtsRef.current.map((court) => {
      if (court.courtId === courtId) {
        return { ...court, state: 'SCORE_ENTRY' as const };
      }
      return court;
    });
    courtsRef.current = nextCourts;
    setCourts(nextCourts);
  }, []);

  const closeScoreModal = useCallback((): void => {
    if (activeScoreCourtId !== null) {
      const nextCourts = courtsRef.current.map((court) => {
        if (court.courtId === activeScoreCourtId && court.state === 'SCORE_ENTRY') {
          return { ...court, state: 'IN_MATCH' as const };
        }
        return court;
      });
      courtsRef.current = nextCourts;
      setCourts(nextCourts);
    }
    setActiveScoreCourtId(null);
  }, [activeScoreCourtId]);

  const openCustomMatchModal = useCallback((courtId: number): void => {
    setActiveCustomMatchCourtId(courtId);
  }, []);

  const closeCustomMatchModal = useCallback((): void => {
    setActiveCustomMatchCourtId(null);
  }, []);

  const stageCustomMatch = useCallback(
    (
      courtId: number,
      teamA: [RosterPlayer, RosterPlayer],
      teamB: [RosterPlayer, RosterPlayer]
    ): void => {
      const nextCourts = courtsRef.current.map((court) => {
        if (court.courtId === courtId) {
          return {
            ...court,
            state: 'PROPOSED' as const,
            elapsedSeconds: 0,
            teamA,
            teamB,
          };
        }
        return court;
      });
      courtsRef.current = nextCourts;
      setCourts(nextCourts);
    },
    []
  );

  const setCourtIdle = useCallback((courtId: number): void => {
    const nextCourts = courtsRef.current.map((court) => {
      if (court.courtId === courtId) {
        return {
          ...court,
          state: 'IDLE' as const,
          elapsedSeconds: 0,
          teamA: null,
          teamB: null,
        };
      }
      return court;
    });
    courtsRef.current = nextCourts;
    setCourts(nextCourts);
  }, []);

  const dispatchCourt = useCallback(
    async (courtId: number): Promise<void> => {
      const targetCourt = courtsRef.current.find((c) => c.courtId === courtId);
      if (!targetCourt) {
        return;
      }

      // Case 1: Court is PROPOSED with players already staged
      if (targetCourt.state === 'PROPOSED' && targetCourt.teamA && targetCourt.teamB) {
        const onCourtPlayers = [...targetCourt.teamA, ...targetCourt.teamB];
        for (const player of onCourtPlayers) {
          await storageService.savePlayer({
            ...player,
            status: 'PLAYING',
          });
        }
        const nextCourts = courtsRef.current.map((court) => {
          if (court.courtId === courtId) {
            return {
              ...court,
              state: 'IN_MATCH' as const,
              elapsedSeconds: 0,
            };
          }
          return court;
        });
        courtsRef.current = nextCourts;
        setCourts(nextCourts);
        await onRosterChange?.();
        return;
      }

      // Case 2: Court is IDLE, pick 4 available queued players
      const assignedIds = new Set(
        courtsRef.current.flatMap((c) => {
          if (c.courtId === courtId) {
            return [];
          }
          return [...(c.teamA ?? []), ...(c.teamB ?? [])].map((p) => p.id);
        })
      );

      const latestRoster = await storageService.getRoster();
      const rosterPool = latestRoster.length > 0 ? latestRoster : roster;
      const availableQueued = rosterPool.filter(
        (player) => player.status === 'QUEUED' && !assignedIds.has(player.id)
      );

      const paired = pairTop4Players(availableQueued);
      if (!paired) {
        return;
      }

      const playersToDispatch = [...paired.teamA, ...paired.teamB];
      for (const player of playersToDispatch) {
        await storageService.savePlayer({
          ...player,
          status: 'PLAYING',
        });
      }

      const nextCourts = courtsRef.current.map((court) => {
        if (court.courtId === courtId) {
          return {
            ...court,
            state: 'IN_MATCH' as const,
            elapsedSeconds: 0,
            teamA: paired.teamA,
            teamB: paired.teamB,
          };
        }
        return court;
      });
      courtsRef.current = nextCourts;
      setCourts(nextCourts);

      await onRosterChange?.();
    },
    [roster, onRosterChange]
  );

  const submitScore = useCallback(
    async (
      courtId: number,
      winner: 'A' | 'B',
      winningScore: number,
      losingScore: number
    ): Promise<MatchRecordingResult> => {
      const targetCourt = courtsRef.current.find((c) => c.courtId === courtId);
      if (!targetCourt || !targetCourt.teamA || !targetCourt.teamB) {
        throw new Error(`Court ${courtId} does not have an active match to score`);
      }

      const teamAScore = winner === 'A' ? winningScore : losingScore;
      const teamBScore = winner === 'B' ? winningScore : losingScore;

      // Calculate DUBR rating deltas
      const deltas = calculateDoublesMatchDeltas(
        targetCourt.teamA.map((player) => ({
          id: player.id,
          name: player.name,
          rating: player.doubles_rating,
          matches_played: player.matches_played,
        })),
        targetCourt.teamB.map((player) => ({
          id: player.id,
          name: player.name,
          rating: player.doubles_rating,
          matches_played: player.matches_played,
        })),
        [[teamAScore, teamBScore]],
        'SINGLE_30'
      );

      // Save match to IndexedDB
      const pending = await storageService.getPendingMatches();
      const matchRecord: MatchRecord = {
        id: crypto.randomUUID(),
        club_night_id: 'default-club-night',
        recorded_at: new Date().toISOString(),
        sequence_num: pending.length + 1,
        court_id: courtId,
        discipline: 'DOUBLES',
        format: 'SINGLE_30',
        team_a_player_ids: [targetCourt.teamA[0].id, targetCourt.teamA[1].id],
        team_b_player_ids: [targetCourt.teamB[0].id, targetCourt.teamB[1].id],
        team_a_scores: [teamAScore],
        team_b_scores: [teamBScore],
        status: 'PENDING',
      };
      await storageService.saveMatch(matchRecord);

      // Badminton Stamina Invariant: All 4 players transition to RESTING and M_i += 1
      const onCourtPlayers = [...targetCourt.teamA, ...targetCourt.teamB];
      for (const delta of deltas) {
        const player = onCourtPlayers.find((p) => p.id === delta.player_id);
        if (player) {
          const updatedPlayer: RosterPlayer = {
            ...player,
            doubles_rating: delta.post_rating,
            matches_played: delta.matches_played_after,
            status: 'RESTING',
          };
          await storageService.savePlayer(updatedPlayer);
        }
      }

      // Check remaining available queued players in roster (excluding current court players)
      const finishedIds = new Set(onCourtPlayers.map((p) => p.id));
      const otherCourtsPlayerIds = new Set(
        courtsRef.current.flatMap((c) => {
          if (c.courtId === courtId) {
            return [];
          }
          return [...(c.teamA ?? []), ...(c.teamB ?? [])].map((p) => p.id);
        })
      );

      const latestRoster = await storageService.getRoster();
      const remainingQueued = latestRoster.filter(
        (player) =>
          player.status === 'QUEUED' &&
          !finishedIds.has(player.id) &&
          !otherCourtsPlayerIds.has(player.id)
      );

      const nextPairing = pairTop4Players(remainingQueued);

      // Cleared court transitions to PROPOSED if queue has >= 4 players, or IDLE
      const nextCourts = courtsRef.current.map((court) => {
        if (court.courtId === courtId) {
          if (nextPairing) {
            return {
              ...court,
              state: 'PROPOSED' as const,
              elapsedSeconds: 0,
              teamA: nextPairing.teamA,
              teamB: nextPairing.teamB,
            };
          }
          return {
            ...court,
            state: 'IDLE' as const,
            elapsedSeconds: 0,
            teamA: null,
            teamB: null,
          };
        }
        return court;
      });
      courtsRef.current = nextCourts;
      setCourts(nextCourts);

      setActiveScoreCourtId(null);
      await onRosterChange?.();

      return {
        match: matchRecord,
        deltas,
      };
    },
    [onRosterChange]
  );

  const activeScoreCourt =
    activeScoreCourtId !== null
      ? courts.find((c) => c.courtId === activeScoreCourtId) ?? null
      : null;

  return {
    courts,
    activeScoreCourt,
    activeCustomMatchCourtId,
    openScoreModal,
    closeScoreModal,
    openCustomMatchModal,
    closeCustomMatchModal,
    dispatchCourt,
    stageCustomMatch,
    setCourtIdle,
    submitScore,
  };
}
