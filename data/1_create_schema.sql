-- Create the 'artists' table
CREATE TABLE artists (
    artist_id INTEGER PRIMARY KEY AUTOINCREMENT,
    artist_name TEXT NOT NULL
);

-- Create the 'songs' table
CREATE TABLE songs (
    song_id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_title_en TEXT NOT NULL,
    song_title_he TEXT,
    artist_id INTEGER,
    FOREIGN KEY (artist_id) REFERENCES artists (artist_id)
);

-- Create the 'lyrics' table
CREATE TABLE lyrics (
    lyric_id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER,
    lyric_text_he TEXT NOT NULL,
    lyric_text_en TEXT,
    FOREIGN KEY (song_id) REFERENCES songs (song_id)
);

-- Create the 'contributors' table
CREATE TABLE contributors (
    contributor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    contributor_name TEXT NOT NULL,
    contributor_email TEXT NOT NULL UNIQUE
);

-- Create the 'lyrics_contributions' table
CREATE TABLE lyrics_contributions (
    contribution_id INTEGER,
    lyric_id INTEGER,
    FOREIGN KEY (contribution_id) REFERENCES contributions (contribution_id),
    FOREIGN KEY (lyric_id) REFERENCES lyrics (lyric_id),
    UNIQUE (contribution_id, lyric_id)  -- Allows more than one contributor to contribute to the same lyric, but only once per contributor
);

-- Create the 'playlists' table
CREATE TABLE playlists (
    playlist_id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_name TEXT NOT NULL,
    contributor_id INTEGER not null
);

-- Create the 'playlist_songs' table
CREATE TABLE playlist_songs (
    playlist_id INTEGER not null,
    song_id INTEGER not null,
    FOREIGN KEY (playlist_id) REFERENCES playlists (playlist_id),
    FOREIGN KEY (song_id) REFERENCES songs (song_id),
    FOREIGN KEY (contributor_id) REFERENCES contributors (contributor_id)
    UNIQUE (playlist_id, song_id)
);