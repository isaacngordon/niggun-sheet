const express = require('express');
const app = express();
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../data/songs_db');

const songsFilePath = path.join(__dirname, '../data/songs.csv');

function csv_handler(req, res) {
    //log request 
    console.log(`Handling GET /songs ${req.query} from ${req.ip}`);

    fs.readFile(songsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal Server Error' });
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

function get_all_songs_handler(req, res) {
    //log request 
    console.log(`Handling GET /songs ${req.query} from ${req.ip}`);

    const stmt = fs.readFileSync(path.join(__dirname, '../data/sql/get_all_songs.sql'), 'utf-8');

    db.all(stmt, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        res.json(rows);
    });

}

app.get('/api/songs', (req, res) => {
    return csv_handler(req, res);
});


module.exports = app;