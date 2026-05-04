import { extractYouTubeId } from './youtube';

export interface StoredTimingClip {
  verseIndex: number;
  start: number;
}

export interface TimingBounds {
  inPoint: number | null;
  outPoint: number | null;
}

export interface StoredTimingData extends TimingBounds {
  clips: StoredTimingClip[];
  useClipEdgeBounds: boolean;
}

export interface ClipTimingEntry extends StoredTimingData {
  version?: number;
}

export interface MultiSourceTimingEntry {
  version: 4;
  defaultSource?: string | null;
  sources: Record<string, ClipTimingEntry>;
  sourceLabels?: Record<string, string>;
}

export type TimingEntry = number[] | ClipTimingEntry | MultiSourceTimingEntry;

export interface ResolvedTimingPayload extends StoredTimingData {
  sourceLabels: Record<string, string>;
}

export interface MediaTimingSource {
  key: string;
  label: string;
  audioUrl: string | null;
  youtubeUrl: string | null;
}

const DEFAULT_CARD_LENGTH = 6;

export function normalizeBoundaryPoint(point: unknown): number | null {
  if (typeof point !== 'number' || !Number.isFinite(point) || point < 0) {
    return null;
  }

  return Number(point.toFixed(2));
}

export function normalizeTimingBounds(inPoint: unknown, outPoint: unknown): TimingBounds {
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

export function sanitizeClips(clips: unknown): StoredTimingClip[] {
  if (!Array.isArray(clips)) return [];

  return clips
    .filter(
      (clip): clip is StoredTimingClip =>
        !!clip &&
        typeof clip === 'object' &&
        typeof (clip as StoredTimingClip).verseIndex === 'number' &&
        typeof (clip as StoredTimingClip).start === 'number' &&
        Number.isFinite((clip as StoredTimingClip).verseIndex) &&
        Number.isFinite((clip as StoredTimingClip).start)
    )
    .map((clip) => ({
      verseIndex: Math.round(clip.verseIndex),
      start: Number(clip.start.toFixed(2)),
    }))
    .sort((a, b) => a.start - b.start);
}

export function timestampsToClips(timestamps: number[]): StoredTimingClip[] {
  return timestamps
    .map((start, verseIndex) => ({ verseIndex, start }))
    .filter((clip) => Number.isFinite(clip.start) && clip.start >= 0)
    .sort((a, b) => a.start - b.start);
}

export function deriveBoundsFromClipEdges(clips: StoredTimingClip[], fallbackOutPoint: number | null): TimingBounds {
  if (clips.length === 0) {
    return { inPoint: null, outPoint: null };
  }

  const ordered = clips.slice().sort((a, b) => a.start - b.start);
  const inPoint = Number(ordered[0].start.toFixed(2));
  const lastStart = ordered[ordered.length - 1].start;
  const defaultOutPoint = Number((lastStart + DEFAULT_CARD_LENGTH).toFixed(2));
  const roundedFallbackOut = normalizeBoundaryPoint(fallbackOutPoint);
  const outPoint = roundedFallbackOut != null && roundedFallbackOut > lastStart
    ? roundedFallbackOut
    : defaultOutPoint;

  return { inPoint, outPoint };
}

function isMultiSourceTimingEntry(entry: TimingEntry | null | undefined): entry is MultiSourceTimingEntry {
  return !!entry && !Array.isArray(entry) && typeof entry === 'object' && 'sources' in entry && !!entry.sources && typeof entry.sources === 'object';
}

function normalizeSourceLabel(label: unknown): string | null {
  if (typeof label !== 'string') return null;
  const trimmed = label.trim();
  return trimmed ? trimmed.slice(0, 40) : null;
}

export function sanitizeSourceLabels(sourceLabels: unknown): Record<string, string> {
  if (!sourceLabels || typeof sourceLabels !== 'object' || Array.isArray(sourceLabels)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(sourceLabels).flatMap(([key, value]) => {
      const normalized = normalizeSourceLabel(value);
      return normalized ? [[key, normalized]] : [];
    }),
  );
}

function toClipTimingEntry(entry: number[] | ClipTimingEntry | null | undefined): ClipTimingEntry | null {
  if (!entry) return null;

  if (Array.isArray(entry)) {
    return {
      version: 2,
      clips: timestampsToClips(entry),
      inPoint: null,
      outPoint: null,
      useClipEdgeBounds: true,
    };
  }

  const bounds = normalizeTimingBounds(entry.inPoint, entry.outPoint);
  return {
    version: entry.version ?? (bounds.inPoint != null || bounds.outPoint != null ? 3 : 2),
    clips: sanitizeClips(entry.clips),
    inPoint: bounds.inPoint,
    outPoint: bounds.outPoint,
    useClipEdgeBounds: typeof entry.useClipEdgeBounds === 'boolean' ? entry.useClipEdgeBounds : true,
  };
}

function selectTimingEntry(
  entry: TimingEntry | null | undefined,
  sourceKey?: string | null,
  fallbackSourceKey?: string | null,
): number[] | ClipTimingEntry | null {
  if (!entry) return null;

  if (isMultiSourceTimingEntry(entry)) {
    if (sourceKey) {
      return entry.sources[sourceKey] ?? null;
    }

    if (entry.defaultSource && entry.sources[entry.defaultSource]) {
      return entry.sources[entry.defaultSource];
    }

    if (fallbackSourceKey && entry.sources[fallbackSourceKey]) {
      return entry.sources[fallbackSourceKey];
    }

    const firstSourceKey = Object.keys(entry.sources)[0];
    return firstSourceKey ? entry.sources[firstSourceKey] : null;
  }

  if (sourceKey && fallbackSourceKey && sourceKey !== fallbackSourceKey) {
    return null;
  }

  return entry;
}

export function resolveStoredTimingData(
  entry: TimingEntry | null | undefined,
  sourceKey?: string | null,
  fallbackSourceKey?: string | null,
): ResolvedTimingPayload | null {
  const sourceLabels = isMultiSourceTimingEntry(entry) ? sanitizeSourceLabels(entry.sourceLabels) : {};
  const selectedEntry = selectTimingEntry(entry, sourceKey, fallbackSourceKey);
  const normalized = toClipTimingEntry(selectedEntry);
  if (!normalized) {
    if (isMultiSourceTimingEntry(entry)) {
      return {
        clips: [],
        inPoint: null,
        outPoint: null,
        useClipEdgeBounds: true,
        sourceLabels,
      };
    }
    return null;
  }

  return {
    clips: normalized.clips,
    inPoint: normalized.inPoint ?? null,
    outPoint: normalized.outPoint ?? null,
    useClipEdgeBounds: normalized.useClipEdgeBounds,
    sourceLabels,
  };
}

export function resolveBoundsFromTimingEntry(
  entry: TimingEntry | null | undefined,
  sourceKey?: string | null,
  fallbackSourceKey?: string | null,
): TimingBounds {
  const timingData = resolveStoredTimingData(entry, sourceKey, fallbackSourceKey);
  if (!timingData) {
    return { inPoint: null, outPoint: null };
  }

  if (timingData.useClipEdgeBounds) {
    return deriveBoundsFromClipEdges(timingData.clips, timingData.outPoint);
  }

  return normalizeTimingBounds(timingData.inPoint, timingData.outPoint);
}

export function resolveSourceLabelsFromTimingEntry(entry: TimingEntry | null | undefined): Record<string, string> {
  return isMultiSourceTimingEntry(entry) ? sanitizeSourceLabels(entry.sourceLabels) : {};
}

export function createClipTimingEntry(data: StoredTimingData): ClipTimingEntry | null {
  const bounds = normalizeTimingBounds(data.inPoint, data.outPoint);
  const clips = sanitizeClips(data.clips);

  if (clips.length === 0 && bounds.inPoint == null && bounds.outPoint == null) {
    return null;
  }

  return {
    version: bounds.inPoint != null || bounds.outPoint != null ? 3 : 2,
    clips,
    inPoint: bounds.inPoint,
    outPoint: bounds.outPoint,
    useClipEdgeBounds: typeof data.useClipEdgeBounds === 'boolean' ? data.useClipEdgeBounds : true,
  };
}

export function upsertTimingSourceEntry(
  existingEntry: TimingEntry | null | undefined,
  sourceKey: string,
  fallbackSourceKey: string | null | undefined,
  nextEntry: ClipTimingEntry | null,
  sourceLabels?: Record<string, string>,
): MultiSourceTimingEntry | null {
  const sources: Record<string, ClipTimingEntry> = {};
  const nextSourceLabels = isMultiSourceTimingEntry(existingEntry)
    ? sanitizeSourceLabels(existingEntry.sourceLabels)
    : {};

  Object.assign(nextSourceLabels, sanitizeSourceLabels(sourceLabels));

  if (isMultiSourceTimingEntry(existingEntry)) {
    Object.entries(existingEntry.sources).forEach(([key, value]) => {
      const normalized = toClipTimingEntry(value);
      if (normalized) {
        sources[key] = normalized;
      }
    });
  } else {
    const normalized = toClipTimingEntry(existingEntry ?? null);
    const legacySourceKey = fallbackSourceKey ?? sourceKey;
    if (normalized) {
      sources[legacySourceKey] = normalized;
    }
  }

  if (nextEntry) {
    sources[sourceKey] = nextEntry;
  } else {
    delete sources[sourceKey];
  }

  const sourceKeys = Object.keys(sources);
  if (sourceKeys.length === 0 && Object.keys(nextSourceLabels).length === 0) {
    return null;
  }

  const preferredDefault = isMultiSourceTimingEntry(existingEntry)
    ? existingEntry.defaultSource
    : (fallbackSourceKey ?? sourceKey);
  const defaultSource = preferredDefault && sources[preferredDefault]
    ? preferredDefault
    : (sourceKeys[0] ?? preferredDefault ?? null);

  return {
    version: 4,
    defaultSource,
    sources,
    sourceLabels: nextSourceLabels,
  };
}

export function buildMediaTimingSources(
  audioUrl: string | null | undefined,
  youtubeUrls: string[],
  sourceLabels?: Record<string, string>,
): MediaTimingSource[] {
  if (audioUrl) {
    const key = `audio:${audioUrl.trim()}`;
    return [{
      key,
      label: sourceLabels?.[key] ?? 'Audio',
      audioUrl,
      youtubeUrl: youtubeUrls[0] ?? null,
    }];
  }

  return youtubeUrls.map((youtubeUrl, index) => ({
    key: `youtube:${extractYouTubeId(youtubeUrl) ?? youtubeUrl.trim()}`,
    label: sourceLabels?.[`youtube:${extractYouTubeId(youtubeUrl) ?? youtubeUrl.trim()}`] ?? (youtubeUrls.length === 1 ? 'YouTube' : `Link ${index + 1}`),
    audioUrl: null,
    youtubeUrl,
  }));
}