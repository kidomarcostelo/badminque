import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_RATING_BASELINE, type RosterPlayer } from '@badminque/core';
import { storageService, closeDatabaseConnection } from '../../services/storageService';
import { useRoster } from './useRoster';

describe('useRoster', () => {
  beforeEach(async () => {
    closeDatabaseConnection();
    await storageService.clearAll();
  });

  it('checks in a new player and immediately stores in IndexedDB', async () => {
    const { result } = renderHook(() => useRoster());

    const resultHolder: { player: RosterPlayer | null } = { player: null };
    await act(async () => {
      resultHolder.player = await result.current.checkInPlayer('Hendra Setiawan');
    });

    const player = resultHolder.player;
    expect(player).not.toBeNull();
    expect(player?.name).toBe('Hendra Setiawan');
    expect(player?.singles_rating).toBe(INITIAL_RATING_BASELINE);
    expect(player?.doubles_rating).toBe(INITIAL_RATING_BASELINE);
    expect(player?.status).toBe('QUEUED');
    expect(player?.matches_played).toBe(0);
    expect(player?.id).toBeDefined();

    // Verify stored in IndexedDB
    const stored = await storageService.getRoster();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).toBe(player?.id);

    // Verify hook state is updated
    expect(result.current.roster).toHaveLength(1);
    expect(result.current.roster[0]?.name).toBe('Hendra Setiawan');
  });

  it('provides typeahead suggestions matching existing roster players', async () => {
    const { result } = renderHook(() => useRoster());

    await act(async () => {
      await result.current.checkInPlayer('Alice Tan');
      await result.current.checkInPlayer('Alvin Lim');
      await result.current.checkInPlayer('Bob Dylan');
    });

    expect(result.current.roster).toHaveLength(3);

    // No search query -> suggestions are empty, filteredRoster has all 3
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.filteredRoster).toHaveLength(3);

    // Type "al"
    act(() => {
      result.current.setSearchQuery('al');
    });

    expect(result.current.suggestions).toHaveLength(2);
    expect(result.current.suggestions.map((p) => p.name)).toEqual(['Alice Tan', 'Alvin Lim']);
    expect(result.current.filteredRoster).toHaveLength(2);

    // Type non-matching "xyz"
    act(() => {
      result.current.setSearchQuery('xyz');
    });

    expect(result.current.suggestions).toHaveLength(0);
    expect(result.current.filteredRoster).toHaveLength(0);
  });

  it('updates player status in IndexedDB and local state', async () => {
    const { result } = renderHook(() => useRoster());

    const resultHolder: { player: RosterPlayer | null } = { player: null };
    await act(async () => {
      resultHolder.player = await result.current.checkInPlayer('Viktor Axelsen');
    });

    const playerId = resultHolder.player?.id ?? '';
    await act(async () => {
      await result.current.updatePlayerStatus(playerId, 'PLAYING');
    });

    expect(result.current.roster[0]?.status).toBe('PLAYING');
    const stored = await storageService.getRoster();
    expect(stored[0]?.status).toBe('PLAYING');
  });
});
