import { NextResponse } from 'next/server';
import { getSongs } from './data';

export async function GET() {
  try {
    const songs = await getSongs();
    return NextResponse.json(songs);
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Unable to load songs from any source' },
      { status: 500 }
    );
  }
}
