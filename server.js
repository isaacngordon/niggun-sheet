// server.js
const serverless = require('serverless-http');
const express = require('express');
const path = require('path');

const app = express();

// Importing route handlers
const songsHandler = require('./api/songs');

// Use the route handlers
app.use(songsHandler);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve index.html for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', '404.html'));
});

if (process.env.VERCEL) {
  // Running on Vercel, export the app as serverless
  module.exports = serverless(app);
} else {
  // Running locally, start the server
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
}
