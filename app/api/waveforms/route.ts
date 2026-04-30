import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

const WAVEFORMS_FILE = path.join(process.cwd(), 'data', 'waveforms.json');

export async function GET() {
  try {
    if (!fs.existsSync(WAVEFORMS_FILE)) {
      return NextResponse.json({});
    }

    const raw = fs.readFileSync(WAVEFORMS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed && typeof parsed === 'object' ? parsed : {});
  } catch {
    return NextResponse.json({}, { status: 200 });
  }
}