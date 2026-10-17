import { describe, expect, it } from 'vitest';
import { viewport, metadata } from './layout';

describe('Courtside PWA Viewport and Metadata Settings', () => {
  it('enforces fixed scale and disables zoom for courtside tablet operation', () => {
    expect(viewport.width).toBe('device-width');
    expect(viewport.initialScale).toBe(1);
    expect(viewport.maximumScale).toBe(1);
    expect(viewport.userScalable).toBe(false);
  });

  it('sets theme color matching dark mode venue palette', () => {
    expect(viewport.themeColor).toBe('#0f172a');
  });

  it('configures standalone manifest and apple web app capabilities', () => {
    expect(metadata.manifest).toBe('/manifest.json');
    expect(metadata.appleWebApp).toEqual({
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'Badminque',
    });
  });
});
