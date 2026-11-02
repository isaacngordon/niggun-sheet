'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import QuickInstructions from '@/components/QuickInstructions';
import { extractYouTubeId, ensureYTApi, fmt, warmYouTubeConnections } from '@/lib/youtube';
import { buildMediaTimingSources, deriveBoundsFromClipEdges, normalizeTimingBounds, type StoredTimingClip, type StoredTimingData, type TimingBounds } from '@/lib/timings';
import React from 'react';
import AuthBoundary from '@/components/AuthBoundary';

function isTimeWithinBounds(currentTime: number, bounds: TimingBounds): boolean {
  if (bounds.inPoint != null && currentTime < bounds.inPoint) return false;
  if (bounds.outPoint != null && currentTime >= bounds.outPoint) return false;
  return true;
}

function isClipWithinBounds(clip: StoredTimingClip, bounds: TimingBounds): boolean {
  if (bounds.inPoint != null && clip.start < bounds.inPoint) return false;
  if (bounds.outPoint != null && clip.start >= bounds.outPoint) return false;
  return true;
}

function resolveEffectiveBounds(
  clips: StoredTimingClip[],
  savedBounds: TimingBounds,
  useClipEdgeBounds: boolean,
  mediaDuration: number | null,
): TimingBounds {
  if (!useClipEdgeBounds) {
    return normalizeTimingBounds(savedBounds.inPoint, savedBounds.outPoint);
  }

  return deriveBoundsFromClipEdges(clips, savedBounds.outPoint ?? mediaDuration);
}

function activeLineFromClips(clips: StoredTimingClip[], currentTime: number, bounds: TimingBounds): number {
  if (!isTimeWithinBounds(currentTime, bounds)) return -1;

  let activeVerseIndex = -1;
  let bestStart = -Infinity;
  for (const clip of clips) {
    if (!isClipWithinBounds(clip, bounds)) continue;
    if (clip.start <= currentTime && clip.start >= bestStart) {
      bestStart = clip.start;
      activeVerseIndex = clip.verseIndex >= 0 ? clip.verseIndex : -1;
    }
  }
  return activeVerseIndex;
}

async function fetchTimings(slug: string): Promise<StoredTimingData | null> {
  try {
    const res = await fetch(`/api/timings?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const bounds = normalizeTimingBounds(data.inPoint, data.outPoint);
    const useClipEdgeBounds = typeof data.useClipEdgeBounds === 'boolean' ? data.useClipEdgeBounds : true;
    if (Array.isArray(data.clips)) {
      return {
        clips: data.clips
          .filter((clip: StoredTimingClip) => Number.isFinite(clip.start))
          .sort((a: StoredTimingClip, b: StoredTimingClip) => a.start - b.start),
        ...bounds,
        useClipEdgeBounds,
      };
    }
    if (Array.isArray(data.timestamps)) {
      return {
        clips: data.timestamps
          .map((start: number, verseIndex: number) => ({ verseIndex, start }))
          .filter((clip: StoredTimingClip) => Number.isFinite(clip.start) && clip.start >= 0)
          .sort((a: StoredTimingClip, b: StoredTimingClip) => a.start - b.start),
        ...bounds,
        useClipEdgeBounds,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function SmartboardAudioPlayer({
  audioUrl,
  inPoint,
  outPoint,
  onTick,
  seekRequest,
}: {
  audioUrl: string;
  inPoint?: number | null;
  outPoint?: number | null;
  onTick?: (time: number, duration: number, playing: boolean) => void;
  seekRequest?: { time: number; nonce: number } | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressFrameRef = useRef<number | null>(null);
  const lastProgressTickRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const windowStart = Math.max(0, inPoint ?? 0);
  const windowEnd = outPoint != null && outPoint > windowStart ? outPoint : null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const stopProgressLoop = () => {
      if (progressFrameRef.current != null) {
        cancelAnimationFrame(progressFrameRef.current);
        progressFrameRef.current = null;
      }
      lastProgressTickRef.current = 0;
    };

    const emitProgressTick = (force = false) => {
      const nextTime = audio.currentTime || 0;
      const nextDuration = audio.duration > 0 ? audio.duration : duration;
      if (windowEnd != null && nextTime >= windowEnd) {
        const capped = Math.min(windowEnd, nextDuration || windowEnd);
        audio.currentTime = capped;
        audio.pause();
        setProgress(capped);
        if (nextDuration > 0) setDuration(nextDuration);
        onTick?.(capped, nextDuration, false);
        return;
      }
      const now = performance.now();
      if (!force && now - lastProgressTickRef.current < 80) return;
      lastProgressTickRef.current = now;
      setProgress(nextTime);
      if (audio.duration > 0) setDuration(audio.duration);
      onTick?.(nextTime, nextDuration, !audio.paused);
    };

    const startProgressLoop = () => {
      stopProgressLoop();
      const step = () => {
        emitProgressTick(false);
        if (!audio.paused) {
          progressFrameRef.current = requestAnimationFrame(step);
        } else {
          progressFrameRef.current = null;
        }
      };
      progressFrameRef.current = requestAnimationFrame(step);
    };

    const handleCanPlay = () => {
      setReady(true);
      setLoading(false);
      const nextDuration = audio.duration || 0;
      setDuration(nextDuration);
      onTick?.(audio.currentTime || 0, nextDuration, !audio.paused);
    };
    const handleTimeUpdate = () => {
      emitProgressTick(true);
    };
    const handlePlay = () => {
      setPlaying(true);
      emitProgressTick(true);
      startProgressLoop();
    };
    const handlePause = () => {
      setPlaying(false);
      stopProgressLoop();
      emitProgressTick(true);
    };

    setReady(audio.readyState >= 2);
    setDuration(audio.duration || 0);
    setProgress(audio.currentTime || 0);
    onTick?.(audio.currentTime || 0, audio.duration || 0, !audio.paused);

    audio.addEventListener('loadedmetadata', handleCanPlay);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handlePause);

    return () => {
      stopProgressLoop();
      audio.removeEventListener('loadedmetadata', handleCanPlay);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handlePause);
    };
  }, [audioUrl, duration, onTick, windowEnd]);

  useEffect(() => {
    if (!seekRequest) return;
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Math.max(0, seekRequest.time);
    audio.currentTime = nextTime;
    setProgress(nextTime);
    const nextDuration = audio.duration > 0 ? audio.duration : duration;
    onTick?.(nextTime, nextDuration, !audio.paused);
  }, [seekRequest, duration, onTick]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    const total = audio.duration || duration;
    const current = audio.currentTime || 0;
    if (current < windowStart || (windowEnd != null && current >= windowEnd)) {
      audio.currentTime = Math.min(windowStart, total || windowStart);
      setProgress(audio.currentTime);
    }

    setLoading(!ready);
    void audio.play().catch(() => setLoading(false));
  }, [duration, ready, windowEnd, windowStart]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const seekEnd = windowEnd != null ? Math.min(windowEnd, duration) : duration;
    const seekStart = Math.min(windowStart, seekEnd);
    const nextTime = seekStart + (seekEnd - seekStart) * pct;
    audio.currentTime = nextTime;
    setProgress(nextTime);
    onTick?.(nextTime, duration, !audio.paused);
  }, [duration, onTick, windowEnd, windowStart]);

  const displayStart = Math.min(windowStart, duration || windowStart);
  const displayEnd = windowEnd != null ? Math.min(windowEnd, duration || windowEnd) : duration;
  const displaySpan = Math.max(0.001, displayEnd - displayStart);
  const displayProgress = Math.max(0, Math.min(displaySpan, progress - displayStart));

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: 'linear-gradient(135deg, rgba(10,10,10,0.94), rgba(24,24,24,0.88))',
      backdropFilter: 'blur(18px)',
      padding: '12px 18px',
      borderRadius: 34,
      border: '1px solid rgba(242,203,5,0.24)',
      boxShadow: '0 22px 50px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.06)',
      width: 'min(100%, 460px)',
      minWidth: 320,
    }}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button
        onClick={togglePlay}
        aria-label={playing ? 'Pause' : 'Play'}
        style={{
          background: 'none', border: 'none', color: '#f2cb05',
          cursor: loading ? 'wait' : 'pointer', padding: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {loading ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="20 40" /></svg>
        ) : playing ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        )}
      </button>
      <div
        onClick={seek}
        style={{
          flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: 999, cursor: 'pointer', position: 'relative', minWidth: 160,
        }}
      >
        <div style={{
          height: '100%', backgroundColor: '#f2cb05', borderRadius: 3,
          width: duration ? `${(displayProgress / displaySpan) * 100}%` : '0%',
          transition: 'width 0.15s linear',
        }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0, minWidth: 72 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.88)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
          {ready && duration ? fmt(progress) : '--:--'}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
          {ready && duration ? fmt(duration) : '--:--'}
        </span>
      </div>
    </div>
  );
}

function SmartboardYouTubePlayer({
  videoId,
  inPoint,
  outPoint,
  onTick,
  seekRequest,
}: {
  videoId: string;
  inPoint?: number | null;
  outPoint?: number | null;
  onTick?: (time: number, duration: number, playing: boolean) => void;
  seekRequest?: { time: number; nonce: number } | null;
}) {
  const hostWidth = 1;
  const hostHeight = 1;
  const playerRef = useRef<any>(null);
  const playingRef = useRef(false);
  const readyRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [optimisticPlaying, setOptimisticPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const windowStart = Math.max(0, inPoint ?? 0);
  const windowEnd = outPoint != null && outPoint > windowStart ? outPoint : null;
  const progressFrameRef = useRef<number | null>(null);
  const lastProgressTickRef = useRef(0);
  const hostRef = useRef<HTMLDivElement>(null);
  const destroyedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    warmYouTubeConnections();

    (async () => {
      try {
        await ensureYTApi();
      } catch (err) {
        console.error('[Smartboard] YouTube API failed to load:', err);
        if (!cancelled) { setLoading(false); setError('YouTube API failed to load'); }
        return;
      }
      if (cancelled || !hostRef.current) return;

      hostRef.current.innerHTML = '';
      const div = document.createElement('div');
      hostRef.current.appendChild(div);
      playerRef.current = new (window as any).YT.Player(div, {
        height: String(hostHeight), width: String(hostWidth), videoId,
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: () => {
            if (cancelled) return;
            readyRef.current = true;
            setReady(true);
            setLoading(false);
            const d = playerRef.current?.getDuration?.() || 0;
            setDuration(d);
            onTick?.(playerRef.current?.getCurrentTime?.() || 0, d, false);
            try { playerRef.current?.setPlaybackQuality?.('small'); } catch {}
          },
          onStateChange: (e: any) => {
            if (cancelled) return;
            const isPlaying = e.data === 1;
            const isBuffering = e.data === 3;
            playingRef.current = isPlaying;
            setPlaying(isPlaying);
            if (isPlaying || !isBuffering) {
              setOptimisticPlaying(false);
            }
            setLoading(isBuffering);
            const t = playerRef.current?.getCurrentTime?.() || 0;
            setProgress(t);
            if (isPlaying) {
              const d = playerRef.current?.getDuration?.() || 0;
              if (windowEnd != null && t >= windowEnd) {
                const capped = Math.min(windowEnd, d || windowEnd);
                try { playerRef.current?.seekTo(capped, true); } catch {}
                try { playerRef.current?.pauseVideo(); } catch {}
                setPlaying(false);
                setOptimisticPlaying(false);
                playingRef.current = false;
                onTick?.(capped, d, false);
                return;
              }
              setDuration(d);
              onTick?.(t, d, true);
            } else {
              onTick?.(t, playerRef.current?.getDuration?.() || 0, false);
            }
          },
          onError: (e: any) => {
            if (cancelled) return;
            console.error('[Smartboard] YouTube player error:', e?.data);
            setLoading(false);
            setOptimisticPlaying(false);
            setError(`Player error (code ${e?.data})`);
          },
        },
      });
    })();

    return () => {
      cancelled = true;
      destroyedRef.current = true;
      if (progressFrameRef.current != null) cancelAnimationFrame(progressFrameRef.current);
      try { playerRef.current?.destroy?.(); } catch {}
    };
  }, [videoId, onTick, windowEnd]);

  // Track progress while playing
  useEffect(() => {
    const stopProgressLoop = () => {
      if (progressFrameRef.current != null) {
        cancelAnimationFrame(progressFrameRef.current);
        progressFrameRef.current = null;
      }
      lastProgressTickRef.current = 0;
    };

    if (playing) {
      const step = () => {
        const now = performance.now();
        if (now - lastProgressTickRef.current < 80) {
          progressFrameRef.current = requestAnimationFrame(step);
          return;
        }
        lastProgressTickRef.current = now;
        const t = playerRef.current?.getCurrentTime?.() || 0;
        const d = playerRef.current?.getDuration?.() || 0;
        if (windowEnd != null && t >= windowEnd && playerRef.current) {
          const capped = Math.min(windowEnd, d || windowEnd);
          try { playerRef.current.seekTo(capped, true); } catch {}
          try { playerRef.current.pauseVideo(); } catch {}
          playingRef.current = false;
          setPlaying(false);
          setOptimisticPlaying(false);
          setProgress(capped);
          onTick?.(capped, d, false);
          return;
        }
        setProgress(t);
        if (d > 0) setDuration(d);
        onTick?.(t, d, true);
        progressFrameRef.current = requestAnimationFrame(step);
      };
      stopProgressLoop();
      progressFrameRef.current = requestAnimationFrame(step);
    } else {
      stopProgressLoop();
    }
    return stopProgressLoop;
  }, [playing, onTick, windowEnd]);

  useEffect(() => {
    if (!seekRequest || !readyRef.current || !playerRef.current) return;
    const nextTime = Math.max(0, seekRequest.time);
    playerRef.current.seekTo(nextTime, true);
    setProgress(nextTime);
    const d = playerRef.current?.getDuration?.() || duration;
    if (d > 0) setDuration(d);
    onTick?.(nextTime, d || 0, playingRef.current);
  }, [seekRequest, duration, onTick]);

  const togglePlay = useCallback(() => {
    if (!readyRef.current) return;
    if (playingRef.current) {
      playingRef.current = false;
      setOptimisticPlaying(false);
      setPlaying(false);
      setLoading(false);
      playerRef.current?.pauseVideo();
    } else {
      const current = playerRef.current?.getCurrentTime?.() || 0;
      const total = playerRef.current?.getDuration?.() || duration;
      if (current < windowStart || (windowEnd != null && current >= windowEnd)) {
        playerRef.current?.seekTo(Math.min(windowStart, total || windowStart), true);
      }
      playingRef.current = true;
      setOptimisticPlaying(true);
      setPlaying(true);
      setLoading(false);
      playerRef.current?.playVideo();
    }
  }, [duration, windowEnd, windowStart]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const seekEnd = windowEnd != null ? Math.min(windowEnd, duration) : duration;
    const seekStart = Math.min(windowStart, seekEnd);
    const nextTime = seekStart + (seekEnd - seekStart) * pct;
    playerRef.current.seekTo(nextTime, true);
    setProgress(nextTime);
    onTick?.(nextTime, duration, playingRef.current);
  }, [duration, onTick, windowEnd, windowStart]);

  const displayStart = Math.min(windowStart, duration || windowStart);
  const displayEnd = windowEnd != null ? Math.min(windowEnd, duration || windowEnd) : duration;
  const displaySpan = Math.max(0.001, displayEnd - displayStart);
  const displayProgress = Math.max(0, Math.min(displaySpan, progress - displayStart));
  const displayPlaying = playing || optimisticPlaying;
  const displayLoading = loading && !optimisticPlaying;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: 'linear-gradient(135deg, rgba(10,10,10,0.94), rgba(24,24,24,0.88))',
      backdropFilter: 'blur(18px)',
      padding: '12px 18px',
      borderRadius: 34,
      border: '1px solid rgba(242,203,5,0.24)',
      boxShadow: '0 22px 50px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.06)',
      width: 'min(100%, 460px)',
      minWidth: 320,
    }}>
      <div style={{
        position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        <div ref={hostRef} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />
      </div>
      <button
        onClick={togglePlay}
        disabled={!ready || Boolean(error)}
        aria-label={displayPlaying ? 'Pause' : 'Play'}
        style={{
          background: 'none', border: 'none', color: '#f2cb05',
          cursor: displayLoading ? 'wait' : 'pointer', padding: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {displayLoading ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="20 40" /></svg>
        ) : displayPlaying ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        )}
      </button>
      <div
        onClick={seek}
        style={{
          flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: 999, cursor: 'pointer', position: 'relative', minWidth: 160,
        }}
      >
        <div style={{
          height: '100%', backgroundColor: '#f2cb05', borderRadius: 3,
          width: duration ? `${(displayProgress / displaySpan) * 100}%` : '0%',
          transition: 'width 0.15s linear',
        }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0, minWidth: 72 }}>
        {error ? <span style={{ color: '#ff6b6b', fontSize: 11, textAlign: 'right' }}>{error}</span> : (
          <>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.88)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
              {ready && duration ? fmt(progress) : '--:--'}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
              {ready && duration ? fmt(duration) : '--:--'}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

import { useGoogleAuth } from '@/components/GoogleAuthProvider';

/** Same slug rules as app/songs/[slug], so a URL slug matches a song title. */
function slugifyTitle(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Background themes for the projection screen. Purely visual — they sit behind
 * the lyrics and never affect playhead timing. "Scenes" are animated vector
 * layers (SVG + CSS keyframes); the rest are flat gradients.
 */
type BgTheme =
  | 'classic'
  | 'warm'
  | 'midnight'
  | 'aurora'
  | 'sunny'
  | 'aquatic'
  | 'starry';

type BgThemeDef = {
  id: BgTheme;
  label: string;
  preview: string;
  dark: boolean;
  scene?: 'sunny' | 'aquatic' | 'starry';
};

const BG_THEMES: BgThemeDef[] = [
  { id: 'classic', label: 'Classic', preview: '#000', dark: true },
  { id: 'warm', label: 'Warm', preview: 'linear-gradient(135deg,#e08a3c,#ffbe6b)', dark: true },
  { id: 'midnight', label: 'Midnight', preview: 'linear-gradient(135deg,#2f6bd0,#6fb3ff)', dark: true },
  { id: 'aurora', label: 'Aurora', preview: 'linear-gradient(135deg,#1fd6a0,#3fc8ee,#c06ae0)', dark: true },
  {
    id: 'sunny',
    label: 'Sunny day',
    preview: 'linear-gradient(180deg,#3fb8f5,#8fd8fa,#fff4c9)',
    dark: false,
    scene: 'sunny',
  },
  {
    id: 'aquatic',
    label: 'Aquatic',
    preview: 'linear-gradient(180deg,#18a7d6,#0a5f95,#07406b)',
    dark: true,
    scene: 'aquatic',
  },
  {
    id: 'starry',
    label: 'Starry night',
    preview: 'linear-gradient(180deg,#12205a,#2a2270,#0a0a24)',
    dark: true,
    scene: 'starry',
  },
];

const BG_THEME_STORAGE_KEY = 'kumzitzsheet:smartboard-bg-theme';
const LINE_VIEW_STORAGE_KEY = 'kumzitzsheet:smartboard-line-view';

// The +/- control sizes the lyrics container (in vw), not the raw font size.
const LYRICS_SIZE_MIN_VW = 1.5;
const LYRICS_SIZE_MAX_VW = 12;
const LYRICS_SIZE_DEFAULT_VW = 4;
// Focused verse size relative to the container font (1 = same size as the container).
const FOCUS_MIN_SCALE = 0.82;

function backgroundForTheme(theme: BgTheme, darkMode: boolean): string {
  if (!darkMode) return '#fff';
  switch (theme) {
    case 'warm':
      return 'radial-gradient(ellipse at 50% 30%, #ffbe6b 0%, #e08a3c 50%, #8a4512 100%)';
    case 'midnight':
      return 'radial-gradient(ellipse at 50% 20%, #6fb3ff 0%, #2f6bd0 50%, #173a7a 100%)';
    case 'aurora':
      return 'linear-gradient(135deg, #1fd6a0 0%, #3fc8ee 45%, #c06ae0 100%)';
    case 'sunny':
      return 'linear-gradient(180deg, #3fb8f5 0%, #8fd8fa 45%, #cdefff 70%, #fff4c9 100%)';
    case 'aquatic':
      return 'linear-gradient(180deg, #18a7d6 0%, #0d7fb8 45%, #0a5f95 75%, #07406b 100%)';
    case 'starry':
      return 'linear-gradient(180deg, #12205a 0%, #2a2270 45%, #1b1446 75%, #0a0a24 100%)';
    case 'classic':
    default:
      return 'black';
  }
}

/** Text color that stays readable on each scene. */
function textColorForTheme(theme: BgTheme, darkMode: boolean): string {
  if (!darkMode) return '#000';
  return theme === 'sunny' ? '#10202b' : '#fff';
}

function isSceneTheme(theme: BgTheme): theme is 'sunny' | 'aquatic' | 'starry' {
  return theme === 'sunny' || theme === 'aquatic' || theme === 'starry';
}

/** Animated SVG scenery. Purely decorative, so it is aria-hidden. */
function SceneBackdrop({ scene }: { scene: 'sunny' | 'aquatic' | 'starry' }) {
  return (
    <svg
      aria-hidden="true"
      className={`sb-scene sb-scene-${scene}`}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
    >
      {scene === 'sunny' && (
        <>
          <g className="sb-scene-drift">
            <ellipse cx="320" cy="180" rx="150" ry="52" fill="#fff" opacity="0.95" />
            <ellipse cx="410" cy="165" rx="110" ry="44" fill="#fff" opacity="0.98" />
            <ellipse cx="1150" cy="250" rx="130" ry="46" fill="#fff" opacity="0.9" />
            <ellipse cx="1240" cy="235" rx="95" ry="38" fill="#fff" opacity="0.93" />
          </g>
          <circle cx="1350" cy="170" r="78" fill="#ffd633" opacity="1" />
          <circle cx="1350" cy="170" r="120" fill="#ffe680" opacity="0.45" />
          <circle cx="1350" cy="170" r="165" fill="#fff3b0" opacity="0.22" />
          <path d="M0 700 Q 260 640 520 690 T 1040 680 T 1600 700 V 900 H 0 Z" fill="#9ad972" opacity="1" />
          <path d="M0 770 Q 300 720 620 770 T 1180 760 T 1600 790 V 900 H 0 Z" fill="#6fce55" opacity="1" />
          <path d="M0 840 Q 380 800 800 840 T 1600 850 V 900 H 0 Z" fill="#4fbf3f" opacity="1" />
        </>
      )}

      {scene === 'aquatic' && (
        <>
          {/* Sun shafts filtering down through the water */}
          <g opacity="0.22">
            {Array.from({ length: 5 }).map((_, i) => (
              <polygon
                key={`ray${i}`}
                points={`${260 + i * 260},0 ${420 + i * 260},0 ${170 + i * 260},900 ${20 + i * 260},900`}
                fill="#e8fbff"
              />
            ))}
          </g>
          {Array.from({ length: 9 }).map((_, i) => (
            <circle
              key={`b${i}`}
              className="sb-scene-bubble"
              cx={130 + i * 175}
              cy={820}
              r={8 + (i % 4) * 7}
              fill="#eaffff"
              opacity="0.6"
              style={{ animationDelay: `${i * 1.1}s`, animationDuration: `${9 + (i % 3) * 3}s` }}
            />
          ))}
          {Array.from({ length: 6 }).map((_, i) => {
            const y = 180 + i * 95;
            const palette = ['#ffb347', '#ffd166', '#ff9e5e', '#ffe08a', '#ffab40', '#ffc86b'];
            const body = palette[i % palette.length];
            return (
              <g key={`f${i}`} transform={`translate(1700 ${y})`}>
                <g
                  className="sb-scene-fish"
                  style={{
                    animationDelay: `${i * 2.3}s`,
                    animationDuration: `${24 + i * 5}s`,
                  }}
                >
                  {/* Negative X scale flips the fish so it faces its travel direction. */}
                  <g transform={`scale(${-(0.8 + (i % 3) * 0.25)} ${0.8 + (i % 3) * 0.25})`}>
                    <path
                      className="sb-scene-fin"
                      d="M-34 0 l-22 -16 l0 32 z"
                      fill={body}
                      opacity="0.9"
                      style={{ animationDelay: `${i * 0.4}s` }}
                    />
                    <ellipse cx="0" cy="0" rx="34" ry="17" fill={body} opacity="0.92" />
                    <path d="M-6 -16 l14 -12 l10 14 z" fill="#fff2c4" opacity="0.75" />
                    <circle cx="19" cy="-4" r="3" fill="#0b2b40" opacity="0.85" />
                  </g>
                </g>
              </g>
            );
          })}
          <path d="M0 0 H1600" stroke="#ffffff" strokeWidth="3" opacity="0.22" />
        </>
      )}

      {scene === 'starry' && (
        <>
          <g className="sb-scene-twinkle">
            {Array.from({ length: 90 }).map((_, i) => {
              const x = (i * 197 + 43) % 1600;
              const y = (i * 143 + 61) % 620;
              const r = i % 7 === 0 ? 3 : 1.7;
              return (
                <circle
                  key={`s${i}`}
                  cx={x}
                  cy={y}
                  r={r}
                  fill={i % 11 === 0 ? '#ffe9a8' : '#ffffff'}
                  opacity={0.8 + (i % 4) * 0.05}
                  style={{ animationDelay: `${(i % 9) * 0.45}s` }}
                />
              );
            })}
          </g>
          <circle cx="1330" cy="170" r="64" fill="#fff8dc" opacity="1" />
          <circle cx="1330" cy="170" r="96" fill="#fff3c4" opacity="0.25" />
          <circle cx="1352" cy="150" r="64" fill="#12205a" opacity="0.92" />
          <path d="M0 760 Q 380 690 780 750 T 1600 730 V 900 H 0 Z" fill="#241b5c" opacity="0.95" />
        </>
      )}
    </svg>
  );
}

function SmartboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slugParam = searchParams.get('slug');
  const audioParam = searchParams.get('audio');
  const youtubeParam = searchParams.get('youtube');
  const { user, preferences, setPref, ready: authReady } = useGoogleAuth();

  const [darkMode, setDarkMode] = useState(true);
  // Controls the size of the lyrics container (clamped responsive size), not the raw font.
  const [fontSize, setFontSize] = useState(LYRICS_SIZE_DEFAULT_VW); // vw units
  const [viewportSize, setViewportSize] = useState({ width: 1920, height: 1080 });
  const [lyrics, setLyrics] = useState('Loading...');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [currentLine, setCurrentLine] = useState(0);
  const [playheadMode, setPlayheadMode] = useState<'off' | 'timed' | 'manual'>('off');
  const [savedClips, setSavedClips] = useState<StoredTimingClip[]>([]);
  const [savedBounds, setSavedBounds] = useState<TimingBounds>({ inPoint: null, outPoint: null });
  const [savedUseClipEdgeBounds, setSavedUseClipEdgeBounds] = useState(true);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [seekRequest, setSeekRequest] = useState<{ time: number; nonce: number } | null>(null);
  const [useNativeAndroidAnimation, setUseNativeAndroidAnimation] = useState(false);
  const [bgTheme, setBgTheme] = useState<BgTheme>('classic');
  const [lineView, setLineView] = useState<'scroll' | 'single'>('scroll');
  const [optionsOpen, setOptionsOpen] = useState(false);
  
  // start as false to avoid SSR flash. We'll turn it true in useEffect if needed.
  const [showQuickStart, setShowQuickStart] = useState(false);
  const linesRef = useRef<(HTMLSpanElement | null)[]>([]);
  
  const handlePlaybackTick = useCallback((time: number, duration: number) => {
    setPlaybackTime(time);
    if (duration > 0) setPlaybackDuration(duration);
  }, []);

  const requestSeekTo = useCallback((time: number) => {
    const nextTime = Math.max(0, time);
    setPlaybackTime(nextTime);
    setSeekRequest((prev) => ({ time: nextTime, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    const lyricsParam = searchParams.get('lyrics');
    if (lyricsParam) {
      const doc = new DOMParser().parseFromString(lyricsParam, 'text/html');
      setLyrics(doc.body.textContent || '');
      return;
    }

    if (!slugParam) {
      setLyrics('');
      return;
    }

    // No lyrics in the URL (e.g. a hand-typed link). Load the song so the
    // screen shows its words instead of staying on "Loading...".
    let cancelled = false;
    fetch('/api/songs')
      .then((res) => (res.ok ? res.json() : []))
      .then((songs: Array<{ title: string; search_title?: string; lyrics: string }>) => {
        if (cancelled) return;
        const normalized = slugParam.replace(/^my-/, '');
        const match = songs.find((song) => slugifyTitle(song.title) === normalized)
          ?? songs.find((song) => slugifyTitle(song.search_title ?? '') === normalized);
        setLyrics(match?.lyrics ?? '');
      })
      .catch(() => {
        if (!cancelled) setLyrics('');
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, slugParam]);

  useEffect(() => {
    const timingSourceParam = searchParams.get('timingSource');
    const fallbackSourceKey = buildMediaTimingSources(audioParam, youtubeParam ? [youtubeParam] : [])[0]?.key ?? null;

    if (slugParam) {
      const query = new URLSearchParams({ slug: slugParam });
      if (timingSourceParam) query.set('source', timingSourceParam);
      if (fallbackSourceKey) query.set('fallbackSource', fallbackSourceKey);

      fetch(`/api/timings?${query.toString()}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((timingData: StoredTimingData | null) => {
        setSavedClips(timingData?.clips ?? []);
        setSavedBounds({
          inPoint: timingData?.inPoint ?? null,
          outPoint: timingData?.outPoint ?? null,
        });
        setSavedUseClipEdgeBounds(timingData?.useClipEdgeBounds ?? true);
        });
    } else {
      setSavedClips([]);
      setSavedBounds({ inPoint: null, outPoint: null });
      setSavedUseClipEdgeBounds(true);
    }
  }, [searchParams, slugParam, audioParam, youtubeParam]);

  useEffect(() => {
    // Audio wins when it is a real, playable URL. Song lists sometimes pass a
    // bare name (e.g. `audio=shaya`) that 404s; those are ignored so we fall
    // through to the YouTube link instead of showing a dead player.
    const raw = (audioParam || '').trim();
    const playableAudio = raw && /^(https?:\/\/|\/|blob:|data:)/i.test(raw) ? raw : null;
    const id = youtubeParam ? extractYouTubeId(youtubeParam) : null;

    setAudioUrl(playableAudio);
    setYoutubeVideoId(playableAudio ? null : id);

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, [audioParam, youtubeParam]);

  useEffect(() => {
    if (typeof window === 'undefined' || !authReady) {
      return;
    }

    const dismissedInSession = window.sessionStorage.getItem('smartboard-guide-dismissed-session') === '1';
    const dismissedInAccount = preferences?.sbSmartboardGuideDismissed === true;

    if (!dismissedInSession && !dismissedInAccount) {
      setShowQuickStart(true);
    } else {
      setShowQuickStart(false);
    }
  }, [preferences, authReady]);

  const handleDismissQuickStart = useCallback(() => {
    setShowQuickStart(false);

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('smartboard-guide-dismissed-session', '1');
    }

    if (user && setPref) {
      setPref('sbSmartboardGuideDismissed', true);
    }
  }, [user, setPref]);

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    setUseNativeAndroidAnimation(/Android/i.test(window.navigator.userAgent));
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const lines = lyrics.split('\n');

  const effectiveSavedBounds = React.useMemo(
    () => resolveEffectiveBounds(savedClips, savedBounds, savedUseClipEdgeBounds, playbackDuration || null),
    [playbackDuration, savedBounds, savedClips, savedUseClipEdgeBounds],
  );

  const PLAYHEAD_TRANSITION_LEAD_SECONDS = 0.2;
  const previewPlaybackTime = React.useMemo(
    () => playbackTime + PLAYHEAD_TRANSITION_LEAD_SECONDS,
    [playbackTime],
  );

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

  const timedPlayheadOn = playheadMode === 'timed';
  const manualPlayheadOn = playheadMode === 'manual';
  const playheadOn = playheadMode !== 'off';

  const timedActiveLine = React.useMemo(() => {
    if (!timedPlayheadOn || savedClips.length === 0) return null;
    return activeLineFromClips(savedClips, previewPlaybackTime, effectiveSavedBounds);
  }, [effectiveSavedBounds, previewPlaybackTime, savedClips, timedPlayheadOn]);

  useEffect(() => {
    if (timedActiveLine == null || timedActiveLine < 0) return;
    setCurrentLine(timedActiveLine);
    scrollToLine(timedActiveLine);
  }, [timedActiveLine, scrollToLine]);

  // Timeline sequence: savedClips sorted by time — supports repeats
  const timelineSequence = React.useMemo(() => {
    return [...savedClips]
      .filter((clip) => isClipWithinBounds(clip, effectiveSavedBounds))
      .sort((a, b) => a.start - b.start);
  }, [effectiveSavedBounds, savedClips]);

  const regularViewDisplayFontSize = React.useMemo(() => {
    const nonEmptyLines = lines.map((line) => line.trim()).filter(Boolean);
    const lineCount = Math.max(nonEmptyLines.length, 1);

    // Strip Hebrew nikud/taamim for width estimation so marked text can still scale up.
    const measureWidth = (line: string) => {
      const base = line.replace(/[\u0591-\u05C7]/g, '').trim();
      return Array.from(base).length;
    };

    const longestLineLength = Math.max(...nonEmptyLines.map(measureWidth), 10);
    const availableWidthPx = viewportSize.width * 0.84;
    const availableHeightPx = Math.max(340, viewportSize.height - 240);
    const widthBasedEm = availableWidthPx / (longestLineLength * 0.5 * 16);
    const heightBasedEm = availableHeightPx / (lineCount * 1.55 * 16);

    const autoFitEm = Math.max(2.6, Math.min(8.2, widthBasedEm, heightBasedEm));
    // The +/- control scales the whole lyrics block on top of the auto-fit size.
    const sizeScale = fontSize / LYRICS_SIZE_DEFAULT_VW;
    return Math.max(1.6, Math.min(14, autoFitEm * sizeScale));
  }, [fontSize, lines, viewportSize.height, viewportSize.width]);

  // Active position in the timeline sequence based on playback time
  const activeSeqIndex = React.useMemo(() => {
    if (!timedPlayheadOn || timelineSequence.length === 0) return -1;
    let best = -1;
    for (let i = 0; i < timelineSequence.length; i++) {
      if (timelineSequence[i].start <= previewPlaybackTime) best = i;
    }
    return best;
  }, [previewPlaybackTime, timedPlayheadOn, timelineSequence]);

  const hasTimedPlayhead = timelineSequence.length > 0;
  const smartboardGuideSteps = hasTimedPlayhead
    ? [
      'Press Start Playhead to make the words follow the timing for you.',
      'Click any line if you want to jump to that part.',
      'Open Options to resize the words, change the background, or show one line at a time.',
    ]
    : [
      'Tap any line to start manual mode.',
      'Tap another line when you want to move the highlight.',
      'Open Options to resize the words, change the background, or show one line at a time.',
    ];

  const wheelAnimationRef = useRef<number | null>(null);
  const wheelNativeAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelMoveFrameRef = useRef<number | null>(null);
  const wheelPendingPositionRef = useRef<number | null>(null);
  const wheelPointerIdRef = useRef<number | null>(null);
  const isWheelDraggingRef = useRef(false);
  const wheelDragStartYRef = useRef(0);
  const wheelDragStartPositionRef = useRef(0);
  const wheelLastYRef = useRef(0);
  const wheelLastTsRef = useRef(0);
  const wheelVelocityRef = useRef(0);
  const wheelPointerTypeRef = useRef<string>('mouse');
  const wheelDragThresholdRef = useRef(8);
  const suppressCardClickUntilRef = useRef(0);
  const [wheelPosition, setWheelPosition] = useState(-1);
  const [isWheelDragging, setIsWheelDragging] = useState(false);
  const [isWheelAnimating, setIsWheelAnimating] = useState(false);
  const [probeWidthPx, setProbeWidthPx] = useState<number | null>(null);

  const longestVerseLine = React.useMemo(
    () => lines.reduce((a, b) => (b.length > a.length ? b : a), ''),
    [lines],
  );

  const FOCUS_CENTER_OFFSET = -60;
  const WHEEL_STEP_PX = 112;
  const WHEEL_VISIBLE_RANGE = 4.25;
  const WHEEL_DRAG_THRESHOLD_PX = 8;
  // Fingers wobble; a larger threshold keeps a deliberate tap from becoming a drag.
  const WHEEL_TOUCH_DRAG_THRESHOLD_PX = 16;

  // 0 at the smallest lyrics size, 1 at the largest. Cards get tighter as it grows.
  const sizeProgress = Math.min(
    1,
    Math.max(0, (fontSize - LYRICS_SIZE_MIN_VW) / (LYRICS_SIZE_MAX_VW - LYRICS_SIZE_MIN_VW)),
  );
  const focusMaxScale = 1.15 - 0.22 * sizeProgress;
  const itemLineHeightEm = 1.45 - 0.3 * sizeProgress;
  const itemPadYEm = 0.28 - 0.24 * sizeProgress;
  const itemMinHeightEm = 1.55 - 0.85 * sizeProgress;

  // Requested container font size in px, before fitting it to the viewport.
  const requestedColumnFontPx = (fontSize * viewportSize.width) / 100;
  const maxColumnWidthPx = Math.max(240, viewportSize.width * 0.94);
  const measuredColumnWidthPx = probeWidthPx ?? 0;
  // The probe is measured at the focused (largest) card size, so the column always fits
  // the biggest verse. Without this the focused verse overflows and the block looks
  // off-centre instead of centred.
  const columnFitScale = measuredColumnWidthPx > maxColumnWidthPx
    ? maxColumnWidthPx / measuredColumnWidthPx
    : 1;
  const lyricsColumnFontPx = Math.max(
    10,
    Math.min(260, requestedColumnFontPx * columnFitScale),
  );
  const lyricsColumnWidthPx = measuredColumnWidthPx > 0
    ? Math.min(maxColumnWidthPx, measuredColumnWidthPx * columnFitScale)
    : maxColumnWidthPx;
  // Spacing is derived from the real card heights so verses can never collide. The
  // per-card line-height, padding and focus growth all tighten as the size grows, so
  // the gap between lines shrinks while the text gets bigger.
  const focusedCardHeightPx = lyricsColumnFontPx * focusMaxScale
    * Math.max(itemMinHeightEm, itemLineHeightEm + 2 * itemPadYEm);
  const neighbourCardHeightPx = lyricsColumnFontPx * FOCUS_MIN_SCALE
    * Math.max(itemMinHeightEm, itemLineHeightEm + 2 * itemPadYEm * 0.8);
  const wheelLineStepPx = ((focusedCardHeightPx + neighbourCardHeightPx) / 2) * 1.04;
  const wheelCenterGapPx = lyricsColumnFontPx * 0.2;

  // Measure the widest verse at the requested container size to size the column.
  // A callback ref + ResizeObserver keeps this accurate through mount, font loading,
  // and every size change.
  const [probeNode, setProbeNode] = useState<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (!probeNode) return;
    const measure = () => setProbeWidthPx(probeNode.offsetWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(probeNode);
    return () => observer.disconnect();
  }, [probeNode]);

  // Android smartboards natively start a text selection / callout when a touch drag
  // begins over the lyrics. Block selectstart, dragstart and the long-press context
  // menu at the native level, which CSS alone does not fully cover on every device.
  const [wheelNode, setWheelNode] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!wheelNode) return;
    const blockSelection = (event: Event) => {
      event.preventDefault();
      try { window.getSelection()?.removeAllRanges(); } catch {}
    };
    const events: Array<keyof HTMLElementEventMap> = ['selectstart', 'dragstart', 'contextmenu'];
    events.forEach((name) => wheelNode.addEventListener(name, blockSelection));
    return () => {
      events.forEach((name) => wheelNode.removeEventListener(name, blockSelection));
    };
  }, [wheelNode]);

  const getWheelAnimationDuration = useCallback((start: number, end: number, base: number) => {
    const distance = Math.abs(end - start);
    return Math.max(base, Math.min(420, base + distance * 55));
  }, []);

  const seekToSequenceIndex = useCallback((seqIdx: number) => {
    const clip = timelineSequence[seqIdx];
    if (!clip) return;
    setCurrentLine(Math.max(0, clip.verseIndex));
    setWheelPosition(seqIdx);
    requestSeekTo(clip.start);
  }, [timelineSequence, requestSeekTo]);

  const clampWheelPosition = useCallback((value: number) => {
    if (timelineSequence.length === 0) return 0;
    return Math.max(0, Math.min(timelineSequence.length - 1, value));
  }, [timelineSequence.length]);

  const stopWheelAnimation = useCallback(() => {
    if (wheelAnimationRef.current != null) {
      cancelAnimationFrame(wheelAnimationRef.current);
      wheelAnimationRef.current = null;
    }
    if (wheelNativeAnimationTimerRef.current != null) {
      clearTimeout(wheelNativeAnimationTimerRef.current);
      wheelNativeAnimationTimerRef.current = null;
    }
    if (wheelMoveFrameRef.current != null) {
      cancelAnimationFrame(wheelMoveFrameRef.current);
      wheelMoveFrameRef.current = null;
    }
    wheelPendingPositionRef.current = null;
    setIsWheelAnimating(false);
  }, []);

  const animateWheelTo = useCallback((target: number, duration: number, seekOnComplete: boolean) => {
    const end = clampWheelPosition(target);
    stopWheelAnimation();

    const start = wheelPosition >= 0 ? wheelPosition : end;
    const resolvedDuration = getWheelAnimationDuration(start, end, duration);
    if (Math.abs(end - start) < 0.001) {
      setWheelPosition(end);
      if (seekOnComplete) seekToSequenceIndex(Math.round(end));
      return;
    }

    if (useNativeAndroidAnimation) {
      setIsWheelAnimating(false);
      setWheelPosition(end);
      if (seekOnComplete) {
        wheelNativeAnimationTimerRef.current = setTimeout(() => {
          wheelNativeAnimationTimerRef.current = null;
          seekToSequenceIndex(Math.round(end));
        }, resolvedDuration);
      }
      return;
    }

    setIsWheelAnimating(true);
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / resolvedDuration);
      const eased = 0.5 - Math.cos(t * Math.PI) / 2;
      const next = start + (end - start) * eased;
      setWheelPosition(next);
      if (t >= 1) {
        wheelAnimationRef.current = null;
        setIsWheelAnimating(false);
        setWheelPosition(end);
        if (seekOnComplete) seekToSequenceIndex(Math.round(end));
        return;
      }
      wheelAnimationRef.current = requestAnimationFrame(step);
    };

    wheelAnimationRef.current = requestAnimationFrame(step);
  }, [clampWheelPosition, getWheelAnimationDuration, seekToSequenceIndex, stopWheelAnimation, useNativeAndroidAnimation, wheelPosition]);

  useEffect(() => {
    if (activeSeqIndex < 0 || isWheelDragging || isWheelAnimating) return;
    animateWheelTo(activeSeqIndex, 220, false);
  }, [activeSeqIndex, animateWheelTo, isWheelAnimating, isWheelDragging]);

  const finishWheelInteraction = useCallback((projectedPosition?: number) => {
    const rawTarget = projectedPosition ?? wheelPosition;
    const targetIndex = Math.round(clampWheelPosition(rawTarget));
    animateWheelTo(targetIndex, 300, true);
  }, [animateWheelTo, clampWheelPosition, wheelPosition]);

  const handleWheelPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (timelineSequence.length === 0) return;
    // NOTE: do NOT preventDefault() or capture the pointer here. Cancelling pointerdown
    // suppresses the compatibility mouse events, so a plain tap never produces a click
    // (breaks tap-to-jump on touch devices), and capturing redirects the click target to
    // the wheel instead of the verse button. Capture starts only once a real drag begins.
    try { window.getSelection()?.removeAllRanges(); } catch {}
    stopWheelAnimation();
    wheelPointerIdRef.current = e.pointerId;
    isWheelDraggingRef.current = false;
    wheelPointerTypeRef.current = e.pointerType || 'mouse';
    wheelDragThresholdRef.current = wheelPointerTypeRef.current === 'touch'
      ? WHEEL_TOUCH_DRAG_THRESHOLD_PX
      : WHEEL_DRAG_THRESHOLD_PX;
    wheelDragStartYRef.current = e.clientY;
    wheelDragStartPositionRef.current = wheelPosition >= 0 ? wheelPosition : Math.max(0, activeSeqIndex);
    wheelLastYRef.current = e.clientY;
    wheelLastTsRef.current = performance.now();
    wheelVelocityRef.current = 0;
  }, [activeSeqIndex, stopWheelAnimation, timelineSequence.length, wheelPosition]);

  const handleWheelPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (wheelPointerIdRef.current !== e.pointerId) return;
    const dy = e.clientY - wheelDragStartYRef.current;
    if (!isWheelDraggingRef.current) {
      if (Math.abs(dy) < wheelDragThresholdRef.current) return;
      isWheelDraggingRef.current = true;
      setIsWheelDragging(true);
      // Capture only now, so a plain tap keeps its original click target.
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
      wheelLastYRef.current = e.clientY;
      wheelLastTsRef.current = performance.now();
      wheelVelocityRef.current = 0;
    }
    e.preventDefault();

    const nextPosition = clampWheelPosition(wheelDragStartPositionRef.current - dy / WHEEL_STEP_PX);
    wheelPendingPositionRef.current = nextPosition;
    if (wheelMoveFrameRef.current == null) {
      wheelMoveFrameRef.current = requestAnimationFrame(() => {
        wheelMoveFrameRef.current = null;
        const pendingPosition = wheelPendingPositionRef.current;
        if (pendingPosition == null) return;
        setWheelPosition(pendingPosition);
      });
    }

    const now = performance.now();
    const deltaY = e.clientY - wheelLastYRef.current;
    const dt = Math.max(1, now - wheelLastTsRef.current);
    const instantVelocity = (-deltaY / WHEEL_STEP_PX) / dt;
    wheelVelocityRef.current = wheelVelocityRef.current === 0
      ? instantVelocity
      : wheelVelocityRef.current * 0.35 + instantVelocity * 0.65;
    wheelLastYRef.current = e.clientY;
    wheelLastTsRef.current = now;
  }, [clampWheelPosition]);

  const handleWheelPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (wheelPointerIdRef.current !== e.pointerId) return;
    // Only cancel pointerup for real drags; cancelling it on a tap suppresses the click.
    if (isWheelDraggingRef.current) e.preventDefault();
    const totalDy = Math.abs(e.clientY - wheelDragStartYRef.current);
    const wasDragging = isWheelDraggingRef.current;
    const releaseVelocity = wheelVelocityRef.current;
    const releasePosition = wheelPendingPositionRef.current ?? wheelPosition;
    wheelPointerIdRef.current = null;
    wheelVelocityRef.current = 0;
    wheelPendingPositionRef.current = null;
    if (wheelMoveFrameRef.current != null) {
      cancelAnimationFrame(wheelMoveFrameRef.current);
      wheelMoveFrameRef.current = null;
    }
    isWheelDraggingRef.current = false;
    setIsWheelDragging(false);
    try {
      if ((e.currentTarget as Element).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (wasDragging && totalDy > wheelDragThresholdRef.current) {
      suppressCardClickUntilRef.current = Date.now() + 220;
    }

    if (!wasDragging) return;

    setWheelPosition(releasePosition);
    const projected = clampWheelPosition((releasePosition >= 0 ? releasePosition : 0) + releaseVelocity * 180);
    finishWheelInteraction(projected);
  }, [clampWheelPosition, finishWheelInteraction, wheelPosition]);

  useEffect(() => {
    return () => {
      isWheelDraggingRef.current = false;
      stopWheelAnimation();
    };
  }, [stopWheelAnimation]);

  const handleVerseClick = useCallback((seqIdx: number) => {
    if (isWheelDraggingRef.current || Date.now() < suppressCardClickUntilRef.current) return;
    animateWheelTo(seqIdx, 280, true);
  }, [animateWheelTo]);

  const activateManualPlayhead = useCallback((lineIndex: number) => {
    setPlayheadMode('manual');
    setCurrentLine(lineIndex);
    scrollToLine(lineIndex);
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
    setFontSize((prev) => Math.min(
      LYRICS_SIZE_MAX_VW,
      Math.max(LYRICS_SIZE_MIN_VW, increase ? prev + 0.5 : prev - 0.5),
    ));
  }, []);

  // Restore the chosen background and line display once on mount.
  useEffect(() => {
    try {
      const savedBg = window.localStorage.getItem(BG_THEME_STORAGE_KEY);
      if (savedBg && BG_THEMES.some((theme) => theme.id === savedBg)) {
        setBgTheme(savedBg as BgTheme);
      }
      const savedLines = window.localStorage.getItem(LINE_VIEW_STORAGE_KEY);
      if (savedLines === 'scroll' || savedLines === 'single') {
        setLineView(savedLines);
      }
    } catch {
      // Storage unavailable; keep the defaults.
    }
  }, []);

  const changeBgTheme = useCallback((theme: BgTheme) => {
    setBgTheme(theme);
    try {
      window.localStorage.setItem(BG_THEME_STORAGE_KEY, theme);
    } catch {
      // Storage unavailable; the theme still applies for this session.
    }
  }, []);

  const changeLineView = useCallback((view: 'scroll' | 'single') => {
    setLineView(view);
    try {
      window.localStorage.setItem(LINE_VIEW_STORAGE_KEY, view);
    } catch {
      // Storage unavailable; the mode still applies for this session.
    }
  }, []);

  // Close the options popover with Escape.
  useEffect(() => {
    if (!optionsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOptionsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [optionsOpen]);

  const toggleTimedPlayhead = useCallback(() => {
    if (!hasTimedPlayhead) {
      return;
    }

    setPlayheadMode((currentMode) => {
      if (currentMode === 'timed') {
        return 'off';
      }

      setCurrentLine(0);
      scrollToLine(0);
      if (effectiveSavedBounds.inPoint != null) {
        requestSeekTo(effectiveSavedBounds.inPoint);
      }
      return 'timed';
    });
  }, [effectiveSavedBounds.inPoint, hasTimedPlayhead, requestSeekTo, scrollToLine]);

  const bottomButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(180deg, #f6d85e, #e7ba1f)',
    color: '#151515',
    padding: '10px 18px',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 999,
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: 13,
    minHeight: 40,
    boxShadow: '0 10px 24px rgba(242,203,5,0.22), inset 0 1px 0 rgba(255,255,255,0.28)',
  };

  const secondaryBottomButtonStyle: React.CSSProperties = {
    ...bottomButtonStyle,
    background: 'rgba(255,255,255,0.03)',
    color: '#f2cb05',
    border: '1px solid #f2cb05',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
  };

  const optionStepButtonStyle: React.CSSProperties = {
    ...secondaryBottomButtonStyle,
    minWidth: 36,
    minHeight: 36,
    padding: 0,
    borderRadius: 999,
    fontSize: 20,
    lineHeight: 1,
  };

  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        fontFamily: 'var(--font-frank-ruhl-libre), var(--font-noto-serif-hebrew), Arial, sans-serif',
        background: backgroundForTheme(bgTheme, darkMode),
        color: textColorForTheme(bgTheme, darkMode),
        transition: 'background-color 0.5s, background 0.5s, color 0.5s',
        minHeight: '100vh',
        position: 'relative',
        isolation: 'isolate',
      }}
    >
      {isSceneTheme(bgTheme) && <SceneBackdrop scene={bgTheme} />}
      <style>{`
        .sb-scene {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: -1;
          pointer-events: none;
        }
        .sb-scene-drift {
          animation: sb-drift 70s linear infinite alternate;
        }
        .sb-scene-bubble {
          animation-name: sb-rise;
          animation-iteration-count: infinite;
          animation-timing-function: linear;
        }
        .sb-scene-fish {
          animation-name: sb-swim;
          animation-iteration-count: infinite;
          animation-timing-function: linear;
        }
        .sb-scene-fin {
          transform-origin: -6px 0px;
          animation: sb-wag 0.9s ease-in-out infinite alternate;
        }
        .sb-scene-twinkle > circle {
          animation: sb-twinkle 3.2s ease-in-out infinite alternate;
        }
        @keyframes sb-drift {
          from { transform: translateX(-40px); }
          to   { transform: translateX(40px); }
        }
        @keyframes sb-rise {
          from { transform: translateY(0); }
          to   { transform: translateY(-900px); }
        }
        @keyframes sb-swim {
          from { transform: translateX(0); }
          to   { transform: translateX(-1900px); }
        }
        @keyframes sb-wag {
          from { transform: rotate(-9deg); }
          to   { transform: rotate(9deg); }
        }
        @keyframes sb-twinkle {
          from { opacity: 0.35; }
          to   { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sb-scene * { animation: none !important; }
        }
        /* Android smartboards start a text selection (blue highlight + handles) when a
           drag begins over the lyrics. Suppress selection, callouts and tap highlights
           for the wheel and everything inside it. */
        .sb-wheel,
        .sb-wheel * {
          -webkit-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        .sb-wheel ::selection {
          background: transparent;
          color: inherit;
        }
      `}</style>
      {showQuickStart === true && !playheadOn && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(92vw, 760px)',
            zIndex: 12,
          }}
        >
          <QuickInstructions
            title="How Smartboard mode works"
            steps={smartboardGuideSteps}
            note={hasTimedPlayhead ? 'This song already has timing saved.' : 'This song does not have timing saved yet.'}
            tone="dark"
            compact
            onDismiss={handleDismissQuickStart}
          />
        </div>
      )}
      {/* Song lyrics */}
      {lineView === 'single' ? (
        // ONE LINE AT A TIME: show only the current line, centered.
        <div
          onClick={manualPlayheadOn ? () => setPlayheadMode('off') : undefined}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '75vh',
            paddingTop: '4.5rem',
            paddingBottom: '10rem',
            cursor: manualPlayheadOn ? 'pointer' : 'default',
          }}
        >
          <div
            style={{
              maxWidth: '84vw',
              textAlign: 'center',
              fontSize: `${regularViewDisplayFontSize}em`,
              lineHeight: 1.35,
              whiteSpace: 'pre-wrap',
              transition: 'opacity 0.25s',
            }}
          >
            {lines[Math.min(Math.max(currentLine, 0), Math.max(lines.length - 1, 0))] || '\u00A0'}
          </div>
        </div>
      ) : timedPlayheadOn && timelineSequence.length > 0 ? (
        // TELEPROMPTER MODE: custom wheel viewport
        <>
          {/* Hidden probe — measures the widest verse at the requested size to size the column. */}
          <span
            ref={setProbeNode}
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: 0,
              left: -9999,
              visibility: 'hidden',
              pointerEvents: 'none',
              fontSize: `${requestedColumnFontPx * focusMaxScale}px`,
              fontWeight: 700,
              fontFamily: 'var(--font-frank-ruhl-libre), var(--font-noto-serif-hebrew), Arial, sans-serif',
              padding: '0 0.8em',
              whiteSpace: 'nowrap',
            }}
          >
            {longestVerseLine || '\u00A0'}
          </span>
          <div
            ref={setWheelNode}
            onPointerDown={handleWheelPointerDown}
            onPointerMove={handleWheelPointerMove}
            onPointerUp={handleWheelPointerUp}
            onPointerCancel={handleWheelPointerUp}
            data-testid="smartboard-wheel"
            className="sb-wheel"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 120,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'none',
              userSelect: 'none',
              cursor: isWheelDragging ? 'grabbing' : 'grab',
              zIndex: 0,
            }}
          >
            {/* Column width and font size both follow the +/- control. */}
            <div style={{
              position: 'relative',
              width: `${Math.round(lyricsColumnWidthPx)}px`,
              maxWidth: '94vw',
              height: '100%',
              fontSize: `${lyricsColumnFontPx}px`,
              textAlign: 'center',
              lineHeight: itemLineHeightEm,
              whiteSpace: 'normal',
              overflowWrap: 'break-word',
            }}>
              {timelineSequence.map((clip, seqIdx) => {
                const effectiveWheelPosition = wheelPosition >= 0 ? wheelPosition : Math.max(0, activeSeqIndex);
                const rawOffset = seqIdx - effectiveWheelPosition;
                const absOffset = Math.abs(rawOffset);
                if (absOffset > WHEEL_VISIBLE_RANGE) return null;
                const clampedOffset = Math.min(1.8, absOffset);
                const focus = Math.max(0, 1 - clampedOffset / 1.8);
                const easedFocus = focus * focus * (3 - 2 * focus);
                const isCurrent = absOffset < 0.22;
                const scale = 0.94 + easedFocus * 0.06;
                const focusScale = FOCUS_MIN_SCALE + easedFocus * (focusMaxScale - FOCUS_MIN_SCALE);
                const fEm = focusScale;
                const androidScale = scale * focusScale;
                const opacity = 0.5 + easedFocus * 0.5;
                const blur = (1 - easedFocus) * 0.75;
                const direction = rawOffset === 0 ? 0 : rawOffset / absOffset;
                const baseTranslateY = rawOffset * wheelLineStepPx;
                const centerGapBonus = absOffset <= 1
                  ? absOffset * wheelCenterGapPx
                  : wheelCenterGapPx;
                const translateY = baseTranslateY + direction * centerGapBonus;
                const hitDepth = Math.round(easedFocus * 1000) + (isCurrent ? 1000 : 0);
                return (
                  <button
                    key={seqIdx}
                    type="button"
                    onClick={() => handleVerseClick(seqIdx)}
                    draggable={false}
                    data-testid={`smartboard-verse-${seqIdx}`}
                    data-seq-index={seqIdx}
                    data-verse-index={clip.verseIndex}
                    data-current={isCurrent ? 'true' : 'false'}
                    className="sb-verse"
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: useNativeAndroidAnimation
                        ? `calc(50% + ${FOCUS_CENTER_OFFSET}px)`
                        : `calc(50% + ${FOCUS_CENTER_OFFSET}px + ${translateY}px)`,
                      display: 'block',
                      width: '100%',
                      minHeight: `${itemMinHeightEm}em`,
                      border: 'none',
                      whiteSpace: 'nowrap',
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                      WebkitTouchCallout: 'none',
                      WebkitTapHighlightColor: 'transparent',
                      padding: isCurrent ? `${itemPadYEm}em 0.8em` : `${itemPadYEm * 0.8}em 0.68em`,
                      lineHeight: itemLineHeightEm,
                      borderRadius: 12,
                      transition: isWheelDragging || isWheelAnimating
                        ? 'none'
                        : useNativeAndroidAnimation
                          ? 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), transform 240ms cubic-bezier(0.22, 1, 0.36, 1)'
                          : 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), font-size 240ms cubic-bezier(0.22, 1, 0.36, 1), transform 240ms cubic-bezier(0.22, 1, 0.36, 1), filter 240ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1), background 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                      opacity,
                      fontSize: useNativeAndroidAnimation ? '1em' : `${fEm}em`,
                      fontWeight: easedFocus > 0.72 ? 700 : 400,
                      transform: useNativeAndroidAnimation
                        ? `translate3d(-50%, -50%, 0) translate3d(0, ${translateY}px, 0) scale(${androidScale})`
                        : `translate(-50%, -50%) scale(${scale})`,
                      transformOrigin: 'center center',
                      filter: useNativeAndroidAnimation ? 'none' : `blur(${blur}px)`,
                      willChange: useNativeAndroidAnimation ? 'transform, opacity' : undefined,
                      backfaceVisibility: useNativeAndroidAnimation ? 'hidden' : undefined,
                      boxShadow: 'none',
                      background: 'transparent',
                      color: darkMode ? 'white' : 'black',
                      textAlign: 'center',
                      cursor: 'pointer',
                      touchAction: 'manipulation',
                      pointerEvents: isWheelDragging ? 'none' : 'auto',
                      zIndex: hitDepth,
                    }}
                  >
                    {lines[clip.verseIndex] || '\u00A0'}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div
          onClick={manualPlayheadOn ? () => setPlayheadMode('off') : undefined}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: manualPlayheadOn ? 'center' : playheadOn ? 'flex-start' : 'center',
            minHeight: '75vh',
            paddingTop: manualPlayheadOn ? '4.5rem' : playheadOn ? '2rem' : '4.5rem',
            paddingBottom: manualPlayheadOn ? 0 : playheadOn ? '10rem' : 0,
            cursor: manualPlayheadOn ? 'pointer' : 'default',
          }}
        >
          <div
            onClick={(event) => {
              if (manualPlayheadOn) {
                event.stopPropagation();
              }
            }}
            style={{
              display: 'inline-block',
              width: 'fit-content',
              maxWidth: '84vw',
              textAlign: 'center',
              margin: '0 auto',
            }}
          >
            <div style={{ fontSize: `${regularViewDisplayFontSize}em`, lineHeight: manualPlayheadOn ? 1.42 : 1.45 }}>
              {lines.map((line, i) => (
                <span
                  key={i}
                  ref={(el) => { linesRef.current[i] = el; }}
                  onClick={(e) => {
                    e.stopPropagation();
                    activateManualPlayhead(i);
                  }}
                  style={{
                    display: 'block',
                    padding: manualPlayheadOn ? '0.02em 0.28em' : '0.04em 0.28em',
                    borderRadius: 6,
                    transition: 'opacity 0.3s, transform 0.3s',
                    opacity: manualPlayheadOn ? (i === currentLine ? 1 : 0.3) : 1,
                    transform: manualPlayheadOn && i === currentLine ? 'scale(1.05)' : 'scale(1)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {line || '\u00A0'}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

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
      <div style={{
        position: 'fixed',
        left: '50%',
        bottom: 18,
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        flexWrap: 'nowrap',
        justifyContent: 'space-between',
        alignItems: 'stretch',
        gap: 14,
        width: 'min(96vw, 1340px)',
        padding: '14px 18px',
        borderRadius: 34,
        background: darkMode
          ? 'linear-gradient(135deg, rgba(10,10,10,0.88), rgba(22,22,22,0.78))'
          : 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(245,242,232,0.82))',
        backdropFilter: 'blur(20px)',
        border: darkMode ? '1px solid rgba(242,203,5,0.18)' : '1px solid rgba(0,0,0,0.08)',
        boxShadow: darkMode
          ? '0 22px 48px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.04)'
          : '0 22px 48px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.5)',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: '0 0 auto' }}>
          <button
            onClick={() => router.push('/songs')}
            style={bottomButtonStyle}
          >
            Back
          </button>
          <button
            onClick={toggleTimedPlayhead}
            disabled={!hasTimedPlayhead}
            style={{
              ...(timedPlayheadOn ? bottomButtonStyle : secondaryBottomButtonStyle),
              minWidth: 168,
              opacity: hasTimedPlayhead ? 1 : 0.42,
              cursor: hasTimedPlayhead ? 'pointer' : 'not-allowed',
              border: hasTimedPlayhead ? bottomButtonStyle.border : '1px solid rgba(255,255,255,0.14)',
              color: hasTimedPlayhead ? (timedPlayheadOn ? '#151515' : '#f2cb05') : '#8f8f8f',
            }}
          >
            {timedPlayheadOn ? 'Pause Playhead' : 'Start Playhead'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '1 1 460px', minWidth: 0 }}>
          {audioUrl ? (
            <SmartboardAudioPlayer
              audioUrl={audioUrl}
              inPoint={effectiveSavedBounds.inPoint}
              outPoint={effectiveSavedBounds.outPoint}
              onTick={handlePlaybackTick}
              seekRequest={seekRequest}
            />
          ) : youtubeVideoId ? (
            <SmartboardYouTubePlayer
              videoId={youtubeVideoId}
              inPoint={effectiveSavedBounds.inPoint}
              outPoint={effectiveSavedBounds.outPoint}
              onTick={handlePlaybackTick}
              seekRequest={seekRequest}
            />
          ) : null}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end', flex: '0 0 auto' }}>
          <button
            type="button"
            onClick={() => setOptionsOpen((v) => !v)}
            aria-label="Options"
            aria-expanded={optionsOpen}
            aria-controls="smartboard-options"
            title="Options"
            style={{
              ...secondaryBottomButtonStyle,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              minWidth: 0,
              padding: '10px 16px',
              border: optionsOpen ? '1px solid #f2cb05' : secondaryBottomButtonStyle.border,
              background: optionsOpen ? 'rgba(242,203,5,0.16)' : secondaryBottomButtonStyle.background,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              {optionsOpen ? (
                <>
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </>
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
            <span style={{ fontSize: 13, fontWeight: 800 }}>{optionsOpen ? 'Close' : 'Options'}</span>
          </button>
        </div>
      </div>

      {/* Options popover - font, line display, background, and dark mode. */}
      {optionsOpen && (
        <>
          <div
            onClick={() => setOptionsOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 14 }}
          />
          <div
            id="smartboard-options"
            role="dialog"
            aria-label="Smartboard options"
            style={{
              position: 'fixed',
              right: 'max(18px, calc((100vw - min(96vw, 1340px)) / 2 + 18px))',
              bottom: 96,
              zIndex: 15,
              width: 'min(92vw, 380px)',
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              borderRadius: 22,
              background: darkMode
                ? 'linear-gradient(135deg, rgba(14,14,14,0.97), rgba(26,26,26,0.95))'
                : 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(246,243,234,0.96))',
              backdropFilter: 'blur(20px)',
              border: darkMode ? '1px solid rgba(242,203,5,0.24)' : '1px solid rgba(0,0,0,0.1)',
              boxShadow: '0 26px 60px rgba(0,0,0,0.5)',
              color: darkMode ? '#fff' : '#151515',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f2cb05' }}>Smartboard</div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>Options</div>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
                <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>Dark</span>
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={() => setDarkMode((v) => !v)}
                  style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
                />
                <span
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: 50,
                    height: 28,
                    borderRadius: 999,
                    background: darkMode ? '#f2cb05' : '#c9c9c9',
                    transition: 'background 0.25s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: darkMode ? 25 : 3,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.25s',
                    }}
                  />
                </span>
              </label>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 7 }}>Lyrics size</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button type="button" onClick={() => changeFontSize(false)} aria-label="Decrease font size" style={optionStepButtonStyle}>-</button>
                <div style={{ flex: 1, height: 6, borderRadius: 999, background: darkMode ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)', position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${Math.min(100, Math.max(0, ((fontSize - LYRICS_SIZE_MIN_VW) / (LYRICS_SIZE_MAX_VW - LYRICS_SIZE_MIN_VW)) * 100))}%`,
                      borderRadius: 999,
                      background: '#f2cb05',
                      transition: 'width 0.2s',
                    }}
                  />
                </div>
                <button type="button" onClick={() => changeFontSize(true)} aria-label="Increase font size" style={optionStepButtonStyle}>+</button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 7 }}>Lines</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {([['scroll', 'Scroll all'], ['single', 'One at a time']] as const).map(([value, label]) => {
                  const active = lineView === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => changeLineView(value)}
                      aria-pressed={active}
                      style={{
                        padding: '11px 12px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 700,
                        border: active ? '1px solid #f2cb05' : `1px solid ${darkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)'}`,
                        background: active ? '#f2cb05' : 'transparent',
                        color: active ? '#151515' : 'inherit',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 7 }}>Background</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {BG_THEMES.map((theme) => {
                  const active = bgTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => changeBgTheme(theme.id)}
                      aria-label={theme.label}
                      aria-pressed={active}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 5,
                        padding: 6,
                        borderRadius: 12,
                        cursor: 'pointer',
                        background: active ? 'rgba(242,203,5,0.14)' : 'transparent',
                        border: active ? '1px solid #f2cb05' : '1px solid transparent',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          display: 'block',
                          width: '100%',
                          height: 30,
                          borderRadius: 8,
                          background: theme.preview,
                          border: '1px solid rgba(255,255,255,0.28)',
                        }}
                      />
                      <span style={{ fontSize: 10.5, fontWeight: 600, textAlign: 'center', lineHeight: 1.2, opacity: active ? 1 : 0.75 }}>
                        {theme.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function SmartboardModePage() {
  return (
    <AuthBoundary>
      <Suspense
        fallback={
          <div style={{ background: 'black', color: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Loading...
          </div>
        }
      >
        <SmartboardContent />
      </Suspense>
    </AuthBoundary>
  );
}
