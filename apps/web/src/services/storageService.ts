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
let isOpeningDatabase = false;

export async function getDatabaseConnection(): Promise<IDBPDatabase<BadminqueDBSchema> | null> {
  if (databaseInstance) {
    return databaseInstance;
  }
  if (isOpeningDatabase) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (databaseInstance) return databaseInstance;
  }

  isOpeningDatabase = true;
  try {
    const openPromise = openDB<BadminqueDBSchema>(DATABASE_NAME, DATABASE_VERSION, {
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
          try {
            const rosterStore = transaction.objectStore('roster');
            if (!rosterStore.indexNames.contains('by_status')) {
              rosterStore.createIndex('by_status', 'status');
            }
          } catch {
            // Ignore index creation if upgrade transaction is locked
          }
        }
      },
      blocked() {
        console.warn('IndexedDB upgrade blocked by an existing open connection.');
      },
      blocking() {
        if (databaseInstance) {
          databaseInstance.close();
          databaseInstance = null;
        }
      },
      terminated() {
        databaseInstance = null;
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('IndexedDB open timeout')), 2000)
    );

    databaseInstance = await Promise.race([openPromise, timeoutPromise]);
    return databaseInstance;
  } catch (error) {
    console.warn('IndexedDB connection unavailable; using in-memory storage fallback:', error);
    return null;
  } finally {
    isOpeningDatabase = false;
  }
}

export function closeDatabaseConnection(): void {
  storageService.clearMemoryCache();
  if (!databaseInstance) {
    return;
  }
  databaseInstance.close();
  databaseInstance = null;
}

export class IndexedDBStorageService implements StorageAdapter {
  private inMemoryRoster = new Map<string, RosterPlayer>();
  private inMemoryMatches = new Map<string, MatchRecord>();

  public clearMemoryCache(): void {
    this.inMemoryRoster.clear();
    this.inMemoryMatches.clear();
  }

  public async saveMatch(match: MatchRecord): Promise<void> {
    this.inMemoryMatches.set(match.id, match);
    try {
      const database = await getDatabaseConnection();
      if (database) {
        await database.put('matches', match);
      }
    } catch {
      // In-memory fallback
    }
  }

  public async getPendingMatches(): Promise<MatchRecord[]> {
    try {
      const database = await getDatabaseConnection();
      if (database) {
        const matches = await database.getAllFromIndex('matches', 'by_status', 'PENDING');
        this.inMemoryMatches.clear();
        for (const m of matches) this.inMemoryMatches.set(m.id, m);
        return matches.sort((firstMatch, secondMatch) => {
          return firstMatch.sequence_num - secondMatch.sequence_num;
        });
      }
    } catch {
      // In-memory fallback
    }
    const matches = Array.from(this.inMemoryMatches.values()).filter(
      (m) => m.status === 'PENDING'
    );
    return matches.sort((firstMatch, secondMatch) => {
      return firstMatch.sequence_num - secondMatch.sequence_num;
    });
  }

  public async markMatchesSynced(matchIds: string[]): Promise<void> {
    if (matchIds.length === 0) {
      return;
    }

    for (const matchId of matchIds) {
      const match = this.inMemoryMatches.get(matchId);
      if (match) {
        match.status = 'SYNCED';
        this.inMemoryMatches.set(matchId, match);
      }
    }

    try {
      const database = await getDatabaseConnection();
      if (database) {
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
    } catch {
      // In-memory fallback
    }
  }

  public async getRoster(): Promise<RosterPlayer[]> {
    try {
      const database = await getDatabaseConnection();
      if (database) {
        const players = await database.getAll('roster');
        this.inMemoryRoster.clear();
        for (const p of players) this.inMemoryRoster.set(p.id, p);
        return players.sort((firstPlayer, secondPlayer) =>
          firstPlayer.name.localeCompare(secondPlayer.name)
        );
      }
    } catch {
      // In-memory fallback
    }
    const players = Array.from(this.inMemoryRoster.values());
    return players.sort((firstPlayer, secondPlayer) =>
      firstPlayer.name.localeCompare(secondPlayer.name)
    );
  }

  public async savePlayer(player: RosterPlayer): Promise<void> {
    this.inMemoryRoster.set(player.id, player);
    try {
      const database = await getDatabaseConnection();
      if (database) {
        await database.put('roster', player);
      }
    } catch {
      // In-memory fallback
    }
  }

  public async searchRoster(query: string): Promise<RosterPlayer[]> {
    const allPlayers = await this.getRoster();
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
    this.inMemoryRoster.clear();
    this.inMemoryMatches.clear();
    try {
      const database = await getDatabaseConnection();
      if (database) {
        const transaction = database.transaction(['matches', 'roster'], 'readwrite');
        await Promise.all([
          transaction.objectStore('matches').clear(),
          transaction.objectStore('roster').clear(),
          transaction.done,
        ]);
      }
    } catch {
      // In-memory fallback
    }
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
