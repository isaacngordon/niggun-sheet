'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useGoogleAuth } from '@/components/GoogleAuthProvider';
import MediaPlayer from '@/components/MediaPlayer';
import { extractAllYouTubeUrls, fmtPrecise } from '@/lib/youtube';

const ADMIN_EMAIL = 'yehudahyjacobs@gmail.com';

interface Song {
  search_title: string;
  title: string;
  lyrics: string;
  artist: string;
  drive: string;
  youtube: string;
  audio: string;
}

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

interface EditorTimingClip extends StoredTimingClip {
  id: string;
}

interface DragState {
  clipId: string;
  edge: 'start' | 'end' | 'move';
  grabOffset?: number;
}

const MIN_CLIP_LENGTH = 0.25;
const DEFAULT_CARD_LENGTH = 6;
const TIMELINE_CLIP_GAP_SECONDS = 0.08;

/* ── Timings API helpers ── */
function makeClipId(): string {
  return `clip-${Math.random().toString(36).slice(2, 10)}`;
}

function toEditorClips(clips: StoredTimingClip[] | null | undefined): EditorTimingClip[] {
  if (!clips || clips.length === 0) return [];
  return clips
    .map((clip) => ({
      id: makeClipId(),
      verseIndex: Math.round(clip.verseIndex),
      start: Number(clip.start.toFixed(2)),
    }))
    .sort((a, b) => a.start - b.start);
}

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
          .filter((clip: StoredTimingClip) => Number.isFinite(clip.start) && clip.start >= 0)
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
  } catch { return null; }
}

async function saveTimingsApi(slug: string, timingData: StoredTimingData): Promise<boolean> {
  try {
    const res = await fetch('/api/timings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        clips: timingData.clips,
        inPoint: timingData.inPoint,
        outPoint: timingData.outPoint,
        useClipEdgeBounds: timingData.useClipEdgeBounds,
      }),
    });
    return res.ok;
  } catch { return false; }
}


/* ── Compute which line is active from timing clips ── */
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
        audio: publicSong.audio,
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
        audio: privateSong.audioUrl || '',
        isPrivate: true as const,
        privateId: privateSong.id,
      };
    }
    return null;
  }, [publicSong, privateSong]);

  /* ── Playback state (from first media player) ── */
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
  const [savedClips, setSavedClips] = useState<EditorTimingClip[]>([]);
  const [savedBounds, setSavedBounds] = useState<TimingBounds>({ inPoint: null, outPoint: null });
  const [savedUseClipEdgeBounds, setSavedUseClipEdgeBounds] = useState(true);
  const [editClips, setEditClips] = useState<EditorTimingClip[]>([]);
  const [editBounds, setEditBounds] = useState<TimingBounds>({ inPoint: null, outPoint: null });
  const [editUseClipEdgeBounds, setEditUseClipEdgeBounds] = useState(true);
  const [timingMode, setTimingMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [previewClipId, setPreviewClipId] = useState<string | null>(null);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(0);
  const isAdmin = user?.email === ADMIN_EMAIL;
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineViewportRef = useRef<HTMLDivElement>(null);

  // Load saved timings
  useEffect(() => {
    if (!slug) return;
    fetchTimings(slug).then((timingData) => {
      setSavedClips(toEditorClips(timingData?.clips));
      setSavedBounds({
        inPoint: timingData?.inPoint ?? null,
        outPoint: timingData?.outPoint ?? null,
      });
      setSavedUseClipEdgeBounds(timingData?.useClipEdgeBounds ?? true);
    });
  }, [slug]);

  const effectiveSavedBounds = useMemo(
    () => resolveEffectiveBounds(savedClips, savedBounds, savedUseClipEdgeBounds, ytDuration || null),
    [savedClips, savedBounds, savedUseClipEdgeBounds, ytDuration],
  );

  const effectiveEditBounds = useMemo(
    () => resolveEffectiveBounds(editClips, editBounds, editUseClipEdgeBounds, ytDuration || null),
    [editClips, editBounds, editUseClipEdgeBounds, ytDuration],
  );

  const lyricsLines = useMemo(() => song?.lyrics.split('\n') ?? [], [song]);

  // Active line based on saved clips
  const activeLine = useMemo(() => {
    if (savedClips.length === 0) return -1;
    return activeLineFromClips(savedClips, currentTime, effectiveSavedBounds);
  }, [effectiveSavedBounds, savedClips, currentTime]);

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
    setEditClips(savedClips.map((clip) => ({ ...clip, id: makeClipId() })));
    setEditBounds(savedBounds);
    setEditUseClipEdgeBounds(savedUseClipEdgeBounds);
    setTimingMode(true);
  };

  const spawnClip = (verseIndex: number) => {
    const rawTime = ytPlayerRef.current?.getCurrentTime?.() ?? currentTime;
    const minStart = effectiveEditBounds.inPoint ?? 0;
    const maxStart = effectiveEditBounds.outPoint != null
      ? Math.max(minStart, effectiveEditBounds.outPoint - MIN_CLIP_LENGTH)
      : Number(rawTime.toFixed(2));
    const t = Math.min(Math.max(Number(rawTime.toFixed(2)), minStart), maxStart);
    const nextClip: EditorTimingClip = {
      id: makeClipId(),
      verseIndex,
      start: Number(t.toFixed(2)),
    };

    setEditClips((prev) => [...prev, nextClip].sort((a, b) => a.start - b.start));
  };

  const removeClip = (id: string) => {
    setEditClips((prev) => prev.filter((clip) => clip.id !== id));
  };

  const cancelTiming = () => {
    setTimingMode(false);
    setEditClips([]);
    setEditBounds({ inPoint: null, outPoint: null });
    setEditUseClipEdgeBounds(true);
    setDragState(null);
  };

  const saveTiming = async () => {
    setSaving(true);
    const finalBounds = normalizeTimingBounds(editBounds.inPoint, editBounds.outPoint);
    const final = editClips.map((clip) => ({
      verseIndex: clip.verseIndex,
      start: Number(clip.start.toFixed(2)),
    }));
    const ok = await saveTimingsApi(slug, { clips: final, ...finalBounds, useClipEdgeBounds: editUseClipEdgeBounds });
    if (ok) {
      setSavedClips(toEditorClips(final));
      setSavedBounds(finalBounds);
      setSavedUseClipEdgeBounds(editUseClipEdgeBounds);
      setTimingMode(false);
      setEditClips([]);
      setEditBounds({ inPoint: null, outPoint: null });
      setEditUseClipEdgeBounds(true);
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
  const hasSavedTimingData = savedClips.length > 0 || savedBounds.inPoint != null || savedBounds.outPoint != null;
  const editorDuration = useMemo(() => {
    const furthestPlaced = editClips.length > 0 ? Math.max(...editClips.map((clip) => clip.start)) : 0;
    const furthestBoundary = Math.max(effectiveEditBounds.inPoint ?? 0, effectiveEditBounds.outPoint ?? 0);
    return Math.max(ytDuration || 0, currentTime + 2, furthestPlaced + 4, furthestBoundary + 4, 30);
  }, [effectiveEditBounds.inPoint, effectiveEditBounds.outPoint, editClips, ytDuration, currentTime]);

  useEffect(() => {
    const viewport = timelineViewportRef.current;
    if (!viewport) return;

    const updateWidth = () => setTimelineViewportWidth(viewport.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [timingMode]);

  const verseCards = useMemo(() => {
    return [...lyricsLines.map((line, index) => {
      const clipCount = editClips.filter((clip) => clip.verseIndex === index).length;
      return {
        verseIndex: index,
        isBlank: false,
        text: line || '\u00A0',
        clipCount,
      };
    }), {
      verseIndex: -1,
      isBlank: true,
      text: '(Pause / blank)',
      clipCount: editClips.filter((clip) => clip.verseIndex < 0).length,
    }];
  }, [editClips, lyricsLines]);

  const boundaryCards = useMemo(() => ([
    {
      key: 'in',
      edge: 'in' as const,
      label: 'In',
      point: editBounds.inPoint,
      text: editBounds.inPoint != null ? 'Song start is locked to this time.' : 'Mark where the song officially begins.',
      stamp: editBounds.inPoint != null ? `Starts ${fmtPrecise(editBounds.inPoint)}` : 'Set at playhead',
    },
    {
      key: 'out',
      edge: 'out' as const,
      label: 'Out',
      point: editBounds.outPoint,
      text: editBounds.outPoint != null ? 'Song end is locked to this time.' : 'Mark where the song officially ends.',
      stamp: editBounds.outPoint != null ? `Ends ${fmtPrecise(editBounds.outPoint)}` : 'Set at playhead',
    },
  ]), [editBounds.inPoint, editBounds.outPoint]);

  const timelineClips = useMemo(() => {
    return editClips
      .slice()
      .sort((a, b) => a.start - b.start)
      .map((clip, index, clips) => {
        const nextClip = clips[index + 1];
        const isLastClip = index === clips.length - 1;
        const end = nextClip ? nextClip.start : (effectiveEditBounds.outPoint ?? editorDuration);
        const visualEnd = nextClip ? Math.max(clip.start, end - TIMELINE_CLIP_GAP_SECONDS) : end;
        const isBlank = clip.verseIndex < 0;
        const text = isBlank ? '(Pause / blank)' : (lyricsLines[clip.verseIndex] || `Verse ${clip.verseIndex + 1}`);
        return {
          ...clip,
          isBlank,
          text,
          end,
          hasEndHandle: Boolean(nextClip) || isLastClip,
          leftPct: (clip.start / editorDuration) * 100,
          widthPct: Math.max((((Math.max(visualEnd, clip.start) - clip.start) || 0) / editorDuration) * 100, 3.5),
        };
      });
  }, [editClips, editorDuration, effectiveEditBounds.outPoint, lyricsLines]);

  const boundaryMarkers = useMemo(() => ([
    effectiveEditBounds.inPoint != null
      ? { key: 'in', edge: 'in' as const, label: 'In', time: effectiveEditBounds.inPoint }
      : null,
    effectiveEditBounds.outPoint != null
      ? { key: 'out', edge: 'out' as const, label: 'Out', time: effectiveEditBounds.outPoint }
      : null,
  ].filter((marker): marker is { key: string; edge: 'in' | 'out'; label: string; time: number } => Boolean(marker))), [effectiveEditBounds.inPoint, effectiveEditBounds.outPoint]);

  const activeTimelineClip = useMemo(() => {
    let activeClip: (typeof timelineClips)[number] | null = null;
    for (const clip of timelineClips) {
      if (clip.start <= currentTime) activeClip = clip;
    }
    return activeClip;
  }, [currentTime, timelineClips]);

  const previewTimelineClip = useMemo(() => {
    if (previewClipId) {
      return timelineClips.find((clip) => clip.id === previewClipId) ?? null;
    }
    return activeTimelineClip;
  }, [activeTimelineClip, previewClipId, timelineClips]);

  const scaledTimelineWidth = useMemo(
    () => Math.max(timelineViewportWidth, timelineViewportWidth * timelineZoom),
    [timelineViewportWidth, timelineZoom],
  );

  const timelineMarkInterval = useMemo(() => {
    if (!editorDuration || scaledTimelineWidth <= 0) return 10;
    const pxPerSecond = scaledTimelineWidth / editorDuration;
    const candidates = [1, 2, 5, 10, 15, 20, 30, 45, 60];
    return candidates.find((interval) => interval * pxPerSecond >= 84) ?? 90;
  }, [editorDuration, scaledTimelineWidth]);

  const timelineMarks = useMemo(() => {
    const marks: number[] = [];
    for (let time = 0; time <= editorDuration; time += timelineMarkInterval) {
      marks.push(Number(Math.min(editorDuration, time).toFixed(2)));
    }
    const lastMark = marks[marks.length - 1];
    if (marks.length === 0 || Math.abs(lastMark - editorDuration) > 0.01) {
      marks.push(Number(editorDuration.toFixed(2)));
    }
    return marks;
  }, [editorDuration, timelineMarkInterval]);

  const usedVerseCount = useMemo(
    () => new Set(editClips.filter((clip) => clip.verseIndex >= 0 && isClipWithinBounds(clip, effectiveEditBounds)).map((clip) => clip.verseIndex)).size,
    [effectiveEditBounds, editClips]
  );

  const setTimingBoundary = useCallback((edge: 'in' | 'out') => {
    const rawTime = ytPlayerRef.current?.getCurrentTime?.() ?? currentTime;
    const nextTime = Number(rawTime.toFixed(2));

    setEditBounds((prev) => normalizeTimingBounds(
      edge === 'in' ? nextTime : prev.inPoint,
      edge === 'out' ? nextTime : prev.outPoint,
    ));
  }, [currentTime]);

  const clearTimingBoundary = useCallback((edge: 'in' | 'out') => {
    setEditBounds((prev) => ({
      inPoint: edge === 'in' ? null : prev.inPoint,
      outPoint: edge === 'out' ? null : prev.outPoint,
    }));
  }, []);

  const seekPlayback = useCallback((time: number) => {
    const nextTime = Math.max(0, time);
    const player = ytPlayerRef.current;
    if (player?.seekTo) {
      player.seekTo(nextTime, true);
    } else if (player && 'currentTime' in player) {
      player.currentTime = nextTime;
    }
    setCurrentTime(nextTime);
  }, []);

  const timelineTimeAtClientX = useCallback((clientX: number): number | null => {
    const timeline = timelineRef.current;
    if (!timeline) return null;
    const rect = timeline.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Number((pct * editorDuration).toFixed(2));
  }, [editorDuration]);

  const seekPlaybackAtClientX = useCallback((clientX: number) => {
    const time = timelineTimeAtClientX(clientX);
    if (time == null) return;
    seekPlayback(time);
  }, [seekPlayback, timelineTimeAtClientX]);

  const handleTimelineSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    seekPlaybackAtClientX(e.clientX);
  }, [seekPlaybackAtClientX]);

  const rippleTrimNextEditToPlayhead = useCallback(() => {
    const playheadTime = Number(currentTime.toFixed(2));

    setEditClips((prev) => {
      const ordered = prev.slice().sort((a, b) => a.start - b.start);
      const clipIndex = ordered.findIndex((clip) => clip.start > playheadTime + 0.001);
      if (clipIndex === -1) return prev;

      const clip = ordered[clipIndex];
      const previousClip = ordered[clipIndex - 1] ?? null;
      const nextClip = ordered[clipIndex + 1] ?? null;
      const minStart = previousClip ? previousClip.start + MIN_CLIP_LENGTH : (effectiveEditBounds.inPoint ?? 0);
      const maxStart = nextClip
        ? nextClip.start - MIN_CLIP_LENGTH
        : Math.max((effectiveEditBounds.outPoint ?? editorDuration) - MIN_CLIP_LENGTH, minStart);
      const nextStart = Math.min(Math.max(playheadTime, minStart), Math.max(minStart, maxStart));

      if (Math.abs(nextStart - clip.start) < 0.001) return prev;

      ordered[clipIndex] = { ...clip, start: Number(nextStart.toFixed(2)) };
      return ordered.sort((a, b) => a.start - b.start);
    });
  }, [currentTime, effectiveEditBounds.inPoint, effectiveEditBounds.outPoint, editorDuration]);

  const handleClipEdgePointerDown = useCallback((clipId: string, edge: 'start' | 'end' | 'move', clientX?: number) => {
    if (edge !== 'move') {
      setDragState({ clipId, edge });
      return;
    }

    const clip = editClips.find((entry) => entry.id === clipId);
    if (!clip) return;
    const pointerTime = typeof clientX === 'number' ? timelineTimeAtClientX(clientX) : null;
    if (pointerTime == null) return;

    setDragState({
      clipId,
      edge,
      grabOffset: Number((pointerTime - clip.start).toFixed(2)),
    });
  }, [editClips, timelineTimeAtClientX]);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      const timeline = timelineRef.current;
      if (!timeline) return;

      const rect = timeline.getBoundingClientRect();
      if (rect.width <= 0) return;

      const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const rawTime = Number((pct * editorDuration).toFixed(2));

      setEditClips((prev) => {
        const ordered = prev.slice().sort((a, b) => a.start - b.start);
        const clipIndex = ordered.findIndex((clip) => clip.id === dragState.clipId);
        if (clipIndex === -1) return prev;

        const clip = ordered[clipIndex];
        const previousClip = ordered[clipIndex - 1] ?? null;
        const nextClip = ordered[clipIndex + 1] ?? null;

        if (dragState.edge === 'start') {
          const minStart = previousClip ? previousClip.start + MIN_CLIP_LENGTH : (effectiveEditBounds.inPoint ?? 0);
          const maxStart = nextClip
            ? nextClip.start - MIN_CLIP_LENGTH
            : Math.max((effectiveEditBounds.outPoint ?? editorDuration) - MIN_CLIP_LENGTH, minStart);
          const nextStart = Math.min(Math.max(rawTime, minStart), Math.max(minStart, maxStart));
          ordered[clipIndex] = { ...clip, start: nextStart };
        } else if (dragState.edge === 'end') {
          if (!nextClip) {
            const minOut = clip.start + MIN_CLIP_LENGTH;
            const nextOut = Math.max(rawTime, minOut);
            setEditBounds((bounds) => normalizeTimingBounds(bounds.inPoint, nextOut));
            return prev;
          }
          const minStart = clip.start + MIN_CLIP_LENGTH;
          const nextNextClip = ordered[clipIndex + 2] ?? null;
          const maxStart = nextNextClip ? nextNextClip.start - MIN_CLIP_LENGTH : (effectiveEditBounds.outPoint ?? editorDuration);
          const nextStart = Math.min(Math.max(rawTime, minStart), Math.max(minStart, maxStart));
          ordered[clipIndex + 1] = { ...nextClip, start: nextStart };
        } else {
          const minStart = previousClip ? previousClip.start + MIN_CLIP_LENGTH : (effectiveEditBounds.inPoint ?? 0);
          const maxStart = nextClip
            ? nextClip.start - MIN_CLIP_LENGTH
            : Math.max((effectiveEditBounds.outPoint ?? editorDuration) - MIN_CLIP_LENGTH, minStart);
          const anchoredStart = rawTime - (dragState.grabOffset ?? 0);
          const nextStart = Math.min(Math.max(anchoredStart, minStart), Math.max(minStart, maxStart));
          ordered[clipIndex] = { ...clip, start: Number(nextStart.toFixed(2)) };
        }

        return ordered.sort((a, b) => a.start - b.start);
      });
    };

    const handlePointerUp = () => {
      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, effectiveEditBounds.inPoint, effectiveEditBounds.outPoint, editorDuration]);

  useEffect(() => {
    if (!timingMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      const tagName = target?.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return;

      if (event.key.toLowerCase() === 'w') {
        event.preventDefault();
        rippleTrimNextEditToPlayhead();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rippleTrimNextEditToPlayhead, timingMode]);

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

        {(song.audio || youtubeUrls.length > 0) && (
          <div className="song-detail-players">
            {song.audio ? (
              <MediaPlayer
                audioUrl={song.audio}
                youtubeUrl={youtubeUrls[0] || ''}
                inPoint={effectiveSavedBounds.inPoint}
                outPoint={effectiveSavedBounds.outPoint}
                onTick={handleTick}
                exposePlayer={handleExposePlayer}
                detail
              />
            ) : youtubeUrls.map((u, i) => (
              <MediaPlayer
                key={i}
                youtubeUrl={u}
                inPoint={effectiveSavedBounds.inPoint}
                outPoint={effectiveSavedBounds.outPoint}
                onTick={i === 0 ? handleTick : undefined}
                exposePlayer={i === 0 ? handleExposePlayer : undefined}
                detail
              />
            ))}
          </div>
        )}

        {/* ── Admin timing toolbar ── */}
        {isAdmin && !timingMode && (
          <div className="timing-toolbar">
            <button className="timing-edit-btn" onClick={startTimingMode}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {hasSavedTimingData ? 'Edit Timings' : 'Add Timings'}
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
            <p className="timing-editor-hint">Play the song, click a verse card to spawn it, drag clip edges for fine timing adjustments, or press W to ripple trim the next edit to the playhead.</p>
            <div className="timing-editor-meta">
              <span>{editClips.length} clips on track, {usedVerseCount}/{lyricsLines.length} verses used</span>
              <div className="timing-editor-meta-tools">
                <label className="timing-boundary-toggle">
                  <input
                    type="checkbox"
                    checked={editUseClipEdgeBounds}
                    onChange={(e) => setEditUseClipEdgeBounds(e.target.checked)}
                  />
                  Use first/last card as song boundaries
                </label>
                <span>Timeline length {fmtPrecise(editorDuration)}</span>
                <div className="timing-zoom-controls" aria-label="Timeline scale controls">
                  <button
                    type="button"
                    className="timing-zoom-btn"
                    onClick={() => setTimelineZoom((prev) => Math.max(1, Number((prev - 0.25).toFixed(2))))}
                    disabled={timelineZoom <= 1}
                    aria-label="Zoom out timeline"
                  >
                    −
                  </button>
                  <span className="timing-zoom-readout">{Math.round(timelineZoom * 100)}%</span>
                  <button
                    type="button"
                    className="timing-zoom-btn"
                    onClick={() => setTimelineZoom((prev) => Math.min(4, Number((prev + 0.25).toFixed(2))))}
                    disabled={timelineZoom >= 4}
                    aria-label="Zoom in timeline"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <div className="timing-verse-bank">
              {!editUseClipEdgeBounds && boundaryCards.map((card) => (
                <div
                  key={card.key}
                  className={`timing-verse-card timing-boundary-card${card.point != null ? ' placed' : ''}`}
                >
                  <button className="timing-verse-main" onClick={() => setTimingBoundary(card.edge)}>
                    <span className="timing-verse-index">{card.label}</span>
                    <span className="timing-verse-copy">{card.text}</span>
                    <span className="timing-verse-stamp">{card.stamp}</span>
                  </button>
                  {card.point != null && (
                    <button
                      className="timing-line-clear timing-boundary-clear"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearTimingBoundary(card.edge);
                      }}
                      aria-label={`Clear ${card.label.toLowerCase()} point`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {verseCards.map((card) => (
                <div
                  key={card.isBlank ? 'pause-card' : card.verseIndex}
                  className={`timing-verse-card${card.clipCount > 0 ? ' placed' : ''}${card.isBlank ? ' blank' : ''}`}
                >
                  <button className="timing-verse-main" onClick={() => spawnClip(card.verseIndex)}>
                    <span className="timing-verse-index">{card.isBlank ? 'P' : card.verseIndex + 1}</span>
                    <span className="timing-verse-copy">{card.text}</span>
                    <span className="timing-verse-stamp">{card.clipCount > 0 ? `${card.clipCount} clip${card.clipCount === 1 ? '' : 's'} on track` : 'Spawn at playhead'}</span>
                  </button>
                </div>
              ))}
            </div>
            <div className="timing-timeline-wrap">
              <div className="timing-timeline-preview" aria-live="polite">
                <span className="timing-timeline-preview-label">
                  {previewTimelineClip
                    ? (previewTimelineClip.isBlank ? 'Pause' : `V${previewTimelineClip.verseIndex + 1}`)
                    : 'Preview'}
                </span>
                <span className="timing-timeline-preview-text">
                  {previewTimelineClip?.text || 'Hover a timeline card to preview its full text.'}
                </span>
                {previewTimelineClip && (
                  <span className="timing-timeline-preview-time">{fmtPrecise(previewTimelineClip.start)}</span>
                )}
              </div>
              <div className="timing-timeline-scroll" ref={timelineViewportRef}>
                <div className="timing-timeline-ruler" style={{ width: scaledTimelineWidth || '100%' }}>
                  {timelineMarks.map((time) => (
                    <span key={time} className="timing-ruler-mark" style={{ left: `${(time / editorDuration) * 100}%` }}>
                      {fmtPrecise(time)}
                    </span>
                  ))}
                </div>
                <div className="timing-timeline" onClick={handleTimelineSeek} ref={timelineRef} style={{ width: scaledTimelineWidth || '100%' }}>
                  <div className="timing-timeline-grid" />
                  <div className="timing-playhead" style={{ left: `${(currentTime / editorDuration) * 100}%` }}>
                    <span className="timing-playhead-label">{fmtPrecise(currentTime)}</span>
                  </div>
                  {boundaryMarkers.map((marker) => (
                    <div
                      key={marker.key}
                      className={`timing-boundary-marker timing-boundary-marker-${marker.edge}`}
                      style={{ left: `${(marker.time / editorDuration) * 100}%` }}
                    >
                      <button
                        className="timing-boundary-marker-main"
                        onClick={(e) => {
                          e.stopPropagation();
                          seekPlayback(marker.time);
                        }}
                      >
                        <span>{marker.label}</span>
                        <span>{fmtPrecise(marker.time)}</span>
                      </button>
                      {!editUseClipEdgeBounds && (
                        <button
                          className="timing-line-clear timing-boundary-marker-clear"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearTimingBoundary(marker.edge);
                          }}
                          aria-label={`Clear ${marker.label.toLowerCase()} point`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {timelineClips.map((clip) => (
                    <div
                      key={clip.id}
                      className={`timing-clip${clip.isBlank ? ' blank' : ''}`}
                      onMouseEnter={() => setPreviewClipId(clip.id)}
                      onMouseLeave={() => setPreviewClipId((current) => (current === clip.id ? null : current))}
                      onFocusCapture={() => setPreviewClipId(clip.id)}
                      onBlurCapture={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                          setPreviewClipId((current) => (current === clip.id ? null : current));
                        }
                      }}
                      style={{
                        left: `${clip.leftPct}%`,
                        width: `${clip.widthPct}%`,
                        top: '36px',
                      }}
                    >
                      <button
                        className="timing-clip-handle timing-clip-handle-start"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleClipEdgePointerDown(clip.id, 'start');
                        }}
                        aria-label="Adjust clip start"
                      />
                      <button
                        className="timing-clip-main"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleClipEdgePointerDown(clip.id, 'move', e.clientX);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          seekPlaybackAtClientX(e.clientX);
                        }}
                      >
                        <span className="timing-clip-index">{clip.isBlank ? 'Pause' : `V${clip.verseIndex + 1}`}</span>
                        <span className="timing-clip-text">{clip.text}</span>
                        <span className="timing-clip-range">{fmtPrecise(clip.start)}</span>
                      </button>
                      <button
                        className="timing-line-clear timing-clip-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeClip(clip.id);
                        }}
                        aria-label="Remove clip"
                      >
                        ×
                      </button>
                      {clip.hasEndHandle && (
                        <button
                          className="timing-clip-handle timing-clip-handle-end"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleClipEdgePointerDown(clip.id, 'end');
                          }}
                          aria-label="Adjust clip end"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
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
              const hasTimings = hasSavedTimingData;
              let cls = 'song-detail-lyric-line';
              if (hasTimings && activeLine >= 0) {
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
            href={`/smartboard-mode?slug=${encodeURIComponent(slug)}&lyrics=${encodeURIComponent(song.lyrics)}${song.audio ? `&audio=${encodeURIComponent(song.audio)}` : ''}${youtubeUrls[0] ? `&youtube=${encodeURIComponent(youtubeUrls[0])}` : ''}`}
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
