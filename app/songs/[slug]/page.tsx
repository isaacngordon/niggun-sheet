import type { Metadata } from 'next';
import { Suspense } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AuthBoundary from '@/components/AuthBoundary';
import SongDetail from './SongDetail';
import { getSongs, type Song } from '@/app/api/songs/data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://niggunsheet.com';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getFirstLyricLine(lyrics: string): string {
  return lyrics
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0) ?? '';
}

function findSong(songs: Song[], slug: string) {
  return songs.find(
    (s) => slugify(s.title) === slug || slugify(s.search_title) === slug
  ) ?? null;
}

export async function generateStaticParams() {
  const songs = await getSongs();
  const seen = new Set<string>();
  return songs
    .filter((s) => {
      const slug = slugify(s.title);
      if (seen.has(slug)) return false;
      seen.add(slug);
      return true;
    })
    .map((s) => ({ slug: slugify(s.title) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const songs = await getSongs();
  const song = findSong(songs, slug);

  if (!song) {
    return { title: 'Song Not Found | Niggun Sheet' };
  }

  const description = getFirstLyricLine(song.lyrics) || `Lyrics and details for ${song.title}`;
  const artistPart = song.artist ? ` by ${song.artist}` : '';

  return {
    title: `${song.title} | Niggun Sheet`,
    description,
    alternates: { canonical: `${SITE_URL}/songs/${slug}` },
    openGraph: {
      title: `${song.title}${artistPart}`,
      description,
      url: `${SITE_URL}/songs/${slug}`,
      siteName: 'Niggun Sheet',
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title: `${song.title}${artistPart}`,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function SongDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const songs = await getSongs();
  const publicSong = findSong(songs, slug);

  return (
    <AuthBoundary>
      <Header />
      <Suspense fallback={<div className="song-detail-loading">Loading song...</div>}>
        <SongDetail publicSong={publicSong} slug={slug} />
      </Suspense>
      <Footer />
    </AuthBoundary>
  );
}
