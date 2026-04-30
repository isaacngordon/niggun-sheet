import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import Analytics from '@/components/Analytics';
import Providers from '@/components/Providers';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://niggunsheet.com';

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@300..900&family=Noto+Serif+Hebrew:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          {children}
          <Suspense fallback={null}>
            <Analytics />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
