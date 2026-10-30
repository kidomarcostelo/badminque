'use client';

import { useState } from 'react';
import {
  calculateDoublesMatchDeltas,
  calculateSinglesMatchDeltas,
  type Discipline,
  type MatchFormat,
  type MatchRecord,
  type MatchRecordingResult,
  type PlayerRatingDelta,
  type RosterPlayer,
} from '@badminque/core';
import { storageService } from '../../services/storageService';

export interface RecordMatchParams {
  courtId: number;
  clubNightId: string;
  discipline: Discipline;
  format: MatchFormat;
  teamAPlayers: RosterPlayer[];
  teamBPlayers: RosterPlayer[];
  teamAScores: number[];
  teamBScores: number[];
}

export interface UseMatchRecordingReturn {
  lastMatchOutcome: MatchRecordingResult | null;
  recordMatchScore: (params: RecordMatchParams) => Promise<MatchRecordingResult>;
  clearOutcome: () => void;
}

export function useMatchRecording(): UseMatchRecordingReturn {
  const [lastMatchOutcome, setLastMatchOutcome] =
    useState<MatchRecordingResult | null>(null);

  const clearOutcome = (): void => {
    setLastMatchOutcome(null);
  };

  const recordMatchScore = async (
    params: RecordMatchParams
  ): Promise<MatchRecordingResult> => {
    const {
      courtId,
      clubNightId,
      discipline,
      format,
      teamAPlayers,
      teamBPlayers,
      teamAScores,
      teamBScores,
    } = params;

    const setsScores: [number, number][] = teamAScores.map((scoreA, index) => [
      scoreA,
      teamBScores[index] ?? 0,
    ]);

    const isDoubles = discipline === 'DOUBLES';
    let deltas: PlayerRatingDelta[];

    if (isDoubles) {
      deltas = calculateDoublesMatchDeltas(
        teamAPlayers.map((player) => ({
          id: player.id,
          name: player.name,
          rating: player.doubles_rating,
          matches_played: player.matches_played,
        })),
        teamBPlayers.map((player) => ({
          id: player.id,
          name: player.name,
          rating: player.doubles_rating,
          matches_played: player.matches_played,
        })),
        setsScores,
        format
      );
    } else {
      const pA = teamAPlayers[0];
      const pB = teamBPlayers[0];
      if (!pA || !pB) {
        throw new Error('Singles match requires 1 player per team');
      }
      const [deltaA, deltaB] = calculateSinglesMatchDeltas(
        {
          id: pA.id,
          name: pA.name,
          rating: pA.singles_rating,
          matches_played: pA.matches_played,
        },
        {
          id: pB.id,
          name: pB.name,
          rating: pB.singles_rating,
          matches_played: pB.matches_played,
        },
        setsScores,
        format
      );
      deltas = [deltaA, deltaB];
    }

    const pending = await storageService.getPendingMatches();
    const sequenceNum = pending.length + 1;

    const matchRecord: MatchRecord = {
      id: crypto.randomUUID(),
      club_night_id: clubNightId,
      recorded_at: new Date().toISOString(),
      sequence_num: sequenceNum,
      court_id: courtId,
      discipline,
      format,
      team_a_player_ids: teamAPlayers.map((p) => p.id),
      team_b_player_ids: teamBPlayers.map((p) => p.id),
      team_a_scores: teamAScores,
      team_b_scores: teamBScores,
      status: 'PENDING',
    };

    await storageService.saveMatch(matchRecord);

    const allPlayers = [...teamAPlayers, ...teamBPlayers];
    for (const delta of deltas) {
      const player = allPlayers.find((p) => p.id === delta.player_id);
      if (player) {
        const updatedPlayer: RosterPlayer = {
          ...player,
          ...(isDoubles
            ? { doubles_rating: delta.post_rating }
            : { singles_rating: delta.post_rating }),
          matches_played: delta.matches_played_after,
          status: 'RESTING',
        };
        await storageService.savePlayer(updatedPlayer);
      }
    }

    const outcome: MatchRecordingResult = {
      match: matchRecord,
      deltas,
    };
    setLastMatchOutcome(outcome);
    return outcome;
  };

  return {
    lastMatchOutcome,
    recordMatchScore,
    clearOutcome,
  };
}
