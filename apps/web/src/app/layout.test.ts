import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';
import { viewport, metadata } from './layout';

const PUBLIC_DIR = path.resolve(__dirname, '../../public');

describe('Courtside PWA Viewport and Metadata Settings', () => {
  it('enforces fixed scale and disables zoom for courtside tablet operation', () => {
    expect(viewport.width).toBe('device-width');
    expect(viewport.initialScale).toBe(1);
    expect(viewport.maximumScale).toBe(1);
    expect(viewport.userScalable).toBe(false);
  });

  it('sets theme color matching Google Stitch Silk Light palette', () => {
    expect(viewport.themeColor).toBe('#f8fafc');
  });

  it('configures standalone manifest, apple web app, and icon metadata', () => {
    expect(metadata.manifest).toBe('/manifest.json');
    expect(metadata.appleWebApp).toEqual({
      capable: true,
      statusBarStyle: 'default',
      title: 'Badminque',
    });
    expect(metadata.icons).toBeDefined();
  });

  it('ships valid manifest.json aligned with Silk Light palette and existing PNG icons', () => {
    const manifestPath = path.join(PUBLIC_DIR, 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as {
      name: string;
      short_name: string;
      display: string;
      theme_color: string;
      background_color: string;
      icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    };

    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#f8fafc');
    expect(manifest.background_color).toBe('#f8fafc');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    for (const icon of manifest.icons) {
      const iconFilePath = path.join(PUBLIC_DIR, icon.src.replace(/^\//, ''));
      expect(fs.existsSync(iconFilePath)).toBe(true);
      const fileBytes = fs.readFileSync(iconFilePath);
      expect(fileBytes.subarray(0, 8).equals(pngHeader)).toBe(true);
      expect(fileBytes.byteLength).toBeGreaterThan(200);
    }

    expect(fs.existsSync(path.join(PUBLIC_DIR, 'icons/apple-touch-icon.png'))).toBe(true);
  });

  it('configures no-cache headers for /sw.js in next.config.ts', async () => {
    expect(typeof nextConfig.headers).toBe('function');
    const headerRules = await nextConfig.headers?.();
    const swRule = headerRules?.find((rule) => rule.source === '/sw.js');
    expect(swRule).toBeDefined();
    const cacheHeader = swRule?.headers.find(
      (h) => h.key.toLowerCase() === 'cache-control'
    );
    expect(cacheHeader?.value).toContain('no-cache');
  });
});
