import type { MatchRecord } from '../types';
import type { CoPlayHistoryLookup } from './types';

function createPairKey(playerAId: string, playerBId: string): string {
  return playerAId < playerBId
    ? `${playerAId}__${playerBId}`
    : `${playerBId}__${playerAId}`;
}

export class CoPlayHistoryTracker implements CoPlayHistoryLookup {
  private readonly partnerCounts = new Map<string, number>();
  private readonly opponentCounts = new Map<string, number>();
  private readonly lastPartnerMatchIndices = new Map<string, number>();
  private readonly lastOpponentMatchIndices = new Map<string, number>();
  private totalMatchesCount = 0;

  public recordMatch(
    teamAPlayerIds: readonly string[],
    teamBPlayerIds: readonly string[],
    matchIndex?: number
  ): void {
    const effectiveIndex = matchIndex ?? this.totalMatchesCount + 1;
    this.totalMatchesCount += 1;

    // Record team A partners
    for (let i = 0; i < teamAPlayerIds.length; i++) {
      for (let j = i + 1; j < teamAPlayerIds.length; j++) {
        const id1 = teamAPlayerIds[i];
        const id2 = teamAPlayerIds[j];
        if (id1 && id2) {
          const key = createPairKey(id1, id2);
          this.partnerCounts.set(key, (this.partnerCounts.get(key) ?? 0) + 1);
          this.lastPartnerMatchIndices.set(key, effectiveIndex);
        }
      }
    }

    // Record team B partners
    for (let i = 0; i < teamBPlayerIds.length; i++) {
      for (let j = i + 1; j < teamBPlayerIds.length; j++) {
        const id1 = teamBPlayerIds[i];
        const id2 = teamBPlayerIds[j];
        if (id1 && id2) {
          const key = createPairKey(id1, id2);
          this.partnerCounts.set(key, (this.partnerCounts.get(key) ?? 0) + 1);
          this.lastPartnerMatchIndices.set(key, effectiveIndex);
        }
      }
    }

    // Record opponents across teams
    for (const playerAId of teamAPlayerIds) {
      for (const playerBId of teamBPlayerIds) {
        if (playerAId && playerBId && playerAId !== playerBId) {
          const key = createPairKey(playerAId, playerBId);
          this.opponentCounts.set(key, (this.opponentCounts.get(key) ?? 0) + 1);
          this.lastOpponentMatchIndices.set(key, effectiveIndex);
        }
      }
    }
  }

  public getPartnerCount(playerAId: string, playerBId: string): number {
    if (playerAId === playerBId) {
      return 0;
    }
    const key = createPairKey(playerAId, playerBId);
    return this.partnerCounts.get(key) ?? 0;
  }

  public getOpponentCount(playerAId: string, playerBId: string): number {
    if (playerAId === playerBId) {
      return 0;
    }
    const key = createPairKey(playerAId, playerBId);
    return this.opponentCounts.get(key) ?? 0;
  }

  public getLastPartnerMatchIndex(playerAId: string, playerBId: string): number {
    if (playerAId === playerBId) {
      return -1;
    }
    const key = createPairKey(playerAId, playerBId);
    return this.lastPartnerMatchIndices.get(key) ?? -1;
  }

  public getLastOpponentMatchIndex(playerAId: string, playerBId: string): number {
    if (playerAId === playerBId) {
      return -1;
    }
    const key = createPairKey(playerAId, playerBId);
    return this.lastOpponentMatchIndices.get(key) ?? -1;
  }

  public getTotalMatches(): number {
    return this.totalMatchesCount;
  }
}

export function buildCoPlayHistory(matches: readonly MatchRecord[]): CoPlayHistoryLookup {
  const tracker = new CoPlayHistoryTracker();
  // Sort chronologically by sequence_num
  const sorted = [...matches].sort((a, b) => a.sequence_num - b.sequence_num);

  for (const match of sorted) {
    tracker.recordMatch(
      match.team_a_player_ids,
      match.team_b_player_ids,
      match.sequence_num
    );
  }

  return tracker;
}
