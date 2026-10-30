/**
 * Domain types and entity models for Badminque.
 * Conforms strictly to GLOSSARY.md and ADR 0001.
 */

export type Discipline = 'SINGLES' | 'DOUBLES';

export type MatchFormat = 'SINGLE_21' | 'BEST_OF_3' | 'SINGLE_30';

export type CourtState = 'IDLE' | 'PROPOSED' | 'IN_MATCH' | 'SCORE_ENTRY';

export type PlayerState =
  | 'QUEUED'
  | 'PLAYING'
  | 'SKIPPED'
  | 'RESTING'
  | 'WAITING_PARTNER';

export type RotationPolicy =
  | 'FAIR_PLAY'
  | 'SPLIT_AND_MIX'
  | 'COURT_LADDER'
  | 'FLIGHTED_TIERS';

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED';

export type SkillTier = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface RosterPlayer {
  id: string;
  name: string;
  club_id?: string;
  auth_user_id: string | null;
  singles_rating: number;
  doubles_rating: number;
  singles_dubr?: number;
  doubles_dubr?: number;
  initial_tier?: SkillTier | null;
  matches_played: number;
  status: PlayerState;
  checked_in_at: string;
}

export interface MatchRecord {
  id: string;
  club_night_id: string;
  recorded_at: string;
  sequence_num: number;
  court_id: number;
  discipline: Discipline;
  format: MatchFormat;
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  team_a_scores: number[];
  team_b_scores: number[];
  status: SyncStatus;
}

export interface CourtStation {
  court_id: number;
  name: string;
  state: CourtState;
  current_match_id: string | null;
  elapsed_seconds: number;
}

export interface ClaimToken {
  token: string;
  roster_player_id: string;
  club_id: string;
  expires_at: string;
  is_claimed: boolean;
}

export interface PlayerPassport {
  player_id: string;
  name: string;
  singles_rating: number;
  doubles_rating: number;
  singles_dubr?: number;
  doubles_dubr?: number;
  is_provisional?: boolean;
  singles_matches_played: number;
  doubles_matches_played: number;
  club_name: string;
}

export interface PlayerRatingDelta {
  player_id: string;
  player_name?: string | undefined;
  pre_rating: number;
  post_rating: number;
  rating_delta: number;
  pre_dubr: number;
  post_dubr: number;
  dubr_delta: number;
  k_factor: number;
  is_provisional: boolean;
  matches_played_after: number;
}

export interface MatchRecordingResult {
  match: MatchRecord;
  deltas: PlayerRatingDelta[];
}
