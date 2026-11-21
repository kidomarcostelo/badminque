'use client';

import React, { useState } from 'react';
import type { RosterPlayer } from '@badminque/core';

export interface ClaimTokenModalProps {
  isOpen: boolean;
  player: RosterPlayer | null;
  onClose: () => void;
}

export function ClaimTokenModal({
  isOpen,
  player,
  onClose,
}: ClaimTokenModalProps): React.JSX.Element | null {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !player) {
    return null;
  }

  const tokenMock = `clm_${player.id.slice(0, 8)}_${Math.random().toString(36).substring(2, 10)}`;
  const claimUrl = `https://badminque.app/claim?token=${tokenMock}`;

  const handleCopy = async (): Promise<void> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(claimUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // ignore clipboard write failure
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-extrabold text-sm">
              🎫
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                Tricount Account Claiming
              </span>
              <h3 id="claim-modal-title" className="text-base font-extrabold text-slate-100">
                Claim Player Passport
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close claim modal"
            className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-center">
          <div>
            <h4 className="text-xl font-extrabold text-slate-100">{player.name}</h4>
            <p className="text-xs text-slate-400 mt-1">
              Scan this single-use Claim Token QR code to bind match history to your user profile.
            </p>
          </div>

          {/* QR Code Graphic Box */}
          <div className="p-4 bg-white rounded-2xl w-48 h-48 mx-auto flex flex-col items-center justify-center shadow-inner">
            <div className="w-36 h-36 border-4 border-slate-950 flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50">
              <span className="text-2xl mb-1">📱</span>
              <span className="font-mono text-[9px] font-bold text-slate-800 break-all text-center leading-tight">
                QR CLAIM TOKEN
              </span>
              <span className="font-mono text-[8px] text-slate-500 mt-1">
                {tokenMock.slice(0, 14)}...
              </span>
            </div>
          </div>

          {/* Single-use Expiration Notice */}
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
            <div className="font-bold flex items-center justify-center gap-1.5">
              <span>⏱️</span>
              <span>48-hour expiration</span>
            </div>
            <div className="text-[11px] text-indigo-400/80 mt-0.5">
              Single-use token. Binds account without mutating historical match logs.
            </div>
          </div>

          {/* Shareable Link Input & Copy Button */}
          <div className="space-y-2">
            <input
              type="text"
              readOnly
              value={claimUrl}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 transition-all active:scale-98"
            >
              <span>{copied ? '✓ Link Copied!' : '📋 Copy Claim Link'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
