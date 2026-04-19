import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TIMINGS_PATH = path.join(process.cwd(), 'data', 'timings.json');

function readTimings(): Record<string, number[]> {
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
  const all = readTimings();
  if (slug) {
    return NextResponse.json({ timestamps: all[slug] || null });
  }
  return NextResponse.json(all);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { slug, timestamps } = body as { slug: string; timestamps: number[] };
  if (!slug || !Array.isArray(timestamps)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const all = readTimings();
  if (timestamps.length === 0) {
    delete all[slug];
  } else {
    all[slug] = timestamps;
  }
  fs.writeFileSync(TIMINGS_PATH, JSON.stringify(all, null, 2));
  return NextResponse.json({ ok: true });
}
