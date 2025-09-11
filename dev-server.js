#!/usr/bin/env node
/**
 * Simple development server for Niggun Sheet
 * Run this script to serve the site locally and avoid CORS/fetch issues.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const url = require('url');

const PORT = 5500;
const PUBLIC_DIR = path.join(__dirname, 'public');
const SONGS_CSV_PATH = path.join(__dirname, 'data', 'songs.csv');

// MIME types for common file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

function openBrowser(url) {
    const start = process.platform === 'darwin' ? 'open' : 
                  process.platform === 'win32' ? 'start' : 'xdg-open';
    spawn(start, [url], { detached: true, stdio: 'ignore' });
}

// Function to parse CSV and return songs data
function getSongsData() {
    try {
        const data = fs.readFileSync(SONGS_CSV_PATH, 'utf8');
        const songs = data.split(/\r?\n(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((line, i) => {
            // Skip the first line (headers)
            if (i === 0) return null;
            // Skip the last line (if empty)
            if (!line) return null;
            const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
            const [search_title, title, lyrics, artist, drive, youtube] = line.split(regex).map(cell => cell.replace(/"/g, ''));
            return { search_title, title, lyrics, artist, drive, youtube };
        }).filter(Boolean); // Remove null entries
        
        return songs;
    } catch (error) {
        console.error('Error reading songs data:', error);
        return [];
    }
}

// Function to handle API requests
function handleApiRequest(req, res, pathname) {
    if (pathname === '/api/songs') {
        console.log(`Handling GET /api/songs from ${req.connection.remoteAddress}`);
        const songs = getSongsData();
        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end(JSON.stringify(songs));
        return true;
    }
    return false;
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Handle API requests first
    if (pathname.startsWith('/api/')) {
        if (handleApiRequest(req, res, pathname)) {
            return; // API request was handled
        }
    }
    
    // Handle static file requests
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    
    // Remove query parameters for file path
    filePath = filePath.split('?')[0];
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // File not found - serve 404
                fs.readFile(path.join(PUBLIC_DIR, '404.html'), (err404, content404) => {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end(content404 || 'Page not found', 'utf-8');
                });
            } else {
                // Server error
                res.writeHead(500);
                res.end(`Server error: ${err.code}`, 'utf-8');
            }
        } else {
            // Success
            const contentType = getMimeType(filePath);
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Check if public directory exists
if (!fs.existsSync(PUBLIC_DIR)) {
    console.error(`❌ Error: 'public' directory not found!`);
    console.error(`Make sure you're running this script from the project root.`);
    process.exit(1);
}

// Check if songs data exists
if (!fs.existsSync(SONGS_CSV_PATH)) {
    console.warn(`⚠️  Warning: 'data/songs.csv' not found!`);
    console.warn(`API will return empty data. Songs data should be in: ${SONGS_CSV_PATH}`);
}

server.listen(PORT, () => {
    console.log(`🚀 Niggun Sheet development server starting...`);
    console.log(`📂 Serving files from: ${PUBLIC_DIR}`);
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`📖 Main pages:`);
    console.log(`   • Home: http://localhost:${PORT}/`);
    console.log(`   • Songs: http://localhost:${PORT}/songs.html`);
    console.log(`   • Sheet Builder: http://localhost:${PORT}/sheet-builder.html`);
    console.log(`   • Project Growth: http://localhost:${PORT}/project-growth-page.html`);
    console.log(`🔌 API endpoints:`);
    console.log(`   • Songs API: http://localhost:${PORT}/api/songs`);
    console.log(`\n💡 Tip: Press Ctrl+C to stop the server`);
    console.log('-'.repeat(60));
    
    // Open browser automatically
    try {
        openBrowser(`http://localhost:${PORT}/`);
    } catch (e) {
        // Ignore browser opening errors
    }
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        console.error(`💡 Try using a different port or stop the other server first.`);
    } else {
        console.error(`❌ Error starting server:`, err);
    }
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log(`\n👋 Server stopped.`);
    process.exit(0);
});
