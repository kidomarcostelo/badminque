'use client';

import React, { useEffect, useState } from 'react';
import {
  activatePendingUpdate,
  registerServiceWorker,
} from './registerServiceWorker';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaLifecycleRegistrarProps {
  onReload?: () => void;
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const matchesStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  return Boolean(matchesStandalone || nav.standalone);
}

/**
 * Registers the Badminque offline Service Worker on app mount and exposes
 * unobtrusive tablet installability and update-reload controls.
 */
export function PwaLifecycleRegistrar({
  onReload,
}: PwaLifecycleRegistrarProps): React.JSX.Element | null {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [pendingUpdateRegistration, setPendingUpdateRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    void registerServiceWorker({
      onUpdateAvailable: (registration) => {
        setPendingUpdateRegistration(registration);
      },
    });

    if (isStandaloneMode()) {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleUpdateClick = () => {
    if (activatePendingUpdate(pendingUpdateRegistration)) {
      if (onReload) {
        onReload();
      } else {
        window.location.reload();
      }
    }
  };

  if (pendingUpdateRegistration) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 shadow-lg silk-extruded"
      >
        <span className="text-[11px] font-semibold text-on-surface">
          New courtside version ready
        </span>
        <button
          type="button"
          onClick={handleUpdateClick}
          className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer hover:bg-indigo-700 transition-colors"
        >
          Update &amp; Reload
        </button>
      </div>
    );
  }

  if (deferredPrompt && !isDismissed) {
    return (
      <div
        role="region"
        aria-label="Install Badminque PWA"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border border-outline-variant bg-white px-3 py-2 shadow-lg silk-extruded"
      >
        <span className="text-[11px] font-semibold text-on-surface">
          Install for offline courtside play
        </span>
        <button
          type="button"
          onClick={() => {
            void handleInstallClick();
          }}
          className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer hover:bg-indigo-700 transition-colors"
        >
          Install App
        </button>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          aria-label="Dismiss install prompt"
          className="px-1 text-slate-400 hover:text-slate-700 cursor-pointer"
        >
          ✕
        </button>
      </div>
    );
  }

  return null;
}
