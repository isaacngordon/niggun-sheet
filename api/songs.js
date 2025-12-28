require('dotenv').config(); // Load environment variables
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const https = require('https');
const http = require('http');

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

// Fetch songs from Google Sheets API with timeout
async function fetchFromGoogleSheetsWithTimeout(timeoutMs = 8000) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Google Sheets API request timed out')), timeoutMs);
        // Unref the timeout so it doesn't keep the event loop alive
        if (timeoutId.unref) timeoutId.unref();
    });
    
    try {
        const result = await Promise.race([
            fetchFromGoogleSheets(),
            timeoutPromise
        ]);
        clearTimeout(timeoutId);
        console.log('[DEBUG] Timeout cleared after successful fetch');
        return result;
    } catch (error) {
        clearTimeout(timeoutId);
        console.log('[DEBUG] Timeout cleared after error');
        throw error;
    }
}

// Fetch songs from Google Sheets API
async function fetchFromGoogleSheets() {
    const startTime = Date.now();
    
    // Create fresh HTTP agents for this request that don't keep connections alive
    const httpAgent = new http.Agent({ keepAlive: false });
    const httpsAgent = new https.Agent({ keepAlive: false });
    
    try {
        console.log('[DEBUG] Starting Google Sheets API fetch...');
        console.log(`[DEBUG] Created fresh agents - keepAlive: false for both HTTP and HTTPS`);
        
        // Use direct HTTPS request instead of googleapis library for better control
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/${encodeURIComponent(SHEET_RANGE)}?key=${GOOGLE_API_KEY}`;
        console.log(`[DEBUG] Making direct HTTPS request at ${Date.now() - startTime}ms`);
        
        const response = await new Promise((resolve, reject) => {
            const req = https.get(url, { agent: httpsAgent, timeout: 7000 }, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    console.log(`[DEBUG] Response data received at ${Date.now() - startTime}ms`);
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch (e) {
                        reject(new Error('Failed to parse response: ' + e.message));
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timed out'));
            });
        });
        
        console.log(`[DEBUG] API response received at ${Date.now() - startTime}ms`);
        
        const rows = response.values;
        if (!rows || rows.length === 0) {
            throw new Error('No data found in Google Sheets');
        }
        
        console.log(`[DEBUG] Google Sheets API returned ${rows.length} total rows (including header)`);
        console.log(`[DEBUG] Starting data processing at ${Date.now() - startTime}ms`);
        
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
        
        console.log(`[DEBUG] Data processing complete at ${Date.now() - startTime}ms`);
        console.log(`[DEBUG] Successfully processed ${songs.length} songs from Google Sheets API`);
        console.log(`[DEBUG] Destroying HTTP agents...`);
        
        // Explicitly destroy agents to ensure connections are closed
        httpAgent.destroy();
        httpsAgent.destroy();
        
        console.log(`[DEBUG] HTTP agents destroyed at ${Date.now() - startTime}ms`);
        console.log(`[DEBUG] Total fetch time: ${Date.now() - startTime}ms`);
        
        return songs;
    } catch (error) {
        console.error(`[DEBUG] Error at ${Date.now() - startTime}ms:`, error);
        
        // Clean up agents on error
        try {
            console.log(`[DEBUG] Destroying agents after error...`);
            httpAgent.destroy();
            httpsAgent.destroy();
            console.log(`[DEBUG] Agents destroyed after error`);
        } catch (cleanupError) {
            console.error(`[DEBUG] Error destroying agents:`, cleanupError);
        }
        
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
}

// Main handler function with Google Sheets API integration
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

    console.log(`[DEBUG] Handling ${req.method} /api/songs from ${req.headers['x-forwarded-for'] || 'unknown'}`);

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
            if (GOOGLE_SHEETS_ID && !GOOGLE_SHEETS_ID.includes('YOUR_SHEET_ID') && 
                GOOGLE_API_KEY && !GOOGLE_API_KEY.includes('YOUR_API_KEY')) {
                console.log(`[DEBUG] Google Sheets credentials found, attempting to fetch data at ${Date.now() - handlerStartTime}ms`);
                
                const fetchStartTime = Date.now();
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
                console.log(`[DEBUG] Google Sheets API not configured, using local CSV at ${Date.now() - handlerStartTime}ms`);
                throw new Error('Google Sheets API not configured');
            }
        } catch (googleSheetsError) {
            console.log(`[DEBUG] Google Sheets API fetch failed at ${Date.now() - handlerStartTime}ms, falling back to local CSV:`, googleSheetsError.message);
            
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

// Export the handler directly for Vercel serverless
module.exports = handler;