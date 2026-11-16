import type { Metadata, Viewport } from 'next';
import { Fredoka, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SWRegister, OfflineIndicator } from '@/components/pwa/PWAControls';

const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-fredoka',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#4C1D95',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'NAIJA PARTY — 234 PLAYERS',
  description:
    'One Phone. Four Players. Endless Fun. Offline same-phone cartoon arcade multiplayer mini-games.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NAIJA PARTY',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'NAIJA PARTY — 234 PLAYERS',
    description:
      'Play 12 offline same-phone multiplayer mini-games with friends and family.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NAIJA PARTY — 234 PLAYERS',
    description: 'One Phone. Four Players. Endless Fun.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fredoka.variable} ${jakarta.variable} ${jetbrains.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen arcade-bg text-white antialiased selection:bg-yellow-300 selection:text-slate-950"
      >
        <SWRegister />
        {children}
        <OfflineIndicator />
      </body>
    </html>
  );
}
