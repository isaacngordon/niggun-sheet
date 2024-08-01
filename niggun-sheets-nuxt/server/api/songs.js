import { readFile } from 'fs/promises';
import { resolve } from 'path';
import Papa from 'papaparse';

const songsFilePath = resolve('server/data/songs.csv');

export default defineEventHandler(async (event) => {
  // Log request
  const query = getQuery(event);
  try {
    const data = await readFile(songsFilePath, 'utf8');
    // Parse the CSV data and convert it to JSON
    const parsed = Papa.parse(data, {
        header: true,
        skipEmptyLines: true,
    });
    
    if (parsed.errors.length) {
          console.error(parsed.errors);
          throw createError({ statusCode: 500, statusMessage: 'Error parsing CSV file' });
        }
        
        const songs = parsed.data.map(({ 'Search title': search_title, Title: title, lyrics, artist, 'google drive': drive, 'youtube link': youtube }) => ({
          search_title,
              title,
              lyrics,
              artist,
              drive,
              youtube,
            }));

    // Log and return the songs
    return songs;
  } catch (err) {
    console.error(err);
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' });
  }
});
