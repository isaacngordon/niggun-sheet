// server.js
const serverless = require('serverless-http');
const express = require('express');
const path = require('path');

const app = express();

// Add CORS middleware for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Importing route handlers
const songsHandler = require('./api/songs');

// Use the route handlers - make sure it matches the API endpoint pattern
app.get('/api/songs', (req, res) => {
  songsHandler.handler(req, res);
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve index.html for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Spin up the server
if (process.env.VERCEL) {
  // Running on Vercel, export the app as serverless
  module.exports = serverless(app);
} else {
  // Running locally, start the server
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🚀 Niggun Sheet server running on http://localhost:${port}`);
    console.log(`📖 Main pages:`);
    console.log(`   • Home: http://localhost:${port}/`);
    console.log(`   • Songs: http://localhost:${port}/songs.html`);
    console.log(`   • Sheet Builder: http://localhost:${port}/sheet-builder.html`);
    console.log(`   • Project Growth: http://localhost:${port}/project-growth-page.html`);
    console.log(`🔌 API endpoints:`);
    console.log(`   • Songs API: http://localhost:${port}/api/songs`);
  });
}
