import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatchRecord, RosterPlayer } from '@badminque/core';
import {
  storageService,
  closeDatabaseConnection,
} from '../../services/storageService';
import { syncService } from './syncService';

describe('syncService', () => {
  const clubNightId = 'c8b417c8-04fb-4fa3-94c3-1123456789ab';

  beforeEach(async () => {
    closeDatabaseConnection();
    await storageService.clearAll();
    vi.restoreAllMocks();
  });

  it('returns zero counts and does not call API when no pending matches exist', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await syncService.syncPendingMatches(clubNightId);

    expect(result.syncedCount).toBe(0);
    expect(result.ignoredDuplicatesCount).toBe(0);
    expect(result.status).toBe('success');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('uploads pending matches, marks them SYNCED, and reconciles player ratings', async () => {
    // 1. Seed player in local storage
    const player1: RosterPlayer = {
      id: 'p1-uuid',
      name: 'Alice Tan',
      auth_user_id: null,
      singles_rating: 1500,
      doubles_rating: 1500,
      matches_played: 0,
      status: 'RESTING',
      checked_in_at: new Date().toISOString(),
    };
    await storageService.savePlayer(player1);

    // 2. Seed pending match in local storage
    const match1: MatchRecord = {
      id: 'match-1-uuid',
      club_night_id: clubNightId,
      recorded_at: '2026-11-21T10:00:00Z',
      sequence_num: 1,
      court_id: 1,
      discipline: 'DOUBLES',
      format: 'SINGLE_30',
      team_a_player_ids: ['p1-uuid', 'p2-uuid'],
      team_b_player_ids: ['p3-uuid', 'p4-uuid'],
      team_a_scores: [30],
      team_b_scores: [20],
      status: 'PENDING',
    };
    await storageService.saveMatch(match1);

    // 3. Mock successful backend batch sync response
    const mockResponse = {
      synced_count: 1,
      ignored_duplicates_count: 0,
      status: 'success',
      deltas: {
        'match-1-uuid': [
          {
            player_id: 'p1-uuid',
            player_name: 'Alice Tan',
            pre_rating: 1500,
            post_rating: 1532,
            rating_delta: 32,
            pre_dubr: 3.5,
            post_dubr: 3.58,
            dubr_delta: 0.08,
            k_factor: 64,
            rd_after: 350,
            is_provisional: true,
            matches_played_after: 1,
          },
        ],
      },
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const result = await syncService.syncPendingMatches(clubNightId);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.syncedCount).toBe(1);
    expect(result.ignoredDuplicatesCount).toBe(0);
    expect(result.status).toBe('success');

    // 4. Verify match is marked SYNCED in storage
    const pendingAfter = await storageService.getPendingMatches();
    expect(pendingAfter).toHaveLength(0);

    // 5. Verify player ratings were reconciled
    const roster = await storageService.getRoster();
    const updatedP1 = roster.find((p) => p.id === 'p1-uuid');
    expect(updatedP1?.doubles_rating).toBe(1532);
    expect(updatedP1?.doubles_dubr).toBe(3.58);
    expect(updatedP1?.matches_played).toBe(1);
  });

  it('leaves matches PENDING when network drops during sync transmission', async () => {
    const match1: MatchRecord = {
      id: 'match-offline-uuid',
      club_night_id: clubNightId,
      recorded_at: '2026-11-21T10:00:00Z',
      sequence_num: 1,
      court_id: 1,
      discipline: 'DOUBLES',
      format: 'SINGLE_30',
      team_a_player_ids: ['p1', 'p2'],
      team_b_player_ids: ['p3', 'p4'],
      team_a_scores: [30],
      team_b_scores: [25],
      status: 'PENDING',
    };
    await storageService.saveMatch(match1);

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new Error('Failed to fetch: Network unreachable')
    );

    await expect(syncService.syncPendingMatches(clubNightId)).rejects.toThrow(
      'Network unreachable'
    );

    const pendingAfter = await storageService.getPendingMatches();
    expect(pendingAfter).toHaveLength(1);
    expect(pendingAfter[0]?.id).toBe('match-offline-uuid');
    expect(pendingAfter[0]?.status).toBe('PENDING');
  });

  it('marks duplicate matches as SYNCED without altering storage negatively', async () => {
    const match1: MatchRecord = {
      id: 'match-dup-uuid',
      club_night_id: clubNightId,
      recorded_at: '2026-11-21T10:00:00Z',
      sequence_num: 1,
      court_id: 1,
      discipline: 'DOUBLES',
      format: 'SINGLE_30',
      team_a_player_ids: ['p1', 'p2'],
      team_b_player_ids: ['p3', 'p4'],
      team_a_scores: [30],
      team_b_scores: [25],
      status: 'PENDING',
    };
    await storageService.saveMatch(match1);

    const mockResponse = {
      synced_count: 0,
      ignored_duplicates_count: 1,
      status: 'success',
      deltas: {},
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const result = await syncService.syncPendingMatches(clubNightId);

    expect(result.syncedCount).toBe(0);
    expect(result.ignoredDuplicatesCount).toBe(1);

    const pendingAfter = await storageService.getPendingMatches();
    expect(pendingAfter).toHaveLength(0);
  });
});
