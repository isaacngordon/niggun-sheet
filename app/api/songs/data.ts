import fs from 'fs';
import path from 'path';
import https from 'https';

const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID || 'YOUR_SHEET_ID';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'YOUR_API_KEY';
const SHEET_RANGE = process.env.SHEET_RANGE || 'Sheet1!A:G1000';

let cachedSongs: Song[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;
const GOOGLE_SHEETS_TIMEOUT_MS = 4000;

export interface Song {
  search_title: string;
  title: string;
  lyrics: string;
  artist: string;
  drive: string;
  youtube: string;
  audio: string;
}

export function cleanText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/\r\n?/g, '\n')
    .replace(/\uFFFD/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

function parseCSVRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index++) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index++;
      }
      row.push(cell.trim());
      cell = '';

      if (row.some((field) => field !== '')) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((field) => field !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

export function parseCSV(csvText: string): Song[] {
  const rows = parseCSVRows(csvText);
  const result: Song[] = [];

  for (let i = 1; i < rows.length; i++) {
    const fields = rows[i];
    if (fields.length >= 4) {
      const [search_title, title, lyrics, artist, drive = '', youtube = '', audio = ''] = fields;
      result.push({
        search_title,
        title,
        lyrics,
        artist,
        drive,
        youtube,
        audio,
      });
    }
  }

  return result;
}

function fetchFromGoogleSheets(): Promise<Song[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/${encodeURIComponent(SHEET_RANGE)}?key=${GOOGLE_API_KEY}`;

  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 7000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const rows = parsed.values;
          if (!rows || rows.length === 0) {
            reject(new Error('No data found in Google Sheets'));
            return;
          }
          const songs: Song[] = [];
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length >= 4) {
              const [search_title = '', title = '', lyrics = '', artist = '', drive = '', youtube = '', audio = ''] = row;
              songs.push({
                search_title: cleanText(search_title),
                title: cleanText(title),
                lyrics: cleanText(lyrics),
                artist: cleanText(artist),
                drive: drive.trim(),
                youtube: youtube.trim(),
                audio: audio.trim(),
              });
            }
          }
          resolve(songs);
        } catch {
          reject(new Error('Failed to parse response'));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function readLocalCSV(): Song[] {
  const songsFilePath = path.join(process.cwd(), 'data/songs.csv');
  const data = fs.readFileSync(songsFilePath, 'utf8');
  return parseCSV(data);
}

export async function getSongs(): Promise<Song[]> {
  const now = Date.now();
  if (cachedSongs && now - cacheTimestamp < CACHE_DURATION) {
    return cachedSongs;
  }

  try {
    if (GOOGLE_SHEETS_ID && !GOOGLE_SHEETS_ID.includes('YOUR_SHEET_ID') &&
        GOOGLE_API_KEY && !GOOGLE_API_KEY.includes('YOUR_API_KEY')) {
      const songs = await withTimeout(
        fetchFromGoogleSheets(),
        GOOGLE_SHEETS_TIMEOUT_MS,
        'Google Sheets request timed out',
      );
      cachedSongs = songs;
      cacheTimestamp = now;
      return songs;
    }
    throw new Error('Google Sheets API not configured');
  } catch {
    const songs = readLocalCSV();
    cachedSongs = songs;
    cacheTimestamp = now;
    return songs;
  }
}
