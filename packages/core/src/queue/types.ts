import type { RosterPlayer, RotationPolicy } from '../types';

export interface DoublesPairing {
  readonly teamA: readonly [RosterPlayer, RosterPlayer];
  readonly teamB: readonly [RosterPlayer, RosterPlayer];
  readonly teamARating: number;
  readonly teamBRating: number;
  readonly ratingSpread: number;
  readonly policy: RotationPolicy;
  readonly cost?: number;
}

export interface CoPlayHistoryLookup {
  getPartnerCount(playerAId: string, playerBId: string): number;
  getOpponentCount(playerAId: string, playerBId: string): number;
  getLastPartnerMatchIndex(playerAId: string, playerBId: string): number;
  getLastOpponentMatchIndex(playerAId: string, playerBId: string): number;
  getTotalMatches(): number;
}

export interface OnDeckMatchGroup {
  readonly slotIndex: number; // 1, 2, 3
  readonly label: 'Next Up' | 'Following' | 'In the Hole';
  readonly pairA: readonly [RosterPlayer, RosterPlayer];
  readonly pairB: readonly [RosterPlayer, RosterPlayer];
  readonly pairARating: number;
  readonly pairBRating: number;
  readonly spread: number;
  readonly policy: RotationPolicy;
}

export interface LadderCourtStationState {
  readonly courtNumber: 1 | 2 | 3;
  readonly tierName: 'Apex' | 'Challenger' | 'Base';
  readonly incomingTopBuffer: RosterPlayer[];
  readonly incomingBottomBuffer: RosterPlayer[];
}
