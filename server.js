// server.js
const express = require('express');
const path = require('path');

const app = express();

// log request to console
app.use((req, res, next) => {
  console.log(`Received ${req.method} request for ${req.url}`);
  next();
});

// Importing route handlers
const songsHandler = require('./api/songs');

// Use the route handlers - wrap the handler for Express
app.get('/api/songs', songsHandler);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve index.html for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', '404.html'));
});

// Running locally, start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
