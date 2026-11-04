# Kumzitz Sheet

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
   PRINT_SHOPS_SHEET_RANGE=PrintShops!A:N
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
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (or `GOOGLE_CLIENT_ID` as fallback)
     - `SHEET_RANGE` (optional)
     - `PRINT_SHOPS_SHEET_RANGE` (optional, defaults to `PrintShops!A:N1000`)

3. Redeploy after adding environment variables

## Print Shops

Print shops are **not hardcoded in the app**. They are read from a tab in the
same Google Sheet used for songs, so adding or editing a print shop is a
spreadsheet edit plus (at most) a 5 minute cache wait.

Add a tab named `PrintShops` with this header row (column order does not matter,
names are matched case-insensitively):

| slug | name | intro | successMessage | logoPath | logoAlt | email | phone | address | deliveryMode | deliveryRecipient | deliveryCc | deliveryWebhookUrl | active |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

- `slug` - required, used in the URL (`?printShop=<slug>` or `?shop=<slug>`).
- `deliveryMode` - `email` or `webhook`.
- `deliveryRecipient` - inbox for `email` mode. Falls back to `email` when blank.
- `deliveryCc` - optional comma-separated extra recipients.
- `deliveryWebhookUrl` - HTTPS endpoint for `webhook` mode.
- `active` - `TRUE`/`FALSE`, `yes`/`no`, or `1`/`0`. Blank counts as active.

Rows with a blank `slug` or a falsy `active` value are skipped. A shop needs a
valid delivery target before it can accept orders.

Notes:
- The app fetches this tab server-side and caches it for 5 minutes, and exposes
  it at `GET /api/print-shops` for the client to hydrate its lookup registry.
- If the tab is missing or unreachable, the app falls back to a minimal bundled
  shop so ordering keeps working.
- Legacy slugs still resolve via aliases (for example `partner-print` resolves
  to `print-on-point`) instead of duplicating a shop definition.

## Visual Verification (`npm run verify:gemini`)

Screenshots the running app and asks the Gemini API to review the result for
layout and UX defects. Configure it in `.env.local`:

| Variable | Required | Default |
| --- | --- | --- |
| `GEMINI_API_KEY` | yes | - |
| `GEMINI_MODEL` | no | `gemini-3.1-pro` |
| `VERIFY_BASE_URL` | no | `http://localhost:3000` |
| `VERIFY_COOKIE` | no | - (raw `Cookie:` header for signed-in pages) |
| `VERIFY_DEVICE` | no | `iPhone 13` |
| `VERIFY_PATHS` | no | `/songs,/bencher,/sheet-builder` |

```bash
npm run verify:gemini
npm run verify:gemini -- --full-page
npm run verify:gemini -- --prompt "Check the bencher toolbar spacing"
```

Screenshots are always written to `test-results/gemini-verify/` before the API
call, so you can capture without a key. Start the dev server first, and use
`localhost` rather than `127.0.0.1` — Next.js blocks its dev resources for
cross-origin hosts, which leaves the page rendered but never hydrated.

### Google OAuth Setup For Live Site

1. In Google Cloud Console, open "APIs & Services" > "Credentials".
2. Create or edit an "OAuth 2.0 Client ID" of type "Web application".
3. Add your production origins under "Authorized JavaScript origins":
   - `https://kumzitzsheet.com`
   - `https://www.kumzitzsheet.com` (if you use www)
   - `http://localhost:3000` (for local dev)
4. Save, then copy the OAuth client id into Vercel as `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
5. Redeploy the site.

Notes:
- This app uses Google Identity Services popup/token flow, so JavaScript origins are the critical OAuth setting.
- If sign-in fails with `origin_mismatch`, your current site origin is not listed in the OAuth client origins.

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
