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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="check-in-modal-title"
    >
      <div className="w-full max-w-md silk-extruded bg-white border border-outline-variant rounded-2xl shadow-2xl p-5 space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">person_add</span>
            <h2
              id="check-in-modal-title"
              className="text-sm font-headline-sm font-extrabold text-slate-900 uppercase tracking-wide"
            >
              Check In Roster Player
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg silk-extruded-sm hover:bg-slate-100 text-on-surface-variant flex items-center justify-center border border-outline-variant cursor-pointer active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="modal-player-name"
              className="block text-[10px] font-mono font-bold text-on-surface-variant uppercase mb-1"
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
              className="w-full h-8 px-3 rounded-lg bg-slate-50 text-slate-900 font-body-base text-xs focus:ring-1 focus:ring-primary border border-outline-variant focus:outline-none placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold text-on-surface-variant uppercase mb-1">
              Skill Tier Anchor
            </label>
            <TierAnchorSelector
              selectedTier={tier}
              onSelectTier={setTier}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 px-3 rounded-lg silk-extruded-sm hover:bg-slate-100 border border-outline-variant text-slate-700 font-mono font-bold text-xs cursor-pointer active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={name.trim().length === 0 || isSubmitting}
              className="silk-btn-primary h-8 px-4 rounded-lg text-white font-headline-sm font-bold text-xs flex items-center justify-center gap-1 shadow cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isSubmitting ? 'Checking In...' : 'Check In Player'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
