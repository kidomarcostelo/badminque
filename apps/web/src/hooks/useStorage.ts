'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MatchRecord, RosterPlayer } from '@badminque/core';
import {
  storageService,
  isPersistenceSupported,
  requestPersistentStorage,
} from '../services/storageService';

export interface UseStorageResult {
  roster: RosterPlayer[];
  pendingMatches: MatchRecord[];
  isLoading: boolean;
  isPersistent: boolean;
  refresh: () => Promise<void>;
  saveMatch: (match: MatchRecord) => Promise<void>;
  upsertPlayer: (player: RosterPlayer) => Promise<void>;
  requestPersistence: () => Promise<boolean>;
}

export function useStorage(): UseStorageResult {
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [pendingMatches, setPendingMatches] = useState<MatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPersistent, setIsPersistent] = useState<boolean>(false);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const [fetchedRoster, fetchedMatches, persisted] = await Promise.all([
        storageService.getRoster(),
        storageService.getPendingMatches(),
        isPersistenceSupported(),
      ]);
      setRoster(fetchedRoster);
      setPendingMatches(fetchedMatches);
      setIsPersistent(persisted);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveMatch = useCallback(
    async (match: MatchRecord): Promise<void> => {
      await storageService.saveMatch(match);
      await refresh();
    },
    [refresh]
  );

  const upsertPlayer = useCallback(
    async (player: RosterPlayer): Promise<void> => {
      await storageService.upsertRosterPlayer(player);
      await refresh();
    },
    [refresh]
  );

  const requestPersistence = useCallback(async (): Promise<boolean> => {
    const granted = await requestPersistentStorage();
    setIsPersistent(granted);
    return granted;
  }, []);

  return {
    roster,
    pendingMatches,
    isLoading,
    isPersistent,
    refresh,
    saveMatch,
    upsertPlayer,
    requestPersistence,
  };
}
