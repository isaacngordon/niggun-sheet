interface StoredTimingClip {
  verseIndex: number;
  start: number;
}

function normalizeBoundaryPoint(point: unknown): number | null {
  if (typeof point !== 'number' || !Number.isFinite(point) || point < 0) {
    return null;
  }

  return Number(point.toFixed(2));
}

export interface EditorTimingClip extends StoredTimingClip {
  id: string;
}

export interface TimingBounds {
  inPoint: number | null;
  outPoint: number | null;
}

export function resolveClipStartLowerBound(
  previousClip: EditorTimingClip | null,
  bounds: TimingBounds,
  useClipEdgeBounds: boolean,
  minClipLength: number,
): number {
  if (previousClip) {
    return previousClip.start + minClipLength;
  }

  return useClipEdgeBounds ? 0 : (bounds.inPoint ?? 0);
}

export function deriveClipEdgeBounds(
  clips: StoredTimingClip[],
  fallbackOutPoint: number | null,
  defaultCardLength: number,
): TimingBounds {
  if (clips.length === 0) {
    return { inPoint: null, outPoint: null };
  }

  const ordered = clips.slice().sort((a, b) => a.start - b.start);
  const inPoint = Number(ordered[0].start.toFixed(2));
  const lastStart = ordered[ordered.length - 1].start;
  const defaultOutPoint = Number((lastStart + defaultCardLength).toFixed(2));
  const roundedFallbackOut = normalizeBoundaryPoint(fallbackOutPoint);
  const outPoint = roundedFallbackOut != null && roundedFallbackOut > lastStart
    ? roundedFallbackOut
    : defaultOutPoint;

  return {
    inPoint,
    outPoint,
  };
}

export function moveClipToTime(
  clips: EditorTimingClip[],
  clipId: string,
  requestedStart: number,
  bounds: TimingBounds,
  editorDuration: number,
  minClipLength: number,
  useClipEdgeBounds = false,
): EditorTimingClip[] {
  const ordered = clips.slice().sort((a, b) => a.start - b.start);
  const clipIndex = ordered.findIndex((clip) => clip.id === clipId);
  if (clipIndex === -1) return clips;

  const clip = ordered[clipIndex];
  const minStart = clipIndex === 0 && useClipEdgeBounds ? 0 : (bounds.inPoint ?? 0);
  const maxStart = Math.max((bounds.outPoint ?? editorDuration) - minClipLength, minStart);
  const nextStart = Math.min(Math.max(requestedStart, minStart), Math.max(minStart, maxStart));

  if (Math.abs(nextStart - clip.start) < 0.001) return clips;

  ordered[clipIndex] = { ...clip, start: Number(nextStart.toFixed(2)) };
  return ordered.sort((a, b) => a.start - b.start);
}