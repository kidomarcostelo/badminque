import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Google Stitch Material Design 3 Surface Containers
        surface: '#f8fafc',
        'surface-dim': '#f1f5f9',
        'surface-bright': '#ffffff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f8fafc',
        'surface-container': '#f1f5f9',
        'surface-container-high': '#e2e8f0',
        'surface-container-highest': '#cbd5e1',
        'on-surface': '#0f172a',
        'on-surface-variant': '#64748b',
        outline: '#94a3b8',
        'outline-variant': '#e2e8f0',
        // Google Stitch Primary Brand & Accents
        primary: '#4f46e5',
        'primary-container': '#6366f1',
        'on-primary': '#ffffff',
        'on-primary-container': '#ffffff',
        secondary: '#475569',
        'secondary-container': '#f1f5f9',
        'on-secondary': '#1e293b',
        tertiary: '#7c3aed',
        'tertiary-container': '#ede9fe',
        'emerald-accent': '#059669',
        'emerald-container': '#ecfdf5',
        'error-container': '#fef2f2',
        error: '#ef4444',
      },
      fontFamily: {
        'body-base': ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        'headline-md': ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        'mono-data': ['JetBrains Mono', 'monospace'],
        'mono-badge': ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
