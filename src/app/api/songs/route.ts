import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const songsFilePath = path.join(process.cwd(), 'express_app/data/songs.csv');

export function GET(req: NextApiRequest, res: NextApiResponse) {
    console.log(`Handling GET /api/songs ${req.query} `);

    fs.readFile(songsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        const songs = data.split(/\r?\n(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((line, i) => {
            if (i === 0) return;
            if (!line) return;
            const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
            const [search_title, title, lyrics, artist, drive, youtube] = line.split(regex).map(cell => cell.replace(/"/g, ''));
            return { search_title, title, lyrics, artist, drive, youtube };
        });

        res.json(songs[0] == null ? songs.slice(1) : songs);
    });
}
