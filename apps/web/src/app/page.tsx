'use client';

import React from 'react';
import {
  DEFAULT_COURT_COUNT,
  QUICK_SCORE_TARGET,
  STANDARD_SET_WIN_SCORE,
} from '@badminque/core';
import { useStorage } from '../hooks/useStorage';

export default function CourtsideStationPage(): React.JSX.Element {
  const { roster, pendingMatches, isPersistent } = useStorage();

  const courts = Array.from({ length: DEFAULT_COURT_COUNT }, (_, index) => {
    return {
      id: index + 1,
      name: `Court ${index + 1}`,
      status: 'IDLE' as const,
    };
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              Badminque Courtside Station
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Club Night Session — Offline-First Courtside Match Tracker
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Roster: </span>
            <span className="font-semibold text-emerald-400">{roster.length}</span>
          </div>

          <div className="px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Pending Sync: </span>
            <span className="font-semibold text-amber-400">{pendingMatches.length}</span>
          </div>

          <div className="px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Storage: </span>
            <span className={isPersistent ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
              {isPersistent ? 'Persisted' : 'Standard'}
            </span>
          </div>
        </div>
      </header>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-200">Active Courts</h2>
          <span className="text-xs text-slate-400">
            Presets: {STANDARD_SET_WIN_SCORE} pts (Standard) / {QUICK_SCORE_TARGET} pts (Quick)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {courts.map((court) => (
            <div
              key={court.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between min-h-[160px]"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">{court.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                  {court.status}
                </span>
              </div>

              <div className="my-4 text-center py-4 rounded-lg bg-slate-950/40 border border-dashed border-slate-800 text-slate-500 text-sm">
                Ready for Match Dispatch
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Discipline: Doubles</span>
                <span>Target: {QUICK_SCORE_TARGET} pts</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-auto pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
        Badminque v0.1.0 • Universal Badminton Skill Transparency
      </footer>
    </main>
  );
}
