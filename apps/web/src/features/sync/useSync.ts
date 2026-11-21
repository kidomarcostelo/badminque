'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { storageService } from '../../services/storageService';
import { syncService, type SyncOptions, type SyncResult } from './syncService';

export interface UseSyncParams {
  clubNightId: string;
  clubId?: string;
  options?: SyncOptions;
}

export interface UseSyncReturn {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  syncError: string | null;
  syncNow: () => Promise<SyncResult | null>;
  refreshPendingCount: () => Promise<void>;
}

export function useSync({ clubNightId, clubId, options }: UseSyncParams): UseSyncReturn {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const isSyncingRef = useRef<boolean>(false);
  isSyncingRef.current = isSyncing;

  const refreshPendingCount = useCallback(async (): Promise<void> => {
    try {
      const pendingMatches = await storageService.getPendingMatches();
      const nightPending = pendingMatches.filter(
        (m) => m.club_night_id === clubNightId
      );
      setPendingCount(nightPending.length);
    } catch {
      // IndexedDB connection closed or unavailable
    }
  }, [clubNightId]);

  const syncNow = useCallback(async (): Promise<SyncResult | null> => {
    if (isSyncingRef.current) {
      return null;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await syncService.syncPendingMatches(clubNightId, {
        clubId,
        ...options,
      });
      setLastSyncTime(new Date());
      await refreshPendingCount();
      return result;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown synchronization error';
      setSyncError(message);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [clubNightId, clubId, options, refreshPendingCount]);

  // Initial read of pending count
  useEffect(() => {
    void refreshPendingCount();
  }, [refreshPendingCount]);

  // Event listeners for offline / online transitions
  useEffect(() => {
    const handleOnline = (): void => {
      setIsOnline(true);
      void (async () => {
        try {
          const pending = await storageService.getPendingMatches();
          const count = pending.filter((m) => m.club_night_id === clubNightId).length;
          setPendingCount(count);
          if (count > 0 && !isSyncingRef.current) {
            await syncNow();
          }
        } catch {
          // ignore
        }
      })();
    };

    const handleOffline = (): void => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [clubNightId, syncNow]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncError,
    syncNow,
    refreshPendingCount,
  };
}
