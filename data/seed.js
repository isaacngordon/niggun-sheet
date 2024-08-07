const fs = require('fs');
const csv = require('csv-parser');
const {runQuery, getRow} = require('./songs_db'); // Assume you have a configured SQLite connection


// Function to insert artist if not exists
async function insertArtist(artistName) {
    if (!artistName) return null;

    const artistId = await runQuery(
        `INSERT INTO artists (artist_name)
         SELECT ?
         WHERE NOT EXISTS (SELECT 1 FROM artists WHERE artist_name = ?)`,
        [artistName, artistName]
    );
    
    if (artistId) {
        return artistId;
    } else {
        const row = await getRow(
            `SELECT artist_id FROM artists WHERE artist_name = ?`,
            [artistName]
        );
        return row.artist_id;
    }
}

// Function to insert song if not exists
async function insertSong(songTitleEn, songTitleHe, artistId) {
    const songId = await runQuery(
        `INSERT INTO songs (song_title_en, song_title_he, artist_id)
         SELECT ?, ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM songs WHERE song_title_en = ? AND artist_id = ?)`,
        [songTitleEn, songTitleHe, artistId, songTitleEn, artistId]
    );
    
    if (songId) {
        return songId;
    } else {
        const row = await getRow(
            `SELECT song_id FROM songs WHERE song_title_en = ? AND artist_id = ?`,
            [songTitleEn, artistId]
        );
        return row.song_id;
    }
}

// Function to insert lyrics if not exists
async function insertLyrics(songId, lyricTextHe, lyricTextEn) { // Added lyricTextEn parameter
    await runQuery(
        `INSERT INTO lyrics (song_id, lyric_text_he, lyric_text_en) 
         SELECT ?, ?, ? 
         WHERE NOT EXISTS (SELECT 1 FROM lyrics WHERE song_id = ? AND lyric_text_he = ?)`,
        [songId, lyricTextHe, lyricTextEn, songId, lyricTextHe]
    );
}

// Function to insert link if not exists
async function insertLink(songId, linkUrl, linkType) {
    if (!linkUrl) return;

    await runQuery(
        `INSERT INTO links (link_url, song_id, link_type)
         SELECT ?, ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM links WHERE link_url = ? AND song_id = ?)`,
        [linkUrl, songId, linkType, linkUrl, songId]
    );
}

// Function to check if the database is already populated
async function database_is_populated() {
    const row = await getRow(
        `SELECT COUNT(*) as count FROM songs`
    );
    console.log("Database is populated: ", row['count'] > 0);
    return row['count'] > 0;
}

// Main function to process CSV and insert data
async function insertDataFromCSV(csvFilePath) {
    if (!csvFilePath) {
        console.error('Please provide a path to the CSV file');
        return;
    }

    if(await database_is_populated()) {
        console.log('Database is already populated');
        return;
    }

    const rows = [];

    // Load the CSV into memory first to handle all rows asynchronously
    await new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => rows.push(row))
            .on('end', resolve)
            .on('error', reject);
    });

    // Process each row
    for (const row of rows) {
        const artistName = row['artist'];
        const songTitleEn = row['Title'];
        const songTitleHe = row['Search title'];
        const lyricTextHe = row['lyrics'];
        const lyricTextEn = row['English Lyrics']; // Assuming you have this column in the CSV
        const youtubeLink = row['youtube link'];
        const googleDriveLink = row['google drive'];

        try {
            const artistId = await insertArtist(artistName).catch(err => {
                console.error('Error inserting artist:', err); 
            });
            
            console.log('artistId:', artistId);
            const songId = await insertSong(songTitleEn, songTitleHe, artistId).catch(err => {
                console.error('Error inserting song:', err);
            });
            console.log('songId:', songId);
            await insertLyrics(songId, lyricTextHe, lyricTextEn).catch(err => {
                console.error('Error inserting lyrics:', err);
            });

            await insertLink(songId, youtubeLink, 'youtube').catch(err => {
                console.error('Error inserting YouTube link:', err);
            });
            await insertLink(songId, googleDriveLink, 'gdrive').catch(err => {
                console.error('Error inserting Google Drive link:', err);
            });
        } catch (err) {
            console.error('Error processing row:', err);
        }
    }

    console.log('CSV file successfully processed');
}

// Call the main function with the path to the CSV file passed as a command line argument
insertDataFromCSV(process.argv[2]);