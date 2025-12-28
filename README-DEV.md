# Niggun Sheet - Developer Guide

This guide provides instructions for developers working on the Niggun Sheet project.

## Prerequisites

- Node.js 22.x (specified in package.json)
- npm (comes with Node.js)
- Git

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/isaacngordon/niggun-sheet.git
   cd niggun-sheet
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables (optional but recommended):**
   ```bash
   cp .env.example .env
   # Edit .env and add your Google Sheets credentials
   ```
   
   See [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) for detailed instructions on setting up Google Sheets API.

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:3000`

## Project Structure

```
niggun-sheet/
├── api/                    # API endpoints
│   └── songs.js           # Songs API endpoint (Google Sheets + CSV fallback)
├── data/                  # Data files
│   ├── songs.csv         # Local CSV fallback data
│   ├── migrate.js        # Database migration script
│   └── seed.js           # Database seeding script
├── public/               # Static files (HTML, CSS, JS, images)
│   ├── assets/          # Images and static assets
│   ├── css/             # Stylesheets
│   ├── index.html       # Homepage
│   ├── songs.html       # Song directory page
│   ├── song-details.html # Individual song details
│   └── sheet-builder.html # Sheet builder tool
├── server.js            # Express server configuration
├── package.json         # Node.js dependencies and scripts
└── .env                 # Environment variables (not in version control)
```

## Available Scripts

- **`npm start`** - Start the production server
- **`npm run dev`** - Start the development server with auto-reload (using nodemon)
- **`npm run db-migrate`** - Run database migrations
- **`npm run db-seed`** - Seed the database with songs from CSV
- **`npm run db-backup`** - Create a backup of the database

## Environment Variables

The application uses the following environment variables:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GOOGLE_SHEETS_ID` | Google Sheets spreadsheet ID | No | Falls back to local CSV |
| `GOOGLE_API_KEY` | Google API key for Sheets API | No | Falls back to local CSV |
| `SHEET_RANGE` | Range of cells to fetch | No | `Sheet1!A:F1000` |
| `PORT` | Server port | No | `3000` |
| `VERCEL` | Set by Vercel for serverless deployment | No | - |

### Local Development Without Google Sheets

You can run the application without setting up Google Sheets API. The application will automatically use the local CSV file (`data/songs.csv`) as a fallback.

### Production Deployment

For production deployment, you **must** set the environment variables in your hosting platform:

1. **Vercel**: Add environment variables in Project Settings → Environment Variables
2. **Netlify**: Add environment variables in Site settings → Environment variables
3. **Other platforms**: Refer to their documentation for setting environment variables

See [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) for detailed setup instructions.

## API Endpoints

### GET /api/songs

Returns a list of all songs from Google Sheets (if configured) or local CSV file.

**Response:** JSON array of song objects

```json
[
  {
    "search_title": "Avinu Av Harachaman",
    "title": "Avinu Av Harachaman אָבִֽינוּ אָב הָרַחֲמָן",
    "lyrics": "...",
    "artist": "",
    "drive": "",
    "youtube": "https://www.youtube.com/watch?v=..."
  }
]
```

**Caching:** Results are cached for 5 minutes to improve performance.

**Fallback:** If Google Sheets API fails or is not configured, the endpoint automatically falls back to the local CSV file.

## Data Format

Songs data should follow this format (both in Google Sheets and CSV):

| Column | Description | Required |
|--------|-------------|----------|
| Search title | Title used for searching | Yes |
| Title | Display title | Yes |
| Lyrics | Song lyrics | Yes |
| Artist | Artist name | Yes |
| Google Drive | Link to Google Drive file | No |
| YouTube link | Link to YouTube video | No |

## Development Workflow

1. **Make your changes** in the appropriate files
2. **Test locally** using `npm run dev`
3. **Verify the API** works at `http://localhost:3000/api/songs`
4. **Test the frontend** at `http://localhost:3000/songs.html`
5. **Commit your changes** with a descriptive message
6. **Push to GitHub** and create a pull request

## Troubleshooting

### "Error loading songs" on the frontend

**Check the browser console** for detailed error messages:
1. Open Developer Tools (F12)
2. Go to the Console tab
3. Look for error messages from `/api/songs`

**Common causes:**
- API endpoint not responding (check server logs)
- Google Sheets API not configured (falls back to CSV)
- Local CSV file missing or corrupted
- Network issues

### Server won't start

**Error: "address already in use"**
- Another process is using port 3000
- Find and stop the process using the port
- Or use a different port: `PORT=3001 npm start`

**Error: "Cannot find module"**
- Dependencies not installed
- Run: `npm install`

### Songs not updating

**Changes in Google Sheets not reflected:**
- Wait 5 minutes for cache to expire
- Or restart the server to clear cache
- Check server logs for API errors

**Changes in local CSV not reflected:**
- Restart the server
- Verify CSV file format matches expected structure

## Deployment

### Deploying to Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel project settings
3. Deploy automatically on push to main branch

### Deploying to Other Platforms

The application uses Express.js with serverless support:
- Set `VERCEL` environment variable for serverless mode
- Otherwise, runs as a traditional Express server on specified PORT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues or questions:
- Check existing issues on GitHub
- Create a new issue with detailed information
- Contact the maintainer

## License

[Add license information here]
