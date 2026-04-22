import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TIMINGS_PATH = path.join(process.cwd(), 'data', 'timings.json');

interface StoredTimingClip {
  verseIndex: number;
  start: number;
}

interface TimingBounds {
  inPoint: number | null;
  outPoint: number | null;
}

interface ClipTimingEntry {
  version: 2 | 3;
  clips: StoredTimingClip[];
  inPoint?: number | null;
  outPoint?: number | null;
  useClipEdgeBounds?: boolean;
}

type TimingEntry = number[] | ClipTimingEntry;

function readTimings(): Record<string, TimingEntry> {
  try {
    const raw = fs.readFileSync(TIMINGS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function sanitizeClips(clips: unknown): StoredTimingClip[] {
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

function sanitizeBoundaryPoint(point: unknown): number | null {
  if (typeof point !== 'number' || !Number.isFinite(point) || point < 0) {
    return null;
  }

  return Number(point.toFixed(2));
}

function sanitizeBounds(inPoint: unknown, outPoint: unknown): TimingBounds {
  const nextInPoint = sanitizeBoundaryPoint(inPoint);
  let nextOutPoint = sanitizeBoundaryPoint(outPoint);

  if (nextInPoint != null && nextOutPoint != null && nextOutPoint <= nextInPoint) {
    nextOutPoint = null;
  }

  return {
    inPoint: nextInPoint,
    outPoint: nextOutPoint,
  };
}

function sanitizeUseClipEdgeBounds(value: unknown): boolean {
  return typeof value === 'boolean' ? value : true;
}

function timestampsToClips(timestamps: number[]): StoredTimingClip[] {
  return timestamps
    .map((start, verseIndex) => ({ verseIndex, start }))
    .filter((clip) => Number.isFinite(clip.start) && clip.start >= 0)
    .sort((a, b) => a.start - b.start);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const all = readTimings();
  if (slug) {
    const entry = all[slug];
    if (!entry) {
      return NextResponse.json({ timestamps: null, clips: null, version: null });
    }

    if (Array.isArray(entry)) {
      return NextResponse.json({
        timestamps: entry,
        clips: timestampsToClips(entry),
        inPoint: null,
        outPoint: null,
        useClipEdgeBounds: true,
        version: 1,
      });
    }

    const clips = sanitizeClips(entry.clips);
    const bounds = sanitizeBounds(entry.inPoint, entry.outPoint);
    const useClipEdgeBounds = sanitizeUseClipEdgeBounds(entry.useClipEdgeBounds);
    return NextResponse.json({
      timestamps: null,
      clips,
      inPoint: bounds.inPoint,
      outPoint: bounds.outPoint,
      useClipEdgeBounds,
      version: entry.version ?? (bounds.inPoint != null || bounds.outPoint != null ? 3 : 2),
    });
  }
  return NextResponse.json(all);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { slug, timestamps, clips, inPoint, outPoint, useClipEdgeBounds } = body as {
    slug: string;
    timestamps?: number[];
    clips?: StoredTimingClip[];
    inPoint?: number | null;
    outPoint?: number | null;
    useClipEdgeBounds?: boolean;
  };

  if (!slug) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const all = readTimings();
  const bounds = sanitizeBounds(inPoint, outPoint);
  const useClipBounds = sanitizeUseClipEdgeBounds(useClipEdgeBounds);

  if (Array.isArray(clips)) {
    const sanitizedClips = sanitizeClips(clips);
    if (sanitizedClips.length === 0 && bounds.inPoint == null && bounds.outPoint == null) {
      delete all[slug];
    } else {
      all[slug] = {
        version: bounds.inPoint != null || bounds.outPoint != null ? 3 : 2,
        clips: sanitizedClips,
        inPoint: bounds.inPoint,
        outPoint: bounds.outPoint,
        useClipEdgeBounds: useClipBounds,
      };
    }
  } else if (Array.isArray(timestamps)) {
    if (timestamps.length === 0) {
      delete all[slug];
    } else {
      all[slug] = timestamps;
    }
  } else {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (Array.isArray(clips) && clips.length === 0 && bounds.inPoint == null && bounds.outPoint == null) {
    delete all[slug];
  }

  fs.writeFileSync(TIMINGS_PATH, JSON.stringify(all, null, 2));
  return NextResponse.json({ ok: true });
}
