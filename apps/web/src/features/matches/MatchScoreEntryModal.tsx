import React, { useEffect, useState } from 'react';
import type { MatchFormat, RosterPlayer } from '@badminque/core';
import type { RecordMatchParams } from './useMatchRecording';

export interface MatchScoreEntryModalProps {
  isOpen: boolean;
  courtId: number;
  availablePlayers: RosterPlayer[];
  onClose: () => void;
  onSubmitScore: (params: RecordMatchParams) => Promise<void>;
}

const PRESET_SCORES: [number, number, string][] = [
  [21, 19, '21 - 19 (Close)'],
  [21, 15, '21 - 15 (Standard)'],
  [21, 5, '21 - 5 (Blowout)'],
  [30, 28, '30 - 28 (Overtime)'],
];

export function MatchScoreEntryModal({
  isOpen,
  courtId,
  availablePlayers,
  onClose,
  onSubmitScore,
}: MatchScoreEntryModalProps): React.JSX.Element | null {
  const [teamAPlayerOneId, setTeamAPlayerOneId] = useState<string>(
    availablePlayers[0]?.id ?? ''
  );
  const [teamAPlayerTwoId, setTeamAPlayerTwoId] = useState<string>(
    availablePlayers[1]?.id ?? ''
  );
  const [teamBPlayerOneId, setTeamBPlayerOneId] = useState<string>(
    availablePlayers[2]?.id ?? ''
  );
  const [teamBPlayerTwoId, setTeamBPlayerTwoId] = useState<string>(
    availablePlayers[3]?.id ?? ''
  );

  const [scoreA, setScoreA] = useState<number>(21);
  const [scoreB, setScoreB] = useState<number>(19);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!teamAPlayerOneId && availablePlayers[0]) {
      setTeamAPlayerOneId(availablePlayers[0].id);
    }
    if (!teamAPlayerTwoId && availablePlayers[1]) {
      setTeamAPlayerTwoId(availablePlayers[1].id);
    }
    if (!teamBPlayerOneId && availablePlayers[2]) {
      setTeamBPlayerOneId(availablePlayers[2].id);
    }
    if (!teamBPlayerTwoId && availablePlayers[3]) {
      setTeamBPlayerTwoId(availablePlayers[3].id);
    }
  }, [availablePlayers, teamAPlayerOneId, teamAPlayerTwoId, teamBPlayerOneId, teamBPlayerTwoId]);

  if (!isOpen) {
    return null;
  }

  const selectedIds = [
    teamAPlayerOneId,
    teamAPlayerTwoId,
    teamBPlayerOneId,
    teamBPlayerTwoId,
  ];
  const allDistinct = new Set(selectedIds).size === 4 && !selectedIds.includes('');
  const validScores = scoreA !== scoreB && scoreA >= 0 && scoreB >= 0;
  const canSubmit = allDistinct && validScores && !isSubmitting;

  const handleApplyPreset = (sa: number, sb: number): void => {
    setScoreA(sa);
    setScoreB(sb);
  };

  const handleSwapScores = (): void => {
    setScoreA(scoreB);
    setScoreB(scoreA);
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    const playerMap = new Map(availablePlayers.map((p) => [p.id, p]));
    const pA1 = playerMap.get(teamAPlayerOneId);
    const pA2 = playerMap.get(teamAPlayerTwoId);
    const pB1 = playerMap.get(teamBPlayerOneId);
    const pB2 = playerMap.get(teamBPlayerTwoId);

    if (!pA1 || !pA2 || !pB1 || !pB2) {
      return;
    }

    const calculatedFormat: MatchFormat =
      Math.max(scoreA, scoreB) > 21 ? 'SINGLE_30' : 'SINGLE_21';

    setIsSubmitting(true);
    try {
      await onSubmitScore({
        courtId,
        clubNightId: 'default-club-night',
        discipline: 'DOUBLES',
        format: calculatedFormat,
        teamAPlayers: [pA1, pA2],
        teamBPlayers: [pB1, pB2],
        teamAScores: [scoreA],
        teamBScores: [scoreB],
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 id="modal-title" className="text-lg font-bold text-slate-100">
            Record Match Score — Court {courtId}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {availablePlayers.length < 4 && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            At least 4 checked-in players are required for doubles score recording.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Quick Score Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-400">
                Score Presets
              </label>
              <button
                type="button"
                onClick={handleSwapScores}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
              >
                ⇄ Swap Scores
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_SCORES.map(([presetA, presetB, label]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleApplyPreset(presetA, presetB)}
                  className="px-3 py-2 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors text-left cursor-pointer"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Score Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="scoreA"
                className="text-xs font-medium text-slate-400 block mb-1"
              >
                Team A Score
              </label>
              <input
                id="scoreA"
                type="number"
                min="0"
                max="30"
                value={scoreA}
                onChange={(e) => setScoreA(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-lg font-mono font-bold text-center text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="scoreB"
                className="text-xs font-medium text-slate-400 block mb-1"
              >
                Team B Score
              </label>
              <input
                id="scoreB"
                type="number"
                min="0"
                max="30"
                value={scoreB}
                onChange={(e) => setScoreB(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-lg font-mono font-bold text-center text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Participant Selectors */}
          <div className="space-y-3">
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                Team A
              </span>
              <div className="grid grid-cols-2 gap-2">
                <select
                  aria-label="Team A Player 1"
                  value={teamAPlayerOneId}
                  onChange={(e) => setTeamAPlayerOneId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {availablePlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Team A Player 2"
                  value={teamAPlayerTwoId}
                  onChange={(e) => setTeamAPlayerTwoId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {availablePlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Team B
              </span>
              <div className="grid grid-cols-2 gap-2">
                <select
                  aria-label="Team B Player 1"
                  value={teamBPlayerOneId}
                  onChange={(e) => setTeamBPlayerOneId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {availablePlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Team B Player 2"
                  value={teamBPlayerTwoId}
                  onChange={(e) => setTeamBPlayerTwoId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {availablePlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed text-xs"
            >
              Submit Score
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
