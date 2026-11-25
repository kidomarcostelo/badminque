'use client';

import React, { useState } from 'react';
import type { ClubNightSession } from '@badminque/core';
import type { CreateClubSessionParams } from './useClubSession';

export interface ClubSessionModalProps {
  isOpen: boolean;
  activeSession: ClubNightSession;
  sessions: ClubNightSession[];
  onSelectSession: (session: ClubNightSession) => Promise<void> | void;
  onCreateSession: (
    params: CreateClubSessionParams
  ) => Promise<ClubNightSession | void> | void;
  onClose: () => void;
}

export function ClubSessionModal({
  isOpen,
  activeSession,
  sessions,
  onSelectSession,
  onCreateSession,
  onClose,
}: ClubSessionModalProps): React.JSX.Element | null {
  const [clubName, setClubName] = useState<string>('');
  const [sessionDate, setSessionDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) {
    return null;
  }

  const handleCreate = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    const trimmedName = clubName.trim();
    if (!trimmedName || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateSession({
        clubName: trimmedName,
        date: sessionDate,
      });
      setClubName('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelect = async (session: ClubNightSession): Promise<void> => {
    await onSelectSession(session);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="club-session-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
    >
      <div className="bg-white border border-outline-variant rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col silk-extruded">
        {/* Header */}
        <div className="px-5 py-3.5 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600">
              Active Club Night Context
            </span>
            <h3
              id="club-session-modal-title"
              className="text-base font-extrabold text-on-surface"
            >
              Switch or Start Club Night
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close session modal"
            className="w-8 h-8 rounded-lg silk-extruded-sm border border-outline-variant text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Existing / Saved Sessions */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant">
              Saved &amp; Remote Club Nights
            </div>
            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
              {sessions.map((session) => {
                const isActive = session.id === activeSession.id;
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => void handleSelect(session)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isActive
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-950'
                        : 'silk-sunken-shallow border-outline-variant hover:bg-slate-100 text-on-surface'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{session.club_name}</div>
                      <div className="text-[10px] font-mono text-on-surface-variant">
                        {session.date} · ID {session.id.slice(0, 8)}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        session.sync_status === 'SYNCED'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-amber-50 border-amber-200 text-amber-700'
                      }`}
                    >
                      {session.sync_status === 'SYNCED' ? 'Synced' : 'Local UUID'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Create New Club Night Form */}
          <form
            onSubmit={(e) => void handleCreate(e)}
            className="pt-4 border-t border-outline-variant space-y-3"
          >
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant">
              Start New Club Night
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <label className="sm:col-span-2 flex flex-col gap-1 text-[11px] font-semibold text-on-surface">
                <span>Club Name</span>
                <input
                  type="text"
                  required
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  placeholder="e.g. Friday Night Smashers"
                  className="px-3 py-2 rounded-xl silk-sunken border border-outline-variant text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-semibold text-on-surface">
                <span>Session Date</span>
                <input
                  type="date"
                  required
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="px-3 py-2 rounded-xl silk-sunken border border-outline-variant text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={!clubName.trim() || isSubmitting}
              className="silk-btn-primary w-full min-h-[40px] px-4 py-2 rounded-xl text-white font-bold text-xs cursor-pointer active:scale-98 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Starting...' : 'Start Club Night'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
