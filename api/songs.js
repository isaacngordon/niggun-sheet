require('dotenv').config(); // Load environment variables
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const csv = require('csv-parser');

// Google Sheets API configuration
const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID || 'YOUR_SHEET_ID';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'YOUR_API_KEY';
const SHEET_RANGE = process.env.SHEET_RANGE || 'Sheet1!A:F1000'; // Adjust range as needed

// Fallback to local CSV file
const songsFilePath = path.join(__dirname, '../data/songs.csv');

// Cache configuration
let cachedSongs = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

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
        
        console.log(`Google Sheets API returned ${rows.length} total rows (including header)`);
        
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
        
        console.log(`Successfully processed ${songs.length} songs from Google Sheets API`);
        return songs;
    } catch (error) {
        console.error('Error fetching from Google Sheets API:', error);
        throw error;
    }
}

// Fallback to local CSV file using csv-parser library
function readLocalCSV() {
    return new Promise((resolve, reject) => {
        const songs = [];
        
        fs.createReadStream(songsFilePath)
            .pipe(csv())
            .on('data', (row) => {
                // Map CSV columns to song object
                songs.push({
                    search_title: (row['Search title'] || '').trim(),
                    title: (row['Title'] || '').trim(),
                    lyrics: (row['lyrics'] || '').trim(),
                    artist: (row['artist'] || '').trim(),
                    drive: (row['google drive'] || '').trim(),
                    youtube: (row['youtube link'] || '').trim()
                });
            })
            .on('end', () => {
                console.log(`Loaded ${songs.length} songs from local CSV file`);
                resolve(songs);
            })
            .on('error', (error) => {
                console.error('Error reading CSV file:', error);
                reject(error);
            });
    });
}

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

    console.log(`Handling ${req.method} /api/songs from ${req.ip || req.connection.remoteAddress}`);

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
                console.log('Google Sheets credentials found, attempting to fetch data...');
                songs = await fetchFromGoogleSheets();
                
                // Update cache
                cachedSongs = songs;
                cacheTimestamp = now;
                
                console.log(`✅ Successfully returned ${songs.length} songs from Google Sheets`);
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

// Register routes
// Note: Both routes are needed for compatibility:
// - '/' is used by Vercel when the file is accessed directly as a serverless function
// - '/api/songs' is used by the local Express server in server.js
app.get('/', handler);
app.get('/api/songs', handler);

// Export for both local Express and Vercel serverless
// When deployed to Vercel (VERCEL env var is set), wrap with serverless-http
// When running locally, export as Express app for use in server.js
if (process.env.VERCEL) {
    module.exports = serverless(app);
} else {
    module.exports = app;
}