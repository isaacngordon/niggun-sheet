const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { google } = require('googleapis');

const app = express();

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
const SHEET_RANGE = process.env.SHEET_RANGE || 'Sheet1!A:D';

// File paths
const songsFilePath = path.join(__dirname, '../data/songs.csv');

// Cache for songs data
let cachedSongs = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// CSV parser function
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const result = [];
    
    for (let i = 1; i < lines.length; i++) { // Skip header row
        const line = lines[i];
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
        
        // Add the last field
        fields.push(current.trim());
        
        // Only add rows with sufficient data
        if (fields.length >= 4) {
            // Clean up the fields by removing surrounding quotes
            result.push({
                id: fields[0].replace(/^"|"$/g, '') || '',
                title: fields[1].replace(/^"|"$/g, '') || '',
                composer: fields[2].replace(/^"|"$/g, '') || '',
                key: fields[3].replace(/^"|"$/g, '') || '',
                sheetMusic: fields[4] ? fields[4].replace(/^"|"$/g, '') : ''
            });
        }
    }
    
    return result;
}

// Function to fetch data from Google Sheets API
async function fetchFromGoogleSheets() {
    try {
        console.log('Attempting to fetch from Google Sheets API...');
        
        const sheets = google.sheets({ version: 'v4', auth: GOOGLE_API_KEY });
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEETS_ID,
            range: SHEET_RANGE,
        });
        
        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            throw new Error('No data found in Google Sheets');
        }
        
        const songs = [];
        // Skip header row (index 0)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length >= 4) { // Ensure we have at least the required fields
                
                songs.push({
                    id: row[0] || '',
                    title: row[1] || '',
                    composer: row[2] || '',
                    key: row[3] || '',
                    sheetMusic: row[4] || ''
                });
            }
        }
        
        console.log(`Successfully fetched ${songs.length} songs from Google Sheets API`);
        return songs;
    } catch (error) {
        console.error('Google Sheets API error:', error.message);
        throw error;
    }
}

// Function to read from local CSV file
function readLocalCSV() {
    return new Promise((resolve, reject) => {
        fs.readFile(songsFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading local CSV file:', err);
                reject(err);
            }
            
            try {
                const songs = parseCSV(data);
                console.log(`Loaded ${songs.length} songs from local CSV file`);
                resolve(songs);
            } catch (parseError) {
                console.error('Error parsing CSV:', parseError);
                reject(parseError);
            }
        });
    });
}

// Main handler function
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
