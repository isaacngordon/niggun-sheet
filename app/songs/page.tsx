import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SongsList from './SongsList';
import { getSongs } from '@/app/api/songs/data';

export default async function SongsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const songs = await getSongs();
  const params = await searchParams;
  const searchQuery = params.search || '';

  return (
    <>
      <Header />
      <main className="songs-container">
        <h1 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Song Directory</h1>
        <SongsList songs={songs} initialSearch={searchQuery} />
      </main>
      <Footer />
    </>
  );
}
