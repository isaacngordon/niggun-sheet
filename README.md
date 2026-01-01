# Niggun Sheet

A Next.js 15 application for managing and building niggun (Jewish song) sheets with drag-and-drop functionality.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19
- **Styling**: CSS-in-JS (styled-jsx), Tailwind-inspired utility classes
- **API**: Next.js API Routes
- **Data Source**: Google Sheets API with local CSV fallback
- **Deployment**: Vercel

## Setup

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory:
   ```env
   GOOGLE_SHEETS_ID=your_sheet_id_here
   GOOGLE_API_KEY=your_api_key_here
   SHEET_RANGE=Sheet1!A:F
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

### Deployment on Vercel

1. Deploy to Vercel:
   ```bash
   vercel
   ```

2. Add environment variables in Vercel Dashboard:
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add:
     - `GOOGLE_SHEETS_ID`
     - `GOOGLE_API_KEY`
     - `SHEET_RANGE` (optional)

3. Redeploy after adding environment variables

### Getting Google Sheets API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google Sheets API"
4. Create an API Key (restrict it to Google Sheets API)
5. Make your Google Sheet publicly viewable
6. Copy the Sheet ID from the URL

## Project Structure

```
niggun-sheet/
├── app/                    # Next.js App Router directory
│   ├── api/               # API routes
│   │   └── songs/         # Songs API endpoint
│   ├── components/        # Shared React components
│   │   ├── Header.js      # Site header with navigation
│   │   ├── Footer.js      # Site footer
│   │   └── CornerBanner.js # Corner banner component
│   ├── contact/           # Contact page
│   ├── layout.js          # Root layout
│   ├── page.js            # Homepage
│   └── not-found.js       # 404 page
├── public/                # Static assets and legacy HTML pages
│   ├── assets/            # Images and static files
│   ├── css/               # Stylesheets
│   ├── js/                # Client-side JavaScript
│   └── *.html             # Legacy HTML pages (songs, sheet-builder, etc.)
├── data/                  # Database and data files
│   ├── songs.csv          # Song data fallback
│   └── migrations/        # Database migrations
├── next.config.js         # Next.js configuration
└── package.json           # Dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db-migrate` - Run database migrations
- `npm run db-seed` - Seed database with songs
- `npm run db-backup` - Backup database

## Features

- **Song Directory**: Browse and search through a comprehensive collection of niggunim
- **Sheet Builder**: Drag-and-drop interface to create custom song sheets
- **Contact Form**: Get in touch with suggestions or questions
- **Google Sheets Integration**: Songs data can be managed via Google Sheets
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Offline Fallback**: Uses local CSV data if Google Sheets API is unavailable

## Troubleshooting

- Check that your Google Sheet is publicly readable
- Verify API key is restricted to Google Sheets API only
- Ensure Google Sheets API is enabled in your GCP project
- Test the API directly: `https://sheets.googleapis.com/v4/spreadsheets/YOUR_SHEET_ID/values/Sheet1!A:F?key=YOUR_API_KEY`
