'use client';

import React, { useEffect, useState } from 'react';
import { type SkillTier } from '@badminque/core';
import { TierAnchorSelector } from './TierAnchorSelector';

export interface RosterCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckIn: (name: string, tier: SkillTier) => Promise<void>;
}

export function RosterCheckInModal({
  isOpen,
  onClose,
  onCheckIn,
}: RosterCheckInModalProps): React.JSX.Element | null {
  const [name, setName] = useState<string>('');
  const [tier, setTier] = useState<SkillTier>('INTERMEDIATE');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTier('INTERMEDIATE');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0 || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onCheckIn(trimmed, tier);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="check-in-modal-title"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
        <div>
          <h2
            id="check-in-modal-title"
            className="text-lg font-extrabold text-slate-100 tracking-tight"
          >
            Check In Roster Player
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Assign a 1-tap skill tier anchor to initialize baseline DUBR and accelerate convergence.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="modal-player-name"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Player Name
            </label>
            <input
              id="modal-player-name"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hendra Setiawan"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Skill Tier Anchor
            </label>
            <TierAnchorSelector
              selectedTier={tier}
              onSelectTier={setTier}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={name.trim().length === 0 || isSubmitting}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition-colors cursor-pointer disabled:cursor-not-allowed shadow-md shadow-emerald-600/20"
            >
              {isSubmitting ? 'Checking In...' : 'Check In Player'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
