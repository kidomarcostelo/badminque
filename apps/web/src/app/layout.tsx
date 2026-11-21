import type { Metadata, Viewport } from 'next';
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
    <html lang="en" className="light h-full overflow-hidden">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-surface font-body-base text-on-surface h-screen w-screen overflow-hidden flex flex-col justify-between text-xs antialiased selection:bg-primary selection:text-white">
        {children}
      </body>
    </html>
  );
}
