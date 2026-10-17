import type { MatchRecord, RosterPlayer } from '../types';


export interface StorageAdapter {
  saveMatch(match: MatchRecord): Promise<void>;
  getPendingMatches(): Promise<MatchRecord[]>;
  markMatchesSynced(matchIds: string[]): Promise<void>;
  getRoster(): Promise<RosterPlayer[]>;
  upsertRosterPlayer(player: RosterPlayer): Promise<void>;
  clearAll(): Promise<void>;
}
