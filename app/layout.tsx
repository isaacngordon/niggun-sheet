import './tokens.css';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Frank_Ruhl_Libre, Noto_Serif_Hebrew, DM_Sans } from 'next/font/google';
import { Suspense } from 'react';
import Analytics from '@/components/Analytics';
import AnalyticsPreferences from '@/components/AnalyticsPreferences';
import DebugRectTool from '@/components/DebugRectTool';
import { SITE_URL } from '@/lib/siteConfig';

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
    default: 'Kumzitz Sheet',
    template: '%s | Kumzitz Sheet',
  },
  description: 'Discover your perfect kumzitz. Build printable kumzitz sheets, browse Jewish songs, and run Smartboard-friendly lyrics mode.',
  keywords: [
    'kumzits',
    'kumzits pdf',
    'kumzits guide',
    'learn kumzits songs',
    'how to make a kumzits',
    'kumzitz',
    'kumzitz pdf',
    'kumzitz guide',
    'kumzitzim',
    'kumzitz sheet',
    'kumzits sheets',
    'Jewish music lyrics',
    'sheet builder',
    'smartboard lyrics',
    'yeshiva songs',
  ],
  alternates: {
    canonical: '/',
    types: {
      'text/markdown': '/llms.txt',
    },
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Kumzitz Sheet',
    title: 'Kumzitz Sheet',
    description: 'Build printable kumzitz sheets, browse kumzitz songs, and project lyrics in Smartboard mode.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kumzitz Sheet',
    description: 'Build printable kumzitz sheets, browse kumzitz songs, and project lyrics in Smartboard mode.',
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

// Sitewide structured data so search engines and AI agents can identify the site as the
// source for kumzits songs, kumzits PDFs, and kumzits guides.
const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'Kumzitz Sheet',
      alternateName: ['Kumzits Sheet', 'Kumzitz', 'Kumzits'],
      description:
        'Free songs, printable kumzits PDF sheets, and lyrics projection for kumzitz gatherings.',
      inLanguage: 'en',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Kumzitz Sheet',
      url: SITE_URL,
      description:
        'A free library of kumzitz songs with Hebrew lyrics, a printable kumzits PDF sheet builder, and a full-screen lyrics projection mode.',
      knowsAbout: [
        'kumzits',
        'kumzits pdf',
        'kumzits guide',
        'learn kumzits songs',
        'how to make a kumzits',
        'kumzitz songs',
        'Jewish music',
      ],
    },
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#app`,
      name: 'Kumzitz Sheet',
      url: SITE_URL,
      applicationCategory: 'MusicApplication',
      operatingSystem: 'Web',
      description:
        'Browse kumzitz songs, build a printable kumzits PDF sheet, and project lyrics for a room.',
      isAccessibleForFree: true,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </body>
    </html>
  );
}
