import './globals.css';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import Analytics from '@/components/Analytics';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Niggun Sheet',
  description: 'Discover Your Perfect Niggun - the next generation of Kumzits Sheets',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
