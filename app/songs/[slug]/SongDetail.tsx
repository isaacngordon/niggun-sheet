'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useGoogleAuth } from '@/components/GoogleAuthProvider';
import { extractYouTubeId, extractAllYouTubeUrls, ensureYTApi, playbackBus, fmt, fmtPrecise } from '@/lib/youtube';

const ADMIN_EMAIL = 'yehudahyjacobs@gmail.com';

interface Song {
  search_title: string;
  title: string;
  lyrics: string;
  artist: string;
  drive: string;
  youtube: string;
}

/* ── Timings API helpers ── */
async function fetchTimings(slug: string): Promise<number[] | null> {
  try {
    const res = await fetch(`/api/timings?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.timestamps ?? null;
  } catch { return null; }
}

async function saveTimingsApi(slug: string, timestamps: number[]): Promise<boolean> {
  try {
    const res = await fetch('/api/timings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, timestamps }),
    });
    return res.ok;
  } catch { return false; }
}

/* ── YouTube player with progress callback ── */
interface YouTubePlayerProps {
  url: string;
  onTick?: (time: number, duration: number, playing: boolean) => void;
  exposePlayer?: (player: any) => void;
}

function YouTubePlayer({ url, onTick, exposePlayer }: YouTubePlayerProps) {
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
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

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

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        const t = playerRef.current?.getCurrentTime?.() || 0;
        const d = playerRef.current?.getDuration?.() || 0;
        setProgress(t);
        if (d > 0) setDuration(d);
        onTickRef.current?.(t, d, true);
      }, 200);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing]);

  const initAndPlay = useCallback(async () => {
    if (!videoId || destroyedRef.current) return;
    if (playerRef.current && readyRef.current) {
      if (playingRef.current) {
        playerRef.current.pauseVideo();
      } else {
        playbackBus?.dispatchEvent(new CustomEvent('play', { detail: idRef.current }));
        playerRef.current.playVideo();
      }
      return;
    }
    if (playerRef.current) return;
    // Fast path: if API already preloaded, skip await to keep user gesture context
    if (!(window as any).YT?.Player) {
      setLoading(true);
      try { await ensureYTApi(); } catch { setLoading(false); return; }
      if (destroyedRef.current) return;
    }
    const host = hostRef.current;
    if (!host) return;
    const div = document.createElement('div');
    host.appendChild(div);
    playbackBus?.dispatchEvent(new CustomEvent('play', { detail: idRef.current }));
    playerRef.current = new (window as any).YT.Player(div, {
      height: '1', width: '1', videoId,
      playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1, rel: 0, origin: window.location.origin },
      events: {
        onReady: () => {
          if (destroyedRef.current) return;
          readyRef.current = true;
          setReady(true); setLoading(false);
          const d = playerRef.current?.getDuration?.() || 0;
          setDuration(d);
          exposePlayer?.(playerRef.current);
          playbackBus?.dispatchEvent(new CustomEvent('play', { detail: idRef.current }));
          try { playerRef.current?.playVideo(); } catch {}
        },
        onStateChange: (e: any) => {
          if (destroyedRef.current) return;
          const isPlaying = e.data === 1;
          playingRef.current = isPlaying;
          setPlaying(isPlaying);
          if (isPlaying) {
            const d = playerRef.current?.getDuration?.() || 0;
            setDuration(d);
          }
          if (!isPlaying) {
            const t = playerRef.current?.getCurrentTime?.() || 0;
            onTickRef.current?.(t, playerRef.current?.getDuration?.() || 0, false);
          }
        },
        onError: () => {
          if (destroyedRef.current) return;
          setLoading(false);
        },
      }
    });
  }, [videoId, exposePlayer]);

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
      <div className="yt-progress-bar" onClick={(e) => {
        if (!playerRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        playerRef.current.seekTo(pct * duration, true);
        setProgress(pct * duration);
      }}>
        <div className="yt-progress-fill" style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }} />
      </div>
      <span className="yt-time">{ready && duration ? fmt(progress) : '--:--'}</span>
    </div>
  );
}

/* ── Compute which line is active from timestamps ── */
function activeLineFromTimestamps(timestamps: number[], currentTime: number): number {
  let active = -1;
  for (let i = 0; i < timestamps.length; i++) {
    if (currentTime >= timestamps[i]) active = i;
    else break;
  }
  return active;
}

/* ── Main detail component ── */
interface SongDetailProps {
  publicSong: Song | null;
  slug: string;
}

export default function SongDetail({ publicSong, slug }: SongDetailProps) {
  const { user, privateSongs, removeSong, ready: authReady } = useGoogleAuth();

  // Check if this is a private song (slug = "my-{uuid}")
  const isPrivateSlug = slug.startsWith('my-');
  const privateId = isPrivateSlug ? slug.slice(3) : null;

  const privateSong = useMemo(() => {
    if (!privateId) return null;
    return privateSongs.find((s) => s.id === privateId) ?? null;
  }, [privateId, privateSongs]);

  // Normalize to a unified shape
  const song = useMemo(() => {
    if (publicSong) {
      return {
        title: publicSong.title,
        artist: publicSong.artist,
        lyrics: publicSong.lyrics,
        drive: publicSong.drive,
        youtube: publicSong.youtube,
        isPrivate: false as const,
        privateId: null as string | null,
      };
    }
    if (privateSong) {
      return {
        title: privateSong.title,
        artist: privateSong.artist,
        lyrics: privateSong.lyrics,
        drive: privateSong.driveLink || '',
        youtube: privateSong.youtubeLinks?.join(' ') || '',
        isPrivate: true as const,
        privateId: privateSong.id,
      };
    }
    return null;
  }, [publicSong, privateSong]);

  /* ── Playback state (from first YouTube player) ── */
  const [currentTime, setCurrentTime] = useState(0);
  const [ytDuration, setYtDuration] = useState(0);
  const [ytPlaying, setYtPlaying] = useState(false);
  const ytPlayerRef = useRef<any>(null);

  const handleTick = useCallback((time: number, dur: number, playing: boolean) => {
    setCurrentTime(time);
    if (dur > 0) setYtDuration(dur);
    setYtPlaying(playing);
  }, []);

  const handleExposePlayer = useCallback((p: any) => { ytPlayerRef.current = p; }, []);

  /* ── Timing state ── */
  const [timestamps, setTimestamps] = useState<number[] | null>(null);
  const [editTimestamps, setEditTimestamps] = useState<(number | null)[]>([]);
  const [timingMode, setTimingMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Load saved timings
  useEffect(() => {
    if (!slug) return;
    fetchTimings(slug).then((t) => setTimestamps(t));
  }, [slug]);

  const lyricsLines = useMemo(() => song?.lyrics.split('\n') ?? [], [song]);

  // Active line based on saved timestamps
  const activeLine = useMemo(() => {
    if (!timestamps || timestamps.length === 0) return -1;
    return activeLineFromTimestamps(timestamps, currentTime);
  }, [timestamps, currentTime]);

  // Auto-scroll active line into view
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activeLine < 0 || timingMode) return;
    const container = lyricsContainerRef.current;
    if (!container) return;
    const lineEl = container.children[activeLine] as HTMLElement;
    if (lineEl) lineEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeLine, timingMode]);

  /* ── Timing editor helpers ── */
  const startTimingMode = () => {
    const init = lyricsLines.map((_, i) => timestamps?.[i] ?? null);
    // Add a blank line at the end
    init.push(null);
    setEditTimestamps(init);
    setTimingMode(true);
  };

  const stampLine = (idx: number) => {
    const t = ytPlayerRef.current?.getCurrentTime?.() ?? currentTime;
    setEditTimestamps((prev) => {
      const next = [...prev];
      next[idx] = t;
      // If stamping the last (blank) line, append another blank
      if (idx === next.length - 1) next.push(null);
      return next;
    });
  };

  const clearStamp = (idx: number) => {
    setEditTimestamps((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  };

  const cancelTiming = () => {
    setTimingMode(false);
    setEditTimestamps([]);
  };

  const saveTiming = async () => {
    setSaving(true);
    // Build final timestamps array (only for non-null values aligned to lyrics lines)
    const final = editTimestamps
      .slice(0, lyricsLines.length)
      .map((v) => v ?? -1);
    // Save only entries that have timestamps; fill gaps with -1 to keep alignment
    const ok = await saveTimingsApi(slug, final);
    if (ok) {
      setTimestamps(final);
      setTimingMode(false);
      setEditTimestamps([]);
    }
    setSaving(false);
  };

  // Private song still loading
  if (isPrivateSlug && !authReady) {
    return (
      <main className="song-detail-container">
        <div className="song-detail-loading">Loading...</div>
      </main>
    );
  }

  // Not found
  if (!song) {
    return (
      <main className="song-detail-container">
        <div className="song-detail-not-found">
          <h1>Song Not Found</h1>
          <p>This song may have been removed or the link is incorrect.</p>
          <Link href="/songs" className="song-detail-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            Back to Songs
          </Link>
        </div>
      </main>
    );
  }

  const youtubeUrls = extractAllYouTubeUrls(song.youtube);

  return (
    <main className="song-detail-container">
      <Link href="/songs" className="song-detail-back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        Back to Songs
      </Link>

      <div className="song-detail-card">
        <div className="song-detail-header">
          {song.isPrivate && <div className="private-badge">My Song</div>}
          <h1 className="song-detail-title">{song.title}</h1>
          {song.artist && <p className="song-detail-artist">{song.artist}</p>}
        </div>

        {youtubeUrls.length > 0 && (
          <div className="song-detail-players">
            {youtubeUrls.map((u, i) => (
              <YouTubePlayer
                key={i}
                url={u}
                onTick={i === 0 ? handleTick : undefined}
                exposePlayer={i === 0 ? handleExposePlayer : undefined}
              />
            ))}
          </div>
        )}

        {/* ── Admin timing toolbar ── */}
        {isAdmin && !timingMode && (
          <div className="timing-toolbar">
            <button className="timing-edit-btn" onClick={startTimingMode}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {timestamps ? 'Edit Timings' : 'Add Timings'}
            </button>
            {ytPlaying && (
              <span className="timing-status">{fmtPrecise(currentTime)}</span>
            )}
          </div>
        )}

        {/* ── Timing editor (admin, when in timing mode) ── */}
        {timingMode && (
          <div className="timing-editor">
            <div className="timing-editor-header">
              <span className="timing-editor-title">Timing Editor</span>
              <span className="timing-editor-time">
                {ytPlaying ? fmtPrecise(currentTime) : 'Paused'}
              </span>
            </div>
            <p className="timing-editor-hint">Play the song, then click a line to stamp its time.</p>
            <div className="timing-editor-lines">
              {editTimestamps.map((ts, i) => {
                const isBlank = i >= lyricsLines.length;
                const lineText = isBlank ? '(blank / pause)' : (lyricsLines[i] || '\u00A0');
                return (
                  <div key={i} className={`timing-line ${isBlank ? 'blank-line' : ''}`} onClick={() => stampLine(i)}>
                    <span className="timing-line-num">{i + 1}</span>
                    <span className="timing-line-text">{lineText}</span>
                    <span className="timing-line-stamp">
                      {ts != null ? fmtPrecise(ts) : '—'}
                    </span>
                    {ts != null && (
                      <button
                        className="timing-line-clear"
                        onClick={(e) => { e.stopPropagation(); clearStamp(i); }}
                        aria-label="Clear timestamp"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="timing-editor-actions">
              <button className="timing-save-btn" onClick={saveTiming} disabled={saving}>
                {saving ? 'Saving...' : 'Save Timings'}
              </button>
              <button className="timing-cancel-btn" onClick={cancelTiming}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── Lyrics with active-line highlighting ── */}
        {!timingMode && (
          <div className="song-detail-lyrics" ref={lyricsContainerRef}>
            {lyricsLines.map((line, i) => {
              const hasTimestamps = timestamps && timestamps.length > 0;
              let cls = 'song-detail-lyric-line';
              if (hasTimestamps && activeLine >= 0) {
                cls += i === activeLine ? ' active-line' : ' inactive-line';
              }
              return (
                <div key={i} className={cls}>
                  {line || '\u00A0'}
                </div>
              );
            })}
          </div>
        )}

        <div className="song-detail-actions">
          {song.drive && (
            <a href={song.drive} target="_blank" rel="noopener noreferrer" className="song-detail-action-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
              Google Drive
            </a>
          )}
          <a
            href={`/smartboard-mode?lyrics=${encodeURIComponent(song.lyrics)}${youtubeUrls[0] ? `&youtube=${encodeURIComponent(youtubeUrls[0])}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="song-detail-action-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
            Open for Smartboard
          </a>
          {song.isPrivate && (
            <button
              className="song-detail-action-btn danger"
              onClick={() => {
                if (confirm(`Delete "${song.title}"?`)) {
                  removeSong(song.privateId!);
                  window.location.href = '/songs';
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6L17.8 20a2 2 0 01-2 2H8.2a2 2 0 01-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
              Delete
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
