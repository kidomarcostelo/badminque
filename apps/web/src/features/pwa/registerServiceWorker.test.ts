import { afterEach, describe, expect, it, vi } from 'vitest';
import { activatePendingUpdate, registerServiceWorker } from './registerServiceWorker';

describe('registerServiceWorker', () => {
  const originalServiceWorker = navigator.serviceWorker;

  afterEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalServiceWorker,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('returns unsupported when serviceWorker API is not available', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
    });

    const result = await registerServiceWorker();
    expect(result.status).toBe('unsupported');
  });

  it('registers /sw.js with root scope and detects waiting updates', async () => {
    const onUpdateAvailable = vi.fn();
    const handlers: { updatefound?: () => void; statechange?: () => void } = {};

    const installingWorker = {
      state: 'installing',
      addEventListener: vi.fn((event: string, cb: () => void) => {
        if (event === 'statechange') handlers.statechange = cb;
      }),
    };

    const mockRegistration = {
      installing: installingWorker,
      waiting: null as ServiceWorker | null,
      addEventListener: vi.fn((event: string, cb: () => void) => {
        if (event === 'updatefound') handlers.updatefound = cb;
      }),
    };

    const registerMock = vi.fn().mockResolvedValue(mockRegistration);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: registerMock,
        controller: {},
      },
      configurable: true,
    });

    const result = await registerServiceWorker({ onUpdateAvailable });

    expect(result.status).toBe('registered');
    expect(registerMock).toHaveBeenCalledWith('/sw.js', { scope: '/' });

    // Simulate update lifecycle completing while an active controller exists
    expect(handlers.updatefound).toBeDefined();
    handlers.updatefound?.();
    installingWorker.state = 'installed';
    handlers.statechange?.();

    expect(onUpdateAvailable).toHaveBeenCalledWith(mockRegistration);
  });

  it('handles registration rejection gracefully without throwing', async () => {
    const registerMock = vi.fn().mockRejectedValue(new Error('Insecure origin'));
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: registerMock,
        controller: null,
      },
      configurable: true,
    });

    const result = await registerServiceWorker();
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.message).toBe('Insecure origin');
    }
  });

  it('posts SKIP_WAITING to a waiting service worker on activation', () => {
    const postMessage = vi.fn();
    const registration = {
      waiting: { postMessage },
    } as unknown as ServiceWorkerRegistration;

    const posted = activatePendingUpdate(registration);
    expect(posted).toBe(true);
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });
});
