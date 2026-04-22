# Niggun Sheet

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
   SHEET_RANGE=Sheet1!A:G
   ```

3. Run the development server:
   ```bash
   npm run dev
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

### Song Sheet Columns

Use this column order in your CSV or Google Sheet:

1. `Search title`
2. `Title`
3. `lyrics`
4. `artist`
5. `google drive`
6. `youtube link`
7. `audio url`

If `audio url` is present, the app will prefer native audio playback and only fall back to YouTube when the audio field is empty.

### Troubleshooting

- Check that your Google Sheet is publicly readable
- Verify API key is restricted to Google Sheets API only
- Ensure Google Sheets API is enabled in your GCP project
- Test the API directly: `https://sheets.googleapis.com/v4/spreadsheets/YOUR_SHEET_ID/values/Sheet1!A:G?key=YOUR_API_KEY`
