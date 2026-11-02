import { describe, expect, it } from 'vitest';
import type { MatchRecord } from '../types';
import { buildCoPlayHistory, CoPlayHistoryTracker } from './coPlayHistory';

function createMatch(
  id: string,
  seq: number,
  teamAIds: string[],
  teamBIds: string[]
): MatchRecord {
  return {
    id,
    club_night_id: 'club-night-1',
    recorded_at: '2026-10-30T10:00:00.000Z',
    sequence_num: seq,
    court_id: 1,
    discipline: 'DOUBLES',
    format: 'SINGLE_30',
    team_a_player_ids: teamAIds,
    team_b_player_ids: teamBIds,
    team_a_scores: [30],
    team_b_scores: [20],
    status: 'SYNCED',
  };
}

describe('CoPlayHistoryTracker', () => {
  it('returns 0 counts and -1 last match indices when history is empty', () => {
    const tracker = new CoPlayHistoryTracker();
    expect(tracker.getPartnerCount('p1', 'p2')).toBe(0);
    expect(tracker.getOpponentCount('p1', 'p3')).toBe(0);
    expect(tracker.getLastPartnerMatchIndex('p1', 'p2')).toBe(-1);
    expect(tracker.getLastOpponentMatchIndex('p1', 'p3')).toBe(-1);
    expect(tracker.getTotalMatches()).toBe(0);
  });

  it('tracks partnerships and oppositions symmetrically', () => {
    const matches: MatchRecord[] = [
      createMatch('m1', 1, ['p1', 'p2'], ['p3', 'p4']),
      createMatch('m2', 2, ['p1', 'p3'], ['p2', 'p4']),
    ];

    const history = buildCoPlayHistory(matches);

    // In match 1: p1 & p2 are partners
    // In match 2: p1 & p3 are partners
    expect(history.getPartnerCount('p1', 'p2')).toBe(1);
    expect(history.getPartnerCount('p2', 'p1')).toBe(1);
    expect(history.getLastPartnerMatchIndex('p1', 'p2')).toBe(1);

    expect(history.getPartnerCount('p1', 'p3')).toBe(1);
    expect(history.getLastPartnerMatchIndex('p1', 'p3')).toBe(2);

    // Oppositions: in match 1, p1 vs p3 and p1 vs p4
    // In match 2, p1 vs p2 and p1 vs p4
    expect(history.getOpponentCount('p1', 'p4')).toBe(2);
    expect(history.getLastOpponentMatchIndex('p1', 'p4')).toBe(2);

    expect(history.getOpponentCount('p1', 'p2')).toBe(1);
    expect(history.getLastOpponentMatchIndex('p1', 'p2')).toBe(2);

    expect(history.getTotalMatches()).toBe(2);
  });

  it('ignores self-pairings gracefully', () => {
    const tracker = new CoPlayHistoryTracker();
    expect(tracker.getPartnerCount('p1', 'p1')).toBe(0);
    expect(tracker.getOpponentCount('p1', 'p1')).toBe(0);
  });
});
