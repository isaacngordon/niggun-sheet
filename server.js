const cors = require('cors');
const express = require('express');
const songsRouter = require('./routes/songs.js');
const path = require('path');

const app = express();

// app.use(cors("*"));

app.use("/songs", songsRouter);

// set static files to public folder
app.use(express.static(path.join(__dirname, 'public')));


app.listen(3000, () => {
    console.log("Server started (http://localhost:3000/)");
});

