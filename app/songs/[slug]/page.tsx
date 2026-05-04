import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AuthBoundary from '@/components/AuthBoundary';
import SongDetail from './SongDetail';
import { getSongs } from '@/app/api/songs/data';

export default async function SongDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const songs = await getSongs();

  // Find the public song matching this slug
  const publicSong = songs.find(
    (s) => slugify(s.title) === slug || slugify(s.search_title) === slug
  ) ?? null;

  return (
    <AuthBoundary>
      <Header />
      <SongDetail publicSong={publicSong} slug={slug} />
      <Footer />
    </AuthBoundary>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
