import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AuthBoundary from '@/components/AuthBoundary';
import SongsList from './SongsList';
import { getSongs } from '@/app/api/songs/data';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Song Directory',
  description: 'Browse niggunim with lyrics, artist info, and playback links. Search and organize songs for your kumzitz.',
  alternates: {
    canonical: '/songs',
  },
  openGraph: {
    title: 'Song Directory | Niggun Sheet',
    description: 'Browse niggunim with lyrics, artist info, and playback links.',
    type: 'website',
  },
};

export default async function SongsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const songs = await getSongs();
  const params = await searchParams;
  const searchQuery = params.search || '';

  return (
    <AuthBoundary>
      <Header />
      <main className="songs-container">
        <div className="songs-hero-image-wrap" aria-hidden="true">
          <Image
            src="/assets/background_small.jpg"
            alt=""
            width={2048}
            height={768}
            className="songs-hero-image"
            priority
          />
        </div>
        <h1 className="song-directory-title">Song Directory</h1>
        <SongsList songs={songs} initialSearch={searchQuery} />
      </main>
      <Footer />
    </AuthBoundary>
  );
}
