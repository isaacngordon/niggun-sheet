'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useGoogleAuth } from '@/components/GoogleAuthProvider';
import AddSongModal from '@/components/AddSongModal';
import MediaPlayer from '@/components/MediaPlayer';
import QuickInstructions from '@/components/QuickInstructions';
import { buildMediaTimingSources, resolveBoundsFromTimingEntry, resolveSourceLabelsFromTimingEntry, type TimingEntry } from '@/lib/timings';
import { extractAllYouTubeUrls } from '@/lib/youtube';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface Song {
  search_title: string;
  title: string;
  lyrics: string;
  artist: string;
  drive: string;
  youtube: string;
  audio: string;
}

interface SongListEntry {
  key: string;
  href: string;
  smartboardHref: string;
  title: string;
  artist: string;
  lyrics: string;
  drive: string;
  audioUrl: string | null;
  youtubeUrl: string | null;
  inPoint: number | null;
  outPoint: number | null;
  isPrivate: boolean;
  privateId?: string;
}

const ENABLE_GRID_VIEW = false;

interface SongsListProps {
  songs: Song[];
  initialSearch: string;
}

export default function SongsList({ songs, initialSearch }: SongsListProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [timingEntriesBySlug, setTimingEntriesBySlug] = useState<Record<string, TimingEntry>>({});
  const { user, privateSongs, preferences, loading: authLoading, ready: authReady, signIn, signOut, addSong, addSongs, removeSong, setPref } = useGoogleAuth();
  const [filter, setFilterState] = useState<'all' | 'library' | 'mine'>((preferences.songsFilter as 'all' | 'library' | 'mine') || 'all');
  const [viewMode, setViewModeState] = useState<'grid' | 'list'>(ENABLE_GRID_VIEW ? ((preferences.songsViewMode as 'grid' | 'list') || 'grid') : 'list');
  const [showAddForm, setShowAddForm] = useState(false);

  // Sync prefs when they load after sign-in
  useEffect(() => {
    if (preferences.songsFilter) setFilterState(preferences.songsFilter as 'all' | 'library' | 'mine');
    if (ENABLE_GRID_VIEW && preferences.songsViewMode) {
      setViewModeState(preferences.songsViewMode as 'grid' | 'list');
      return;
    }
    setViewModeState('list');
  }, [preferences.songsFilter, preferences.songsViewMode]);

  const setFilter = useCallback((v: 'all' | 'library' | 'mine') => {
    setFilterState(v);
    if (user) setPref('songsFilter', v);
  }, [user, setPref]);

  const setViewMode = useCallback((v: 'grid' | 'list') => {
    if (!ENABLE_GRID_VIEW && v === 'grid') return;
    setViewModeState(v);
    if (user) setPref('songsViewMode', v);
  }, [user, setPref]);

  // Convert private songs to Song shape for unified rendering
  const privateSongsAsSongs: (Song & { _privateId: string })[] = useMemo(() =>
    privateSongs.map((s) => ({
      search_title: s.title,
      title: s.title,
      artist: s.artist,
      lyrics: s.lyrics,
      drive: s.driveLink || '',
      youtube: s.youtubeLinks?.join(' ') || '',
      audio: s.audioUrl || '',
      _privateId: s.id,
    })),
  [privateSongs]);

  const filteredSongs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    let pool: (Song & { _privateId?: string })[];
    if (filter === 'mine') {
      pool = privateSongsAsSongs;
    } else if (filter === 'library') {
      pool = songs;
    } else {
      // 'all' — private songs first, then library
      pool = [...privateSongsAsSongs, ...songs];
    }

    if (!query) return pool;
    return pool.filter(
      (song) =>
        song.title.toLowerCase().includes(query) ||
        song.search_title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query) ||
        song.lyrics.toLowerCase().includes(query)
    );
  }, [songs, privateSongsAsSongs, searchQuery, filter]);

  const totalCount = filter === 'mine' ? privateSongsAsSongs.length : filter === 'library' ? songs.length : songs.length + privateSongsAsSongs.length;

  const displayEntries = useMemo<SongListEntry[]>(() => {
    return filteredSongs.flatMap<SongListEntry>((song) => {
      const isPrivate = '_privateId' in song && !!song._privateId;
      const songSlug = isPrivate ? `my-${song._privateId}` : slugify(song.title);
      const fallbackSlug = isPrivate ? null : slugify(song.search_title || song.title);
      const timingEntry = timingEntriesBySlug[songSlug] ?? (fallbackSlug ? timingEntriesBySlug[fallbackSlug] : undefined);
      const urls = extractAllYouTubeUrls(song.youtube);
      const mediaSources = buildMediaTimingSources(song.audio, urls, resolveSourceLabelsFromTimingEntry(timingEntry));
      const primarySourceKey = mediaSources[0]?.key ?? null;

      if (mediaSources.length <= 1) {
        const source = mediaSources[0] ?? null;
        const bounds = resolveBoundsFromTimingEntry(timingEntry, source?.key ?? primarySourceKey, primarySourceKey);
        const hrefBase = isPrivate ? `/songs/my-${song._privateId}` : `/songs/${slugify(song.title)}`;

        return [{
          key: `${hrefBase}-${source?.key ?? 'default'}`,
          href: source?.key ? `${hrefBase}?timingSource=${encodeURIComponent(source.key)}` : hrefBase,
          smartboardHref: `/smartboard-mode?slug=${encodeURIComponent(isPrivate ? `my-${song._privateId}` : slugify(song.title))}&lyrics=${encodeURIComponent(song.lyrics)}${song.audio ? `&audio=${encodeURIComponent(song.audio)}` : ''}${source?.youtubeUrl ? `&youtube=${encodeURIComponent(source.youtubeUrl)}` : ''}${source?.key ? `&timingSource=${encodeURIComponent(source.key)}` : ''}`,
          title: song.title,
          artist: song.artist,
          lyrics: song.lyrics,
          drive: song.drive,
          audioUrl: song.audio || null,
          youtubeUrl: source?.youtubeUrl ?? urls[0] ?? null,
          inPoint: bounds.inPoint,
          outPoint: bounds.outPoint,
          isPrivate,
          privateId: isPrivate ? song._privateId : undefined,
        }];
      }

      return mediaSources.map((source) => {
        const hrefBase = isPrivate ? `/songs/my-${song._privateId}` : `/songs/${slugify(song.title)}`;
        const bounds = resolveBoundsFromTimingEntry(timingEntry, source.key, primarySourceKey);

        return {
          key: `${hrefBase}-${source.key}`,
          href: `${hrefBase}?timingSource=${encodeURIComponent(source.key)}`,
          smartboardHref: `/smartboard-mode?slug=${encodeURIComponent(isPrivate ? `my-${song._privateId}` : slugify(song.title))}&lyrics=${encodeURIComponent(song.lyrics)}${source.youtubeUrl ? `&youtube=${encodeURIComponent(source.youtubeUrl)}` : ''}${source.key ? `&timingSource=${encodeURIComponent(source.key)}` : ''}`,
          title: song.title,
          artist: source.label,
          lyrics: song.lyrics,
          drive: song.drive,
          audioUrl: null,
          youtubeUrl: source.youtubeUrl,
          inPoint: bounds.inPoint,
          outPoint: bounds.outPoint,
          isPrivate,
          privateId: isPrivate ? song._privateId : undefined,
        };
      });
    });
  }, [filteredSongs, timingEntriesBySlug]);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/timings')
      .then((res) => (res.ok ? res.json() : null))
      .then((raw: Record<string, TimingEntry> | null) => {
        if (cancelled || !raw || typeof raw !== 'object') return;
        setTimingEntriesBySlug(raw);
      })
      .catch(() => {
        if (!cancelled) setTimingEntriesBySlug({});
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <QuickInstructions
        title="How to use the song directory"
        steps={[
          'Type a song name, singer, or lyric word in the search box.',
          'Click a song to open the full words and tools for that song.',
          'Sign in if you want to save your own songs under My Songs.',
        ]}
        note={user ? 'Your saved songs are in My Songs.' : 'Want your own songs here? Sign in, then press Add Song.'}
      />
      <div className="search-section">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Find a song by name, singer, or words..."
          className="search-input"
        />
        {user && (
          <button className="my-songs-add-btn" onClick={() => setShowAddForm(true)}>+ Add Song</button>
        )}
      </div>

      <div className="songs-filter-bar">
        <div className="songs-filter-tabs">
          <button className={`songs-filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All Songs</button>
          <button className={`songs-filter-tab ${filter === 'library' ? 'active' : ''}`} onClick={() => setFilter('library')}>Library</button>
          <button className={`songs-filter-tab ${filter === 'mine' ? 'active' : ''}`} onClick={() => { if (!user) { signIn().then(() => setFilter('mine')); } else { setFilter('mine'); } }}>
            My Songs{user && privateSongs.length > 0 ? ` (${privateSongs.length})` : ''}
          </button>
        </div>
        {ENABLE_GRID_VIEW && (
          <div className="songs-filter-right">
            <div className="songs-view-toggle">
              <button className={`songs-view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} aria-label="Grid view">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              </button>
              <button className={`songs-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} aria-label="List view">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <AddSongModal open={showAddForm} onClose={() => setShowAddForm(false)} onSave={addSong} onSaveBulk={addSongs} />

      <p className="songs-count">
        Showing {displayEntries.length} of {filteredSongs.length} {filteredSongs.length === 1 ? 'song' : 'songs'}
      </p>

      {displayEntries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            {filter === 'mine' ? 'No private songs yet' : 'No songs found'}
          </p>
          <p>{filter === 'mine' ? 'Press Add Song to save your first song.' : 'Try a different word in the search box.'}</p>
        </div>
      ) : (
        <div className={viewMode === 'list' ? 'songs-list' : 'songs-grid'}>
          {viewMode === 'list' && (
            <div className="songs-list-header" aria-hidden="true">
              <span>Track</span>
              <span>Playback + Actions</span>
            </div>
          )}
          {displayEntries.map((entry, index) => {
            const lyricLines = entry.lyrics
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean);
            const listExcerpt = lyricLines.slice(0, 2).join('  ') ?? '';
            return (
              <div key={entry.key} className={`song-card ${entry.isPrivate ? 'private-song-card' : ''}`}>
                <Link href={entry.href} className="song-card-link">
                  {viewMode === 'list' ? (
                    <div className="song-list-headline">
                      <span className="song-list-index">{String(index + 1).padStart(2, '0')}</span>
                      <div className="song-list-meta">
                        {entry.isPrivate && <div className="private-badge">My Song</div>}
                        <h3 className="song-title">{entry.title}</h3>
                        {entry.artist && <p className="song-artist">{entry.artist}</p>}
                      </div>
                    </div>
                  ) : (
                    <>
                      {entry.isPrivate && <div className="private-badge">My Song</div>}
                      <h3 className="song-title">{entry.title}</h3>
                      {entry.artist && <p className="song-artist">{entry.artist}</p>}
                    </>
                  )}
                  {viewMode === 'grid' && (
                    <div className="song-lyrics">
                      {entry.lyrics.split('\n').slice(0, 4).join('\n')}
                      {entry.lyrics.split('\n').length > 4 && '...'}
                    </div>
                  )}
                </Link>
                {viewMode === 'list' && (
                  <p className="song-list-excerpt">{listExcerpt || '\u2014'}</p>
                )}
                <div className="song-links">
                  <div className="song-player-rail">
                    {(entry.audioUrl || entry.youtubeUrl) && (
                      <MediaPlayer
                        audioUrl={entry.audioUrl}
                        youtubeUrl={entry.youtubeUrl}
                        inPoint={entry.inPoint}
                        outPoint={entry.outPoint}
                      />
                    )}
                  </div>

                  <div className="song-quick-actions">
                    {/* Secondary icon-only actions */}
                    {entry.drive && (
                      <a
                        href={entry.drive}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="song-link song-link-icon"
                        aria-label="Open Drive link"
                        title="Open Drive link"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                      </a>
                    )}
                    {entry.isPrivate && (
                      <button
                        className="song-link song-link-icon private-delete-btn"
                        onClick={() => { if (confirm(`Delete "${entry.title}"?`)) removeSong(entry.privateId!); }}
                        aria-label="Delete private song"
                        title="Delete private song"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6L17.8 20a2 2 0 01-2 2H8.2a2 2 0 01-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
                      </button>
                    )}
                    {/* Primary CTA — always labeled */}
                    <a
                      href={entry.smartboardHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="song-smartboard-btn"
                      title="Open in Smartboard mode"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                      <span>Smartboard</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
