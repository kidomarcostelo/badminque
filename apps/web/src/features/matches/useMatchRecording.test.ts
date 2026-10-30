import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MatchRecordingResult, RosterPlayer } from '@badminque/core';
import { storageService } from '../../services/storageService';
import { useMatchRecording } from './useMatchRecording';

describe('useMatchRecording', () => {
  beforeEach(async () => {
    await storageService.clearAll();
  });

  const createPlayer = (id: string, name: string): RosterPlayer => ({
    id,
    name,
    auth_user_id: null,
    singles_rating: 1500.0,
    doubles_rating: 1500.0,
    matches_played: 0,
    status: 'QUEUED',
    checked_in_at: new Date().toISOString(),
  });

  it('records a completed match score and updates player ratings in storage', async () => {
    const p1 = createPlayer('p1', 'Alice');
    const p2 = createPlayer('p2', 'Bob');
    const p3 = createPlayer('p3', 'Charlie');
    const p4 = createPlayer('p4', 'Dave');

    await storageService.savePlayer(p1);
    await storageService.savePlayer(p2);
    await storageService.savePlayer(p3);
    await storageService.savePlayer(p4);

    const { result } = renderHook(() => useMatchRecording());

    let matchResult: MatchRecordingResult | undefined;
    await act(async () => {
      matchResult = await result.current.recordMatchScore({
        courtId: 1,
        clubNightId: 'club-night-1',
        discipline: 'DOUBLES',
        format: 'SINGLE_21',
        teamAPlayers: [p1, p2],
        teamBPlayers: [p3, p4],
        teamAScores: [21],
        teamBScores: [19],
      });
    });

    expect(matchResult).toBeDefined();
    expect(matchResult?.match.status).toBe('PENDING');
    expect(matchResult?.deltas).toHaveLength(4);

    // Winner deltas > 0
    const deltaA1 = matchResult?.deltas.find((d) => d.player_id === 'p1');
    expect(deltaA1?.dubr_delta).toBeGreaterThan(0);
    expect(deltaA1?.is_provisional).toBe(true);

    // Loser deltas < 0
    const deltaB1 = matchResult?.deltas.find((d) => d.player_id === 'p3');
    expect(deltaB1?.dubr_delta).toBeLessThan(0);

    // Verify storage updates
    const storedRoster = await storageService.getRoster();
    const storedP1 = storedRoster.find((p) => p.id === 'p1');
    const storedP3 = storedRoster.find((p) => p.id === 'p3');

    expect(storedP1?.doubles_rating).toBe(deltaA1?.post_rating);
    expect(storedP1?.matches_played).toBe(1);
    expect(storedP1?.status).toBe('RESTING');

    expect(storedP3?.doubles_rating).toBe(deltaB1?.post_rating);
    expect(storedP3?.matches_played).toBe(1);

    // Verify pending match in storage
    const pendingMatches = await storageService.getPendingMatches();
    expect(pendingMatches).toHaveLength(1);
    expect(pendingMatches[0]?.id).toBe(matchResult?.match.id);
  });

  it('exposes lastMatchOutcome and allows clearing', async () => {
    const p1 = createPlayer('p1', 'Alice');
    const p2 = createPlayer('p2', 'Bob');
    const p3 = createPlayer('p3', 'Charlie');
    const p4 = createPlayer('p4', 'Dave');

    const { result } = renderHook(() => useMatchRecording());

    expect(result.current.lastMatchOutcome).toBeNull();

    await act(async () => {
      await result.current.recordMatchScore({
        courtId: 2,
        clubNightId: 'club-night-1',
        discipline: 'DOUBLES',
        format: 'SINGLE_21',
        teamAPlayers: [p1, p2],
        teamBPlayers: [p3, p4],
        teamAScores: [21],
        teamBScores: [5],
      });
    });

    expect(result.current.lastMatchOutcome).not.toBeNull();
    expect(result.current.lastMatchOutcome?.deltas[0]?.rating_delta).toBeGreaterThan(30);

    act(() => {
      result.current.clearOutcome();
    });

    expect(result.current.lastMatchOutcome).toBeNull();
  });

  it('records a singles match without discipline bleeding into doubles', async () => {
    const s1 = createPlayer('s1', 'Singles Alice');
    const s2 = createPlayer('s2', 'Singles Bob');

    await storageService.savePlayer(s1);
    await storageService.savePlayer(s2);

    const { result } = renderHook(() => useMatchRecording());

    let matchResult: MatchRecordingResult | undefined;
    await act(async () => {
      matchResult = await result.current.recordMatchScore({
        courtId: 3,
        clubNightId: 'club-night-1',
        discipline: 'SINGLES',
        format: 'SINGLE_21',
        teamAPlayers: [s1],
        teamBPlayers: [s2],
        teamAScores: [21],
        teamBScores: [17],
      });
    });

    expect(matchResult?.match.discipline).toBe('SINGLES');
    expect(matchResult?.match.team_a_player_ids).toEqual(['s1']);
    expect(matchResult?.match.team_b_player_ids).toEqual(['s2']);
    expect(matchResult?.deltas).toHaveLength(2);

    const deltaS1 = matchResult?.deltas.find((d) => d.player_id === 's1');
    expect(deltaS1?.rating_delta).toBeGreaterThan(0);

    const storedRoster = await storageService.getRoster();
    const storedS1 = storedRoster.find((p) => p.id === 's1');
    // singles_rating updated, doubles_rating untouched
    expect(storedS1?.singles_rating).toBe(deltaS1?.post_rating);
    expect(storedS1?.doubles_rating).toBe(1500.0);
  });
});
