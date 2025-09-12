require('dotenv').config(); // Load environment variables
const express = require('express');
const app = express();
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Google Sheets API configuration
const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID || 'YOUR_SHEET_ID';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'YOUR_API_KEY';
const SHEET_RANGE = process.env.SHEET_RANGE || 'Sheet1!A:F'; // Adjust range as needed

// Fallback to local CSV file
const songsFilePath = path.join(__dirname, '../data/songs.csv');

// Cache configuration
let cachedSongs = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Enhanced CSV parsing function that handles quoted fields properly
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const result = [];
    
    for (let i = 1; i < lines.length; i++) { // Skip header row
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const fields = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                fields.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // Don't forget the last field
        fields.push(current.trim());
        
        // Ensure we have all expected fields
        if (fields.length >= 4) {
            const [search_title, title, lyrics, artist, drive = '', youtube = ''] = fields;
            result.push({
                search_title: search_title.replace(/"/g, ''),
                title: title.replace(/"/g, ''),
                lyrics: lyrics.replace(/"/g, ''),
                artist: artist.replace(/"/g, ''),
                drive: drive.replace(/"/g, ''),
                youtube: youtube.replace(/"/g, '')
            });
        }
    }
    
    return result;
}

// Fetch songs from Google Sheets API
async function fetchFromGoogleSheets() {
    try {
        console.log('Fetching songs from Google Sheets API...');
        
        // Initialize the Google Sheets API
        const sheets = google.sheets({ version: 'v4', auth: GOOGLE_API_KEY });
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEETS_ID,
            range: SHEET_RANGE,
        });
        
        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            throw new Error('No data found in Google Sheets');
        }
        
        // Convert rows to song objects (skip header row)
        const songs = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length >= 4) { // Ensure we have at least the required fields
                const [search_title = '', title = '', lyrics = '', artist = '', drive = '', youtube = ''] = row;
                songs.push({
                    search_title: search_title.trim(),
                    title: title.trim(),
                    lyrics: lyrics.trim(),
                    artist: artist.trim(),
                    drive: drive.trim(),
                    youtube: youtube.trim()
                });
            }
        }
        
        console.log(`Successfully fetched ${songs.length} songs from Google Sheets API`);
        return songs;
    } catch (error) {
        console.error('Error fetching from Google Sheets API:', error);
        throw error;
    }
}

// Fallback to local CSV file
function readLocalCSV() {
    return new Promise((resolve, reject) => {
        fs.readFile(songsFilePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            
            try {
                const songs = parseCSV(data);
                console.log(`Loaded ${songs.length} songs from local CSV file`);
                resolve(songs);
            } catch (parseError) {
                reject(parseError);
            }
        });
    });
// Main handler function with Google Sheets API integration
async function handler(req, res) {
    // Add CORS headers for local development
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }

    console.log(`Handling GET /api/songs from ${req.ip || req.connection.remoteAddress}`);

    try {
        // Check cache first
        const now = Date.now();
        if (cachedSongs && (now - cacheTimestamp) < CACHE_DURATION) {
            console.log('Returning cached songs data');
            res.json(cachedSongs);
            return;
        }

        let songs;
        
        // Try to fetch from Google Sheets API first
        try {
            if (GOOGLE_SHEETS_ID && !GOOGLE_SHEETS_ID.includes('YOUR_SHEET_ID') && 
                GOOGLE_API_KEY && !GOOGLE_API_KEY.includes('YOUR_API_KEY')) {
                songs = await fetchFromGoogleSheets();
                
                // Update cache
                cachedSongs = songs;
                cacheTimestamp = now;
                
                res.json(songs);
                return;
            } else {
                console.log('Google Sheets API not configured, using local CSV');
                throw new Error('Google Sheets API not configured');
            }
        } catch (googleSheetsError) {
            console.log('Google Sheets API fetch failed, falling back to local CSV:', googleSheetsError.message);
            
            // Fallback to local CSV
            songs = await readLocalCSV();
            
            // Update cache with local data
            cachedSongs = songs;
            cacheTimestamp = now;
            
            res.json(songs);
        }
        
    } catch (error) {
        console.error('Error loading songs:', error);
        res.status(500).json({ 
            error: 'Internal Server Error',
            message: 'Unable to load songs from any source'
        });
    }
}

app.get('/api/songs', handler);

// Export both the handler function and the app
module.exports = app;
module.exports.handler = handler;
module.exports.handler = handler;