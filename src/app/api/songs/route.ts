import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const songsFilePath = path.join(process.cwd(), 'express_app/data/songs.csv');

export async function GET(req: NextRequest) {
    try {
        const data = await fs.promises.readFile(songsFilePath, 'utf8');
        const songs = data.split(/\r?\n(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((line, i) => {
            if (i === 0) return;
            if (!line) return;
            const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
            const [search_title, title, lyrics, artist, drive, youtube] = line.split(regex).map(cell => cell.replace(/"/g, ''));
            return { search_title, title, lyrics, artist, drive, youtube };
        });

        return NextResponse.json(songs[0] == null ? songs.slice(1) : songs);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
