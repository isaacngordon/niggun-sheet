'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useGoogleAuth } from '@/components/GoogleAuthProvider';
import MediaPlayer from '@/components/MediaPlayer';
import { buildMediaTimingSources } from '@/lib/timings';
import { extractAllYouTubeUrls, fmtPrecise } from '@/lib/youtube';
import { deriveClipEdgeBounds, moveClipToTime, resolveClipStartLowerBound } from './timingEditorUtils';

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
  sourceLabels?: Record<string, string>;
}

interface EditorTimingClip extends StoredTimingClip {
  id: string;
}

interface DragState {
  clipId: string;
  edge: 'start' | 'end' | 'move';
  grabOffset?: number;
}

interface VerseCard {
  verseIndex: number;
  isBlank: boolean;
  text: string;
  clipCount: number;
}

const MIN_CLIP_LENGTH = 0.01;
const DEFAULT_CARD_LENGTH = 6;
const TIMELINE_CLIP_GAP_SECONDS = 0.14;
const TIMELINE_ZOOM_MIN = 1;
const TIMELINE_ZOOM_MAX = 8;
const TIMELINE_ZOOM_KEY_STEP = 0.5;
const CLIP_EDGE_HIT_AREA_PX = 28;
const CLIP_EDGE_HIT_AREA_RATIO = 0.35;

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

function clipContextWords(text: string, limit = 4): string[] {
  const words = text
    .replace(/[\u0591-\u05C7]/g, '')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) return ['Pause'];
  return words.slice(0, limit);
}

function findSuggestedVerseIndex(cards: VerseCard[], currentVerseIndex?: number | null): number {
  const lyricCards = cards.filter((card) => !card.isBlank);
  if (lyricCards.length === 0) return -1;

  if (typeof currentVerseIndex === 'number' && currentVerseIndex >= 0) {
    const nextUnplaced = lyricCards.find((card) => card.verseIndex > currentVerseIndex && card.clipCount === 0);
    if (nextUnplaced) return nextUnplaced.verseIndex;

    const nextCard = lyricCards.find((card) => card.verseIndex > currentVerseIndex);
    if (nextCard) return nextCard.verseIndex;
  }

  return lyricCards.find((card) => card.clipCount === 0)?.verseIndex ?? lyricCards[0].verseIndex;
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
  return deriveClipEdgeBounds(clips, fallbackOutPoint, DEFAULT_CARD_LENGTH);
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

async function fetchTimings(slug: string, sourceKey?: string | null, fallbackSourceKey?: string | null): Promise<StoredTimingData | null> {
  try {
    const query = new URLSearchParams({ slug });
    if (sourceKey) query.set('source', sourceKey);
    if (fallbackSourceKey) query.set('fallbackSource', fallbackSourceKey);
    const res = await fetch(`/api/timings?${query.toString()}`);
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
        sourceLabels: data.sourceLabels ?? {},
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
        sourceLabels: data.sourceLabels ?? {},
      };
    }
    return null;
  } catch { return null; }
}

async function saveTimingsApi(
  slug: string,
  timingData: StoredTimingData,
  sourceKey?: string | null,
  fallbackSourceKey?: string | null,
): Promise<boolean> {
  try {
    const res = await fetch('/api/timings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        source: sourceKey,
        fallbackSource: fallbackSourceKey,
        clips: timingData.clips,
        inPoint: timingData.inPoint,
        outPoint: timingData.outPoint,
        useClipEdgeBounds: timingData.useClipEdgeBounds,
        sourceLabels: timingData.sourceLabels,
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
  const searchParams = useSearchParams();
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
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(0);
  const [isTimelineScrubbing, setIsTimelineScrubbing] = useState(false);
  const [selectedMediaSourceKey, setSelectedMediaSourceKey] = useState<string | null>(null);
  const [savedSourceLabels, setSavedSourceLabels] = useState<Record<string, string>>({});
  const [editSourceLabels, setEditSourceLabels] = useState<Record<string, string>>({});
  const [manualTargetVerseIndex, setManualTargetVerseIndex] = useState<number | null>(0);
  const isAdmin = user?.email === ADMIN_EMAIL;
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineViewportRef = useRef<HTMLDivElement>(null);
  const timelineScrubPointerIdRef = useRef<number | null>(null);

  const youtubeUrls = useMemo(() => extractAllYouTubeUrls(song?.youtube ?? ''), [song?.youtube]);
  const mediaSources = useMemo(
    () => buildMediaTimingSources(song?.audio ?? null, youtubeUrls, timingMode ? editSourceLabels : savedSourceLabels),
    [editSourceLabels, savedSourceLabels, song?.audio, timingMode, youtubeUrls],
  );
  const defaultMediaSourceKey = mediaSources[0]?.key ?? null;
  const requestedTimingSourceKey = searchParams.get('timingSource');
  const activeMediaSourceKey = useMemo(() => {
    if (requestedTimingSourceKey && mediaSources.some((source) => source.key === requestedTimingSourceKey)) {
      return requestedTimingSourceKey;
    }
    if (selectedMediaSourceKey && mediaSources.some((source) => source.key === selectedMediaSourceKey)) {
      return selectedMediaSourceKey;
    }
    return defaultMediaSourceKey;
  }, [defaultMediaSourceKey, mediaSources, requestedTimingSourceKey, selectedMediaSourceKey]);
  const activeMediaSource = mediaSources.find((source) => source.key === activeMediaSourceKey) ?? mediaSources[0] ?? null;

  useEffect(() => {
    setCurrentTime(0);
    setYtDuration(0);
    setYtPlaying(false);
    ytPlayerRef.current = null;
  }, [activeMediaSourceKey]);

  const buildTimingSourceHref = useCallback((sourceKey: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('timingSource', sourceKey);
    const query = params.toString();
    return query ? `/songs/${slug}?${query}` : `/songs/${slug}`;
  }, [searchParams, slug]);

  // Load saved timings
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    fetchTimings(slug, activeMediaSourceKey, defaultMediaSourceKey).then((timingData) => {
      if (cancelled) return;
      setSavedClips(toEditorClips(timingData?.clips));
      setSavedBounds({
        inPoint: timingData?.inPoint ?? null,
        outPoint: timingData?.outPoint ?? null,
      });
      setSavedUseClipEdgeBounds(timingData?.useClipEdgeBounds ?? true);
      setSavedSourceLabels(timingData?.sourceLabels ?? {});
      if (!timingMode) {
        setEditSourceLabels(timingData?.sourceLabels ?? {});
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeMediaSourceKey, defaultMediaSourceKey, slug, timingMode]);

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

  const editActiveLine = useMemo(() => {
    if (!timingMode || editClips.length === 0) return -1;
    return activeLineFromClips(editClips, currentTime, effectiveEditBounds);
  }, [currentTime, editClips, effectiveEditBounds, timingMode]);

  const verseCards = useMemo<VerseCard[]>(() => {
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

  /* ── Timing editor helpers ── */
  const startTimingMode = () => {
    const nextClips = savedClips.map((clip) => ({ ...clip, id: makeClipId() }));
    const nextVerseCards: VerseCard[] = [
      ...lyricsLines.map((line, index) => ({
        verseIndex: index,
        isBlank: false,
        text: line || '\u00A0',
        clipCount: savedClips.filter((clip) => clip.verseIndex === index).length,
      })),
      {
        verseIndex: -1,
        isBlank: true,
        text: '(Pause / blank)',
        clipCount: savedClips.filter((clip) => clip.verseIndex < 0).length,
      },
    ];

    setEditClips(nextClips);
    setEditBounds(savedBounds);
    setEditUseClipEdgeBounds(savedUseClipEdgeBounds);
    setEditSourceLabels(savedSourceLabels);
    setSelectedClipId(nextClips[0]?.id ?? null);
    setManualTargetVerseIndex(findSuggestedVerseIndex(nextVerseCards));
    setTimingMode(true);
  };

  const getPlayheadTime = useCallback(() => {
    const rawTime = ytPlayerRef.current?.getCurrentTime?.() ?? currentTime;
    return Number(Math.max(0, rawTime).toFixed(2));
  }, [currentTime]);

  const spawnClip = useCallback((verseIndex: number) => {
    const rawTime = getPlayheadTime();
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
    setSelectedClipId(nextClip.id);
    setPreviewClipId(nextClip.id);
  }, [effectiveEditBounds.inPoint, effectiveEditBounds.outPoint, getPlayheadTime]);

  const placeManualTargetClip = useCallback((options?: { advance?: boolean; verseIndex?: number }) => {
    const verseIndex = options?.verseIndex ?? manualTargetVerseIndex;
    if (verseIndex == null || verseIndex < -1) return;

    spawnClip(verseIndex);

    if (options?.advance && verseIndex >= 0) {
      setManualTargetVerseIndex(findSuggestedVerseIndex(verseCards, verseIndex));
    }
  }, [manualTargetVerseIndex, spawnClip, verseCards]);

  const moveManualTarget = useCallback((direction: -1 | 1) => {
    const lyricCards = verseCards.filter((card) => !card.isBlank);
    if (lyricCards.length === 0) return;

    const currentIndex = lyricCards.findIndex((card) => card.verseIndex === manualTargetVerseIndex);
    const fallbackIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = Math.max(0, Math.min(lyricCards.length - 1, fallbackIndex + direction));
    setManualTargetVerseIndex(lyricCards[nextIndex].verseIndex);
  }, [manualTargetVerseIndex, verseCards]);

  const removeClip = useCallback((id: string) => {
    setEditClips((prev) => {
      const ordered = prev.slice().sort((a, b) => a.start - b.start);
      const removedIndex = ordered.findIndex((clip) => clip.id === id);
      const next = ordered.filter((clip) => clip.id !== id);

      setSelectedClipId((current) => {
        if (current !== id) return current;
        return next[Math.min(removedIndex, next.length - 1)]?.id ?? null;
      });

      return next;
    });
    setPreviewClipId((current) => (current === id ? null : current));
  }, []);

  const cancelTiming = () => {
    setTimingMode(false);
    setEditClips([]);
    setEditBounds({ inPoint: null, outPoint: null });
    setEditUseClipEdgeBounds(true);
    setDragState(null);
    setSelectedClipId(null);
    setEditSourceLabels(savedSourceLabels);
    setManualTargetVerseIndex(null);
  };

  const saveTiming = async () => {
    setSaving(true);
    const finalBounds = normalizeTimingBounds(editBounds.inPoint, editBounds.outPoint);
    const final = editClips.map((clip) => ({
      verseIndex: clip.verseIndex,
      start: Number(clip.start.toFixed(2)),
    }));
    const ok = await saveTimingsApi(
      slug,
      { clips: final, ...finalBounds, useClipEdgeBounds: editUseClipEdgeBounds, sourceLabels: editSourceLabels },
      activeMediaSourceKey,
      defaultMediaSourceKey,
    );

    if (ok) {
      setSavedClips(toEditorClips(final));
      setSavedBounds(finalBounds);
      setSavedUseClipEdgeBounds(editUseClipEdgeBounds);
      setSavedSourceLabels(editSourceLabels);
      setTimingMode(false);
      setEditClips([]);
      setEditBounds({ inPoint: null, outPoint: null });
      setEditUseClipEdgeBounds(true);
      setSelectedClipId(null);
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

  const selectedVerseCard = useMemo(
    () => verseCards.find((card) => card.verseIndex === manualTargetVerseIndex) ?? null,
    [manualTargetVerseIndex, verseCards],
  );

  const suggestedNextVerseIndex = useMemo(
    () => findSuggestedVerseIndex(verseCards, manualTargetVerseIndex),
    [manualTargetVerseIndex, verseCards],
  );

  useEffect(() => {
    if (!timingMode) return;
    if (manualTargetVerseIndex == null) {
      setManualTargetVerseIndex(findSuggestedVerseIndex(verseCards));
      return;
    }

    const targetStillExists = verseCards.some((card) => card.verseIndex === manualTargetVerseIndex);
    if (!targetStillExists) {
      setManualTargetVerseIndex(findSuggestedVerseIndex(verseCards));
    }
  }, [manualTargetVerseIndex, timingMode, verseCards]);

  const boundaryCards = useMemo(() => ([
    {
      key: 'in',
      edge: 'in' as const,
      label: 'In',
      point: editBounds.inPoint,
      text: editBounds.inPoint != null ? 'The song now starts here.' : 'Mark where the song starts.',
      stamp: editBounds.inPoint != null ? `Starts at ${fmtPrecise(editBounds.inPoint)}` : 'Set it here',
    },
    {
      key: 'out',
      edge: 'out' as const,
      label: 'Out',
      point: editBounds.outPoint,
      text: editBounds.outPoint != null ? 'The song now ends here.' : 'Mark where the song ends.',
      stamp: editBounds.outPoint != null ? `Ends at ${fmtPrecise(editBounds.outPoint)}` : 'Set it here',
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
        const visualDuration = Math.max(0, visualEnd - clip.start);
        const isBlank = clip.verseIndex < 0;
        const text = isBlank ? '(Pause)' : (lyricsLines[clip.verseIndex] || `Line ${clip.verseIndex + 1}`);
        return {
          ...clip,
          isBlank,
          text,
          contextWords: isBlank ? ['Pause'] : clipContextWords(text),
          end,
          hasEndHandle: Boolean(nextClip) || isLastClip,
          leftPct: (clip.start / editorDuration) * 100,
          widthPct: nextClip
            ? (visualDuration / editorDuration) * 100
            : Math.max((visualDuration / editorDuration) * 100, 1.2),
        };
      });
  }, [editClips, editorDuration, effectiveEditBounds.outPoint, lyricsLines]);

  const selectedTimelineClip = useMemo(() => {
    if (!selectedClipId) return null;
    return timelineClips.find((clip) => clip.id === selectedClipId) ?? null;
  }, [selectedClipId, timelineClips]);

  const nudgeSelectedClip = useCallback((deltaSeconds: number) => {
    if (!selectedClipId) return;

    setEditClips((prev) => {
      const clip = prev.find((entry) => entry.id === selectedClipId);
      if (!clip) return prev;

      return moveClipToTime(
        prev,
        selectedClipId,
        Number((clip.start + deltaSeconds).toFixed(2)),
        effectiveEditBounds,
        editorDuration,
        MIN_CLIP_LENGTH,
        editUseClipEdgeBounds,
      );
    });
  }, [editUseClipEdgeBounds, editorDuration, effectiveEditBounds, selectedClipId]);

  const moveSelectedClipToPlayhead = useCallback(() => {
    if (!selectedClipId) return;

    setEditClips((prev) => moveClipToTime(
      prev,
      selectedClipId,
      getPlayheadTime(),
      effectiveEditBounds,
      editorDuration,
      MIN_CLIP_LENGTH,
      editUseClipEdgeBounds,
    ));
  }, [editUseClipEdgeBounds, editorDuration, effectiveEditBounds, getPlayheadTime, selectedClipId]);

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
    return selectedTimelineClip ?? activeTimelineClip;
  }, [activeTimelineClip, previewClipId, selectedTimelineClip, timelineClips]);

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

  const usedVerseCount = useMemo(
    () => new Set(editClips.filter((clip) => clip.verseIndex >= 0 && isClipWithinBounds(clip, effectiveEditBounds)).map((clip) => clip.verseIndex)).size,
    [effectiveEditBounds, editClips]
  );

  const selectClip = useCallback((clipId: string, shouldSeek = false) => {
    const clip = editClips.find((entry) => entry.id === clipId);
    if (!clip) return;
    setSelectedClipId(clipId);
    setPreviewClipId(clipId);
    setManualTargetVerseIndex(clip.verseIndex);
    if (shouldSeek) seekPlayback(clip.start);
  }, [editClips, seekPlayback]);

  const setTimingBoundary = useCallback((edge: 'in' | 'out') => {
    const nextTime = getPlayheadTime();

    setEditBounds((prev) => normalizeTimingBounds(
      edge === 'in' ? nextTime : prev.inPoint,
      edge === 'out' ? nextTime : prev.outPoint,
    ));
  }, [getPlayheadTime]);

  const clearTimingBoundary = useCallback((edge: 'in' | 'out') => {
    setEditBounds((prev) => ({
      inPoint: edge === 'in' ? null : prev.inPoint,
      outPoint: edge === 'out' ? null : prev.outPoint,
    }));
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

  const handleTimelinePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    timelineScrubPointerIdRef.current = e.pointerId;
    setIsTimelineScrubbing(true);
    seekPlaybackAtClientX(e.clientX);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  }, [seekPlaybackAtClientX]);

  const handleTimelinePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (timelineScrubPointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    seekPlaybackAtClientX(e.clientX);
  }, [seekPlaybackAtClientX]);

  const finishTimelineScrub = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (timelineScrubPointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    seekPlaybackAtClientX(e.clientX);
    timelineScrubPointerIdRef.current = null;
    setIsTimelineScrubbing(false);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
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
    setSelectedClipId(clipId);
    setPreviewClipId(clipId);

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
          const minStart = resolveClipStartLowerBound(
            previousClip,
            effectiveEditBounds,
            editUseClipEdgeBounds,
            MIN_CLIP_LENGTH,
          );
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
          const anchoredStart = rawTime - (dragState.grabOffset ?? 0);
          return moveClipToTime(
            ordered,
            clip.id,
            anchoredStart,
            effectiveEditBounds,
            editorDuration,
            MIN_CLIP_LENGTH,
            editUseClipEdgeBounds,
          );
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
  }, [dragState, editUseClipEdgeBounds, effectiveEditBounds, editorDuration]);

  const adjustTimelineZoom = useCallback((delta: number) => {
    setTimelineZoom((prev) => Math.max(TIMELINE_ZOOM_MIN, Math.min(TIMELINE_ZOOM_MAX, Number((prev + delta).toFixed(2)))));
  }, []);

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
      } else if (event.key === 'Enter') {
        event.preventDefault();
        placeManualTargetClip({ advance: event.shiftKey });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveManualTarget(-1);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveManualTarget(1);
      } else if (event.key === '[') {
        event.preventDefault();
        nudgeSelectedClip(-0.1);
      } else if (event.key === ']') {
        event.preventDefault();
        nudgeSelectedClip(0.1);
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedClipId) {
        event.preventDefault();
        removeClip(selectedClipId);
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        adjustTimelineZoom(TIMELINE_ZOOM_KEY_STEP);
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        adjustTimelineZoom(-TIMELINE_ZOOM_KEY_STEP);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [adjustTimelineZoom, moveManualTarget, nudgeSelectedClip, placeManualTargetClip, removeClip, rippleTrimNextEditToPlayhead, selectedClipId, timingMode]);

  return (
    <main className="song-detail-container">
      <Link href="/songs" className="song-detail-back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        Back to songs
      </Link>

      <div className="song-detail-card">
        <div className="song-detail-header">
          {song.isPrivate && <div className="private-badge">My Song</div>}
          <h1 className="song-detail-title">{song.title}</h1>
          {song.artist && <p className="song-detail-artist">{song.artist}</p>}
        </div>

        {(song.audio || youtubeUrls.length > 0) && (
          <>
            {mediaSources.length > 1 && (
              <div className="song-detail-source-switcher" role="tablist" aria-label="Timing source selector">
                {mediaSources.map((source) => (
                  <Link
                    key={source.key}
                    href={buildTimingSourceHref(source.key)}
                    replace
                    scroll={false}
                    role="tab"
                    aria-selected={activeMediaSource?.key === source.key}
                    className={`song-detail-source-pill${activeMediaSource?.key === source.key ? ' active' : ''}`}
                    onClick={() => {
                      if (source.key === activeMediaSource?.key) return;
                      cancelTiming();
                      setSelectedMediaSourceKey(source.key);
                    }}
                  >
                    {source.label}
                  </Link>
                ))}
              </div>
            )}
            <div className="song-detail-players">
              {mediaSources.map((source) => {
                const isActiveSource = activeMediaSource?.key === source.key;

                return (
                  <div key={source.key} className={`song-detail-player-slot${isActiveSource ? ' active' : ''}`}>
                    {mediaSources.length > 1 && (
                      <div className="song-detail-player-caption">
                        <span>{source.label}</span>
                        <span>{isActiveSource ? 'This one controls timing' : 'Not used for timing right now'}</span>
                      </div>
                    )}
                    <MediaPlayer
                      audioUrl={source.audioUrl}
                      youtubeUrl={source.youtubeUrl}
                      inPoint={isActiveSource ? effectiveSavedBounds.inPoint : null}
                      outPoint={isActiveSource ? effectiveSavedBounds.outPoint : null}
                      onTick={isActiveSource ? handleTick : undefined}
                      exposePlayer={isActiveSource ? handleExposePlayer : undefined}
                      detail
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Admin timing toolbar ── */}
        {isAdmin && !timingMode && (
          <div className="timing-toolbar">
            <button className="timing-edit-btn" onClick={startTimingMode}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {hasSavedTimingData ? 'Edit timing' : 'Add timing'}
            </button>
            {activeMediaSource && mediaSources.length > 1 && (
              <span className="timing-source-indicator">{activeMediaSource.label}</span>
            )}
            {ytPlaying && (
              <span className="timing-status">{fmtPrecise(currentTime)}</span>
            )}
          </div>
        )}

        {/* ── Timing editor (admin, when in timing mode) ── */}
        {timingMode && (
          <div className="timing-editor">
            <div className="timing-editor-header">
              <span className="timing-editor-title">Timing editor</span>
              <span className="timing-editor-time">
                {ytPlaying ? fmtPrecise(currentTime) : 'Paused'}
              </span>
            </div>
            {mediaSources.length > 1 && (
              <div className="timing-source-editor">
                {mediaSources.map((source, index) => (
                  <label key={source.key} className="timing-source-field">
                    <span className="timing-source-field-label">Link {index + 1}</span>
                    <input
                      type="text"
                      className="timing-source-input"
                      value={editSourceLabels[source.key] ?? source.label}
                      onChange={(event) => {
                        const nextValue = event.target.value.slice(0, 40);
                        setEditSourceLabels((prev) => ({
                          ...prev,
                          [source.key]: nextValue,
                        }));
                      }}
                      placeholder={`Name for link ${index + 1}`}
                    />
                  </label>
                ))}
              </div>
            )}
            <p className="timing-editor-hint">Click a line card when the playhead reaches the right spot. Use Previous, Next, or Pause to change your place. Press Enter to place a line. Press Shift+Enter to place it and move on.</p>
            <div className="timing-manual-workflow">
              <div className="timing-manual-copy">
                <span className="timing-manual-label">Place lines by hand</span>
                <strong className="timing-manual-title">
                  {selectedVerseCard
                    ? (selectedVerseCard.isBlank ? 'Pause is selected' : `Line ${selectedVerseCard.verseIndex + 1} is selected`)
                    : 'Pick the next line to place'}
                </strong>
                <p className="timing-manual-description">
                  {selectedVerseCard
                    ? selectedVerseCard.text
                    : 'Pick the next line, then click it when the playhead gets there.'}
                </p>
                <span className="timing-manual-meta">
                  {suggestedNextVerseIndex >= 0
                    ? `Next line to try: ${suggestedNextVerseIndex + 1}`
                    : 'Every line already has at least one timing mark.'}
                </span>
              </div>
              <div className="timing-manual-controls">
                <div className="timing-manual-nav" role="group" aria-label="Selected line navigation">
                  <button type="button" className="timing-manual-btn timing-manual-btn-secondary" onClick={() => moveManualTarget(-1)}>
                    Previous line
                  </button>
                  <button type="button" className="timing-manual-btn timing-manual-btn-secondary" onClick={() => moveManualTarget(1)}>
                    Next line
                  </button>
                  <button type="button" className="timing-manual-btn timing-manual-btn-secondary" onClick={() => setManualTargetVerseIndex(-1)}>
                    Pause
                  </button>
                </div>
                <div className="timing-manual-actions" role="group" aria-label="Selected clip fine adjustment">
                  <button
                    type="button"
                    className="timing-manual-btn timing-manual-btn-primary"
                    onClick={moveSelectedClipToPlayhead}
                    disabled={!selectedTimelineClip}
                  >
                    Move selected mark to {fmtPrecise(getPlayheadTime())}
                  </button>
                  <button
                    type="button"
                    className="timing-manual-btn timing-manual-btn-secondary"
                    onClick={() => nudgeSelectedClip(-0.25)}
                    disabled={!selectedTimelineClip}
                  >
                    Move back 0.25s
                  </button>
                  <button
                    type="button"
                    className="timing-manual-btn timing-manual-btn-secondary"
                    onClick={() => nudgeSelectedClip(-0.1)}
                    disabled={!selectedTimelineClip}
                  >
                    -0.10s
                  </button>
                  <button
                    type="button"
                    className="timing-manual-btn timing-manual-btn-secondary"
                    onClick={() => nudgeSelectedClip(0.1)}
                    disabled={!selectedTimelineClip}
                  >
                    +0.10s
                  </button>
                  <button
                    type="button"
                    className="timing-manual-btn timing-manual-btn-secondary"
                    onClick={() => nudgeSelectedClip(0.25)}
                    disabled={!selectedTimelineClip}
                  >
                    Move forward 0.25s
                  </button>
                </div>
                {selectedTimelineClip && (
                  <span className="timing-manual-selection">
                    Picked mark: {selectedTimelineClip.isBlank ? 'Pause' : `Line ${selectedTimelineClip.verseIndex + 1}`} at {fmtPrecise(selectedTimelineClip.start)}
                  </span>
                )}
              </div>
            </div>
            <div className="timing-editor-meta">
              <span>{editClips.length} marks placed, {usedVerseCount}/{lyricsLines.length} lines used</span>
              <div className="timing-editor-meta-tools">
                <label className="timing-boundary-toggle">
                  <input
                    type="checkbox"
                    checked={editUseClipEdgeBounds}
                    onChange={(e) => setEditUseClipEdgeBounds(e.target.checked)}
                  />
                  Use the first and last marks as the song edges
                </label>
                <span>Timeline length {fmtPrecise(editorDuration)}</span>
                <label className="timing-zoom-controls" aria-label="Timeline zoom control">
                  <span className="timing-zoom-label">Zoom</span>
                  <input
                    type="range"
                    className="timing-zoom-slider"
                    min={TIMELINE_ZOOM_MIN}
                    max={TIMELINE_ZOOM_MAX}
                    step="0.25"
                    value={timelineZoom}
                    onChange={(event) => setTimelineZoom(Number(event.target.value))}
                    aria-label="Timeline zoom"
                  />
                  <span className="timing-zoom-readout">{Math.round(timelineZoom * 100)}%</span>
                </label>
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
                  className={`timing-verse-card${card.clipCount > 0 ? ' placed' : ''}${card.isBlank ? ' blank' : ''}${card.verseIndex === manualTargetVerseIndex ? ' selected' : ''}`}
                >
                  <button
                    className="timing-verse-main"
                    onClick={() => {
                      setManualTargetVerseIndex(card.verseIndex);
                      placeManualTargetClip({ verseIndex: card.verseIndex, advance: !card.isBlank });
                    }}
                  >
                    <span className="timing-verse-index">{card.isBlank ? 'P' : card.verseIndex + 1}</span>
                    <span className="timing-verse-copy">{card.text}</span>
                    <span className="timing-verse-stamp">
                      {card.verseIndex === manualTargetVerseIndex
                        ? 'Click again to place it here'
                        : card.clipCount > 0
                          ? `${card.clipCount} mark${card.clipCount === 1 ? '' : 's'} here`
                          : 'Click to place it here'}
                    </span>
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
                  {previewTimelineClip?.text || 'Point to a mark below to read the whole line.'}
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
                <div
                  className={`timing-timeline${isTimelineScrubbing ? ' scrubbing' : ''}`}
                  onPointerDown={handleTimelinePointerDown}
                  onPointerMove={handleTimelinePointerMove}
                  onPointerUp={finishTimelineScrub}
                  onPointerCancel={finishTimelineScrub}
                  ref={timelineRef}
                  style={{ width: scaledTimelineWidth || '100%' }}
                >
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
                      className={`timing-clip${clip.isBlank ? ' blank' : ''}${selectedClipId === clip.id ? ' selected' : ''}${clip.verseIndex % 2 === 0 ? ' tone-warm' : ' tone-deep'}`}
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
                          const rect = e.currentTarget.getBoundingClientRect();
                          const offsetX = e.clientX - rect.left;
                          const dynamicEdgeHitArea = Math.min(
                            rect.width / 2,
                            Math.max(CLIP_EDGE_HIT_AREA_PX, rect.width * CLIP_EDGE_HIT_AREA_RATIO),
                          );

                          if (offsetX <= dynamicEdgeHitArea) {
                            handleClipEdgePointerDown(clip.id, 'start', e.clientX);
                            return;
                          }

                          if (rect.width - offsetX <= dynamicEdgeHitArea) {
                            handleClipEdgePointerDown(clip.id, 'end', e.clientX);
                            return;
                          }

                          handleClipEdgePointerDown(clip.id, 'move', e.clientX);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectClip(clip.id, true);
                        }}
                      >
                        <span className="timing-clip-index">{clip.isBlank ? 'Pause' : `V${clip.verseIndex + 1}`}</span>
                        <span className="timing-clip-word-stack" aria-label={clip.text}>
                          {clip.contextWords.map((word, wordIndex) => (
                            <span key={`${clip.id}-word-${wordIndex}`} className="timing-clip-word">{word}</span>
                          ))}
                        </span>
                        <span className="timing-clip-range">{fmtPrecise(clip.start)}–{fmtPrecise(clip.end)}</span>
                      </button>
                      <button
                        className="timing-line-clear timing-clip-remove"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
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
                {saving ? 'Saving...' : 'Save timing'}
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
            href={`/smartboard-mode?slug=${encodeURIComponent(slug)}&lyrics=${encodeURIComponent(song.lyrics)}${activeMediaSource?.audioUrl ? `&audio=${encodeURIComponent(activeMediaSource.audioUrl)}` : ''}${activeMediaSource?.youtubeUrl ? `&youtube=${encodeURIComponent(activeMediaSource.youtubeUrl)}` : ''}${activeMediaSource?.key ? `&timingSource=${encodeURIComponent(activeMediaSource.key)}` : ''}`}
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
