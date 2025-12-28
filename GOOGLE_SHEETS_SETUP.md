# Google Sheets Setup Guide

This guide explains how to set up Google Sheets API integration for the Niggun Sheet application.

## Overview

The application can fetch songs from a Google Sheets spreadsheet using the Google Sheets API. If the API is not configured, the application will automatically fall back to using the local CSV file (`data/songs.csv`).

## Prerequisites

- A Google Account
- A Google Sheets spreadsheet with your songs data
- Access to Google Cloud Console

## Google Sheets Format

Your Google Sheets spreadsheet should have the following columns (in this order):

1. **Search title** - The title used for searching
2. **Title** - The display title of the song
3. **Lyrics** - The song lyrics
4. **Artist** - The artist name
5. **Google Drive** - Link to Google Drive file (optional)
6. **YouTube link** - Link to YouTube video (optional)

**Example:**
```
Search title                    | Title                          | Lyrics              | Artist | Google Drive | YouTube link
Avinu Av Harachaman            | Avinu Av Harachaman            | [lyrics text]       |        |              | https://youtube.com/...
```

## Step 1: Get Your Google Sheets ID

1. Open your Google Sheets spreadsheet
2. Look at the URL in your browser's address bar
3. The URL format is: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
4. Copy the `SPREADSHEET_ID` part (the long string between `/d/` and `/edit`)

**Example:**
- URL: `https://docs.google.com/spreadsheets/d/1ABC123XYZ456/edit`
- Spreadsheet ID: `1ABC123XYZ456`

## Step 2: Create a Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the Google Sheets API:
   - Go to **APIs & Services** → **Library**
   - Search for "Google Sheets API"
   - Click on it and click **Enable**
4. Create an API Key:
   - Go to **APIs & Services** → **Credentials**
   - Click **+ CREATE CREDENTIALS**
   - Select **API Key**
   - Copy the generated API key
5. (Recommended) Restrict the API key:
   - Click on the newly created API key to edit it
   - Under "API restrictions", select "Restrict key"
   - Select only "Google Sheets API"
   - Under "Application restrictions", you can restrict it to specific websites or IP addresses
   - Click **Save**

## Step 3: Make Your Spreadsheet Public (Read-Only)

For the API key to work, your spreadsheet must be publicly accessible:

1. Open your Google Sheets spreadsheet
2. Click the **Share** button (top right)
3. Click **Change to anyone with the link**
4. Make sure the permission is set to **Viewer**
5. Click **Done**

## Step 4: Set Environment Variables

### For Local Development

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your credentials:
   ```
   GOOGLE_SHEETS_ID=your_spreadsheet_id_here
   GOOGLE_API_KEY=your_api_key_here
   SHEET_RANGE=Sheet1!A:F1000
   ```

3. Save the file

### For Production (Vercel, Netlify, etc.)

Add these environment variables in your hosting platform's dashboard:

- `GOOGLE_SHEETS_ID` = Your spreadsheet ID
- `GOOGLE_API_KEY` = Your API key
- `SHEET_RANGE` = `Sheet1!A:F1000` (or your custom range)

**For Vercel:**
1. Go to your project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with its value
4. Redeploy your application

**For Netlify:**
1. Go to your site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add each variable with its value
4. Trigger a new deploy

## Step 5: Verify the Setup

After setting up the environment variables, you can verify the setup works:

1. Start your development server:
   ```bash
   npm start
   ```

2. Check the server logs - you should see:
   ```
   Google Sheets credentials found, attempting to fetch data...
   Successfully processed X songs from Google Sheets API
   ```

3. Visit `http://localhost:3000/api/songs` - you should see JSON data with your songs

## Troubleshooting

### "No data found in Google Sheets"
- Make sure your spreadsheet has data starting from row 1
- Verify the `SHEET_RANGE` environment variable is correct
- Check that your spreadsheet is shared publicly

### "Error fetching from Google Sheets API"
- Verify your API key is correct
- Make sure the Google Sheets API is enabled in your Google Cloud project
- Check that your spreadsheet ID is correct
- Ensure your spreadsheet is shared publicly (anyone with the link can view)

### "Unable to load songs from any source"
- This means both Google Sheets API failed AND the local CSV file is missing or unreadable
- Check that `data/songs.csv` exists
- Verify file permissions

### Songs load but they're old/outdated
- The application caches songs for 5 minutes to improve performance
- Wait 5 minutes or restart the server to fetch fresh data from Google Sheets

## Fallback Behavior

If the Google Sheets API is not configured or fails:
1. The application will automatically fall back to the local CSV file (`data/songs.csv`)
2. A log message will indicate: "Google Sheets API not configured, using local CSV"
3. The application will continue to work normally with the local data

This ensures the application is always functional, even without Google Sheets integration.

## Security Notes

- **Never commit your `.env` file** to version control (it's in `.gitignore`)
- Keep your API key secure and don't share it publicly
- Use API key restrictions to limit usage to your domain
- Regularly rotate your API keys for better security
- Consider using service accounts for production environments for better security

## Data Sync

To update your local CSV file from Google Sheets:
1. Make changes in your Google Sheets spreadsheet
2. The API will automatically fetch new data on the next request (after cache expires)
3. To manually update the local CSV: Export your spreadsheet as CSV and replace `data/songs.csv`
