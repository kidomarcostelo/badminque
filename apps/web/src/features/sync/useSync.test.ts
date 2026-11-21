import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatchRecord } from '@badminque/core';
import {
  storageService,
  closeDatabaseConnection,
} from '../../services/storageService';
import { syncService } from './syncService';
import { useSync } from './useSync';

describe('useSync', () => {
  const clubNightId = 'c8b417c8-04fb-4fa3-94c3-1123456789ab';

  beforeEach(async () => {
    closeDatabaseConnection();
    await storageService.clearAll();
    vi.restoreAllMocks();
  });

  it('initializes with online status and reads pending count', async () => {
    const match: MatchRecord = {
      id: 'm1',
      club_night_id: clubNightId,
      recorded_at: '2026-11-21T10:00:00Z',
      sequence_num: 1,
      court_id: 1,
      discipline: 'DOUBLES',
      format: 'SINGLE_30',
      team_a_player_ids: ['p1', 'p2'],
      team_b_player_ids: ['p3', 'p4'],
      team_a_scores: [30],
      team_b_scores: [20],
      status: 'PENDING',
    };
    await storageService.saveMatch(match);

    const { result } = renderHook(() => useSync({ clubNightId }));

    await waitFor(() => {
      expect(result.current.pendingCount).toBe(1);
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.syncError).toBeNull();
  });

  it('updates isOnline state on offline and online window events', async () => {
    const { result } = renderHook(() => useSync({ clubNightId }));

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('triggers syncNow manually and decrements pending count on success', async () => {
    const match: MatchRecord = {
      id: 'm-sync-now',
      club_night_id: clubNightId,
      recorded_at: '2026-11-21T10:00:00Z',
      sequence_num: 1,
      court_id: 1,
      discipline: 'DOUBLES',
      format: 'SINGLE_30',
      team_a_player_ids: ['p1', 'p2'],
      team_b_player_ids: ['p3', 'p4'],
      team_a_scores: [30],
      team_b_scores: [20],
      status: 'PENDING',
    };
    await storageService.saveMatch(match);

    vi.spyOn(syncService, 'syncPendingMatches').mockResolvedValueOnce({
      syncedCount: 1,
      ignoredDuplicatesCount: 0,
      status: 'success',
      deltas: {},
    });

    const { result } = renderHook(() => useSync({ clubNightId }));

    await waitFor(() => {
      expect(result.current.pendingCount).toBe(1);
    });

    let syncResult;
    await act(async () => {
      syncResult = await result.current.syncNow();
    });

    expect(syncResult).toBeDefined();
    expect(result.current.lastSyncTime).not.toBeNull();
    expect(result.current.syncError).toBeNull();
  });

  it('automatically triggers sync on reconnection event when pending matches exist', async () => {
    const match: MatchRecord = {
      id: 'm-auto-sync',
      club_night_id: clubNightId,
      recorded_at: '2026-11-21T10:00:00Z',
      sequence_num: 1,
      court_id: 1,
      discipline: 'DOUBLES',
      format: 'SINGLE_30',
      team_a_player_ids: ['p1', 'p2'],
      team_b_player_ids: ['p3', 'p4'],
      team_a_scores: [30],
      team_b_scores: [20],
      status: 'PENDING',
    };
    await storageService.saveMatch(match);

    const syncSpy = vi.spyOn(syncService, 'syncPendingMatches').mockResolvedValueOnce({
      syncedCount: 1,
      ignoredDuplicatesCount: 0,
      status: 'success',
      deltas: {},
    });

    const { result } = renderHook(() => useSync({ clubNightId }));

    await waitFor(() => {
      expect(result.current.pendingCount).toBe(1);
    });

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(syncSpy).toHaveBeenCalledWith(clubNightId, expect.anything());
    });
  });

  it('captures error message when sync fails', async () => {
    const match: MatchRecord = {
      id: 'm-err',
      club_night_id: clubNightId,
      recorded_at: '2026-11-21T10:00:00Z',
      sequence_num: 1,
      court_id: 1,
      discipline: 'DOUBLES',
      format: 'SINGLE_30',
      team_a_player_ids: ['p1', 'p2'],
      team_b_player_ids: ['p3', 'p4'],
      team_a_scores: [30],
      team_b_scores: [20],
      status: 'PENDING',
    };
    await storageService.saveMatch(match);

    vi.spyOn(syncService, 'syncPendingMatches').mockRejectedValueOnce(
      new Error('Server unavailable')
    );

    const { result } = renderHook(() => useSync({ clubNightId }));

    await waitFor(() => {
      expect(result.current.pendingCount).toBe(1);
    });

    await act(async () => {
      await result.current.syncNow();
    });

    expect(result.current.syncError).toContain('Server unavailable');
    expect(result.current.isSyncing).toBe(false);
  });
});
