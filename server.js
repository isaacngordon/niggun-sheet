const cors = require('cors');
const express = require('express');

const app = express();

app.use(cors("*"));

app.get("/", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.sendFile(__dirname + "/index.html");
});

app.get("/duh", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.sendFile(__dirname + "/duh.html");
});

app.listen(3000, () => {
    console.log("Server started (http://localhost:3000/)");
});
