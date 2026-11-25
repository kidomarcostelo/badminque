import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaLifecycleRegistrar } from './PwaLifecycleRegistrar';
import * as swHelper from './registerServiceWorker';

describe('PwaLifecycleRegistrar', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers the service worker on client mount', () => {
    const spy = vi
      .spyOn(swHelper, 'registerServiceWorker')
      .mockResolvedValue({ status: 'unsupported' });

    render(<PwaLifecycleRegistrar />);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('shows install prompt when beforeinstallprompt fires and triggers prompt on click', async () => {
    vi.spyOn(swHelper, 'registerServiceWorker').mockResolvedValue({
      status: 'unsupported',
    });

    render(<PwaLifecycleRegistrar />);

    const promptMock = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
    };
    installEvent.prompt = promptMock;
    installEvent.userChoice = Promise.resolve({ outcome: 'accepted' });

    act(() => {
      window.dispatchEvent(installEvent);
    });

    const installBtn = await screen.findByRole('button', { name: /Install App/i });
    expect(installBtn).toBeInTheDocument();

    fireEvent.click(installBtn);

    await waitFor(() => {
      expect(promptMock).toHaveBeenCalledTimes(1);
    });
  });

  it('does not render install prompt when already running in standalone mode', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    vi.spyOn(swHelper, 'registerServiceWorker').mockResolvedValue({
      status: 'unsupported',
    });

    render(<PwaLifecycleRegistrar />);

    const installEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
    };
    installEvent.prompt = vi.fn();
    installEvent.userChoice = Promise.resolve({ outcome: 'dismissed' });

    act(() => {
      window.dispatchEvent(installEvent);
    });

    expect(screen.queryByRole('button', { name: /Install App/i })).not.toBeInTheDocument();
  });

  it('displays update banner when a new service worker is ready and activates on click', async () => {
    const waitingWorker = { postMessage: vi.fn() } as unknown as ServiceWorker;
    const mockRegistration = {
      waiting: waitingWorker,
    } as unknown as ServiceWorkerRegistration;

    vi.spyOn(swHelper, 'registerServiceWorker').mockImplementation(
      async (options) => {
        options?.onUpdateAvailable?.(mockRegistration);
        return { status: 'registered', registration: mockRegistration };
      }
    );

    const onReload = vi.fn();
    render(<PwaLifecycleRegistrar onReload={onReload} />);

    const reloadBtn = await screen.findByRole('button', { name: /Update & Reload/i });
    fireEvent.click(reloadBtn);

    expect(waitingWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
