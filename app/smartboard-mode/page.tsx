'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { extractYouTubeId, ensureYTApi, fmt } from '@/lib/youtube';

function SmartboardYouTubePlayer({ videoId }: { videoId: string }) {
  const playerRef = useRef<any>(null);
  const playingRef = useRef(false);
  const readyRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true); // starts loading immediately
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const destroyedRef = useRef(false);
  const pendingPlayRef = useRef(false);

  // Pre-initialize the YT player on mount so it's ready when user clicks play
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await ensureYTApi();
      } catch (err) {
        console.error('[Smartboard] YouTube API failed to load:', err);
        if (!cancelled) { setLoading(false); setError('YouTube API failed to load'); }
        return;
      }
      if (cancelled || !hostRef.current) return;

      const div = document.createElement('div');
      hostRef.current.appendChild(div);
      playerRef.current = new (window as any).YT.Player(div, {
        height: '1', width: '1', videoId,
        playerVars: { controls: 0, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: () => {
            if (cancelled) return;
            readyRef.current = true;
            setReady(true);
            setLoading(false);
            const d = playerRef.current?.getDuration?.() || 0;
            setDuration(d);
            // If user clicked play while we were loading, start now
            if (pendingPlayRef.current) {
              pendingPlayRef.current = false;
              try { playerRef.current?.playVideo(); } catch {}
            }
          },
          onStateChange: (e: any) => {
            if (cancelled) return;
            const isPlaying = e.data === 1;
            playingRef.current = isPlaying;
            setPlaying(isPlaying);
            if (isPlaying) {
              const d = playerRef.current?.getDuration?.() || 0;
              setDuration(d);
            }
          },
          onError: (e: any) => {
            if (cancelled) return;
            console.error('[Smartboard] YouTube player error:', e?.data);
            setLoading(false);
            setError(`Player error (code ${e?.data})`);
          },
        },
      });
    })();

    return () => {
      cancelled = true;
      destroyedRef.current = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      try { playerRef.current?.destroy?.(); } catch {}
    };
  }, [videoId]);

  // Track progress while playing
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        const t = playerRef.current?.getCurrentTime?.() || 0;
        const d = playerRef.current?.getDuration?.() || 0;
        setProgress(t);
        if (d > 0) setDuration(d);
      }, 250);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing]);

  // Toggle play/pause — runs synchronously in user gesture context
  const togglePlay = useCallback(() => {
    if (!readyRef.current) {
      // Player still loading — queue play for when it's ready
      pendingPlayRef.current = true;
      return;
    }
    if (playingRef.current) {
      playerRef.current?.pauseVideo();
    } else {
      playerRef.current?.playVideo();
    }
  }, []);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    playerRef.current.seekTo(pct * duration, true);
    setProgress(pct * duration);
  }, [duration]);

  return (
    <div style={{
      position: 'fixed', bottom: 60, left: '50%', transform: 'translateX(-50%)',
      zIndex: 10, display: 'flex', alignItems: 'center', gap: 10,
      backgroundColor: 'rgba(0,0,0,0.85)', padding: '8px 16px',
      borderRadius: 30, border: '1px solid rgba(242,203,5,0.3)',
      minWidth: 220, maxWidth: '90vw',
    }}>
      <div ref={hostRef} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }} />
      <button
        onClick={togglePlay}
        disabled={loading && !ready}
        aria-label={playing ? 'Pause' : 'Play'}
        style={{
          background: 'none', border: 'none', color: '#f2cb05',
          cursor: loading ? 'wait' : 'pointer', padding: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {loading ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="20 40" /></svg>
        ) : playing ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        )}
      </button>
      <div
        onClick={seek}
        style={{
          flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: 3, cursor: 'pointer', position: 'relative', minWidth: 100,
        }}
      >
        <div style={{
          height: '100%', backgroundColor: '#f2cb05', borderRadius: 3,
          width: duration ? `${(progress / duration) * 100}%` : '0%',
          transition: 'width 0.15s linear',
        }} />
      </div>
      <span style={{
        fontSize: 12, color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums',
        flexShrink: 0, minWidth: 32, textAlign: 'right',
      }}>
        {error ? <span style={{ color: '#ff6b6b', fontSize: 11 }}>{error}</span>
          : ready && duration ? fmt(progress) : '--:--'}
      </span>
    </div>
  );
}

function SmartboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState(3); // em units
  const [lyrics, setLyrics] = useState('Loading...');
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [currentLine, setCurrentLine] = useState(0);
  const [playheadOn, setPlayheadOn] = useState(false);
  const linesRef = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const lyricsParam = searchParams.get('lyrics');
    if (lyricsParam) {
      const doc = new DOMParser().parseFromString(lyricsParam, 'text/html');
      setLyrics(doc.body.textContent || '');
    }

    const ytParam = searchParams.get('youtube');
    if (ytParam) {
      const id = extractYouTubeId(ytParam);
      if (id) setYoutubeVideoId(id);
    }

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, [searchParams]);

  const lines = lyrics.split('\n');

  const scrollToLine = useCallback((idx: number) => {
    linesRef.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const goNext = useCallback(() => {
    setCurrentLine((prev) => {
      const next = Math.min(prev + 1, lines.length - 1);
      scrollToLine(next);
      return next;
    });
  }, [lines.length, scrollToLine]);

  const goPrev = useCallback(() => {
    setCurrentLine((prev) => {
      const next = Math.max(prev - 1, 0);
      scrollToLine(next);
      return next;
    });
  }, [scrollToLine]);

  // Keyboard navigation
  useEffect(() => {
    if (!playheadOn) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [playheadOn, goNext, goPrev]);

  const changeFontSize = useCallback((increase: boolean) => {
    setFontSize((prev) => Math.max(0.5, increase ? prev + 0.2 : prev - 0.2));
  }, []);

  const togglePlayhead = useCallback(() => {
    setPlayheadOn((v) => {
      if (!v) { setCurrentLine(0); scrollToLine(0); }
      return !v;
    });
  }, [scrollToLine]);

  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', Arial, sans-serif",
        backgroundColor: darkMode ? 'black' : 'white',
        color: darkMode ? 'white' : 'black',
        transition: 'background-color 0.5s, color 0.5s',
        minHeight: '100vh',
      }}
    >
      {/* Mode toggle */}
      <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 1 }}>
        <label
          style={{ position: 'relative', display: 'inline-block', width: 60, height: 34 }}
        >
          <input
            type="checkbox"
            checked={darkMode}
            onChange={() => setDarkMode((v) => !v)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span
            style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: darkMode ? '#f2cb05' : '#ccc',
              transition: '.4s',
              borderRadius: 34,
            }}
          >
            <span
              style={{
                position: 'absolute',
                content: '""',
                height: 26,
                width: 26,
                left: darkMode ? 30 : 4,
                bottom: 4,
                backgroundColor: 'white',
                transition: '.4s',
                borderRadius: '50%',
              }}
            />
          </span>
        </label>
      </div>

      {/* Back button + playhead toggle */}
      <div style={{ marginLeft: 10, marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={() => router.push('/songs')}
          style={{
            backgroundColor: '#f2cb05',
            color: '#000',
            padding: '10px 20px',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
          }}
        >
          Back
        </button>
        <button
          onClick={togglePlayhead}
          style={{
            backgroundColor: playheadOn ? '#f2cb05' : 'transparent',
            color: playheadOn ? '#000' : '#f2cb05',
            padding: '10px 20px',
            border: playheadOn ? 'none' : '1px solid #f2cb05',
            borderRadius: 5,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {playheadOn ? '⏸ Playhead On' : '▶ Playhead'}
        </button>
      </div>

      {/* Song lyrics */}
      <div
        onClick={playheadOn ? goNext : undefined}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: playheadOn ? 'flex-start' : 'center',
          minHeight: '75vh',
          paddingTop: playheadOn ? '2rem' : 0,
          paddingBottom: playheadOn ? '60vh' : 0,
          cursor: playheadOn ? 'pointer' : 'default',
        }}
      >
        <h2>Song Lyrics</h2>
        <div style={{ maxWidth: '80%', textAlign: 'center' }}>
          {playheadOn ? (
            <div style={{ fontSize: `${fontSize}em`, lineHeight: 1.6 }}>
              {lines.map((line, i) => (
                <span
                  key={i}
                  ref={(el) => { linesRef.current[i] = el; }}
                  onClick={(e) => { e.stopPropagation(); setCurrentLine(i); scrollToLine(i); }}
                  style={{
                    display: 'block',
                    padding: '0.1em 0.3em',
                    borderRadius: 6,
                    transition: 'opacity 0.3s, transform 0.3s',
                    opacity: i === currentLine ? 1 : 0.3,
                    transform: i === currentLine ? 'scale(1.05)' : 'scale(1)',
                    cursor: 'pointer',
                  }}
                >
                  {line || '\u00A0'}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: `${fontSize}em`, whiteSpace: 'pre-line' }}>{lyrics}</p>
          )}
        </div>
      </div>

      {/* Playhead line counter */}
      {playheadOn && (
        <div style={{
          position: 'fixed',
          bottom: 10,
          left: 10,
          zIndex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: '#f2cb05',
          padding: '6px 14px',
          borderRadius: 20,
          fontSize: 14,
          fontWeight: 600,
        }}>
          {currentLine + 1} / {lines.length}
        </div>
      )}

      {/* YouTube player */}
      {youtubeVideoId && <SmartboardYouTubePlayer videoId={youtubeVideoId} />}

      {/* Font size controls */}
      <div style={{ position: 'fixed', bottom: 10, right: 10, zIndex: 1 }}>
        <button
          onClick={() => changeFontSize(true)}
          style={{
            backgroundColor: '#f2cb05',
            color: '#000',
            padding: 10,
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
            margin: 5,
            fontWeight: 'bold',
            fontSize: 18,
          }}
        >
          +
        </button>
        <button
          onClick={() => changeFontSize(false)}
          style={{
            backgroundColor: '#f2cb05',
            color: '#000',
            padding: 10,
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
            margin: 5,
            fontWeight: 'bold',
            fontSize: 18,
          }}
        >
          −
        </button>
      </div>
    </div>
  );
}

export default function SmartboardModePage() {
  return (
    <Suspense
      fallback={
        <div style={{ background: 'black', color: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Loading...
        </div>
      }
    >
      <SmartboardContent />
    </Suspense>
  );
}
