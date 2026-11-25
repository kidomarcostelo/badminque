/**
 * Resolves full API endpoint URLs cleanly across local dev and cloud deployments.
 * Uses NEXT_PUBLIC_API_URL when configured (Vercel -> Koyeb), or falls back to
 * an explicit base URL or relative path.
 */
export function buildApiUrl(
  path: string,
  overrideBaseUrl?: string,
  fallbackBaseUrl = ''
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const rawBase =
    overrideBaseUrl || process.env.NEXT_PUBLIC_API_URL || fallbackBaseUrl;
  const base = rawBase.replace(/\/+$/, '');
  return base ? `${base}${normalizedPath}` : normalizedPath;
}
