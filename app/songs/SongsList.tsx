'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useGoogleAuth } from '@/components/GoogleAuthProvider';
import AddSongModal from '@/components/AddSongModal';
import MediaPlayer from '@/components/MediaPlayer';
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

interface TimingBounds {
  inPoint: number | null;
  outPoint: number | null;
}

interface StoredTimingClip {
  verseIndex: number;
  start: number;
}

interface ClipTimingEntry {
  version?: number;
  clips?: StoredTimingClip[];
  inPoint?: number | null;
  outPoint?: number | null;
  useClipEdgeBounds?: boolean;
}

type RawTimingEntry = number[] | ClipTimingEntry;

const DEFAULT_CARD_LENGTH = 6;

function normalizeBoundaryPoint(point: unknown): number | null {
  if (typeof point !== 'number' || !Number.isFinite(point) || point < 0) return null;
  return Number(point.toFixed(2));
}

function normalizeTimingBounds(inPoint: unknown, outPoint: unknown): TimingBounds {
  const nextInPoint = normalizeBoundaryPoint(inPoint);
  let nextOutPoint = normalizeBoundaryPoint(outPoint);
  if (nextInPoint != null && nextOutPoint != null && nextOutPoint <= nextInPoint) {
    nextOutPoint = null;
  }
  return { inPoint: nextInPoint, outPoint: nextOutPoint };
}

function sanitizeClips(clips: unknown): StoredTimingClip[] {
  if (!Array.isArray(clips)) return [];
  return clips
    .filter((clip): clip is StoredTimingClip =>
      !!clip &&
      typeof clip === 'object' &&
      typeof (clip as StoredTimingClip).start === 'number' &&
      Number.isFinite((clip as StoredTimingClip).start)
    )
    .map((clip) => ({
      verseIndex: Number.isFinite(clip.verseIndex) ? Math.round(clip.verseIndex) : -1,
      start: Number(clip.start.toFixed(2)),
    }))
    .sort((a, b) => a.start - b.start);
}

function deriveBoundsFromClipEdges(clips: StoredTimingClip[], outPoint: number | null): TimingBounds {
  if (clips.length === 0) return { inPoint: null, outPoint: null };
  const first = clips[0].start;
  const last = clips[clips.length - 1].start;
  const defaultOutPoint = Number((last + DEFAULT_CARD_LENGTH).toFixed(2));
  const normalizedOut = normalizeBoundaryPoint(outPoint);
  const boundedOut = normalizedOut != null && normalizedOut > last
    ? Math.min(normalizedOut, defaultOutPoint)
    : defaultOutPoint;
  return normalizeTimingBounds(first, boundedOut);
}

function resolveBoundsFromEntry(entry: RawTimingEntry | undefined): TimingBounds {
  if (!entry) return { inPoint: null, outPoint: null };

  if (Array.isArray(entry)) {
    const clips = entry
      .map((start, verseIndex) => ({ verseIndex, start }))
      .filter((clip) => Number.isFinite(clip.start) && clip.start >= 0)
      .sort((a, b) => a.start - b.start);
    return deriveBoundsFromClipEdges(clips, null);
  }

  const clips = sanitizeClips(entry.clips);
  const manualBounds = normalizeTimingBounds(entry.inPoint, entry.outPoint);
  const useClipEdgeBounds = typeof entry.useClipEdgeBounds === 'boolean' ? entry.useClipEdgeBounds : true;
  if (useClipEdgeBounds) {
    return deriveBoundsFromClipEdges(clips, manualBounds.outPoint);
  }
  return manualBounds;
}

interface SongsListProps {
  songs: Song[];
  initialSearch: string;
}

export default function SongsList({ songs, initialSearch }: SongsListProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [timingBoundsBySlug, setTimingBoundsBySlug] = useState<Record<string, TimingBounds>>({});
  const { user, privateSongs, preferences, loading: authLoading, ready: authReady, signIn, signOut, addSong, addSongs, removeSong, setPref } = useGoogleAuth();
  const [filter, setFilterState] = useState<'all' | 'library' | 'mine'>((preferences.songsFilter as 'all' | 'library' | 'mine') || 'all');
  const [viewMode, setViewModeState] = useState<'grid' | 'list'>((preferences.songsViewMode as 'grid' | 'list') || 'grid');
  const [showAddForm, setShowAddForm] = useState(false);

  // Sync prefs when they load after sign-in
  useEffect(() => {
    if (preferences.songsFilter) setFilterState(preferences.songsFilter as 'all' | 'library' | 'mine');
    if (preferences.songsViewMode) setViewModeState(preferences.songsViewMode as 'grid' | 'list');
  }, [preferences.songsFilter, preferences.songsViewMode]);

  const setFilter = useCallback((v: 'all' | 'library' | 'mine') => {
    setFilterState(v);
    if (user) setPref('songsFilter', v);
  }, [user, setPref]);

  const setViewMode = useCallback((v: 'grid' | 'list') => {
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

  useEffect(() => {
    let cancelled = false;

    fetch('/api/timings')
      .then((res) => (res.ok ? res.json() : null))
      .then((raw: Record<string, RawTimingEntry> | null) => {
        if (cancelled || !raw || typeof raw !== 'object') return;
        const next: Record<string, TimingBounds> = {};
        for (const [slug, entry] of Object.entries(raw)) {
          next[slug] = resolveBoundsFromEntry(entry);
        }
        setTimingBoundsBySlug(next);
      })
      .catch(() => {
        if (!cancelled) setTimingBoundsBySlug({});
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="search-section">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title, artist, or lyrics..."
          className="search-input"
        />
      </div>

      <div className="songs-filter-bar">
        <div className="songs-filter-tabs">
          <button className={`songs-filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All Songs</button>
          <button className={`songs-filter-tab ${filter === 'library' ? 'active' : ''}`} onClick={() => setFilter('library')}>Library</button>
          <button className={`songs-filter-tab ${filter === 'mine' ? 'active' : ''}`} onClick={() => { if (!user) { signIn().then(() => setFilter('mine')); } else { setFilter('mine'); } }}>
            My Songs{user && privateSongs.length > 0 ? ` (${privateSongs.length})` : ''}
          </button>
        </div>
        <div className="songs-filter-right">
          <div className="songs-view-toggle">
            <button className={`songs-view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} aria-label="Grid view">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
            </button>
            <button className={`songs-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} aria-label="List view">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            </button>
          </div>
          {user && (
            <button className="my-songs-add-btn" onClick={() => setShowAddForm(true)}>+ Add Song</button>
          )}
        </div>
      </div>

      <AddSongModal open={showAddForm} onClose={() => setShowAddForm(false)} onSave={addSong} onSaveBulk={addSongs} />

      <p className="songs-count">
        Showing {filteredSongs.length} of {totalCount} {filter === 'mine' ? 'private songs' : 'niggunim'}
      </p>

      {filteredSongs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            {filter === 'mine' ? 'No private songs yet' : 'No songs found'}
          </p>
          <p>{filter === 'mine' ? 'Use "+ Add Song" to create your first private song' : 'Try a different search term'}</p>
        </div>
      ) : (
        <div className={viewMode === 'list' ? 'songs-list' : 'songs-grid'}>
          {filteredSongs.map((song, index) => {
            const isPrivate = '_privateId' in song && !!song._privateId;
            const href = isPrivate ? `/songs/my-${song._privateId}` : `/songs/${slugify(song.title)}`;
            const songSlug = isPrivate ? `my-${song._privateId}` : slugify(song.title);
            const fallbackSlug = isPrivate ? null : slugify(song.search_title || song.title);
            const bounds = timingBoundsBySlug[songSlug] ?? (fallbackSlug ? timingBoundsBySlug[fallbackSlug] : undefined) ?? { inPoint: null, outPoint: null };
            const cardKey = isPrivate ? `my-${song._privateId}` : `${href}-${song.artist || 'unknown-artist'}`;
            return (
              <div key={cardKey} className={`song-card ${isPrivate ? 'private-song-card' : ''}`}>
                <Link href={href} className="song-card-link">
                  {isPrivate && <div className="private-badge">My Song</div>}
                  <h3 className="song-title">{song.title}</h3>
                  {song.artist && <p className="song-artist">{song.artist}</p>}
                  {viewMode === 'grid' && (
                    <div className="song-lyrics">
                      {song.lyrics.split('\n').slice(0, 4).join('\n')}
                      {song.lyrics.split('\n').length > 4 && '...'}
                    </div>
                  )}
                </Link>
                <div className="song-links">
                  {song.drive && (
                    <a href={song.drive} target="_blank" rel="noopener noreferrer" className="song-link">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg> Drive
                    </a>
                  )}
                  {(song.audio || song.youtube) && (() => {
                    const urls = extractAllYouTubeUrls(song.youtube);
                    if (!song.audio && urls.length === 0) return null;
                    if (song.audio) {
                      return <MediaPlayer audioUrl={song.audio} youtubeUrl={urls[0] || ''} inPoint={bounds.inPoint} outPoint={bounds.outPoint} />;
                    }
                    return (
                      <div className={`yt-players-stack${urls.length > 1 ? ' double' : ''}`}>
                        {urls.map((u, i) => <MediaPlayer key={`${cardKey}-${u}-${i}`} youtubeUrl={u} inPoint={bounds.inPoint} outPoint={bounds.outPoint} />)}
                      </div>
                    );
                  })()}
                  <a
                    href={`/smartboard-mode?slug=${encodeURIComponent(isPrivate ? `my-${song._privateId}` : slugify(song.title))}&lyrics=${encodeURIComponent(song.lyrics)}${song.audio ? `&audio=${encodeURIComponent(song.audio)}` : ''}${song.youtube ? `&youtube=${encodeURIComponent(extractAllYouTubeUrls(song.youtube)[0] || '')}` : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="song-link"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg> Open for Smartboard
                  </a>
                  {isPrivate && (
                    <button className="song-link private-delete-btn" onClick={() => { if (confirm(`Delete "${song.title}"?`)) removeSong(song._privateId!); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6L17.8 20a2 2 0 01-2 2H8.2a2 2 0 01-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
