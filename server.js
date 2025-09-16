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

// Use the route handlers - for local development only
if (!process.env.VERCEL) {
  // In local development, use the Express router
  if (typeof songsHandler.expressRouter === 'function') {
    app.use('/api/songs', songsHandler.expressRouter());
  } else {
    // Fallback to wrapping the handler
    app.get('/api/songs', songsHandler);
  }
}

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve 404.html for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', '404.html'));
});

// Export for Vercel or start local server
if (process.env.VERCEL) {
  // Running on Vercel, export the app for serverless
  module.exports = app;
} else {
  // Running locally, start the server
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
    console.log(`API endpoint: http://localhost:${port}/api/songs`);
  });
}
