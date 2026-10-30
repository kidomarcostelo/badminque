import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RosterPlayer } from '@badminque/core';
import { closeDatabaseConnection, storageService } from '../../services/storageService';
import { useCourts } from './useCourts';

function createMockPlayer(id: string, name: string, rating: number = 1500): RosterPlayer {
  return {
    id,
    name,
    auth_user_id: null,
    singles_rating: rating,
    doubles_rating: rating,
    matches_played: 0,
    status: 'QUEUED',
    checked_in_at: '2026-10-30T10:00:00Z',
  };
}

describe('useCourts', () => {
  beforeEach(async () => {
    closeDatabaseConnection();
    await storageService.clearAll();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes 3 courts in IDLE state', () => {
    const { result } = renderHook(() => useCourts({ roster: [] }));

    expect(result.current.courts).toHaveLength(3);
    expect(result.current.courts[0]?.courtId).toBe(1);
    expect(result.current.courts[0]?.state).toBe('IDLE');
    expect(result.current.courts[1]?.courtId).toBe(2);
    expect(result.current.courts[1]?.state).toBe('IDLE');
    expect(result.current.courts[2]?.courtId).toBe(3);
    expect(result.current.courts[2]?.state).toBe('IDLE');
  });

  it('dispatches court from IDLE directly into IN_MATCH when >= 4 players queued', async () => {
    const mockPlayers = [
      createMockPlayer('p1', 'Player 1', 1600),
      createMockPlayer('p2', 'Player 2', 1550),
      createMockPlayer('p3', 'Player 3', 1500),
      createMockPlayer('p4', 'Player 4', 1450),
    ];

    for (const player of mockPlayers) {
      await storageService.savePlayer(player);
    }

    const { result } = renderHook(() => useCourts({ roster: mockPlayers }));

    await act(async () => {
      await result.current.dispatchCourt(1);
    });

    const court1 = result.current.courts[0];
    expect(court1?.state).toBe('IN_MATCH');
    expect(court1?.teamA).not.toBeNull();
    expect(court1?.teamB).not.toBeNull();

    // Verify all 4 players persisted as PLAYING in storage
    const stored = await storageService.getRoster();
    const playing = stored.filter((p) => p.status === 'PLAYING');
    expect(playing).toHaveLength(4);
  });

  it('increments elapsed timer every second for active courts', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });

    const mockPlayers = [
      createMockPlayer('p1', 'Player 1', 1600),
      createMockPlayer('p2', 'Player 2', 1550),
      createMockPlayer('p3', 'Player 3', 1500),
      createMockPlayer('p4', 'Player 4', 1450),
    ];

    const { result } = renderHook(() => useCourts({ roster: mockPlayers }));

    // Manually stage and dispatch
    act(() => {
      result.current.stageCustomMatch(
        1,
        [mockPlayers[0]!, mockPlayers[1]!],
        [mockPlayers[2]!, mockPlayers[3]!]
      );
    });

    expect(result.current.courts[0]?.state).toBe('PROPOSED');

    await act(async () => {
      await result.current.dispatchCourt(1);
    });

    expect(result.current.courts[0]?.state).toBe('IN_MATCH');
    expect(result.current.courts[0]?.elapsedSeconds).toBe(0);

    // Fast forward 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.courts[0]?.elapsedSeconds).toBe(5);

    vi.useRealTimers();
  });

  it('transitions state machine to SCORE_ENTRY and back to IN_MATCH on cancel', async () => {
    const mockPlayers = [
      createMockPlayer('p1', 'Player 1'),
      createMockPlayer('p2', 'Player 2'),
      createMockPlayer('p3', 'Player 3'),
      createMockPlayer('p4', 'Player 4'),
    ];

    const { result } = renderHook(() => useCourts({ roster: mockPlayers }));

    await act(async () => {
      result.current.stageCustomMatch(
        1,
        [mockPlayers[0]!, mockPlayers[1]!],
        [mockPlayers[2]!, mockPlayers[3]!]
      );
      await result.current.dispatchCourt(1);
    });

    expect(result.current.courts[0]?.state).toBe('IN_MATCH');

    act(() => {
      result.current.openScoreModal(1);
    });

    expect(result.current.courts[0]?.state).toBe('SCORE_ENTRY');
    expect(result.current.activeScoreCourt?.courtId).toBe(1);

    act(() => {
      result.current.closeScoreModal();
    });

    expect(result.current.courts[0]?.state).toBe('IN_MATCH');
    expect(result.current.activeScoreCourt).toBeNull();
  });

  it('applies Badminton Stamina Invariant on score submit: RESTING, matches_played += 1, and court transitions to PROPOSED if queue has >= 4 players', async () => {
    const mockPlayers = [
      // 4 on-court players
      createMockPlayer('p1', 'Player 1', 1600),
      createMockPlayer('p2', 'Player 2', 1580),
      createMockPlayer('p3', 'Player 3', 1540),
      createMockPlayer('p4', 'Player 4', 1520),
      // 4 waiting queued players
      createMockPlayer('p5', 'Player 5', 1620),
      createMockPlayer('p6', 'Player 6', 1590),
      createMockPlayer('p7', 'Player 7', 1550),
      createMockPlayer('p8', 'Player 8', 1510),
    ];

    for (const player of mockPlayers) {
      await storageService.savePlayer(player);
    }

    const { result } = renderHook(() => useCourts({ roster: mockPlayers }));

    // Stage and dispatch match on court 1
    await act(async () => {
      result.current.stageCustomMatch(
        1,
        [mockPlayers[0]!, mockPlayers[1]!],
        [mockPlayers[2]!, mockPlayers[3]!]
      );
      await result.current.dispatchCourt(1);
    });

    expect(result.current.courts[0]?.state).toBe('IN_MATCH');

    // Submit score: Pair A wins 30 - 25
    await act(async () => {
      result.current.openScoreModal(1);
      await result.current.submitScore(1, 'A', 30, 25);
    });

    // 1. All 4 finished players must be RESTING with matches_played = 1
    const storedRoster = await storageService.getRoster();
    const finishedPlayers = storedRoster.filter((p) =>
      ['p1', 'p2', 'p3', 'p4'].includes(p.id)
    );

    expect(finishedPlayers).toHaveLength(4);
    for (const player of finishedPlayers) {
      expect(player.status).toBe('RESTING');
      expect(player.matches_played).toBe(1);
    }

    // Winners (p1, p2) gained rating
    const p1 = finishedPlayers.find((p) => p.id === 'p1');
    expect(p1?.doubles_rating).toBeGreaterThan(1600);

    // Losers (p3, p4) lost rating
    const p3 = finishedPlayers.find((p) => p.id === 'p3');
    expect(p3?.doubles_rating).toBeLessThan(1540);

    // 2. Cleared court transitions to PROPOSED because p5..p8 are queued
    const court1After = result.current.courts[0];
    expect(court1After?.state).toBe('PROPOSED');
    expect(court1After?.teamA).not.toBeNull();
    expect(court1After?.teamB).not.toBeNull();

    // 3. Match was saved to IndexedDB
    const pendingMatches = await storageService.getPendingMatches();
    expect(pendingMatches).toHaveLength(1);
    expect(pendingMatches[0]?.court_id).toBe(1);
    expect(pendingMatches[0]?.team_a_scores).toEqual([30]);
    expect(pendingMatches[0]?.team_b_scores).toEqual([25]);
  });

  it('transitions cleared court to IDLE if fewer than 4 queued players remain', async () => {
    // Only 4 players in total, so 0 queued players remain after match
    const mockPlayers = [
      createMockPlayer('p1', 'Player 1', 1600),
      createMockPlayer('p2', 'Player 2', 1580),
      createMockPlayer('p3', 'Player 3', 1540),
      createMockPlayer('p4', 'Player 4', 1520),
    ];

    for (const player of mockPlayers) {
      await storageService.savePlayer(player);
    }

    const { result } = renderHook(() => useCourts({ roster: mockPlayers }));

    await act(async () => {
      result.current.stageCustomMatch(
        1,
        [mockPlayers[0]!, mockPlayers[1]!],
        [mockPlayers[2]!, mockPlayers[3]!]
      );
      await result.current.dispatchCourt(1);
    });

    await act(async () => {
      result.current.openScoreModal(1);
      await result.current.submitScore(1, 'A', 30, 20);
    });

    // Cleared court transitions to IDLE because no queued players remain
    const court1After = result.current.courts[0];
    expect(court1After?.state).toBe('IDLE');
    expect(court1After?.teamA).toBeNull();
    expect(court1After?.teamB).toBeNull();
  });
});
