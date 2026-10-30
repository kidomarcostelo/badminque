import type { MatchRecord, RosterPlayer } from '../types';


export interface StorageAdapter {
  saveMatch(match: MatchRecord): Promise<void>;
  getPendingMatches(): Promise<MatchRecord[]>;
  markMatchesSynced(matchIds: string[]): Promise<void>;
  getRoster(): Promise<RosterPlayer[]>;
  savePlayer(player: RosterPlayer): Promise<void>;
  searchRoster(query: string): Promise<RosterPlayer[]>;
  upsertRosterPlayer(player: RosterPlayer): Promise<void>;
  clearAll(): Promise<void>;
}
