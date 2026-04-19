'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useGoogleAuth } from '@/components/GoogleAuthProvider';
import AddSongModal from '@/components/AddSongModal';
import { extractYouTubeId, extractAllYouTubeUrls, ensureYTApi, playbackBus, fmt } from '@/lib/youtube';

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
}

function YouTubePlayer({ url }: { url: string }) {
  const videoId = extractYouTubeId(url);
  const playerRef = useRef<any>(null);
  const playingRef = useRef(false);
  const readyRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const destroyedRef = useRef(false);
  const idRef = useRef(`yt-${Math.random().toString(36).slice(2, 8)}`);

  // Pause when another player starts
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail !== idRef.current && playerRef.current && readyRef.current) {
        try { playerRef.current.pauseVideo(); } catch {}
      }
    };
    playbackBus?.addEventListener('play', handler);
    return () => {
      playbackBus?.removeEventListener('play', handler);
      destroyedRef.current = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      try { playerRef.current?.destroy?.(); } catch {}
    };
  }, []);

  // Track progress while playing
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        const t = playerRef.current?.getCurrentTime?.() || 0;
        setProgress(t);
      }, 250);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing]);

  const initAndPlay = useCallback(async () => {
    if (!videoId || destroyedRef.current) return;

    // Already initialized — just toggle
    if (playerRef.current && readyRef.current) {
      if (playingRef.current) {
        playerRef.current.pauseVideo();
      } else {
        playbackBus?.dispatchEvent(new CustomEvent('play', { detail: idRef.current }));
        playerRef.current.playVideo();
      }
      return;
    }

    // Still initializing from a previous click
    if (playerRef.current) return;

    // Fast path: if API already preloaded, skip await to keep user gesture context
    if (!(window as any).YT?.Player) {
      setLoading(true);
      try { await ensureYTApi(); } catch { setLoading(false); return; }
      if (destroyedRef.current || !hostRef.current) return;
    }

    // Create a fresh div for the player (YT.Player replaces it)
    const el = document.createElement('div');
    hostRef.current!.appendChild(el);

    playbackBus?.dispatchEvent(new CustomEvent('play', { detail: idRef.current }));

    playerRef.current = new (window as any).YT.Player(el, {
      height: '1',
      width: '1',
      videoId,
      playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1, rel: 0, origin: window.location.origin },
      events: {
        onReady: () => {
          if (destroyedRef.current) return;
          readyRef.current = true;
          setReady(true);
          setLoading(false);
          setDuration(playerRef.current?.getDuration?.() || 0);
          // Explicitly play — autoplay may be blocked by browser
          playbackBus?.dispatchEvent(new CustomEvent('play', { detail: idRef.current }));
          try { playerRef.current?.playVideo(); } catch {}
        },
        onStateChange: (e: any) => {
          if (destroyedRef.current) return;
          const isPlaying = e.data === 1;
          playingRef.current = isPlaying;
          setPlaying(isPlaying);
          if (isPlaying) setDuration(playerRef.current?.getDuration?.() || 0);
        },
        onError: () => {
          if (destroyedRef.current) return;
          setLoading(false);
        },
      },
    });
  }, [videoId]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    playerRef.current.seekTo(pct * duration, true);
    setProgress(pct * duration);
  }, [duration]);

  if (!videoId) return null;

  return (
    <div className="yt-audio-player">
      <div ref={hostRef} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }} />
      <button className="yt-play-btn" onClick={initAndPlay} disabled={loading} aria-label={playing ? 'Pause' : 'Play'}>
        {loading ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="20 40" /></svg>
        ) : playing ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        )}
      </button>
      <div className="yt-progress-bar" onClick={seek}>
        <div className="yt-progress-fill" style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }} />
      </div>
      <span className="yt-time">{ready && duration ? fmt(progress) : '--:--'}</span>
    </div>
  );
}

interface SongsListProps {
  songs: Song[];
  initialSearch: string;
}

export default function SongsList({ songs, initialSearch }: SongsListProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
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
            return (
              <div key={isPrivate ? `my-${song._privateId}` : index} className={`song-card ${isPrivate ? 'private-song-card' : ''}`}>
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
                  {song.youtube && (() => {
                    const urls = extractAllYouTubeUrls(song.youtube);
                    if (urls.length === 0) return null;
                    return (
                      <div className={`yt-players-stack${urls.length > 1 ? ' double' : ''}`}>
                        {urls.map((u, i) => <YouTubePlayer key={i} url={u} />)}
                      </div>
                    );
                  })()}
                  <a
                    href={`/smartboard-mode?lyrics=${encodeURIComponent(song.lyrics)}${song.youtube ? `&youtube=${encodeURIComponent(extractAllYouTubeUrls(song.youtube)[0] || '')}` : ''}`}
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
