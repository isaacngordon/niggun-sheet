<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Song Details</title>
    <link rel="stylesheet" href="css/main.css">
</head>
<body>
    <div id="navbar">
        <a href="/">Home Page</a>
        <a href="/songs.html">Song Directory</a>
    </div>

    <div id="song-details">
        <h2>Song Details</h2>
        <div id="details-container">
            <p><strong>Title:</strong> <span id="song-title">Song Title</span></p>
            <p><strong>Artist:</strong> <span id="song-artist">Artist Name</span></p>
            <p><strong>Lyrics:</strong> <span id="song-lyrics">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</span></p>
            <p><strong>Google Drive:</strong> <a id="google-drive-link" href="#" target="_blank">Link</a></p>
            <p><strong>YouTube:</strong> <a id="youtube-link" href="#" target="_blank">Link</a></p>
            <p><strong>Spotify:</strong> <a id="spotify-link" href="#" target="_blank">Link</a></p>
        </div>
    </div>

    <div id="footer">
        <a href="https://drive.google.com/file/d/1X_aY7tb7E9RxKVyXDYkGAC_wMGznGJe6/view?usp=drive_link" target="_blank">Download Niggun Sheet</a>
        <a href="https://drive.google.com/file/d/1GrpBue_ukxtR7mKjuGZljXL_X-I7Y4wu/view?usp=drive_link" target="_blank">Download Simcha Sheet</a>
    </div>

    <script>
        // Mock song data (replace with actual data)
        const songData = {
            title: "Song Title",
            artist: "Artist Name",
            lyrics: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
            googleDriveLink: "#", // Replace "#" with actual link
            youtubeLink: "#", // Replace "#" with actual link
            spotifyLink: "#" // Replace "#" with actual link
        };

        // Populate song details
        document.getElementById("song-title").innerText = songData.title;
        document.getElementById("song-artist").innerText = songData.artist;
        document.getElementById("song-lyrics").innerText = songData.lyrics;
        document.getElementById("google-drive-link").href = songData.googleDriveLink;
        document.getElementById("youtube-link").href = songData.youtubeLink;
        document.getElementById("spotify-link").href = songData.spotifyLink;
    </script>
</body>
</html>
