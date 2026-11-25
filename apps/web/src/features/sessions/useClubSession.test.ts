import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  closeDatabaseConnection,
  storageService,
} from '../../services/storageService';
import { useClubSession } from './useClubSession';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('useClubSession', () => {
  const originalOnLine = navigator.onLine;

  beforeEach(async () => {
    closeDatabaseConnection();
    await storageService.clearAll();
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      configurable: true,
    });
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('auto-initializes an offline session with valid UUID v4 club and club night IDs', async () => {
    const { result } = renderHook(() => useClubSession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeSession.club_id).toMatch(UUID_V4_REGEX);
    expect(result.current.activeSession.id).toMatch(UUID_V4_REGEX);
    expect(result.current.activeSession.id).not.toBe('default-club-night');

    const stored = await storageService.getActiveSession();
    expect(stored?.id).toBe(result.current.activeSession.id);
  });

  it('creates a new Club Night locally when offline and syncs idempotently via ensureSessionSynced', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.badminque.test');
    const { result } = renderHook(() => useClubSession());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.createSession({
        clubName: 'Smashers Arena',
        date: '2026-11-25',
      });
    });

    expect(result.current.activeSession.club_name).toBe('Smashers Arena');
    expect(result.current.activeSession.sync_status).toBe('PENDING');

    // Bring online and trigger reconciliation
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    const origFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      await act(async () => {
        await result.current.ensureSessionSynced();
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.badminque.test/api/v1/clubs',
        expect.objectContaining({ method: 'POST' })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        `https://api.badminque.test/api/v1/clubs/${result.current.activeSession.club_id}/nights`,
        expect.objectContaining({ method: 'POST' })
      );
      expect(result.current.activeSession.sync_status).toBe('SYNCED');
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
