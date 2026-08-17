import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Frank_Ruhl_Libre, Noto_Serif_Hebrew, DM_Sans } from 'next/font/google';
import { Suspense } from 'react';
import Analytics from '@/components/Analytics';
import AnalyticsPreferences from '@/components/AnalyticsPreferences';
import DebugRectTool from '@/components/DebugRectTool';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://niggunsheet.com';

const frankRuhlLibre = Frank_Ruhl_Libre({
  subsets: ['hebrew', 'latin'],
  display: 'swap',
  variable: '--font-frank-ruhl-libre',
});

const notoSerifHebrew = Noto_Serif_Hebrew({
  subsets: ['hebrew', 'latin'],
  display: 'swap',
  variable: '--font-noto-serif-hebrew',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-dm-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Niggun Sheet',
    template: '%s | Niggun Sheet',
  },
  description: 'Discover your perfect niggun. Build printable kumzitz sheets, browse Jewish songs, and run Smartboard-friendly lyrics mode.',
  keywords: [
    'niggun',
    'niggunim',
    'kumzitz',
    'kumzits sheets',
    'Jewish music lyrics',
    'sheet builder',
    'smartboard lyrics',
    'yeshiva songs',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Niggun Sheet',
    title: 'Niggun Sheet',
    description: 'Build printable kumzitz sheets, browse niggunim, and project lyrics in Smartboard mode.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Niggun Sheet',
    description: 'Build printable kumzitz sheets, browse niggunim, and project lyrics in Smartboard mode.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${frankRuhlLibre.variable} ${notoSerifHebrew.variable} ${dmSans.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        {children}
        {process.env.NODE_ENV === 'development' && <DebugRectTool />}
        <AnalyticsPreferences />
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
