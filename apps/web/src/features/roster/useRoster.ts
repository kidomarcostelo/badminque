'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  INITIAL_RATING_BASELINE,
  TIER_ANCHORS,
  ratingToDubr,
  type PlayerState,
  type RosterPlayer,
  type SkillTier,
} from '@badminque/core';
import { buildApiUrl } from '../../services/apiClient';
import { storageService } from '../../services/storageService';

export interface UseRosterOptions {
  onBeforeRemoteMutation?: () => Promise<void>;
  skipRemoteHydration?: boolean;
}

export interface UseRosterResult {
  roster: RosterPlayer[];
  filteredRoster: RosterPlayer[];
  suggestions: RosterPlayer[];
  searchQuery: string;
  isLoading: boolean;
  setSearchQuery: (query: string) => void;
  checkInPlayer: (
    name: string,
    tierOrClubId?: SkillTier | string,
    clubId?: string
  ) => Promise<RosterPlayer>;
  updatePlayerStatus: (playerId: string, status: PlayerState) => Promise<void>;
  syncPlayerStatusRemote: (
    playerId: string,
    status: PlayerState,
    clubIdOverride?: string
  ) => Promise<void>;
  refreshRoster: () => Promise<void>;
}

function mergeRemoteAndLocalPlayer(
  remotePlayer: RosterPlayer,
  localRecord: RosterPlayer | undefined,
  fallbackClubId: string
): RosterPlayer {
  const localMatches = localRecord?.matches_played ?? 0;
  const remoteMatches = remotePlayer.matches_played ?? 0;
  const preferLocalStats = Boolean(localRecord && localMatches > remoteMatches);

  const singlesRating = preferLocalStats
    ? localRecord!.singles_rating
    : (remotePlayer.singles_rating ??
      localRecord?.singles_rating ??
      INITIAL_RATING_BASELINE);
  const doublesRating = preferLocalStats
    ? localRecord!.doubles_rating
    : (remotePlayer.doubles_rating ??
      localRecord?.doubles_rating ??
      INITIAL_RATING_BASELINE);

  const singlesDubr =
    preferLocalStats && localRecord?.singles_dubr !== undefined
      ? localRecord.singles_dubr
      : (remotePlayer.singles_dubr ?? ratingToDubr(singlesRating));
  const doublesDubr =
    preferLocalStats && localRecord?.doubles_dubr !== undefined
      ? localRecord.doubles_dubr
      : (remotePlayer.doubles_dubr ?? ratingToDubr(doublesRating));

  return {
    id: remotePlayer.id,
    club_id: remotePlayer.club_id ?? localRecord?.club_id ?? fallbackClubId,
    name: remotePlayer.name,
    auth_user_id: remotePlayer.auth_user_id ?? localRecord?.auth_user_id ?? null,
    initial_tier: remotePlayer.initial_tier ?? localRecord?.initial_tier ?? null,
    singles_rating: singlesRating,
    doubles_rating: doublesRating,
    singles_dubr: singlesDubr,
    doubles_dubr: doublesDubr,
    singles_matches_played: preferLocalStats
      ? (localRecord?.singles_matches_played ?? 0)
      : (remotePlayer.singles_matches_played ??
        localRecord?.singles_matches_played ??
        0),
    doubles_matches_played: preferLocalStats
      ? (localRecord?.doubles_matches_played ?? localMatches)
      : (remotePlayer.doubles_matches_played ?? remoteMatches),
    singles_is_provisional: preferLocalStats
      ? localRecord?.singles_is_provisional
      : (remotePlayer.singles_is_provisional ??
        localRecord?.singles_is_provisional),
    doubles_is_provisional: preferLocalStats
      ? localRecord?.doubles_is_provisional
      : (remotePlayer.doubles_is_provisional ??
        localRecord?.doubles_is_provisional),
    matches_played: preferLocalStats ? localMatches : remoteMatches,
    status: localRecord?.status ?? remotePlayer.status ?? 'QUEUED',
    locked_partner_id:
      localRecord?.locked_partner_id ?? remotePlayer.locked_partner_id,
    locked_partner_name:
      localRecord?.locked_partner_name ?? remotePlayer.locked_partner_name,
    is_skipped: localRecord?.is_skipped ?? remotePlayer.is_skipped,
    checked_in_at:
      localRecord?.checked_in_at ??
      remotePlayer.checked_in_at ??
      new Date().toISOString(),
  };
}

function generateUuidV4(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const randomByte = (Math.random() * 16) | 0;
    const value = char === 'x' ? randomByte : (randomByte & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function useRoster(
  initialClubId?: string,
  options?: UseRosterOptions
): UseRosterResult {
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const skipRemoteHydration = options?.skipRemoteHydration ?? false;
  const onBeforeRemoteMutationRef = useRef<(() => Promise<void>) | undefined>(
    options?.onBeforeRemoteMutation
  );
  onBeforeRemoteMutationRef.current = options?.onBeforeRemoteMutation;
  const pendingCheckInsRef = useRef<Map<string, Promise<void>>>(new Map());

  const refreshRoster = useCallback(async (): Promise<void> => {
    try {
      const players = await storageService.getRoster();
      const sorted = [...players].sort((firstPlayer, secondPlayer) =>
        firstPlayer.name.localeCompare(secondPlayer.name)
      );
      setRoster(sorted);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshRoster();
  }, [refreshRoster]);

  // Synchronize remote club roster into IndexedDB when online
  useEffect(() => {
    if (
      skipRemoteHydration ||
      !initialClubId ||
      typeof window === 'undefined' ||
      !navigator.onLine
    ) {
      return;
    }

    let cancelled = false;
    void fetch(buildApiUrl(`/api/v1/clubs/${initialClubId}/players`))
      .then((response) => {
        if (!response.ok) {
          return null;
        }
        return response.json();
      })
      .then(async (remotePlayers: RosterPlayer[] | null) => {
        if (cancelled || !remotePlayers || !Array.isArray(remotePlayers)) {
          return;
        }
        const existingRoster = await storageService.getRoster();
        const existingMap = new Map(existingRoster.map((player) => [player.id, player]));

        for (const remotePlayer of remotePlayers) {
          const localRecord = existingMap.get(remotePlayer.id);
          await storageService.savePlayer(
            mergeRemoteAndLocalPlayer(remotePlayer, localRecord, initialClubId)
          );
        }
        if (!cancelled) {
          await refreshRoster();
        }
      })
      .catch(() => {
        // Offline or network drop: IndexedDB remains authoritative courtside
      });

    return () => {
      cancelled = true;
    };
  }, [initialClubId, refreshRoster, skipRemoteHydration]);

  // Derived state: calculate filtered roster and typeahead suggestions per CODING_STANDARDS.md 2.3
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredRoster = useMemo(() => {
    if (normalizedQuery.length === 0) {
      return roster;
    }
    return roster.filter((player) => {
      return player.name.toLowerCase().includes(normalizedQuery);
    });
  }, [roster, normalizedQuery]);

  const suggestions = useMemo(() => {
    if (normalizedQuery.length === 0) {
      return [];
    }
    return roster.filter((player) => {
      return player.name.toLowerCase().includes(normalizedQuery);
    });
  }, [roster, normalizedQuery]);

  const checkInPlayer = useCallback(
    async (
      name: string,
      tierOrClubId?: SkillTier | string,
      clubId?: string
    ): Promise<RosterPlayer> => {
      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        throw new Error('Player name cannot be empty');
      }

      let tier: SkillTier | undefined = undefined;
      let effectiveClubId: string | undefined = initialClubId;

      if (
        tierOrClubId === 'BEGINNER' ||
        tierOrClubId === 'INTERMEDIATE' ||
        tierOrClubId === 'ADVANCED'
      ) {
        tier = tierOrClubId;
        effectiveClubId = clubId ?? initialClubId;
      } else if (typeof tierOrClubId === 'string') {
        effectiveClubId = tierOrClubId;
      }

      const generatedId = generateUuidV4();

      let singlesRating: number = INITIAL_RATING_BASELINE;
      let doublesRating: number = INITIAL_RATING_BASELINE;
      let singlesDubr: number = ratingToDubr(INITIAL_RATING_BASELINE);
      let doublesDubr: number = ratingToDubr(INITIAL_RATING_BASELINE);

      if (tier && TIER_ANCHORS[tier]) {
        const anchor = TIER_ANCHORS[tier];
        singlesRating = anchor.rating;
        doublesRating = anchor.rating;
        singlesDubr = anchor.dubr;
        doublesDubr = anchor.dubr;
      }

      const newPlayer: RosterPlayer = {
        id: generatedId,
        club_id: effectiveClubId,
        name: trimmedName,
        auth_user_id: null,
        initial_tier: tier ?? null,
        singles_rating: singlesRating,
        doubles_rating: doublesRating,
        singles_dubr: singlesDubr,
        doubles_dubr: doublesDubr,
        matches_played: 0,
        status: 'QUEUED',
        checked_in_at: new Date().toISOString(),
      };

      // 1. Immediately persist to IndexedDB for offline courtside operation
      await storageService.savePlayer(newPlayer);
      await refreshRoster();

      // 2. Best-effort background sync to API when online (non-blocking)
      if (effectiveClubId && typeof window !== 'undefined' && navigator.onLine) {
        const syncPromise = (async () => {
          try {
            await onBeforeRemoteMutationRef.current?.();
            await fetch(buildApiUrl(`/api/v1/clubs/${effectiveClubId}/players`), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: newPlayer.id,
                name: newPlayer.name,
                initial_tier: newPlayer.initial_tier,
                singles_rating: newPlayer.singles_rating,
                doubles_rating: newPlayer.doubles_rating,
                singles_dubr: newPlayer.singles_dubr,
                doubles_dubr: newPlayer.doubles_dubr,
              }),
            });
          } catch {
            // Offline or network drop: IndexedDB remains authoritative courtside
          } finally {
            pendingCheckInsRef.current.delete(newPlayer.id);
          }
        })();
        pendingCheckInsRef.current.set(newPlayer.id, syncPromise);
        void syncPromise;
      }

      return newPlayer;
    },
    [initialClubId, refreshRoster]
  );

  const syncPlayerStatusRemote = useCallback(
    async (
      playerId: string,
      status: PlayerState,
      clubIdOverride?: string
    ): Promise<void> => {
      if (typeof window === 'undefined' || !navigator.onLine) {
        return;
      }

      const storedRoster = await storageService.getRoster();
      const targetPlayer =
        storedRoster.find((player) => player.id === playerId) ??
        roster.find((player) => player.id === playerId);
      const effectiveClubId = clubIdOverride ?? targetPlayer?.club_id ?? initialClubId;
      if (!effectiveClubId) {
        return;
      }

      void (async () => {
        try {
          const pendingCheckIn = pendingCheckInsRef.current.get(playerId);
          if (pendingCheckIn) {
            await pendingCheckIn;
          }
          await onBeforeRemoteMutationRef.current?.();
          await fetch(
            buildApiUrl(
              `/api/v1/clubs/${effectiveClubId}/players/${playerId}/status`
            ),
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status }),
            }
          );
        } catch {
          // Offline or network drop: IndexedDB remains authoritative courtside
        }
      })();
    },
    [roster, initialClubId]
  );

  const updatePlayerStatus = useCallback(
    async (playerId: string, status: PlayerState): Promise<void> => {
      const storedRoster = await storageService.getRoster();
      const existingPlayer =
        storedRoster.find((player) => player.id === playerId) ??
        roster.find((player) => player.id === playerId);
      if (!existingPlayer) {
        return;
      }

      const updatedPlayer: RosterPlayer = {
        ...existingPlayer,
        status,
      };

      await storageService.savePlayer(updatedPlayer);
      await refreshRoster();

      const effectiveClubId = existingPlayer.club_id ?? initialClubId;
      await syncPlayerStatusRemote(playerId, status, effectiveClubId);
    },
    [roster, initialClubId, refreshRoster, syncPlayerStatusRemote]
  );

  return {
    roster,
    filteredRoster,
    suggestions,
    searchQuery,
    isLoading,
    setSearchQuery,
    checkInPlayer,
    updatePlayerStatus,
    syncPlayerStatusRemote,
    refreshRoster,
  };
}
