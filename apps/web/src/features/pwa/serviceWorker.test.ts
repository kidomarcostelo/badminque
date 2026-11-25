/**
 * @vitest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const SW_PATH = path.resolve(__dirname, '../../../public/sw.js');

function createSwHarness() {
  const listeners = new Map<string, (event: unknown) => void>();
  const cacheStore = new Map<string, Map<string, { status: number; body: string }>>();
  const skipWaiting = vi.fn().mockResolvedValue(undefined);
  const clientsClaim = vi.fn().mockResolvedValue(undefined);
  const fetchMock = vi.fn();

  const normalizeKey = (req: { url?: string } | string): string => {
    const raw = typeof req === 'string' ? req : req.url ?? '';
    return new URL(raw, 'https://badminque.app').href;
  };

  const openCache = async (name: string) => {
    if (!cacheStore.has(name)) {
      cacheStore.set(name, new Map());
    }
    const entries = cacheStore.get(name)!;
    return {
      addAll: vi.fn(async (urls: string[]) => {
        for (const u of urls) {
          entries.set(normalizeKey(u), { status: 200, body: `precached:${u}` });
        }
      }),
      put: vi.fn(async (req: { url?: string } | string, res: { status: number; body: string }) => {
        entries.set(normalizeKey(req), res);
      }),
      match: vi.fn(async (req: { url?: string } | string) => {
        return entries.get(normalizeKey(req));
      }),
    };
  };

  const cachesMock = {
    open: vi.fn(openCache),
    keys: vi.fn(async () => Array.from(cacheStore.keys())),
    delete: vi.fn(async (name: string) => cacheStore.delete(name)),
    match: vi.fn(async (req: { url?: string } | string) => {
      const key = normalizeKey(req);
      for (const store of cacheStore.values()) {
        if (store.has(key)) return store.get(key);
      }
      return undefined;
    }),
  };

  const sandbox = {
    URL,
    Promise,
    Error,
    caches: cachesMock,
    fetch: fetchMock,
    self: {
      location: { origin: 'https://badminque.app' },
      addEventListener: (type: string, handler: (event: unknown) => void) => {
        listeners.set(type, handler);
      },
      skipWaiting,
      clients: { claim: clientsClaim },
    },
  };

  const swCode = fs.readFileSync(SW_PATH, 'utf-8');
  vm.runInNewContext(swCode, sandbox);

  const dispatchExtendable = async (
    eventName: string,
    extra: Record<string, unknown> = {}
  ) => {
    const promises: Promise<unknown>[] = [];
    const handler = listeners.get(eventName);
    if (!handler) throw new Error(`Missing ${eventName} listener`);
    handler({
      ...extra,
      waitUntil: (p: Promise<unknown>) => promises.push(p),
    });
    await Promise.all(promises);
  };

  const dispatchFetch = async (request: {
    url: string;
    method?: string;
    mode?: string;
  }) => {
    let responsePromise: Promise<unknown> | undefined;
    const handler = listeners.get('fetch');
    if (!handler) throw new Error('Missing fetch listener');
    handler({
      request: {
        method: request.method ?? 'GET',
        mode: request.mode ?? 'cors',
        url: request.url,
      },
      respondWith: (p: Promise<unknown>) => {
        responsePromise = p;
      },
    });
    if (!responsePromise) return { intercepted: false as const };
    const response = await responsePromise;
    return { intercepted: true as const, response };
  };

  return {
    cacheStore,
    cachesMock,
    fetchMock,
    skipWaiting,
    clientsClaim,
    listeners,
    dispatchExtendable,
    dispatchFetch,
  };
}

describe('Service Worker (public/sw.js)', () => {
  it('precaches offline shell and icons on install and prunes stale caches on activate', async () => {
    const sw = createSwHarness();
    sw.cacheStore.set('badminque-shell-v1', new Map([['/', { status: 200, body: 'old' }]]));

    await sw.dispatchExtendable('install');
    expect(sw.skipWaiting).toHaveBeenCalled();

    const activeCache = sw.cacheStore.get('badminque-shell-v2');
    expect(activeCache).toBeDefined();
    expect(activeCache?.has('https://badminque.app/')).toBe(true);
    expect(activeCache?.has('https://badminque.app/manifest.json')).toBe(true);
    expect(activeCache?.has('https://badminque.app/icons/icon-192.png')).toBe(true);
    expect(activeCache?.has('https://badminque.app/icons/icon-512.png')).toBe(true);

    await sw.dispatchExtendable('activate');
    expect(sw.cacheStore.has('badminque-shell-v1')).toBe(false);
    expect(sw.cacheStore.has('badminque-shell-v2')).toBe(true);
    expect(sw.clientsClaim).toHaveBeenCalled();
  });

  it('never intercepts non-GET requests or /api/* endpoints so live data and offline batch sync stay fresh', async () => {
    const sw = createSwHarness();
    await sw.dispatchExtendable('install');

    const postSync = await sw.dispatchFetch({
      url: 'https://badminque.app/api/v1/sync/batch',
      method: 'POST',
    });
    expect(postSync.intercepted).toBe(false);

    const getLeaderboard = await sw.dispatchFetch({
      url: 'https://badminque.app/api/v1/clubs/club-1/leaderboard',
      method: 'GET',
    });
    expect(getLeaderboard.intercepted).toBe(false);
  });

  it('uses Network-First for navigations and falls back to cached / when offline', async () => {
    const sw = createSwHarness();
    await sw.dispatchExtendable('install');

    // Online navigation returns fresh HTML and updates cache
    const freshHtml = {
      status: 200,
      type: 'basic',
      body: '<html>fresh</html>',
      clone: () => freshHtml,
    };
    sw.fetchMock.mockResolvedValueOnce(freshHtml);

    const onlineResult = await sw.dispatchFetch({
      url: 'https://badminque.app/',
      mode: 'navigate',
    });
    expect(onlineResult.intercepted).toBe(true);
    expect(onlineResult.response).toBe(freshHtml);

    // Offline navigation rejects fetch -> falls back to cached shell '/'
    sw.fetchMock.mockRejectedValueOnce(new Error('Offline'));
    const offlineResult = await sw.dispatchFetch({
      url: 'https://badminque.app/some-route',
      mode: 'navigate',
    });
    expect(offlineResult.intercepted).toBe(true);
    expect(offlineResult.response).toBe(freshHtml);
  });

  it('uses Cache-First for immutable static chunks and icons', async () => {
    const sw = createSwHarness();
    await sw.dispatchExtendable('install');

    const staticUrl = 'https://badminque.app/_next/static/chunks/main-123.js';
    const chunkResponse = {
      status: 200,
      type: 'basic',
      body: 'console.log("ok")',
      clone: () => chunkResponse,
    };
    sw.fetchMock.mockResolvedValueOnce(chunkResponse);

    // First request populates cache
    const miss = await sw.dispatchFetch({ url: staticUrl });
    expect(miss.response).toBe(chunkResponse);
    expect(sw.fetchMock).toHaveBeenCalledTimes(1);

    // Second request hits cache without touching network
    const hit = await sw.dispatchFetch({ url: staticUrl });
    expect(hit.response).toBe(chunkResponse);
    expect(sw.fetchMock).toHaveBeenCalledTimes(1);
  });

  it('calls skipWaiting when receiving SKIP_WAITING message', () => {
    const sw = createSwHarness();
    const msgHandler = sw.listeners.get('message');
    expect(msgHandler).toBeDefined();
    msgHandler?.({ data: { type: 'SKIP_WAITING' } });
    expect(sw.skipWaiting).toHaveBeenCalledTimes(1);
  });
});
