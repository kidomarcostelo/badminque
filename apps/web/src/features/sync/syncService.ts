import type { RosterPlayer } from '@badminque/core';
import { storageService } from '../../services/storageService';

export interface PlayerDeltaResponse {
  player_id: string;
  player_name: string;
  pre_rating: number;
  post_rating: number;
  rating_delta: number;
  pre_dubr: number;
  post_dubr: number;
  dubr_delta: number;
  k_factor: number;
  rd_after: number;
  is_provisional: boolean;
  matches_played_after: number;
}

export interface SyncResult {
  syncedCount: number;
  ignoredDuplicatesCount: number;
  status: 'success' | 'partial' | 'error';
  deltas: Record<string, PlayerDeltaResponse[]>;
}

export interface SyncOptions {
  clubId?: string;
  apiUrl?: string;
}

export class SyncService {
  private getApiUrl(options?: SyncOptions): string {
    const base = options?.apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return `${base.replace(/\/$/, '')}/api/v1/sync/batch`;
  }

  public async syncPendingMatches(
    clubNightId: string,
    options?: SyncOptions
  ): Promise<SyncResult> {
    const pendingMatches = await storageService.getPendingMatches();
    const matchesForNight = pendingMatches.filter(
      (m) => m.club_night_id === clubNightId
    );

    if (matchesForNight.length === 0) {
      return {
        syncedCount: 0,
        ignoredDuplicatesCount: 0,
        status: 'success',
        deltas: {},
      };
    }

    const payload = {
      club_night_id: clubNightId,
      matches: matchesForNight,
    };

    const url = this.getApiUrl(options);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Sync failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const batchIds = matchesForNight.map((m) => m.id);

    // 1. Mark batch matches as synced in IndexedDB
    await storageService.markMatchesSynced(batchIds);

    // 2. Reconcile player rating deltas if authoritative server returned them
    if (data.deltas && typeof data.deltas === 'object') {
      const roster = await storageService.getRoster();
      const playerMap = new Map<string, RosterPlayer>(
        roster.map((player) => [player.id, player])
      );

      for (const matchDeltas of Object.values(data.deltas)) {
        if (!Array.isArray(matchDeltas)) {
          continue;
        }

        for (const delta of matchDeltas as PlayerDeltaResponse[]) {
          const player = playerMap.get(delta.player_id);
          if (!player) {
            continue;
          }

          const updatedPlayer: RosterPlayer = {
            ...player,
            doubles_rating: delta.post_rating,
            doubles_dubr: delta.post_dubr,
            matches_played: delta.matches_played_after,
          };

          playerMap.set(player.id, updatedPlayer);
          await storageService.savePlayer(updatedPlayer);
        }
      }
    }

    return {
      syncedCount: data.synced_count ?? matchesForNight.length,
      ignoredDuplicatesCount: data.ignored_duplicates_count ?? 0,
      status: data.status ?? 'success',
      deltas: data.deltas ?? {},
    };
  }
}

export const syncService = new SyncService();
