require('dotenv').config(); // Load environment variables
<<<<<<< HEAD
=======
const express = require('express');
const app = express();
>>>>>>> 1c8a375 (Refactor app export for Vercel serverless compatibility)
const fs = require('fs');
const path = require('path');
const https = require('https');

// Google Sheets API configuration
const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SHEET_RANGE = process.env.SHEET_RANGE || 'Sheet1!A:F';

// Log configuration status (without exposing sensitive data)
console.log('========================================');
console.log('Environment:', process.env.VERCEL ? 'VERCEL PRODUCTION' : 'LOCAL DEVELOPMENT');
console.log('Google Sheets Config Status:');
console.log('- GOOGLE_SHEETS_ID:', GOOGLE_SHEETS_ID ? `✅ Set (${GOOGLE_SHEETS_ID.substring(0, 8)}...)` : '❌ NOT SET');
console.log('- GOOGLE_API_KEY:', GOOGLE_API_KEY ? `✅ Set (${GOOGLE_API_KEY.substring(0, 8)}...)` : '❌ NOT SET');
console.log('- SHEET_RANGE:', SHEET_RANGE);

if (process.env.VERCEL && (!GOOGLE_SHEETS_ID || !GOOGLE_API_KEY)) {
    console.log('⚠️ WARNING: Running on Vercel but environment variables are missing!');
    console.log('Please add GOOGLE_SHEETS_ID and GOOGLE_API_KEY in Vercel Dashboard > Settings > Environment Variables');
}
console.log('========================================');

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

// Fetch songs from Google Sheets API using direct HTTP request
async function fetchFromGoogleSheets() {
    return new Promise((resolve, reject) => {
        console.log('Fetching songs from Google Sheets API...');
        
        if (!GOOGLE_SHEETS_ID || !GOOGLE_API_KEY) {
            reject(new Error(`Missing credentials - Sheet ID: ${!!GOOGLE_SHEETS_ID}, API Key: ${!!GOOGLE_API_KEY}`));
            return;
        }
        
        // Use the direct API URL that we know works
        const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/${encodeURIComponent(SHEET_RANGE)}?key=${GOOGLE_API_KEY}`;
        console.log('Fetching from URL (key hidden):', apiUrl.replace(GOOGLE_API_KEY, 'API_KEY_HIDDEN'));
        
        https.get(apiUrl, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode !== 200) {
                        console.error(`API returned status ${res.statusCode}`);
                        console.error('Response:', data);
                        reject(new Error(`Google Sheets API returned status ${res.statusCode}`));
                        return;
                    }
                    
                    const response = JSON.parse(data);
                    const rows = response.values;
                    
                    if (!rows || rows.length === 0) {
                        reject(new Error('No data found in Google Sheets'));
                        return;
                    }
                    
                    console.log(`Google Sheets API returned ${rows.length} total rows (including header)`);
                    
                    // Convert rows to song objects (skip header row)
                    const songs = [];
                    for (let i = 1; i < rows.length; i++) {
                        const row = rows[i];
                        if (row && row.length >= 4) { // Ensure we have at least the required fields
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
                    resolve(songs);
                } catch (error) {
                    console.error('Error parsing API response:', error);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.error('Network error fetching from Google Sheets API:', error);
            reject(error);
        });
    });
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
}

// Main handler function for Vercel
async function handler(req, res) {
    const handlerStartTime = Date.now();
    console.log(`[DEBUG] ========== Handler started at ${new Date().toISOString()} ==========`);
    
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        console.log(`[DEBUG] OPTIONS request handled at ${Date.now() - handlerStartTime}ms`);
        res.status(200).end();
        return;
    }

    console.log(`Handling ${req.method} /api/songs`);

    try {
        // Check cache first
        const now = Date.now();
        if (cachedSongs && (now - cacheTimestamp) < CACHE_DURATION) {
            console.log(`[DEBUG] Returning cached songs data at ${Date.now() - handlerStartTime}ms`);
            console.log(`[DEBUG] Cache age: ${Math.floor((now - cacheTimestamp) / 1000)}s`);
            res.status(200).json(cachedSongs);
            console.log(`[DEBUG] Response sent at ${Date.now() - handlerStartTime}ms`);
            console.log(`[DEBUG] ========== Handler completed (cached) at ${Date.now() - handlerStartTime}ms ==========`);
            return;
        }

        console.log(`[DEBUG] Cache miss or expired, fetching fresh data at ${Date.now() - handlerStartTime}ms`);
        let songs;
        
        // Try to fetch from Google Sheets API first
        try {
            if (GOOGLE_SHEETS_ID && GOOGLE_API_KEY) {
                console.log('Google Sheets credentials found, attempting to fetch data...');
                songs = await fetchFromGoogleSheetsWithTimeout(8000);
                console.log(`[DEBUG] Fetch completed in ${Date.now() - fetchStartTime}ms`);
                
                // Update cache
                cachedSongs = songs;
                cacheTimestamp = now;
                
                console.log(`[DEBUG] Cache updated at ${Date.now() - handlerStartTime}ms`);
                console.log(`[DEBUG] Preparing response with ${songs.length} songs`);
                
                res.status(200).json(songs);
                
                console.log(`[DEBUG] ✅ Response sent at ${Date.now() - handlerStartTime}ms`);
                console.log(`[DEBUG] ========== Handler completed (success) at ${Date.now() - handlerStartTime}ms ==========`);
                return;
            } else {
                console.log('Missing Google Sheets configuration:');
                console.log('- GOOGLE_SHEETS_ID:', GOOGLE_SHEETS_ID ? 'Set' : 'Missing');
                console.log('- GOOGLE_API_KEY:', GOOGLE_API_KEY ? 'Set' : 'Missing');
                throw new Error('Google Sheets API not configured');
            }
        } catch (googleSheetsError) {
            console.log('Google Sheets API fetch failed:', googleSheetsError.message);
            
            // Fallback to local CSV
            songs = await readLocalCSV();
            
            // Update cache with local data
            cachedSongs = songs;
            cacheTimestamp = now;
            
            console.log(`[DEBUG] Fallback CSV loaded, sending response at ${Date.now() - handlerStartTime}ms`);
            res.status(200).json(songs);
            console.log(`[DEBUG] ========== Handler completed (fallback) at ${Date.now() - handlerStartTime}ms ==========`);
            return;
        }
        
    } catch (error) {
        console.error(`[DEBUG] Fatal error at ${Date.now() - handlerStartTime}ms:`, error);
        res.status(500).json({ 
            error: 'Internal Server Error',
            message: 'Unable to load songs from any source'
        });
        console.log(`[DEBUG] ========== Handler completed (error) at ${Date.now() - handlerStartTime}ms ==========`);
        return;
    }
}

<<<<<<< HEAD
// Export for Vercel
module.exports = handler;

// For local development with Express
module.exports.expressRouter = function() {
    const express = require('express');
    const router = express.Router();
    router.get('/', handler);
    return router;
};
=======
// For Vercel serverless deployment
app.get('/', handler);
app.get('/api/songs', handler);

// Export for both local Express and Vercel serverless
if (process.env.VERCEL) {
    const serverless = require('serverless-http');
    module.exports = serverless(app);
} else {
    module.exports = app;
}
>>>>>>> 1c8a375 (Refactor app export for Vercel serverless compatibility)
