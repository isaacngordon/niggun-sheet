import { readFile } from 'fs/promises';
import { resolve } from 'path';

const songsFilePath = resolve('data/songs.csv');

export default defineEventHandler(async (event) => {
  // Log request
  const query = getQuery(event);
  console.log(`Handling GET /api/songs ${JSON.stringify(query)} from ${event.node.req.socket.remoteAddress}`);

  try {
    const data = await readFile(songsFilePath, 'utf8');

    // Parse the CSV data and convert it to JSON
    const songs = data.split(/\r?\n(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((line, i) => {
      // Skip the first line (headers)
      if (i === 0) return;
      // Skip the last line (if empty)
      if (!line) return;
      const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
      const [search_title, title, lyrics, artist, drive, youtube] = line.split(regex).map(cell => cell.replace(/"/g, ''));
      return { search_title, title, lyrics, artist, drive, youtube };
    }).filter(Boolean); // Filter out undefined values

    // Log and return the songs
    console.log(songs);
    return songs;
  } catch (err) {
    console.error(err);
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' });
  }
});
