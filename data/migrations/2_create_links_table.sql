CREATE TABLE Links (
    link_id INTEGER PRIMARY KEY, -- Primary Key
    song_id INTEGER NOT NULL, -- Foreign Key referencing songs.song_id
    link_type TEXT NOT NULL CHECK (link_type IN ('youtube', 'gdrive', 'spotify')), -- Enum for link types
    link_url TEXT NOT NULL, -- URL for the link
    FOREIGN KEY (song_id) REFERENCES songs(song_id) -- Foreign Key constraint
);