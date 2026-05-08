import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  createClipTimingEntry,
  resolveStoredTimingData,
  sanitizeSourceLabels,
  sanitizeClips,
  timestampsToClips,
  type TimingEntry,
  upsertTimingSourceEntry,
} from '@/lib/timings';

const TIMINGS_PATH = path.join(process.cwd(), 'data', 'timings.json');

function readTimings(): Record<string, TimingEntry> {
  try {
    const raw = fs.readFileSync(TIMINGS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const source = searchParams.get('source');
  const fallbackSource = searchParams.get('fallbackSource');
  const all = readTimings();
  if (slug) {
    const entry = all[slug];
    const timingData = resolveStoredTimingData(entry, source, fallbackSource);
    if (!timingData) {
      return NextResponse.json({ timestamps: null, clips: null, version: null });
    }
    return NextResponse.json({
      timestamps: null,
      clips: timingData.clips,
      inPoint: timingData.inPoint,
      outPoint: timingData.outPoint,
      useClipEdgeBounds: timingData.useClipEdgeBounds,
      sourceLabels: timingData.sourceLabels,
      version: 4,
    });
  }
  return NextResponse.json(all);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { slug, source, fallbackSource, timestamps, clips, inPoint, outPoint, useClipEdgeBounds } = body as {
    slug: string;
    source?: string;
    fallbackSource?: string | null;
    timestamps?: number[];
    clips?: Array<{ verseIndex: number; start: number }>;
    inPoint?: number | null;
    outPoint?: number | null;
    useClipEdgeBounds?: boolean;
    sourceLabels?: Record<string, string>;
  };

  if (!slug) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const all = readTimings();
  const nextSourceLabels = sanitizeSourceLabels(body.sourceLabels);
  let nextSourceEntry = null;
  let nextLegacyEntry: TimingEntry | null = null;

  if (Array.isArray(clips)) {
    nextSourceEntry = createClipTimingEntry({
      clips: sanitizeClips(clips),
      inPoint: inPoint ?? null,
      outPoint: outPoint ?? null,
      useClipEdgeBounds: typeof useClipEdgeBounds === 'boolean' ? useClipEdgeBounds : true,
    });
  } else if (Array.isArray(timestamps)) {
    if (source) {
      nextSourceEntry = createClipTimingEntry({
        clips: timestampsToClips(timestamps),
        inPoint: null,
        outPoint: null,
        useClipEdgeBounds: true,
      });
    } else {
      nextLegacyEntry = timestamps.length > 0 ? timestamps : null;
    }
  } else {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (source) {
    const nextEntry = upsertTimingSourceEntry(all[slug], source, fallbackSource, nextSourceEntry, nextSourceLabels);
    if (nextEntry) {
      all[slug] = nextEntry;
    } else {
      delete all[slug];
    }
  } else if (nextLegacyEntry) {
    all[slug] = nextLegacyEntry;
  } else if (nextSourceEntry) {
    all[slug] = nextSourceEntry;
  } else {
    delete all[slug];
  }

  fs.writeFileSync(TIMINGS_PATH, JSON.stringify(all, null, 2));
  return NextResponse.json({ ok: true });
}
