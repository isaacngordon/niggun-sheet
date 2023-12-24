const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const songsFilePath = path.join(__dirname, '../data/songs.csv');

router.get('/', (req, res) => {
    //log request 
    console.log(`Handling GET /songs ${req.query} from ${req.ip}`);

    fs.readFile(songsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Parse the CSV data and convert it to JSON
        const songs = data.split('\n').map((line) => {
            console.log(line);
            const [title, lyrics, artist] = line.split(',');
            return { title, lyrics, artist };
        });

        res.json(songs);
    });
});


module.exports = router;
