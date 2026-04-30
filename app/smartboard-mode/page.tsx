'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { extractYouTubeId, ensureYTApi, fmt } from '@/lib/youtube';
import React from 'react';

interface StoredTimingClip {
  verseIndex: number;
  start: number;
}

interface TimingBounds {
  inPoint: number | null;
  outPoint: number | null;
}

interface StoredTimingData extends TimingBounds {
  clips: StoredTimingClip[];
  useClipEdgeBounds: boolean;
}

const DEFAULT_CARD_LENGTH = 6;

function normalizeBoundaryPoint(point: unknown): number | null {
  if (typeof point !== 'number' || !Number.isFinite(point) || point < 0) {
    return null;
  }

  return Number(point.toFixed(2));
}

function normalizeTimingBounds(inPoint: unknown, outPoint: unknown): TimingBounds {
  const nextInPoint = normalizeBoundaryPoint(inPoint);
  let nextOutPoint = normalizeBoundaryPoint(outPoint);

  if (nextInPoint != null && nextOutPoint != null && nextOutPoint <= nextInPoint) {
    nextOutPoint = null;
  }

  return {
    inPoint: nextInPoint,
    outPoint: nextOutPoint,
  };
}

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

function deriveBoundsFromClipEdges(clips: StoredTimingClip[], fallbackOutPoint: number | null): TimingBounds {
  if (clips.length === 0) {
    return { inPoint: null, outPoint: null };
  }

  const ordered = clips.slice().sort((a, b) => a.start - b.start);
  const inPoint = Number(ordered[0].start.toFixed(2));
  const lastStart = ordered[ordered.length - 1].start;
  const defaultOutPoint = Number((lastStart + DEFAULT_CARD_LENGTH).toFixed(2));
  const roundedFallbackOut = normalizeBoundaryPoint(fallbackOutPoint);
  const outPoint = roundedFallbackOut != null && roundedFallbackOut > lastStart
    ? Math.min(roundedFallbackOut, defaultOutPoint)
    : defaultOutPoint;

  return normalizeTimingBounds(inPoint, outPoint);
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

    const handleCanPlay = () => {
      setReady(true);
      setLoading(false);
      const nextDuration = audio.duration || 0;
      setDuration(nextDuration);
      onTick?.(audio.currentTime || 0, nextDuration, !audio.paused);
    };
    const handleTimeUpdate = () => {
      const nextTime = audio.currentTime || 0;
      const nextDuration = audio.duration > 0 ? audio.duration : duration;
      if (windowEnd != null && nextTime >= windowEnd) {
        audio.currentTime = Math.min(windowEnd, nextDuration || windowEnd);
        audio.pause();
      }
      setProgress(nextTime);
      if (audio.duration > 0) setDuration(audio.duration);
      onTick?.(nextTime, nextDuration, !audio.paused);
    };
    const handlePlay = () => {
      setPlaying(true);
      onTick?.(audio.currentTime || 0, audio.duration || 0, true);
    };
    const handlePause = () => {
      setPlaying(false);
      onTick?.(audio.currentTime || 0, audio.duration || 0, false);
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
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const windowStart = Math.max(0, inPoint ?? 0);
  const windowEnd = outPoint != null && outPoint > windowStart ? outPoint : null;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const destroyedRef = useRef(false);

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
  }, [videoId, onTick, windowEnd]);

  // Track progress while playing
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        const t = playerRef.current?.getCurrentTime?.() || 0;
        const d = playerRef.current?.getDuration?.() || 0;
        if (windowEnd != null && t >= windowEnd && playerRef.current) {
          const capped = Math.min(windowEnd, d || windowEnd);
          try { playerRef.current.seekTo(capped, true); } catch {}
          try { playerRef.current.pauseVideo(); } catch {}
          playingRef.current = false;
          setPlaying(false);
          setProgress(capped);
          onTick?.(capped, d, false);
          return;
        }
        setProgress(t);
        if (d > 0) setDuration(d);
        onTick?.(t, d, true);
      }, 250);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
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
      playerRef.current?.pauseVideo();
    } else {
      const current = playerRef.current?.getCurrentTime?.() || 0;
      const total = playerRef.current?.getDuration?.() || duration;
      if (current < windowStart || (windowEnd != null && current >= windowEnd)) {
        playerRef.current?.seekTo(Math.min(windowStart, total || windowStart), true);
      }
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

function SmartboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState(3); // em units
  const [viewportSize, setViewportSize] = useState({ width: 1920, height: 1080 });
  const [lyrics, setLyrics] = useState('Loading...');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [currentLine, setCurrentLine] = useState(0);
  const [playheadOn, setPlayheadOn] = useState(false);
  const [savedClips, setSavedClips] = useState<StoredTimingClip[]>([]);
  const [savedBounds, setSavedBounds] = useState<TimingBounds>({ inPoint: null, outPoint: null });
  const [savedUseClipEdgeBounds, setSavedUseClipEdgeBounds] = useState(true);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [seekRequest, setSeekRequest] = useState<{ time: number; nonce: number } | null>(null);
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
    const slugParam = searchParams.get('slug');
    const lyricsParam = searchParams.get('lyrics');
    if (lyricsParam) {
      const doc = new DOMParser().parseFromString(lyricsParam, 'text/html');
      setLyrics(doc.body.textContent || '');
    }

    if (slugParam) {
      fetchTimings(slugParam).then((timingData) => {
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

    const ytParam = searchParams.get('youtube');
    if (ytParam) {
      const id = extractYouTubeId(ytParam);
      if (id) setYoutubeVideoId(id);
    }

    const audioParam = searchParams.get('audio');
    setAudioUrl(audioParam || null);

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

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

  const timedActiveLine = React.useMemo(() => {
    if (!playheadOn || savedClips.length === 0) return null;
    return activeLineFromClips(savedClips, previewPlaybackTime, effectiveSavedBounds);
  }, [effectiveSavedBounds, playheadOn, previewPlaybackTime, savedClips]);

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
    return Math.max(fontSize, autoFitEm);
  }, [fontSize, lines, viewportSize.height, viewportSize.width]);

  // Active position in the timeline sequence based on playback time
  const activeSeqIndex = React.useMemo(() => {
    if (!playheadOn || timelineSequence.length === 0) return -1;
    let best = -1;
    for (let i = 0; i < timelineSequence.length; i++) {
      if (timelineSequence[i].start <= previewPlaybackTime) best = i;
    }
    return best;
  }, [playheadOn, previewPlaybackTime, timelineSequence]);

  const isNoTimingPlayhead = playheadOn && timelineSequence.length === 0;

  const probeRef = useRef<HTMLSpanElement>(null);
  const wheelAnimationRef = useRef<number | null>(null);
  const wheelPointerIdRef = useRef<number | null>(null);
  const isWheelDraggingRef = useRef(false);
  const wheelDragStartYRef = useRef(0);
  const wheelDragStartPositionRef = useRef(0);
  const wheelLastYRef = useRef(0);
  const wheelLastTsRef = useRef(0);
  const wheelVelocityRef = useRef(0);
  const suppressCardClickUntilRef = useRef(0);
  const [lockedWidth, setLockedWidth] = useState<number | null>(null);
  const [wheelPosition, setWheelPosition] = useState(-1);
  const [isWheelDragging, setIsWheelDragging] = useState(false);
  const [isWheelAnimating, setIsWheelAnimating] = useState(false);

  const FOCUS_CENTER_OFFSET = -60;
  const WHEEL_STEP_PX = 112;
  const WHEEL_VISIBLE_RANGE = 4.25;
  const WHEEL_DRAG_THRESHOLD_PX = 8;
  const WHEEL_CENTER_GAP_BONUS_PX = 24;

  const getWheelAnimationDuration = useCallback((start: number, end: number, base: number) => {
    const distance = Math.abs(end - start);
    return Math.max(base, Math.min(420, base + distance * 55));
  }, []);

  const longestVerseLine = React.useMemo(
    () => lines.reduce((a, b) => (b.length > a.length ? b : a), ''),
    [lines],
  );

  // Lock container width to the widest verse at full font size (hidden probe span)
  useEffect(() => {
    if (!probeRef.current) return;
    requestAnimationFrame(() => {
      if (probeRef.current) setLockedWidth(probeRef.current.offsetWidth);
    });
  }, [fontSize, longestVerseLine]);

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
  }, [clampWheelPosition, getWheelAnimationDuration, seekToSequenceIndex, stopWheelAnimation, wheelPosition]);

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
    stopWheelAnimation();
    wheelPointerIdRef.current = e.pointerId;
    isWheelDraggingRef.current = false;
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
      if (Math.abs(dy) < WHEEL_DRAG_THRESHOLD_PX) return;
      isWheelDraggingRef.current = true;
      setIsWheelDragging(true);
      try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch {}
      wheelLastYRef.current = e.clientY;
      wheelLastTsRef.current = performance.now();
      wheelVelocityRef.current = 0;
    }

    const nextPosition = clampWheelPosition(wheelDragStartPositionRef.current - dy / WHEEL_STEP_PX);
    setWheelPosition(nextPosition);

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
    const totalDy = Math.abs(e.clientY - wheelDragStartYRef.current);
    const wasDragging = isWheelDraggingRef.current;
    const releaseVelocity = wheelVelocityRef.current;
    wheelPointerIdRef.current = null;
    wheelVelocityRef.current = 0;
    isWheelDraggingRef.current = false;
    setIsWheelDragging(false);
    try {
      if ((e.currentTarget as Element).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (wasDragging && totalDy > WHEEL_DRAG_THRESHOLD_PX) {
      suppressCardClickUntilRef.current = Date.now() + 220;
    }

    if (!wasDragging) return;

    const projected = clampWheelPosition((wheelPosition >= 0 ? wheelPosition : 0) + releaseVelocity * 180);
    finishWheelInteraction(projected);
  }, [clampWheelPosition, finishWheelInteraction, wheelPosition, WHEEL_DRAG_THRESHOLD_PX]);

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
      if (!v) {
        setCurrentLine(0);
        scrollToLine(0);
        if (effectiveSavedBounds.inPoint != null) {
          requestSeekTo(effectiveSavedBounds.inPoint);
        }
      }
      return !v;
    });
  }, [effectiveSavedBounds.inPoint, requestSeekTo, scrollToLine]);

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
      {/* Song lyrics */}
      {playheadOn && timelineSequence.length > 0 ? (
        // TELEPROMPTER MODE: custom wheel viewport
        <>
          {/* Hidden probe span — measures widest verse at full font size to lock column width */}
          <span
            ref={probeRef}
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: 0,
              left: -9999,
              visibility: 'hidden',
              pointerEvents: 'none',
              fontSize: `${fontSize}em`,
              fontWeight: 700,
              fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', Arial, sans-serif",
              padding: '0.2em 0.6em',
              whiteSpace: 'nowrap',
            }}
          >
            {longestVerseLine || '\u00A0'}
          </span>
          <div
            onPointerDown={handleWheelPointerDown}
            onPointerMove={handleWheelPointerMove}
            onPointerUp={handleWheelPointerUp}
            onPointerCancel={handleWheelPointerUp}
            data-testid="smartboard-wheel"
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
            <div style={{
              position: 'relative',
              width: lockedWidth ? `${lockedWidth}px` : '80%',
              minWidth: lockedWidth ? `${lockedWidth}px` : undefined,
              maxWidth: '92vw',
              height: '100%',
              textAlign: 'center',
              lineHeight: 1.5,
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
                const scale = 0.84 + easedFocus * 0.2;
                const fEm = fontSize * (0.8 + easedFocus * 0.78);
                const opacity = 0.5 + easedFocus * 0.5;
                const blur = (1 - easedFocus) * 0.75;
                const direction = rawOffset === 0 ? 0 : rawOffset / absOffset;
                const baseTranslateY = rawOffset * WHEEL_STEP_PX * 0.72;
                const centerGapBonus = absOffset <= 1
                  ? absOffset * WHEEL_CENTER_GAP_BONUS_PX
                  : WHEEL_CENTER_GAP_BONUS_PX;
                const translateY = baseTranslateY + direction * centerGapBonus;
                const hitDepth = Math.round(easedFocus * 1000) + (isCurrent ? 1000 : 0);
                return (
                  <button
                    key={seqIdx}
                    type="button"
                    onClick={() => handleVerseClick(seqIdx)}
                    data-testid={`smartboard-verse-${seqIdx}`}
                    data-seq-index={seqIdx}
                    data-verse-index={clip.verseIndex}
                    data-current={isCurrent ? 'true' : 'false'}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: `calc(50% + ${FOCUS_CENTER_OFFSET}px + ${translateY}px)`,
                      display: 'block',
                      width: '100%',
                      minHeight: '1.65em',
                      border: 'none',
                      padding: isCurrent ? '0.3em 0.8em' : '0.24em 0.68em',
                      borderRadius: 12,
                      transition: isWheelDragging || isWheelAnimating
                        ? 'none'
                        : 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), font-size 240ms cubic-bezier(0.22, 1, 0.36, 1), transform 240ms cubic-bezier(0.22, 1, 0.36, 1), filter 240ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1), background 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                      opacity,
                      fontSize: `${fEm}em`,
                      fontWeight: easedFocus > 0.72 ? 700 : 400,
                      transform: `translate(-50%, -50%) scale(${scale})`,
                      transformOrigin: 'center center',
                      filter: `blur(${blur}px)`,
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
          onClick={playheadOn ? goNext : undefined}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: isNoTimingPlayhead ? 'center' : playheadOn ? 'flex-start' : 'center',
            minHeight: '75vh',
            paddingTop: isNoTimingPlayhead ? '4.5rem' : playheadOn ? '2rem' : '4.5rem',
            paddingBottom: isNoTimingPlayhead ? 0 : playheadOn ? '10rem' : 0,
            cursor: playheadOn ? 'pointer' : 'default',
          }}
        >
          <div style={{ width: 'min(92vw, 1500px)', maxWidth: '1500px', textAlign: 'center' }}>
            {playheadOn ? (
              // MANUAL PLAYHEAD MODE — all lines listed, active one highlighted
              <div style={{ fontSize: `${isNoTimingPlayhead ? regularViewDisplayFontSize : fontSize}em`, lineHeight: isNoTimingPlayhead ? 1.42 : 1.6 }}>
                {lines.map((line, i) => (
                  <span
                    key={i}
                    ref={(el) => { linesRef.current[i] = el; }}
                    onClick={(e) => { e.stopPropagation(); setCurrentLine(i); scrollToLine(i); }}
                    style={{
                      display: 'block',
                      padding: isNoTimingPlayhead ? '0.02em 0.28em' : '0.1em 0.3em',
                      borderRadius: 6,
                      transition: 'opacity 0.3s, transform 0.3s',
                      opacity: i === (timedActiveLine ?? currentLine) ? 1 : 0.3,
                      transform: i === (timedActiveLine ?? currentLine) ? 'scale(1.05)' : 'scale(1)',
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    {line || '\u00A0'}
                  </span>
                ))}
              </div>
            ) : (
              <p
                style={{
                  fontSize: `${regularViewDisplayFontSize}em`,
                  whiteSpace: 'pre-line',
                  textAlign: 'center',
                  margin: '0 auto',
                  maxWidth: '84vw',
                  paddingInline: '4vw',
                  lineHeight: 1.45,
                }}
              >
                {lyrics}
              </p>
            )}
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
            onClick={togglePlayhead}
            style={{
              ...(playheadOn ? bottomButtonStyle : secondaryBottomButtonStyle),
              minWidth: 168,
            }}
          >
            {playheadOn ? 'Pause Playhead' : 'Start Playhead'}
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
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '7px 8px 7px 14px',
            borderRadius: 999,
            backgroundColor: darkMode ? 'rgba(0,0,0,0.52)' : 'rgba(255,255,255,0.72)',
            border: '1px solid rgba(242,203,5,0.2)',
            color: darkMode ? '#f2cb05' : '#333',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.82 }}>Font</span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => changeFontSize(false)}
              style={{
                ...bottomButtonStyle,
                minWidth: 34,
                minHeight: 34,
                padding: 0,
                borderRadius: 999,
                fontSize: 20,
                lineHeight: 1,
              }}
              aria-label="Decrease font size"
            >
              −
            </button>
            <button
              onClick={() => changeFontSize(true)}
              style={{
                ...bottomButtonStyle,
                minWidth: 34,
                minHeight: 34,
                padding: 0,
                borderRadius: 999,
                fontSize: 20,
                lineHeight: 1,
              }}
              aria-label="Increase font size"
            >
              +
            </button>
          </div>
        </div>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 16px',
            borderRadius: 999,
            backgroundColor: darkMode ? 'rgba(0,0,0,0.72)' : 'rgba(255,255,255,0.88)',
            border: '1px solid rgba(242,203,5,0.3)',
            color: darkMode ? '#f2cb05' : '#333',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em' }}>Dark</span>
          <span
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
          </span>
        </label>
        </div>
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
