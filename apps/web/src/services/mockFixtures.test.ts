import { describe, expect, it } from 'vitest';
import {
  createMockClubNight,
  createMockCompletedMatches,
  createMockRoster,
  seedMockData,
} from './mockFixtures';
import { storageService, closeDatabaseConnection } from './storageService';

describe('mockFixtures seam', () => {
  it('creates deterministic mock roster players conforming to @badminque/core schema', () => {
    const roster = createMockRoster();
    expect(roster.length).toBeGreaterThanOrEqual(8);

    for (const player of roster) {
      expect(player.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(player.name).toBeTruthy();
      expect(typeof player.doubles_rating).toBe('number');
      expect(typeof player.singles_rating).toBe('number');
      expect(player.status).toMatch(/^(QUEUED|RESTING|PLAYING|SKIPPED|WAITING_PARTNER)$/);
      expect(typeof player.matches_played).toBe('number');
    }

    // Verify rating distribution covers Beginner, Intermediate, and Advanced tiers
    const ratings = roster.map((p) => p.doubles_rating);
    expect(ratings.some((r) => r <= 1200)).toBe(true); // Beginner (~2.500 DUBR = 1000)
    expect(ratings.some((r) => r >= 1400 && r <= 1600)).toBe(true); // Intermediate (~3.500 DUBR = 1400-1600)
    expect(ratings.some((r) => r >= 1800)).toBe(true); // Advanced (~4.500 DUBR = 1800+)
  });

  it('creates mock club night session with valid courts and metadata', () => {
    const clubNight = createMockClubNight();
    expect(clubNight.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(clubNight.court_count).toBe(3);
    expect(clubNight.title).toContain('Club Night');
  });

  it('creates realistic mock match history with DUBR scorelines', () => {
    const roster = createMockRoster();
    const matches = createMockCompletedMatches(roster);

    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      expect(match.team_a_player_ids).toHaveLength(2);
      expect(match.team_b_player_ids).toHaveLength(2);
      expect(match.team_a_scores[0]).toBeGreaterThanOrEqual(21);
      expect(match.team_b_scores[0]).toBeGreaterThanOrEqual(0);
    }
  });

  it('seeds empty storage service with mock players without duplicates', async () => {
    closeDatabaseConnection();
    await storageService.clearAll();

    const seededCount = await seedMockData(storageService);
    expect(seededCount).toBeGreaterThanOrEqual(8);

    const loadedRoster = await storageService.getRoster();
    expect(loadedRoster.length).toBe(seededCount);

    // Calling seedMockData again on populated storage should do nothing (idempotent)
    const secondPassCount = await seedMockData(storageService);
    expect(secondPassCount).toBe(0);

    const afterSecondPass = await storageService.getRoster();
    expect(afterSecondPass.length).toBe(seededCount);
  });
});
