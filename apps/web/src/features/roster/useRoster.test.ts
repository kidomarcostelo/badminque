import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('generates valid RFC 4122 UUID v4 for newly checked-in player', async () => {
    const { result } = renderHook(() => useRoster());

    const resultHolder: { player: RosterPlayer | null } = { player: null };
    await act(async () => {
      resultHolder.player = await result.current.checkInPlayer('Chou Tien Chen');
    });

    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(resultHolder.player?.id).toMatch(uuidV4Regex);
  });

  it('syncs remote club roster into IndexedDB when clubId is provided', async () => {
    const clubId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    const remotePlayers: Partial<RosterPlayer>[] = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Kento Momota',
        club_id: clubId,
        singles_rating: 1550,
        doubles_rating: 1550,
        matches_played: 5,
        status: 'QUEUED',
      },
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => remotePlayers,
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      const { result } = renderHook(() => useRoster(clubId));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(mockFetch).toHaveBeenCalledWith(`/api/v1/clubs/${clubId}/players`);
      const stored = await storageService.getRoster();
      expect(stored.some((p) => p.name === 'Kento Momota')).toBe(true);
      expect(result.current.roster.some((p) => p.name === 'Kento Momota')).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
