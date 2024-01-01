const cors = require('cors');
const express = require('express');
const songsRouter = require('./routes/songs.js');

const app = express();

// app.use(cors("*"));

app.use("/songs", songsRouter);

app.get("/", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.sendFile(__dirname + "/index.html");
});



app.listen(3000, () => {
    console.log("Server started (http://localhost:3000/)");
});

