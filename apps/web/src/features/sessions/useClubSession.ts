'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Club, ClubNightSession } from '@badminque/core';
import { buildApiUrl } from '../../services/apiClient';
import { storageService } from '../../services/storageService';

export interface CreateClubSessionParams {
  clubName: string;
  date: string;
}

export interface UseClubSessionResult {
  activeSession: ClubNightSession;
  sessions: ClubNightSession[];
  isLoading: boolean;
  selectSession: (session: ClubNightSession) => Promise<void>;
  createSession: (params: CreateClubSessionParams) => Promise<ClubNightSession>;
  ensureSessionSynced: () => Promise<void>;
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildLocalSession(
  clubName = 'Badminque Club',
  date = getTodayIsoDate()
): ClubNightSession {
  return {
    id: crypto.randomUUID(),
    club_id: crypto.randomUUID(),
    club_name: clubName.trim() || 'Badminque Club',
    date,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    sync_status: 'PENDING',
  };
}

const INITIAL_PLACEHOLDER_SESSION: ClubNightSession = buildLocalSession();

export function useClubSession(): UseClubSessionResult {
  const [activeSession, setActiveSession] = useState<ClubNightSession>(
    INITIAL_PLACEHOLDER_SESSION
  );
  const [sessions, setSessions] = useState<ClubNightSession[]>([
    INITIAL_PLACEHOLDER_SESSION,
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const userSelectedRef = useRef<boolean>(false);

  const pushSessionRemote = useCallback(
    async (session: ClubNightSession): Promise<boolean> => {
      if (typeof navigator === 'undefined' || !navigator.onLine) {
        return false;
      }

      const clubRes = await fetch(buildApiUrl('/api/v1/clubs'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: session.club_id,
          name: session.club_name,
        }),
      });
      if (!clubRes.ok) {
        return false;
      }

      const nightRes = await fetch(
        buildApiUrl(`/api/v1/clubs/${session.club_id}/nights`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: session.id,
            club_id: session.club_id,
            date: session.date,
            status: session.status,
          }),
        }
      );
      return nightRes.ok;
    },
    []
  );

  const loadSessions = useCallback(async (): Promise<void> => {
    try {
      let currentActive = await storageService.getActiveSession();
      if (!currentActive) {
        currentActive = buildLocalSession();
        await storageService.saveActiveSession(currentActive);
      }

      const savedList = await storageService.listSavedSessions();
      const sessionMap = new Map<string, ClubNightSession>(
        savedList.map((s) => [s.id, s])
      );
      sessionMap.set(currentActive.id, currentActive);

      if (!userSelectedRef.current) {
        setActiveSession(currentActive);
      }
      setSessions(
        Array.from(sessionMap.values()).sort((a, b) =>
          b.created_at.localeCompare(a.created_at)
        )
      );

      // Hydrate remote clubs and nights when online (merges into session list without clobbering activeSession)
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const clubsRes = await fetch(buildApiUrl('/api/v1/clubs'));
          if (clubsRes.ok) {
            const clubs = (await clubsRes.json()) as Club[];
            for (const club of clubs.slice(0, 10)) {
              const nightsRes = await fetch(
                buildApiUrl(`/api/v1/clubs/${club.id}/nights`)
              );
              if (!nightsRes.ok) {
                continue;
              }
              const nights = (await nightsRes.json()) as Array<{
                id: string;
                club_id: string;
                date: string;
                status: 'ACTIVE' | 'CLOSED';
                created_at: string;
              }>;
              for (const night of nights) {
                if (!sessionMap.has(night.id)) {
                  sessionMap.set(night.id, {
                    ...night,
                    club_name: club.name,
                    sync_status: 'SYNCED',
                  });
                }
              }
            }
            setSessions(
              Array.from(sessionMap.values()).sort((a, b) =>
                b.created_at.localeCompare(a.created_at)
              )
            );
          }
        } catch {
          // Offline or API unreachable: retain local IndexedDB sessions
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const selectSession = useCallback(
    async (session: ClubNightSession): Promise<void> => {
      userSelectedRef.current = true;
      await storageService.saveActiveSession(session);
      setActiveSession(session);
      setSessions((prev) => {
        const map = new Map(prev.map((s) => [s.id, s]));
        map.set(session.id, session);
        return Array.from(map.values()).sort((a, b) =>
          b.created_at.localeCompare(a.created_at)
        );
      });
    },
    []
  );

  const createSession = useCallback(
    async (params: CreateClubSessionParams): Promise<ClubNightSession> => {
      userSelectedRef.current = true;
      const nextSession = buildLocalSession(params.clubName, params.date);
      let finalSession = nextSession;

      try {
        const synced = await pushSessionRemote(nextSession);
        if (synced) {
          finalSession = { ...nextSession, sync_status: 'SYNCED' };
        }
      } catch {
        // Offline fallback keeps sync_status: 'PENDING'
      }

      await storageService.saveActiveSession(finalSession);
      setActiveSession(finalSession);
      setSessions((prev) => [
        finalSession,
        ...prev.filter((s) => s.id !== finalSession.id),
      ]);
      return finalSession;
    },
    [pushSessionRemote]
  );

  const ensureSessionSynced = useCallback(async (): Promise<void> => {
    if (activeSession.sync_status === 'SYNCED') {
      return;
    }

    try {
      const synced = await pushSessionRemote(activeSession);
      if (synced) {
        const syncedSession: ClubNightSession = {
          ...activeSession,
          sync_status: 'SYNCED',
        };
        await storageService.saveActiveSession(syncedSession);
        setActiveSession(syncedSession);
        setSessions((prev) =>
          prev.map((s) => (s.id === syncedSession.id ? syncedSession : s))
        );
      }
    } catch {
      // Offline or unreachable: sync batch handler handles failure feedback
    }
  }, [activeSession, pushSessionRemote]);

  return {
    activeSession,
    sessions,
    isLoading,
    selectSession,
    createSession,
    ensureSessionSynced,
  };
}
