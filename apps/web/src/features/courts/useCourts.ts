'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildCoPlayHistory,
  calculateDoublesMatchDeltas,
  calculateWeakLinkSoftMean,
  generateMatchPairing,
  generateOnDeckPool,
  handleLadderMatchCompletion,
  pinPlayerPair,
  reconcileLockedPairStatus,
  togglePlayerSkip,
  unpinPlayerPair,
  type CourtLadderBufferState,
  type MatchRecord,
  type MatchRecordingResult,
  type OnDeckMatchGroup,
  type PlayerState,
  type RosterPlayer,
  type RotationPolicy,
} from '@badminque/core';
import { storageService } from '../../services/storageService';
import type { CourtStationData } from './types';

export interface UseCourtsOptions {
  roster: RosterPlayer[];
  initialPolicy?: RotationPolicy;
  onRosterChange?: () => Promise<void> | void;
}

export interface UseCourtsResult {
  courts: CourtStationData[];
  activeScoreCourt: CourtStationData | null;
  activeCustomMatchCourtId: number | null;
  activePolicy: RotationPolicy;
  setRotationPolicy: (policy: RotationPolicy) => void;
  onDeckGroups: OnDeckMatchGroup[];
  openScoreModal: (courtId: number) => void;
  closeScoreModal: () => void;
  openCustomMatchModal: (courtId: number) => void;
  closeCustomMatchModal: () => void;
  dispatchCourt: (courtId: number) => Promise<void>;
  dispatchDeckMatch: (slotIndex: number, targetCourtId?: number) => Promise<void>;
  clearCourt: (courtId: number) => Promise<void>;
  stageCustomMatch: (
    courtId: number,
    teamA: [RosterPlayer, RosterPlayer],
    teamB: [RosterPlayer, RosterPlayer]
  ) => Promise<void> | void;
  setCourtIdle: (courtId: number) => Promise<void> | void;
  customStagedSlot3: OnDeckMatchGroup | null;
  stageCustomSlot3: (
    teamA: [RosterPlayer, RosterPlayer],
    teamB: [RosterPlayer, RosterPlayer]
  ) => void;
  clearCustomSlot3: () => void;
  pinPlayerPair: (playerAId: string, playerBId: string) => Promise<void>;
  unpinPlayerPair: (playerId: string) => Promise<void>;
  togglePlayerSkip: (playerId: string) => Promise<void>;
  togglePlayerRest: (playerId: string) => Promise<void>;
  assignPlayerToCourt: (playerId: string, courtId: number) => Promise<void>;
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

const DEFAULT_INITIAL_LADDER_BUFFERS: CourtLadderBufferState = {
  1: { top: [], bottom: [] },
  2: { top: [], bottom: [] },
  3: { top: [], bottom: [] },
};

function mergeRosterPool(
  storedRoster: RosterPlayer[],
  inMemoryRoster: RosterPlayer[]
): RosterPlayer[] {
  const playerMap = new Map<string, RosterPlayer>();
  for (const player of inMemoryRoster) {
    playerMap.set(player.id, player);
  }
  for (const player of storedRoster) {
    playerMap.set(player.id, player);
  }
  return Array.from(playerMap.values());
}

export function useCourts(options: UseCourtsOptions): UseCourtsResult {
  const { roster, onRosterChange, initialPolicy } = options;
  const [courts, setCourts] = useState<CourtStationData[]>(DEFAULT_INITIAL_COURTS);
  const [activeScoreCourtId, setActiveScoreCourtId] = useState<number | null>(null);
  const [activeCustomMatchCourtId, setActiveCustomMatchCourtId] = useState<number | null>(null);
  const [activePolicy, setActivePolicy] = useState<RotationPolicy>(initialPolicy ?? 'FAIR_PLAY');
  const [ladderBuffers, setLadderBuffers] = useState<CourtLadderBufferState>(DEFAULT_INITIAL_LADDER_BUFFERS);
  const [pendingMatches, setPendingMatches] = useState<MatchRecord[]>([]);

  const courtsRef = useRef<CourtStationData[]>(courts);
  courtsRef.current = courts;

  const activePolicyRef = useRef<RotationPolicy>(activePolicy);
  activePolicyRef.current = activePolicy;

  const ladderBuffersRef = useRef<CourtLadderBufferState>(ladderBuffers);
  ladderBuffersRef.current = ladderBuffers;

  // Fetch pending matches for co-play history tracking
  const refreshMatches = useCallback(async (): Promise<void> => {
    try {
      const matches = await storageService.getPendingMatches();
      setPendingMatches(matches);
    } catch {
      // Offline fallback
    }
  }, []);

  useEffect(() => {
    void refreshMatches();
  }, [refreshMatches]);

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

  // Co-play history lookup derived from stored matches
  const coPlayHistory = useMemo(() => {
    return buildCoPlayHistory(pendingMatches);
  }, [pendingMatches]);

  // Calculate available queued players (excluding players on active courts)
  const availableQueued = useMemo(() => {
    const activeCourtPlayerIds = new Set(
      courts.flatMap((court) =>
        [...(court.teamA ?? []), ...(court.teamB ?? [])].map((player) => player.id)
      )
    );
    return roster.filter(
      (player) =>
        (player.status === 'QUEUED' || player.status === 'SKIPPED') &&
        !activeCourtPlayerIds.has(player.id)
    );
  }, [courts, roster]);

  const [customStagedSlot3, setCustomStagedSlot3] = useState<OnDeckMatchGroup | null>(null);
  const customStagedSlot3Ref = useRef<OnDeckMatchGroup | null>(customStagedSlot3);
  customStagedSlot3Ref.current = customStagedSlot3;

  // Automated On-Deck match groups (Slot 1: "Next Up", Slot 2: "Following", Slot 3: "In the Hole" / "Custom Staging")
  const onDeckGroups = useMemo(() => {
    const maxSlots = customStagedSlot3 ? 2 : 3;
    const generated = generateOnDeckPool(
      availableQueued,
      activePolicy,
      Date.now(),
      coPlayHistory,
      maxSlots
    );

    if (customStagedSlot3) {
      return [...generated.slice(0, 2), customStagedSlot3];
    }
    return generated;
  }, [availableQueued, activePolicy, coPlayHistory, customStagedSlot3]);

  const onDeckGroupsRef = useRef<OnDeckMatchGroup[]>(onDeckGroups);
  onDeckGroupsRef.current = onDeckGroups;

  const stageCustomSlot3 = useCallback(
    (
      teamA: [RosterPlayer, RosterPlayer],
      teamB: [RosterPlayer, RosterPlayer]
    ): void => {
      const ratingA = calculateWeakLinkSoftMean(
        teamA[0].doubles_rating,
        teamA[1].doubles_rating
      );
      const ratingB = calculateWeakLinkSoftMean(
        teamB[0].doubles_rating,
        teamB[1].doubles_rating
      );
      const spread = Math.round(Math.abs(ratingA - ratingB) * 10) / 10;

      const group: OnDeckMatchGroup = {
        slotIndex: 3,
        label: 'In the Hole',
        pairA: teamA,
        pairB: teamB,
        pairARating: Math.round(ratingA),
        pairBRating: Math.round(ratingB),
        spread,
        policy: activePolicyRef.current,
      };

      setCustomStagedSlot3(group);
    },
    []
  );

  const clearCustomSlot3 = useCallback((): void => {
    setCustomStagedSlot3(null);
  }, []);

  const setRotationPolicy = useCallback((policy: RotationPolicy): void => {
    // Policy change guardrail: mid-session policy switches apply only at the queue boundary
    // without affecting on-court matches, preserving all player wait times and match counts.
    setActivePolicy(policy);
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
    async (
      courtId: number,
      teamA: [RosterPlayer, RosterPlayer],
      teamB: [RosterPlayer, RosterPlayer]
    ): Promise<void> => {
      const targetCourt = courtsRef.current.find((court) => court.courtId === courtId);
      if (targetCourt && (targetCourt.teamA || targetCourt.teamB)) {
        const newAssignedIds = new Set([...teamA, ...teamB].map((player) => player.id));
        const oldPlayers = [...(targetCourt.teamA ?? []), ...(targetCourt.teamB ?? [])];
        const latestRoster = await storageService.getRoster();
        const rosterPool = mergeRosterPool(latestRoster, roster);
        for (const oldPlayer of oldPlayers) {
          if (!newAssignedIds.has(oldPlayer.id)) {
            const freshPlayer =
              rosterPool.find((rosterPlayer) => rosterPlayer.id === oldPlayer.id) ?? oldPlayer;
            if (freshPlayer.status === 'PLAYING') {
              await storageService.savePlayer({
                ...freshPlayer,
                status: 'QUEUED',
              });
            }
          }
        }
      }
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
      await onRosterChange?.();
    },
    [roster, onRosterChange]
  );

  const setCourtIdle = useCallback(
    async (courtId: number): Promise<void> => {
      const targetCourt = courtsRef.current.find((court) => court.courtId === courtId);
      if (targetCourt && (targetCourt.teamA || targetCourt.teamB)) {
        const onCourtPlayers = [...(targetCourt.teamA ?? []), ...(targetCourt.teamB ?? [])];
        const latestRoster = await storageService.getRoster();
        const rosterPool = mergeRosterPool(latestRoster, roster);
        for (const player of onCourtPlayers) {
          const freshPlayer =
            rosterPool.find((rosterPlayer) => rosterPlayer.id === player.id) ?? player;
          if (freshPlayer.status === 'PLAYING') {
            await storageService.savePlayer({
              ...freshPlayer,
              status: 'QUEUED',
            });
          }
        }
      }
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
      await onRosterChange?.();
    },
    [roster, onRosterChange]
  );

  const clearCourt = useCallback(
    async (courtId: number): Promise<void> => {
      const targetCourt = courtsRef.current.find((court) => court.courtId === courtId);
      if (targetCourt && (targetCourt.teamA || targetCourt.teamB)) {
        const onCourtPlayers = [...(targetCourt.teamA ?? []), ...(targetCourt.teamB ?? [])];
        const latestRoster = await storageService.getRoster();
        const rosterPool = mergeRosterPool(latestRoster, roster);
        for (const player of onCourtPlayers) {
          const freshPlayer =
            rosterPool.find((rosterPlayer) => rosterPlayer.id === player.id) ?? player;
          if (freshPlayer.status === 'PLAYING') {
            await storageService.savePlayer({
              ...freshPlayer,
              status: 'QUEUED',
            });
          }
        }
      }

      const latestRoster = await storageService.getRoster();
      const rosterPool = mergeRosterPool(latestRoster, roster);

      const otherCourtsPlayerIds = new Set(
        courtsRef.current.flatMap((court) => {
          if (court.courtId === courtId) {
            return [];
          }
          return [...(court.teamA ?? []), ...(court.teamB ?? [])].map(
            (player) => player.id
          );
        })
      );

      const remainingQueued = rosterPool.filter(
        (player) => player.status === 'QUEUED' && !otherCourtsPlayerIds.has(player.id)
      );

      const pairing = generateMatchPairing({
        policy: activePolicyRef.current,
        queue: remainingQueued,
        history: buildCoPlayHistory(pendingMatches),
        ladderBuffers: ladderBuffersRef.current,
        courtNumber: courtId as 1 | 2 | 3,
      });

      const nextCourts = courtsRef.current.map((court) => {
        if (court.courtId === courtId) {
          if (pairing) {
            return {
              ...court,
              state: 'PROPOSED' as const,
              elapsedSeconds: 0,
              teamA: [pairing.teamA[0], pairing.teamA[1]] as [RosterPlayer, RosterPlayer],
              teamB: [pairing.teamB[0], pairing.teamB[1]] as [RosterPlayer, RosterPlayer],
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
      await onRosterChange?.();
    },
    [roster, pendingMatches, onRosterChange]
  );

  const dispatchCourt = useCallback(
    async (courtId: number): Promise<void> => {
      const targetCourt = courtsRef.current.find((court) => court.courtId === courtId);
      if (!targetCourt) {
        return;
      }

      // Case 1: Court is PROPOSED with players already staged
      if (targetCourt.state === 'PROPOSED' && targetCourt.teamA && targetCourt.teamB) {
        const onCourtPlayers = [...targetCourt.teamA, ...targetCourt.teamB];
        const latestRoster = await storageService.getRoster();
        const rosterPool = mergeRosterPool(latestRoster, roster);
        for (const player of onCourtPlayers) {
          const freshPlayer =
            rosterPool.find((rosterPlayer) => rosterPlayer.id === player.id) ?? player;
          await storageService.savePlayer({
            ...freshPlayer,
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

      // Case 2: Court is IDLE or without pairings, pick 4 optimal queued players
      const assignedIds = new Set(
        courtsRef.current.flatMap((court) => {
          if (court.courtId === courtId) {
            return [];
          }
          return [...(court.teamA ?? []), ...(court.teamB ?? [])].map(
            (player) => player.id
          );
        })
      );

      const latestRoster = await storageService.getRoster();
      const rosterPool = mergeRosterPool(latestRoster, roster);
      const availableQueue = rosterPool.filter(
        (player) => player.status === 'QUEUED' && !assignedIds.has(player.id)
      );

      const pairing = generateMatchPairing({
        policy: activePolicyRef.current,
        queue: availableQueue,
        history: buildCoPlayHistory(pendingMatches),
        ladderBuffers: ladderBuffersRef.current,
        courtNumber: courtId as 1 | 2 | 3,
      });

      if (!pairing) {
        return;
      }

      const playersToDispatch = [...pairing.teamA, ...pairing.teamB];
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
            teamA: [pairing.teamA[0], pairing.teamA[1]] as [RosterPlayer, RosterPlayer],
            teamB: [pairing.teamB[0], pairing.teamB[1]] as [RosterPlayer, RosterPlayer],
          };
        }
        return court;
      });
      courtsRef.current = nextCourts;
      setCourts(nextCourts);

      await onRosterChange?.();
    },
    [roster, pendingMatches, onRosterChange]
  );

  const dispatchDeckMatch = useCallback(
    async (slotIndex: number, targetCourtId?: number): Promise<void> => {
      const matchGroup = onDeckGroupsRef.current.find((g) => g.slotIndex === slotIndex);
      if (!matchGroup) {
        return;
      }

      let chosenCourtId = targetCourtId;
      if (!chosenCourtId) {
        const availableCourt =
          courtsRef.current.find(
            (court) => court.state === 'IDLE' || court.state === 'PROPOSED'
          ) ?? courtsRef.current[0];
        chosenCourtId = availableCourt?.courtId ?? 1;
      }

      const playersToDispatch = [...matchGroup.pairA, ...matchGroup.pairB];
      const latestRoster = await storageService.getRoster();
      const rosterPool = mergeRosterPool(latestRoster, roster);

      for (const player of playersToDispatch) {
        const freshPlayer =
          rosterPool.find((rosterPlayer) => rosterPlayer.id === player.id) ?? player;
        await storageService.savePlayer({
          ...freshPlayer,
          status: 'PLAYING',
        });

        // Locked pair invariant: If partner is off-court, set them to WAITING_PARTNER
        if (freshPlayer.locked_partner_id) {
          const isPartnerDispatched = playersToDispatch.some(
            (p) => p.id === freshPlayer.locked_partner_id
          );
          if (!isPartnerDispatched) {
            const partner = rosterPool.find((p) => p.id === freshPlayer.locked_partner_id);
            if (partner && partner.status !== 'PLAYING') {
              await storageService.savePlayer({
                ...partner,
                status: 'WAITING_PARTNER',
              });
            }
          }
        }
      }

      if (slotIndex === 3) {
        setCustomStagedSlot3(null);
      }

      const nextCourts = courtsRef.current.map((court) => {
        if (court.courtId === chosenCourtId) {
          return {
            ...court,
            state: 'IN_MATCH' as const,
            elapsedSeconds: 0,
            teamA: [matchGroup.pairA[0], matchGroup.pairA[1]] as [RosterPlayer, RosterPlayer],
            teamB: [matchGroup.pairB[0], matchGroup.pairB[1]] as [RosterPlayer, RosterPlayer],
          };
        }
        return court;
      });

      courtsRef.current = nextCourts;
      setCourts(nextCourts);
      await onRosterChange?.();
    },
    [onDeckGroups, roster, onRosterChange]
  );

  const pinPlayerPairHandler = useCallback(
    async (playerAId: string, playerBId: string): Promise<void> => {
      const latestRoster = await storageService.getRoster();
      const rosterPool = mergeRosterPool(latestRoster, roster);
      const pA = rosterPool.find((p) => p.id === playerAId);
      const pB = rosterPool.find((p) => p.id === playerBId);
      if (!pA || !pB) {
        return;
      }
      const [pinnedA, pinnedB] = pinPlayerPair(pA, pB);
      await storageService.savePlayer(pinnedA);
      await storageService.savePlayer(pinnedB);
      await onRosterChange?.();
    },
    [roster, onRosterChange]
  );

  const unpinPlayerPairHandler = useCallback(
    async (playerId: string): Promise<void> => {
      const latestRoster = await storageService.getRoster();
      const rosterPool = mergeRosterPool(latestRoster, roster);
      const pA = rosterPool.find((p) => p.id === playerId);
      if (!pA) {
        return;
      }
      const partnerId = pA.locked_partner_id;
      const pB = partnerId ? rosterPool.find((p) => p.id === partnerId) : undefined;
      const [unpinnedA, unpinnedB] = unpinPlayerPair(pA, pB);
      await storageService.savePlayer(unpinnedA);
      if (unpinnedB) {
        await storageService.savePlayer(unpinnedB);
      }
      await onRosterChange?.();
    },
    [roster, onRosterChange]
  );

  const togglePlayerSkipHandler = useCallback(
    async (playerId: string): Promise<void> => {
      const latestRoster = await storageService.getRoster();
      const rosterPool = mergeRosterPool(latestRoster, roster);
      const player = rosterPool.find((p) => p.id === playerId);
      if (!player) {
        return;
      }
      const updated = togglePlayerSkip(player);
      await storageService.savePlayer(updated);
      await onRosterChange?.();
    },
    [roster, onRosterChange]
  );

  const togglePlayerRestHandler = useCallback(
    async (playerId: string): Promise<void> => {
      const latestRoster = await storageService.getRoster();
      const rosterPool = mergeRosterPool(latestRoster, roster);
      const player = rosterPool.find((p) => p.id === playerId);
      if (!player) {
        return;
      }
      const nextStatus: PlayerState = player.status === 'RESTING' ? 'QUEUED' : 'RESTING';
      const updated: RosterPlayer = {
        ...player,
        status: nextStatus,
      };
      await storageService.savePlayer(updated);

      if (player.locked_partner_id) {
        const partner = rosterPool.find((p) => p.id === player.locked_partner_id);
        if (partner) {
          const reconciled = reconcileLockedPairStatus(partner, [updated, partner]);
          await storageService.savePlayer(reconciled);
        }
      }

      await onRosterChange?.();
    },
    [roster, onRosterChange]
  );

  const assignPlayerToCourt = useCallback(
    async (playerId: string, courtId: number): Promise<void> => {
      const latestRoster = await storageService.getRoster();
      const rosterPool = mergeRosterPool(latestRoster, roster);
      const player = rosterPool.find((p) => p.id === playerId);
      if (!player) {
        return;
      }

      const targetCourt = courtsRef.current.find((c) => c.courtId === courtId);
      if (!targetCourt || targetCourt.state === 'IN_MATCH' || targetCourt.state === 'SCORE_ENTRY') {
        return;
      }

      const assignedIds = new Set(
        courtsRef.current.flatMap((c) => {
          if (c.courtId === courtId) {
            return [];
          }
          return [...(c.teamA ?? []), ...(c.teamB ?? [])].map((p) => p.id);
        })
      );
      assignedIds.add(playerId);

      const otherQueued = rosterPool.filter(
        (p) => (p.status === 'QUEUED' || p.status === 'SKIPPED') && !assignedIds.has(p.id)
      );

      const quad: RosterPlayer[] = [player];
      if (player.locked_partner_id) {
        const partner = otherQueued.find((p) => p.id === player.locked_partner_id);
        if (partner) {
          quad.push(partner);
        }
      }

      const needed = 4 - quad.length;
      const additional = otherQueued
        .filter((p) => !quad.some((q) => q.id === p.id))
        .slice(0, needed);
      quad.push(...additional);

      if (quad.length === 4) {
        const teamA: [RosterPlayer, RosterPlayer] = [quad[0] as RosterPlayer, quad[1] as RosterPlayer];
        const teamB: [RosterPlayer, RosterPlayer] = [quad[2] as RosterPlayer, quad[3] as RosterPlayer];

        const nextCourts = courtsRef.current.map((c) => {
          if (c.courtId === courtId) {
            return {
              ...c,
              state: 'PROPOSED' as const,
              elapsedSeconds: 0,
              teamA,
              teamB,
            };
          }
          return c;
        });
        courtsRef.current = nextCourts;
        setCourts(nextCourts);
        await onRosterChange?.();
      }
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
      const targetCourt = courtsRef.current.find((court) => court.courtId === courtId);
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

      // Update ladder buffer if COURT_LADDER policy is active
      let nextBuffers = ladderBuffersRef.current;
      if (activePolicyRef.current === 'COURT_LADDER') {
        const winnerPair = winner === 'A' ? targetCourt.teamA : targetCourt.teamB;
        const loserPair = winner === 'A' ? targetCourt.teamB : targetCourt.teamA;
        nextBuffers = handleLadderMatchCompletion(
          {
            courtNumber: courtId as 1 | 2 | 3,
            winnerPair,
            loserPair,
          },
          ladderBuffersRef.current
        );
        ladderBuffersRef.current = nextBuffers;
        setLadderBuffers(nextBuffers);
      }

      // Badminton Stamina Invariant: All 4 players transition to RESTING and M_i += 1
      const onCourtPlayers = [...targetCourt.teamA, ...targetCourt.teamB];
      const latestStoredRoster = await storageService.getRoster();
      const currentRosterPool = mergeRosterPool(latestStoredRoster, roster);
      for (const delta of deltas) {
        const player =
          currentRosterPool.find((rosterPlayer) => rosterPlayer.id === delta.player_id) ??
          onCourtPlayers.find((onCourtPlayer) => onCourtPlayer.id === delta.player_id);
        if (player) {
          const updatedPlayer: RosterPlayer = {
            ...player,
            doubles_rating: delta.post_rating,
            doubles_dubr: delta.post_dubr,
            matches_played: delta.matches_played_after,
            status: 'RESTING',
          };
          await storageService.savePlayer(updatedPlayer);
        }
      }

      // Check remaining available queued players in roster (excluding current court players)
      const finishedIds = new Set(onCourtPlayers.map((player) => player.id));
      const otherCourtsPlayerIds = new Set(
        courtsRef.current.flatMap((court) => {
          if (court.courtId === courtId) {
            return [];
          }
          return [...(court.teamA ?? []), ...(court.teamB ?? [])].map(
            (player) => player.id
          );
        })
      );

      const latestRoster = await storageService.getRoster();
      const rosterPool = mergeRosterPool(latestRoster, roster);
      const remainingQueued = rosterPool.filter(
        (player) =>
          player.status === 'QUEUED' &&
          !finishedIds.has(player.id) &&
          !otherCourtsPlayerIds.has(player.id)
      );

      const allMatches = [...pending, matchRecord];
      const updatedHistory = buildCoPlayHistory(allMatches);

      const nextPairing = generateMatchPairing({
        policy: activePolicyRef.current,
        queue: remainingQueued,
        history: updatedHistory,
        ladderBuffers: nextBuffers,
        courtNumber: courtId as 1 | 2 | 3,
      });

      // Cleared court transitions to PROPOSED if queue has >= 4 players, or IDLE
      const nextCourts = courtsRef.current.map((court) => {
        if (court.courtId === courtId) {
          if (nextPairing) {
            return {
              ...court,
              state: 'PROPOSED' as const,
              elapsedSeconds: 0,
              teamA: [nextPairing.teamA[0], nextPairing.teamA[1]] as [RosterPlayer, RosterPlayer],
              teamB: [nextPairing.teamB[0], nextPairing.teamB[1]] as [RosterPlayer, RosterPlayer],
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
      void refreshMatches();
      await onRosterChange?.();

      return {
        match: matchRecord,
        deltas,
      };
    },
    [roster, refreshMatches, onRosterChange]
  );

  const activeScoreCourt =
    activeScoreCourtId !== null
      ? courts.find((court) => court.courtId === activeScoreCourtId) ?? null
      : null;

  return {
    courts,
    activeScoreCourt,
    activeCustomMatchCourtId,
    activePolicy,
    setRotationPolicy,
    onDeckGroups,
    customStagedSlot3,
    stageCustomSlot3,
    clearCustomSlot3,
    pinPlayerPair: pinPlayerPairHandler,
    unpinPlayerPair: unpinPlayerPairHandler,
    togglePlayerSkip: togglePlayerSkipHandler,
    togglePlayerRest: togglePlayerRestHandler,
    assignPlayerToCourt,
    openScoreModal,
    closeScoreModal,
    openCustomMatchModal,
    closeCustomMatchModal,
    dispatchCourt,
    dispatchDeckMatch,
    clearCourt,
    stageCustomMatch,
    setCourtIdle,
    submitScore,
  };
}
