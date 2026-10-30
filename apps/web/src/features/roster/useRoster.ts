'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  INITIAL_RATING_BASELINE,
  type PlayerState,
  type RosterPlayer,
} from '@badminque/core';
import { storageService } from '../../services/storageService';

export interface UseRosterResult {
  roster: RosterPlayer[];
  filteredRoster: RosterPlayer[];
  suggestions: RosterPlayer[];
  searchQuery: string;
  isLoading: boolean;
  setSearchQuery: (query: string) => void;
  checkInPlayer: (name: string, clubId?: string) => Promise<RosterPlayer>;
  updatePlayerStatus: (playerId: string, status: PlayerState) => Promise<void>;
  refreshRoster: () => Promise<void>;
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

export function useRoster(initialClubId?: string): UseRosterResult {
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
    if (!initialClubId || typeof window === 'undefined' || !navigator.onLine) {
      return;
    }

    void fetch(`/api/v1/clubs/${initialClubId}/players`)
      .then((response) => {
        if (!response.ok) {
          return null;
        }
        return response.json();
      })
      .then(async (remotePlayers: RosterPlayer[] | null) => {
        if (!remotePlayers || !Array.isArray(remotePlayers)) {
          return;
        }
        const existingRoster = await storageService.getRoster();
        const existingMap = new Map(existingRoster.map((player) => [player.id, player]));

        for (const remotePlayer of remotePlayers) {
          const localRecord = existingMap.get(remotePlayer.id);
          await storageService.savePlayer({
            id: remotePlayer.id,
            club_id: remotePlayer.club_id ?? initialClubId,
            name: remotePlayer.name,
            auth_user_id: remotePlayer.auth_user_id ?? null,
            singles_rating: remotePlayer.singles_rating ?? INITIAL_RATING_BASELINE,
            doubles_rating: remotePlayer.doubles_rating ?? INITIAL_RATING_BASELINE,
            matches_played: remotePlayer.matches_played ?? 0,
            status: localRecord?.status ?? remotePlayer.status ?? 'QUEUED',
            checked_in_at:
              localRecord?.checked_in_at ??
              remotePlayer.checked_in_at ??
              new Date().toISOString(),
          });
        }
        await refreshRoster();
      })
      .catch(() => {
        // Offline or network drop: IndexedDB remains authoritative courtside
      });
  }, [initialClubId, refreshRoster]);

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
    async (name: string, clubId?: string): Promise<RosterPlayer> => {
      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        throw new Error('Player name cannot be empty');
      }

      const effectiveClubId = clubId ?? initialClubId;
      const generatedId = generateUuidV4();

      const newPlayer: RosterPlayer = {
        id: generatedId,
        club_id: effectiveClubId,
        name: trimmedName,
        auth_user_id: null,
        singles_rating: INITIAL_RATING_BASELINE,
        doubles_rating: INITIAL_RATING_BASELINE,
        matches_played: 0,
        status: 'QUEUED',
        checked_in_at: new Date().toISOString(),
      };

      // 1. Immediately persist to IndexedDB for offline courtside operation
      await storageService.savePlayer(newPlayer);
      await refreshRoster();

      // 2. Best-effort background sync to API when online (non-blocking)
      if (effectiveClubId && typeof window !== 'undefined' && navigator.onLine) {
        void fetch(`/api/v1/clubs/${effectiveClubId}/players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newPlayer.id,
            name: newPlayer.name,
            singles_rating: newPlayer.singles_rating,
            doubles_rating: newPlayer.doubles_rating,
          }),
        }).catch(() => {
          // Offline or network drop: IndexedDB remains authoritative courtside
        });
      }

      return newPlayer;
    },
    [initialClubId, refreshRoster]
  );

  const updatePlayerStatus = useCallback(
    async (playerId: string, status: PlayerState): Promise<void> => {
      const existingPlayer = roster.find((player) => player.id === playerId);
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
      if (effectiveClubId && typeof window !== 'undefined' && navigator.onLine) {
        void fetch(`/api/v1/clubs/${effectiveClubId}/players/${playerId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }).catch(() => {
          // Offline or network drop
        });
      }
    },
    [roster, initialClubId, refreshRoster]
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
    refreshRoster,
  };
}
