import type { Metadata, Viewport } from 'next';
import { PwaLifecycleRegistrar } from '../features/pwa';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f8fafc',
};

export const metadata: Metadata = {
  title: 'Badminque | Courtside Station OS',
  description: 'Club-first badminton rating and match-tracking system',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Badminque',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en" className="light">
      <body className="bg-surface font-body-base text-on-surface min-h-screen w-full flex flex-col justify-between text-xs antialiased selection:bg-primary selection:text-white">
        {children}
        <PwaLifecycleRegistrar />
      </body>
    </html>
  );
}
