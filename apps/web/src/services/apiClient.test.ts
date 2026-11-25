import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApiUrl } from './apiClient';

describe('buildApiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses NEXT_PUBLIC_API_URL when configured and strips trailing slashes', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://badminque-api.koyeb.app/');
    expect(buildApiUrl('/api/v1/sync/batch')).toBe(
      'https://badminque-api.koyeb.app/api/v1/sync/batch'
    );
  });

  it('prefers explicit overrideBaseUrl over NEXT_PUBLIC_API_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://badminque-api.koyeb.app');
    expect(
      buildApiUrl('/api/v1/sync/batch', 'https://staging.example.com/')
    ).toBe('https://staging.example.com/api/v1/sync/batch');
  });

  it('falls back to relative path when neither env nor fallback is provided', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    expect(buildApiUrl('api/v1/clubs/1/players')).toBe('/api/v1/clubs/1/players');
  });

  it('uses fallbackBaseUrl when NEXT_PUBLIC_API_URL is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    expect(
      buildApiUrl('/api/v1/sync/batch', undefined, 'http://localhost:8000')
    ).toBe('http://localhost:8000/api/v1/sync/batch');
  });
});
