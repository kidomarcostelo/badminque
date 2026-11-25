export type ServiceWorkerRegistrationResult =
  | { status: 'registered'; registration: ServiceWorkerRegistration }
  | { status: 'unsupported' }
  | { status: 'error'; error: Error };

export interface RegisterServiceWorkerOptions {
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
}

/**
 * Registers the Badminque offline shell Service Worker (`/sw.js`) and hooks
 * into update lifecycle notifications without throwing on unsupported origins.
 */
export async function registerServiceWorker(
  options?: RegisterServiceWorkerOptions
): Promise<ServiceWorkerRegistrationResult> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    return { status: 'unsupported' };
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    if (registration.waiting && navigator.serviceWorker.controller) {
      options?.onUpdateAvailable?.(registration);
    }

    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (!installingWorker) {
        return;
      }

      installingWorker.addEventListener('statechange', () => {
        if (
          installingWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          options?.onUpdateAvailable?.(registration);
        }
      });
    });

    return { status: 'registered', registration };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { status: 'error', error };
  }
}

/**
 * Instructs a waiting Service Worker to immediately take control via SKIP_WAITING.
 */
export function activatePendingUpdate(
  registration: ServiceWorkerRegistration | null | undefined
): boolean {
  if (!registration?.waiting) {
    return false;
  }
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}
