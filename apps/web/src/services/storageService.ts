import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  MatchRecord,
  RosterPlayer,
  StorageAdapter,
  SyncStatus,
} from '@badminque/core';

export const DATABASE_NAME = 'badminque_offline_db' as const;
export const DATABASE_VERSION = 2 as const;

interface BadminqueDBSchema extends DBSchema {
  matches: {
    key: string;
    value: MatchRecord;
    indexes: {
      by_status: SyncStatus;
      by_recorded_at: string;
    };
  };
  roster: {
    key: string;
    value: RosterPlayer;
    indexes: {
      by_status: string;
    };
  };
}

let databaseInstance: IDBPDatabase<BadminqueDBSchema> | null = null;

export async function getDatabaseConnection(): Promise<IDBPDatabase<BadminqueDBSchema>> {
  if (databaseInstance) {
    return databaseInstance;
  }

  databaseInstance = await openDB<BadminqueDBSchema>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database, _oldVersion, _newVersion, transaction) {
      if (!database.objectStoreNames.contains('matches')) {
        const matchStore = database.createObjectStore('matches', { keyPath: 'id' });
        matchStore.createIndex('by_status', 'status');
        matchStore.createIndex('by_recorded_at', 'recorded_at');
      }

      if (!database.objectStoreNames.contains('roster')) {
        const rosterStore = database.createObjectStore('roster', { keyPath: 'id' });
        rosterStore.createIndex('by_status', 'status');
      } else {
        const rosterStore = transaction.objectStore('roster');
        if (!rosterStore.indexNames.contains('by_status')) {
          rosterStore.createIndex('by_status', 'status');
        }
      }
    },
  });

  return databaseInstance;
}

export function closeDatabaseConnection(): void {
  if (!databaseInstance) {
    return;
  }
  databaseInstance.close();
  databaseInstance = null;
}

export class IndexedDBStorageService implements StorageAdapter {
  public async saveMatch(match: MatchRecord): Promise<void> {
    const database = await getDatabaseConnection();
    await database.put('matches', match);
  }

  public async getPendingMatches(): Promise<MatchRecord[]> {
    const database = await getDatabaseConnection();
    const matches = await database.getAllFromIndex('matches', 'by_status', 'PENDING');
    return matches.sort((firstMatch, secondMatch) => {
      return firstMatch.sequence_num - secondMatch.sequence_num;
    });
  }

  public async markMatchesSynced(matchIds: string[]): Promise<void> {
    if (matchIds.length === 0) {
      return;
    }

    const database = await getDatabaseConnection();
    const transaction = database.transaction('matches', 'readwrite');
    const store = transaction.objectStore('matches');

    for (const matchId of matchIds) {
      const match = await store.get(matchId);
      if (match) {
        match.status = 'SYNCED';
        await store.put(match);
      }
    }

    await transaction.done;
  }

  public async getRoster(): Promise<RosterPlayer[]> {
    const database = await getDatabaseConnection();
    const players = await database.getAll('roster');
    return players.sort((firstPlayer, secondPlayer) =>
      firstPlayer.name.localeCompare(secondPlayer.name)
    );
  }

  public async savePlayer(player: RosterPlayer): Promise<void> {
    const database = await getDatabaseConnection();
    await database.put('roster', player);
  }

  public async searchRoster(query: string): Promise<RosterPlayer[]> {
    const database = await getDatabaseConnection();
    const allPlayers = await database.getAll('roster');
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length === 0) {
      return allPlayers;
    }
    return allPlayers.filter((player) => {
      return player.name.toLowerCase().includes(trimmed);
    });
  }

  public async upsertRosterPlayer(player: RosterPlayer): Promise<void> {
    await this.savePlayer(player);
  }

  public async clearAll(): Promise<void> {
    const database = await getDatabaseConnection();
    const transaction = database.transaction(['matches', 'roster'], 'readwrite');
    await Promise.all([
      transaction.objectStore('matches').clear(),
      transaction.objectStore('roster').clear(),
      transaction.done,
    ]);
  }
}

export async function isPersistenceSupported(): Promise<boolean> {
  try {
    if (
      typeof navigator === 'undefined' ||
      !navigator.storage ||
      typeof navigator.storage.persisted !== 'function'
    ) {
      return false;
    }
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (
      typeof navigator === 'undefined' ||
      !navigator.storage ||
      typeof navigator.storage.persist !== 'function'
    ) {
      return false;
    }
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export const storageService = new IndexedDBStorageService();
