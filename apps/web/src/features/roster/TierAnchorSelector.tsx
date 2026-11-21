'use client';

import React from 'react';
import {
  TIER_ANCHORS,
  formatDubr,
  type SkillTier,
} from '@badminque/core';

export interface TierAnchorSelectorProps {
  selectedTier: SkillTier;
  onSelectTier: (tier: SkillTier) => void;
  disabled?: boolean;
  className?: string;
}

const TIER_KEYS: SkillTier[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

export function TierAnchorSelector({
  selectedTier,
  onSelectTier,
  disabled = false,
  className = '',
}: TierAnchorSelectorProps): React.JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label="Initial skill tier anchor"
      className={`flex flex-wrap items-center gap-2 ${className}`}
    >
      <span className="text-xs font-semibold text-slate-400 mr-0.5">
        Initial Tier:
      </span>
      {TIER_KEYS.map((tierKey) => {
        const config = TIER_ANCHORS[tierKey];
        const isSelected = selectedTier === tierKey;
        const isDefault = tierKey === 'INTERMEDIATE';

        const baseStyles =
          'relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer select-none font-mono-badge shadow-xs';
        const activeStyles = isSelected
          ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-600 dark:border-indigo-500 shadow-xs'
          : 'bg-surface-container dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border border-outline-variant dark:border-slate-700/80 hover:bg-surface-container-high dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200';
        const disabledStyles = disabled
          ? 'opacity-50 cursor-not-allowed pointer-events-none'
          : '';

        return (
          <button
            key={tierKey}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onSelectTier(tierKey)}
            className={`${baseStyles} ${activeStyles} ${disabledStyles}`}
          >
            <span>{config.label}</span>
            <span className="font-mono text-[11px] opacity-80">
              {formatDubr(config.dubr)}
            </span>
            {isDefault && (
              <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-emerald-400 font-bold border border-slate-700">
                Default
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
