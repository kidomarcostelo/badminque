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

export function useRoster(): UseRosterResult {
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

      const generatedId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `player-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const newPlayer: RosterPlayer = {
        id: generatedId,
        club_id: clubId,
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
      if (clubId && typeof window !== 'undefined' && navigator.onLine) {
        void fetch(`/api/v1/clubs/${clubId}/players`, {
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
    [refreshRoster]
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
    },
    [roster, refreshRoster]
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
