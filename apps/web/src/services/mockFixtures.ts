import {
  type MatchRecord,
  type RosterPlayer,
  type SkillTier,
  ratingToDubr,
  ESTABLISHED_MATCH_THRESHOLD,
  INITIAL_ELO,
  INITIAL_TIER_ANCHORS,
} from '@badminque/core';
import type { StorageService } from './storageService';

export interface MockClubNight {
  id: string;
  club_id: string;
  title: string;
  court_count: number;
  created_at: string;
}

/**
 * Deterministic sample Roster Players covering Beginner, Intermediate, and Advanced tiers.
 * Used for offline courtside station operation, testing seams, and preview environments.
 */
export function createMockRoster(): RosterPlayer[] {
  const baseTimestamp = new Date('2026-11-21T18:00:00Z').toISOString();

  const playerSpecs: Array<{
    id: string;
    name: string;
    tier: SkillTier;
    doublesRating: number;
    singlesRating: number;
    matchesPlayed: number;
    status: 'QUEUED' | 'RESTING';
  }> = [
    // Advanced Tier (DUBR ~4.500–5.250 / Elo 1800–2100)
    {
      id: 'a1000000-0000-4000-8000-000000000001',
      name: 'Viktor Axelsen',
      tier: 'ADVANCED',
      doublesRating: 2000,
      singlesRating: 2150,
      matchesPlayed: 14,
      status: 'QUEUED',
    },
    {
      id: 'a1000000-0000-4000-8000-000000000002',
      name: 'Tai Tzu-ying',
      tier: 'ADVANCED',
      doublesRating: 1950,
      singlesRating: 2100,
      matchesPlayed: 12,
      status: 'QUEUED',
    },
    {
      id: 'a1000000-0000-4000-8000-000000000003',
      name: 'Hendra Setiawan',
      tier: 'ADVANCED',
      doublesRating: 1900,
      singlesRating: 1750,
      matchesPlayed: 20,
      status: 'QUEUED',
    },
    {
      id: 'a1000000-0000-4000-8000-000000000004',
      name: 'Lee Yang',
      tier: 'ADVANCED',
      doublesRating: 1850,
      singlesRating: 1700,
      matchesPlayed: 10,
      status: 'QUEUED',
    },

    // Intermediate Tier (DUBR ~3.250–3.750 / Elo 1300–1600)
    {
      id: 'b1000000-0000-4000-8000-000000000001',
      name: 'Marcus Fernaldi',
      tier: 'INTERMEDIATE',
      doublesRating: 1550,
      singlesRating: 1450,
      matchesPlayed: 9,
      status: 'QUEUED',
    },
    {
      id: 'b1000000-0000-4000-8000-000000000002',
      name: 'Greysia Polii',
      tier: 'INTERMEDIATE',
      doublesRating: 1500,
      singlesRating: 1400,
      matchesPlayed: 6, // Provisional (< 8)
      status: 'QUEUED',
    },
    {
      id: 'b1000000-0000-4000-8000-000000000003',
      name: 'Anthony Ginting',
      tier: 'INTERMEDIATE',
      doublesRating: 1480,
      singlesRating: 1600,
      matchesPlayed: 5, // Provisional (< 8)
      status: 'QUEUED',
    },
    {
      id: 'b1000000-0000-4000-8000-000000000004',
      name: 'Apriyani Rahayu',
      tier: 'INTERMEDIATE',
      doublesRating: 1420,
      singlesRating: 1350,
      matchesPlayed: 8,
      status: 'QUEUED',
    },

    // Beginner Tier (DUBR ~2.250–2.750 / Elo 900–1200)
    {
      id: 'c1000000-0000-4000-8000-000000000001',
      name: 'Dave Rookie',
      tier: 'BEGINNER',
      doublesRating: 1050,
      singlesRating: 1000,
      matchesPlayed: 3,
      status: 'QUEUED',
    },
    {
      id: 'c1000000-0000-4000-8000-000000000002',
      name: 'Sarah Starter',
      tier: 'BEGINNER',
      doublesRating: 1000,
      singlesRating: 950,
      matchesPlayed: 2,
      status: 'QUEUED',
    },
    {
      id: 'c1000000-0000-4000-8000-000000000003',
      name: 'Bob Casual',
      tier: 'BEGINNER',
      doublesRating: 1100,
      singlesRating: 1050,
      matchesPlayed: 4,
      status: 'RESTING',
    },
    {
      id: 'c1000000-0000-4000-8000-000000000004',
      name: 'Alice Novice',
      tier: 'BEGINNER',
      doublesRating: 980,
      singlesRating: 950,
      matchesPlayed: 1,
      status: 'RESTING',
    },
  ];

  return playerSpecs.map((spec) => ({
    id: spec.id,
    name: spec.name,
    auth_user_id: null,
    doubles_rating: spec.doublesRating,
    singles_rating: spec.singlesRating,
    doubles_dubr: ratingToDubr(spec.doublesRating),
    singles_dubr: ratingToDubr(spec.singlesRating),
    doubles_matches_played: spec.matchesPlayed,
    singles_matches_played: Math.max(0, spec.matchesPlayed - 2),
    matches_played: spec.matchesPlayed,
    initial_tier: spec.tier,
    status: spec.status,
    checked_in_at: baseTimestamp,
    locked_partner_id: null,
    locked_partner_name: null,
    is_skipped: false,
  }));
}

/**
 * Creates a mock Club Night session with 3 standard courts.
 */
export function createMockClubNight(): MockClubNight {
  return {
    id: 'f1000000-0000-4000-8000-000000000001',
    club_id: 'c1000000-0000-4000-8000-000000000001',
    title: 'Club Night — Friday Courtside Session',
    court_count: 3,
    created_at: new Date('2026-11-21T18:00:00Z').toISOString(),
  };
}

/**
 * Creates realistic completed match history with DUBR scorelines.
 */
export function createMockCompletedMatches(roster: RosterPlayer[]): MatchRecord[] {
  if (roster.length < 4) {
    return [];
  }

  const [p1, p2, p3, p4] = roster;
  return [
    {
      id: 'm1000000-0000-4000-8000-000000000001',
      club_night_id: 'f1000000-0000-4000-8000-000000000001',
      recorded_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      sequence_num: 1,
      court_id: 1,
      discipline: 'DOUBLES',
      format: 'SINGLE_30',
      team_a_player_ids: [p1.id, p2.id],
      team_b_player_ids: [p3.id, p4.id],
      team_a_scores: [30],
      team_b_scores: [24],
      status: 'SYNCED',
    },
    {
      id: 'm1000000-0000-4000-8000-000000000002',
      club_night_id: 'f1000000-0000-4000-8000-000000000001',
      recorded_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      sequence_num: 2,
      court_id: 2,
      discipline: 'DOUBLES',
      format: 'SINGLE_21',
      team_a_player_ids: [p3.id, p1.id],
      team_b_player_ids: [p2.id, p4.id],
      team_a_scores: [21],
      team_b_scores: [19],
      status: 'PENDING',
    },
  ];
}

/**
 * Seeds local IndexedDB storage with mock data if currently empty.
 * Returns the count of seeded players (or 0 if already populated).
 */
export async function seedMockData(storage: StorageService): Promise<number> {
  const existingRoster = await storage.getRoster();
  if (existingRoster.length > 0) {
    return 0;
  }

  const mockRoster = createMockRoster();
  for (const player of mockRoster) {
    await storage.savePlayer(player);
  }

  return mockRoster.length;
}
