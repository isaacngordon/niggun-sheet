'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ensureYTApi, extractYouTubeId, playbackBus, fmt } from '@/lib/youtube';

interface MediaPlayerProps {
  audioUrl?: string | null;
  youtubeUrl?: string | null;
  inPoint?: number | null;
  outPoint?: number | null;
  onTick?: (time: number, duration: number, playing: boolean) => void;
  exposePlayer?: (player: any) => void;
  detail?: boolean;
}

export default function MediaPlayer({ audioUrl, youtubeUrl, inPoint = null, outPoint = null, onTick, exposePlayer, detail = false }: MediaPlayerProps) {
  const youtubeId = extractYouTubeId(youtubeUrl || '');
  const prefersAudio = Boolean(audioUrl);
  const hostWidth = detail ? 92 : 72;
  const hostHeight = detail ? 52 : 40;

  const idRef = useRef(`media-${Math.random().toString(36).slice(2, 8)}`);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<any>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);
  const playingRef = useRef(false);
  const destroyedRef = useRef(false);
  const pendingPlayRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(prefersAudio ? false : true);
  const [apiReady, setApiReady] = useState(prefersAudio);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [shouldInitYoutube, setShouldInitYoutube] = useState(prefersAudio || detail);
  const [retryNonce, setRetryNonce] = useState(0);

  const windowStart = Math.max(0, inPoint ?? 0);
  const effectiveWindowEnd = outPoint != null && outPoint > windowStart ? outPoint : null;
  const clampToWindow = useCallback((time: number, totalDuration: number) => {
    const upper = effectiveWindowEnd != null ? Math.min(effectiveWindowEnd, totalDuration > 0 ? totalDuration : effectiveWindowEnd) : totalDuration;
    const upperBound = upper > 0 ? upper : effectiveWindowEnd ?? Number.POSITIVE_INFINITY;
    return Math.min(Math.max(time, windowStart), upperBound);
  }, [effectiveWindowEnd, windowStart]);

  useEffect(() => {
    destroyedRef.current = false;

    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === idRef.current) return;
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      if (playerRef.current && readyRef.current) {
        try { playerRef.current.pauseVideo(); } catch {}
      }
    };

    playbackBus?.addEventListener('play', handler);
    return () => {
      destroyedRef.current = true;
      pendingPlayRef.current = false;
      playbackBus?.removeEventListener('play', handler);
      try { playerRef.current?.destroy?.(); } catch {}
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (prefersAudio || !youtubeId || !shouldInitYoutube) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    ensureYTApi()
      .then(() => {
        if (cancelled || destroyedRef.current) return;
        setApiReady(true);
      })
      .catch(() => {
        if (cancelled || destroyedRef.current) return;
        setError('Unable to load YouTube');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [prefersAudio, youtubeId, shouldInitYoutube, retryNonce]);

  useEffect(() => {
    if (prefersAudio || detail || shouldInitYoutube) return;

    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setShouldInitYoutube(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldInitYoutube(true);
          observer.disconnect();
        }
      },
      { rootMargin: '160px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [prefersAudio, detail, shouldInitYoutube]);

  useEffect(() => {
    if (!prefersAudio || !audioRef.current) return;
    const audio = audioRef.current;

    const updateTime = () => {
      const current = audio.currentTime || 0;
      const total = audio.duration || 0;
      if (effectiveWindowEnd != null && current >= effectiveWindowEnd) {
        audio.currentTime = clampToWindow(effectiveWindowEnd, total);
        audio.pause();
      }
      setProgress(current);
      if (total > 0) setDuration(total);
      onTick?.(current, total, !audio.paused && !audio.ended);
    };
    const handleCanPlay = () => {
      readyRef.current = true;
      setReady(true);
      setLoading(false);
      setDuration(audio.duration || 0);
      exposePlayer?.(audio);
    };
    const handlePlay = () => {
      playingRef.current = true;
      setPlaying(true);
      playbackBus?.dispatchEvent(new CustomEvent('play', { detail: idRef.current }));
    };
    const handlePause = () => {
      playingRef.current = false;
      setPlaying(false);
      updateTime();
    };

    audio.addEventListener('loadedmetadata', handleCanPlay);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handlePause);

    if (audio.readyState >= 2) handleCanPlay();

    return () => {
      audio.removeEventListener('loadedmetadata', handleCanPlay);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handlePause);
    };
  }, [prefersAudio, audioUrl, onTick, exposePlayer, effectiveWindowEnd, clampToWindow]);

  useEffect(() => {
    if (prefersAudio || !youtubeId || !shouldInitYoutube || !apiReady || !hostRef.current || playerRef.current) return;

    let cancelled = false;
    const host = hostRef.current;
    const yt = (window as any).YT;
    if (!yt?.Player) {
      setError('YouTube unavailable');
      setLoading(false);
      return;
    }

    readyRef.current = false;
    playingRef.current = false;
    setReady(false);
    setPlaying(false);
    setProgress(0);
    setDuration(0);
    setLoading(true);
    setError(null);

    host.innerHTML = '';
    const div = document.createElement('div');
    host.appendChild(div);

    playerRef.current = new yt.Player(div, {
      height: String(hostHeight),
      width: String(hostWidth),
      videoId: youtubeId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          if (cancelled || destroyedRef.current) return;
          readyRef.current = true;
          setReady(true);
          setLoading(false);
          setDuration(playerRef.current?.getDuration?.() || 0);
          exposePlayer?.(playerRef.current);
          try { playerRef.current?.setPlaybackQuality?.('small'); } catch {}
          if (pendingPlayRef.current) {
            pendingPlayRef.current = false;
            playbackBus?.dispatchEvent(new CustomEvent('play', { detail: idRef.current }));
            try { playerRef.current?.playVideo(); } catch {}
          }
        },
        onStateChange: (e: any) => {
          if (cancelled || destroyedRef.current) return;
          const state = e.data;
          const isPlaying = state === yt.PlayerState.PLAYING;
          const isBuffering = state === yt.PlayerState.BUFFERING;
          const current = playerRef.current?.getCurrentTime?.() || 0;
          const total = playerRef.current?.getDuration?.() || 0;

          if (effectiveWindowEnd != null && current >= effectiveWindowEnd && playerRef.current) {
            const endTime = clampToWindow(effectiveWindowEnd, total);
            try { playerRef.current.seekTo(endTime, true); } catch {}
            try { playerRef.current.pauseVideo(); } catch {}
            playingRef.current = false;
            setPlaying(false);
            setLoading(false);
            setProgress(endTime);
            onTick?.(endTime, total, false);
            return;
          }

          playingRef.current = isPlaying;
          setPlaying(isPlaying);
          setLoading(isBuffering);
          if (total > 0) setDuration(total);
          setProgress(current);
          onTick?.(current, total, isPlaying);
        },
        onError: (e: any) => {
          if (cancelled || destroyedRef.current) return;
          pendingPlayRef.current = false;
          setError(`YouTube error ${e?.data ?? ''}`.trim());
          setLoading(false);
        },
      },
    });

    return () => {
      cancelled = true;
      readyRef.current = false;
      playingRef.current = false;
      try { playerRef.current?.destroy?.(); } catch {}
      playerRef.current = null;
      host.innerHTML = '';
    };
  }, [prefersAudio, youtubeId, shouldInitYoutube, apiReady, detail, exposePlayer, onTick, retryNonce, effectiveWindowEnd, clampToWindow]);

  useEffect(() => {
    if (prefersAudio || !playerRef.current || !playing) return;
    const interval = setInterval(() => {
      const current = playerRef.current?.getCurrentTime?.() || 0;
      const total = playerRef.current?.getDuration?.() || 0;
      if (effectiveWindowEnd != null && current >= effectiveWindowEnd && playerRef.current) {
        const endTime = clampToWindow(effectiveWindowEnd, total);
        try { playerRef.current.seekTo(endTime, true); } catch {}
        try { playerRef.current.pauseVideo(); } catch {}
        setProgress(endTime);
        setPlaying(false);
        onTick?.(endTime, total, false);
        return;
      }
      setProgress(current);
      if (total > 0) setDuration(total);
      onTick?.(current, total, true);
    }, 250);
    return () => clearInterval(interval);
  }, [prefersAudio, playing, onTick, effectiveWindowEnd, clampToWindow]);

  const togglePlay = useCallback(() => {
    if (prefersAudio) {
      const audio = audioRef.current;
      if (!audio) return;
      if (!audio.paused) {
        audio.pause();
        return;
      }
      const total = audio.duration || duration;
      const current = audio.currentTime || 0;
      if (current < windowStart || (effectiveWindowEnd != null && current >= effectiveWindowEnd)) {
        audio.currentTime = clampToWindow(windowStart, total);
        setProgress(audio.currentTime);
      }
      setLoading(!readyRef.current);
      playbackBus?.dispatchEvent(new CustomEvent('play', { detail: idRef.current }));
      void audio.play().catch(() => setLoading(false));
      return;
    }

    if (!youtubeId) return;

    if (error) {
      pendingPlayRef.current = true;
      setError(null);
      setReady(false);
      setLoading(true);
      readyRef.current = false;
      playingRef.current = false;
      try { playerRef.current?.destroy?.(); } catch {}
      playerRef.current = null;
      setRetryNonce((v) => v + 1);
      return;
    }

    if (!shouldInitYoutube) {
      pendingPlayRef.current = true;
      setShouldInitYoutube(true);
      setLoading(true);
      return;
    }

    if (!apiReady || !playerRef.current || !readyRef.current) {
      pendingPlayRef.current = true;
      setLoading(true);
      return;
    }

    if (playingRef.current) {
      playerRef.current.pauseVideo();
      return;
    }

    const current = playerRef.current?.getCurrentTime?.() || 0;
    const total = playerRef.current?.getDuration?.() || duration;
    if (current < windowStart || (effectiveWindowEnd != null && current >= effectiveWindowEnd)) {
      try { playerRef.current.seekTo(clampToWindow(windowStart, total), true); } catch {}
    }

    playbackBus?.dispatchEvent(new CustomEvent('play', { detail: idRef.current }));
    playerRef.current.playVideo();
  }, [prefersAudio, youtubeId, apiReady, error, shouldInitYoutube, duration, windowStart, effectiveWindowEnd, clampToWindow]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const seekEnd = effectiveWindowEnd != null ? Math.min(effectiveWindowEnd, duration) : duration;
    const seekStart = Math.min(windowStart, seekEnd);
    const nextTime = seekStart + (seekEnd - seekStart) * pct;
    if (prefersAudio && audioRef.current) {
      audioRef.current.currentTime = nextTime;
    } else if (playerRef.current && readyRef.current) {
      playerRef.current.seekTo(nextTime, true);
    }
    setProgress(nextTime);
  }, [duration, prefersAudio, effectiveWindowEnd, windowStart]);

  const displayStart = Math.min(windowStart, duration || windowStart);
  const displayEnd = effectiveWindowEnd != null ? Math.min(effectiveWindowEnd, duration || effectiveWindowEnd) : duration;
  const displaySpan = Math.max(0.001, displayEnd - displayStart);
  const displayProgress = Math.max(0, Math.min(displaySpan, progress - displayStart));
  const progressPercent = duration ? Math.max(0, Math.min(100, (displayProgress / displaySpan) * 100)) : 0;

  if (!audioUrl && !youtubeId) return null;

  return (
    <div
      ref={containerRef}
      className="yt-audio-player"
      onPointerEnter={() => setShouldInitYoutube(true)}
      onFocus={() => setShouldInitYoutube(true)}
    >
      {prefersAudio ? (
        <audio ref={audioRef} src={audioUrl || undefined} preload="metadata" />
      ) : (
        <div
          ref={hostRef}
          className={`yt-video-host${ready ? '' : ' yt-video-host-loading'}`}
          style={{ width: hostWidth, height: hostHeight }}
          aria-hidden="true"
        />
      )}
      <button
        className="yt-play-btn"
        onClick={togglePlay}
        disabled={prefersAudio ? false : false}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {loading ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="20 40" /></svg>
        ) : playing ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        )}
      </button>
      <div
        className="yt-progress-bar"
        onClick={seek}
      >
        <div className="yt-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>
      <span className={`yt-time${error ? ' yt-time-error' : ''}`}>{error ? 'error' : ready && duration ? fmt(progress) : '--:--'}</span>
    </div>
  );
}
