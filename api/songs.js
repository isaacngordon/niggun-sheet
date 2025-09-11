const express = require('express');
const app = express();
const router = express.Router();
const fs = require('fs');
const path = require('path');

const songsFilePath = path.join(__dirname, '../data/songs.csv');

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

// obtains the song data from the csv file
function handler(req, res) {
    // Add CORS headers for local development
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }

    //log request 
    console.log(`Handling GET /api/songs from ${req.ip || req.connection.remoteAddress}`);

    fs.readFile(songsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading songs CSV file:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        try {
            // Use enhanced CSV parsing
            const songs = parseCSV(data);
            console.log(`Successfully parsed ${songs.length} songs from CSV`);
            res.json(songs);
        } catch (parseError) {
            console.error('Error parsing CSV data:', parseError);
            res.status(500).json({ error: 'Error parsing song data' });
        }
    });
}

app.get('/api/songs', handler);

// Export both the handler function and the app
module.exports = app;
module.exports.handler = handler;