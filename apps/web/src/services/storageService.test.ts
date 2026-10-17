import { beforeEach, describe, expect, it } from 'vitest';
import type { MatchRecord, RosterPlayer } from '@badminque/core';
import {
  storageService,
  closeDatabaseConnection,
} from './storageService';

describe('IndexedDBStorageService', () => {
  beforeEach(async () => {
    closeDatabaseConnection();
    await storageService.clearAll();
  });

  it('persists and retrieves roster players', async () => {
    const testPlayer: RosterPlayer = {
      id: 'player-uuid-1',
      name: 'Alice Tan',
      auth_user_id: null,
      singles_rating: 1500,
      doubles_rating: 1520,
      matches_played: 4,
      status: 'QUEUED',
      checked_in_at: new Date().toISOString(),
    };

    await storageService.upsertRosterPlayer(testPlayer);
    const roster = await storageService.getRoster();

    expect(roster).toHaveLength(1);
    expect(roster[0]?.id).toBe('player-uuid-1');
    expect(roster[0]?.name).toBe('Alice Tan');
    expect(roster[0]?.auth_user_id).toBeNull();
  });

  it('saves matches and retrieves pending matches ordered by sequence_num', async () => {
    const matchSecond: MatchRecord = {
      id: 'match-uuid-2',
      club_night_id: 'club-night-1',
      recorded_at: '2026-10-17T20:30:00Z',
      sequence_num: 2,
      court_id: 2,
      discipline: 'DOUBLES',
      format: 'SINGLE_30',
      team_a_player_ids: ['p1', 'p2'],
      team_b_player_ids: ['p3', 'p4'],
      team_a_scores: [30],
      team_b_scores: [24],
      status: 'PENDING',
    };

    const matchFirst: MatchRecord = {
      id: 'match-uuid-1',
      club_night_id: 'club-night-1',
      recorded_at: '2026-10-17T20:15:00Z',
      sequence_num: 1,
      court_id: 1,
      discipline: 'DOUBLES',
      format: 'SINGLE_30',
      team_a_player_ids: ['p5', 'p6'],
      team_b_player_ids: ['p7', 'p8'],
      team_a_scores: [30],
      team_b_scores: [28],
      status: 'PENDING',
    };

    await storageService.saveMatch(matchSecond);
    await storageService.saveMatch(matchFirst);

    const pendingMatches = await storageService.getPendingMatches();
    expect(pendingMatches).toHaveLength(2);
    expect(pendingMatches[0]?.id).toBe('match-uuid-1');
    expect(pendingMatches[1]?.id).toBe('match-uuid-2');
  });

  it('marks pending matches as SYNCED', async () => {
    const match: MatchRecord = {
      id: 'match-uuid-sync',
      club_night_id: 'club-night-1',
      recorded_at: '2026-10-17T20:45:00Z',
      sequence_num: 3,
      court_id: 3,
      discipline: 'DOUBLES',
      format: 'SINGLE_30',
      team_a_player_ids: ['p1', 'p3'],
      team_b_player_ids: ['p2', 'p4'],
      team_a_scores: [30],
      team_b_scores: [26],
      status: 'PENDING',
    };

    await storageService.saveMatch(match);
    let pendingMatches = await storageService.getPendingMatches();
    expect(pendingMatches).toHaveLength(1);

    await storageService.markMatchesSynced(['match-uuid-sync']);
    pendingMatches = await storageService.getPendingMatches();
    expect(pendingMatches).toHaveLength(0);
  });

  it('clears all data when clearAll is called', async () => {
    const player: RosterPlayer = {
      id: 'player-uuid-clear',
      name: 'Bob Tan',
      auth_user_id: null,
      singles_rating: 1500,
      doubles_rating: 1500,
      matches_played: 0,
      status: 'QUEUED',
      checked_in_at: new Date().toISOString(),
    };

    await storageService.upsertRosterPlayer(player);
    let roster = await storageService.getRoster();
    expect(roster).toHaveLength(1);

    await storageService.clearAll();
    roster = await storageService.getRoster();
    expect(roster).toHaveLength(0);
  });
});
