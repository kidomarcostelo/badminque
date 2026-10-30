import type { CourtState, RosterPlayer } from '@badminque/core';

export interface CourtStationData {
  courtId: number;
  name: string;
  state: CourtState;
  elapsedSeconds: number;
  teamA: [RosterPlayer, RosterPlayer] | null;
  teamB: [RosterPlayer, RosterPlayer] | null;
}

export function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function getPairAverage(pair: [RosterPlayer, RosterPlayer] | null): number {
  if (!pair) {
    return 1500;
  }
  const [firstPlayer, secondPlayer] = pair;
  return Math.round((firstPlayer.doubles_rating + secondPlayer.doubles_rating) / 2);
}

export function getSpread(
  teamA: [RosterPlayer, RosterPlayer] | null,
  teamB: [RosterPlayer, RosterPlayer] | null
): number {
  if (!teamA || !teamB) {
    return 0;
  }
  const averageA = getPairAverage(teamA);
  const averageB = getPairAverage(teamB);
  return Math.abs(averageA - averageB);
}

export function getMatchBalanceLabel(spread: number): string {
  if (spread <= 35) {
    return '98% Balanced Match';
  }
  return 'Competitive Match';
}
