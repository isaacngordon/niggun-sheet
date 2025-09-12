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

        // Parse the CSV data and convert it to JSON
        const songs = data.split(/\r?\n(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((line, i) => {
            // Skip the first line (headers)
            if (i === 0) return;
            // Skip the last line (if empty)
            if (!line) return;
            const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
            const [search_title, title, lyrics, artist, drive, youtube] = line.split(regex).map(cell => cell.replace(/"/g, ''));
            return {search_title,  title, lyrics, artist, drive, youtube };
        });

        // remove the first element in the array if it is null otherwise return the array
        console.log(songs[0] == null ? songs.slice(1) : songs);
        res.json(songs[0] == null ? songs.slice(1) : songs);
    });
}

app.get('/', handler);

// Export the handler function for direct use and the app for Vercel
module.exports = handler;
module.exports.app = app;