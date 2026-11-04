import https from 'https';
import {
  applyPrintShopRecords,
  getFallbackPrintShopRecords,
  type PrintShopConfig,
} from '@/lib/printShop';
import type { PrintShopDeliveryConfig } from '@/lib/printShopDelivery';

/**
 * Print shops are sourced from a dedicated tab in the same Google Sheet that
 * backs the song library. Add or edit a print shop by adding a row there --
 * no code change required.
 *
 * Expected header row (order does not matter, names are matched case-insensitively):
 *
 *   slug | name | intro | successMessage | logoPath | logoAlt
 *   email | phone | address
 *   deliveryMode | deliveryRecipient | deliveryCc | deliveryWebhookUrl | active
 *
 * - `deliveryMode` is `email` or `webhook`.
 * - `deliveryCc` is a comma-separated list of extra recipients.
 * - `active` accepts true/false, yes/no, or 1/0. Blank counts as active.
 *
 * Set `PRINT_SHOPS_SHEET_RANGE` to change the tab or range. Always include a
 * start row (`PrintShops!A1:N1000`), never a bare start column with an end row.
 */

const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID || 'YOUR_SHEET_ID';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'YOUR_API_KEY';

/**
 * Google's A1 notation treats a range like `A:N1000` (a bare start column with
 * an end row) as empty, returning HTTP 200 with zero values even when the tab
 * is full. Rewrite that shape to the explicit `A1:N1000` so the obvious-looking
 * value still works.
 */
export function normalizeSheetRange(range: string): string {
  const trimmed = range.trim();
  const match = /^(.*![A-Za-z]+):([A-Za-z]+)(\d+)$/.exec(trimmed);
  return match ? `${match[1]}1:${match[2]}${match[3]}` : trimmed;
}

const PRINT_SHOPS_SHEET_RANGE = normalizeSheetRange(process.env.PRINT_SHOPS_SHEET_RANGE || 'PrintShops!A1:N1000');

const CACHE_DURATION = 5 * 60 * 1000;
// Fallback results are cached briefly so a freshly fixed sheet shows up fast
// instead of being pinned behind the full cache window.
const FALLBACK_CACHE_DURATION = 30 * 1000;
const GOOGLE_SHEETS_TIMEOUT_MS = 4000;

export interface PrintShopSheetRecord {
  config: PrintShopConfig;
  delivery: PrintShopDeliveryConfig | null;
}

export interface PrintShopLoadResult {
  records: PrintShopSheetRecord[];
  /** Where the records came from. `fallback` means the sheet was unusable. */
  source: 'sheet' | 'fallback';
  /** Human-readable explanation, always set when `source` is `fallback`. */
  reason?: string;
  range: string;
  diagnostics?: PrintShopSheetDiagnostics;
}

let cachedResult: PrintShopLoadResult | null = null;
let cacheTimestamp = 0;

function fallbackResult(reason: string, diagnostics?: PrintShopSheetDiagnostics): PrintShopLoadResult {
  const result: PrintShopLoadResult = {
    records: getFallbackPrintShopRecords(),
    source: 'fallback',
    reason,
    range: PRINT_SHOPS_SHEET_RANGE,
    ...(diagnostics ? { diagnostics } : {}),
  };

  cachedResult = result;
  cacheTimestamp = Date.now();
  return result;
}

/**
 * Loads the print shops, reporting exactly why the bundled fallback was used
 * when the spreadsheet could not supply records.
 */
export async function loadPrintShopResult(): Promise<PrintShopLoadResult> {
  const now = Date.now();
  const ttl = cachedResult?.source === 'sheet' ? CACHE_DURATION : FALLBACK_CACHE_DURATION;
  if (cachedResult && now - cacheTimestamp < ttl) {
    return cachedResult;
  }

  let rows: string[][];
  try {
    rows = await fetchPrintShopRows();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const reason = `Could not read ${PRINT_SHOPS_SHEET_RANGE}: ${message}`;
    console.warn('[printShopSheet]', reason, '- using bundled fallback shop');
    return fallbackResult(reason);
  }

  const diagnostics = diagnosePrintShopSheet(rows);
  const records = parsePrintShopRows(rows);

  if (records.length === 0) {
    const reason =
      rows.length === 0
        ? `Range ${PRINT_SHOPS_SHEET_RANGE} is empty. Add the header row and at least one shop row.`
        : `Range ${PRINT_SHOPS_SHEET_RANGE} returned ${rows.length} row(s) but no usable shops. ` +
          `Header seen: ${JSON.stringify(diagnostics.headerRow)}. ` +
          (diagnostics.missingFields.includes('slug')
            ? 'No "slug" column was recognised, so the header row is probably missing or misspelled.'
            : 'Check that "slug" is filled in and "active" is not FALSE.');

    console.warn('[printShopSheet]', reason, '- using bundled fallback shop');
    return fallbackResult(reason, diagnostics);
  }

  const result: PrintShopLoadResult = {
    records,
    source: 'sheet',
    range: PRINT_SHOPS_SHEET_RANGE,
    diagnostics,
  };

  cachedResult = result;
  cacheTimestamp = now;
  return result;
}

/** Returns the print shop records, preferring the spreadsheet. */
export async function loadPrintShopRecords(): Promise<PrintShopSheetRecord[]> {
  return (await loadPrintShopResult()).records;
}

/** Loads the sheet records once and hydrates the in-process registries. */
export async function ensureReadyPrintShopRecords(): Promise<PrintShopSheetRecord[]> {
  const records = (await loadPrintShopResult()).records;
  applyPrintShopRecords(records);
  return records;
}

function cleanText(value: string | undefined): string {
  if (!value) return '';
  return value
    .trim()
    .replace(/\r\n?/g, '\n')
    .replace(/\uFFFD/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

function normalizeSlug(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

function normalizeHeader(value: string | undefined): string {
  return cleanText(value).toLowerCase().replace(/[\s_-]+/g, '');
}

function isFalsy(value: string | undefined): boolean {
  const normalized = cleanText(value).toLowerCase();
  return normalized === 'false' || normalized === 'no' || normalized === '0' || normalized === 'n';
}

const HEADER_ALIASES: Record<string, string[]> = {
  slug: ['slug', 'shopslug', 'shop', 'id'],
  name: ['name', 'shopname', 'title', 'displayname'],
  intro: ['intro', 'introduction', 'description', 'blurb'],
  successMessage: ['successmessage', 'success', 'confirmationmessage'],
  logoPath: ['logopath', 'logo', 'logourl', 'logoimagepath'],
  logoAlt: ['logoalt', 'logotext', 'logoalttext'],
  email: ['email', 'contactemail', 'shopemail'],
  phone: ['phone', 'phonenumber', 'tel', 'telephone'],
  address: ['address', 'location', 'streetaddress'],
  deliveryMode: ['deliverymode', 'mode', 'deliverytype'],
  deliveryRecipient: ['deliveryrecipient', 'recipient', 'orderto', 'deliveryemail'],
  deliveryCc: ['deliverycc', 'cc', 'copyto'],
  deliveryWebhookUrl: ['deliverywebhookurl', 'webhookurl', 'submissionurl', 'webhook'],
  active: ['active', 'enabled', 'live', 'published'],
};

function buildHeaderIndex(headerRow: string[]): Record<string, number> {
  const index: Record<string, number> = {};
  const normalizedHeaders = headerRow.map((cell) => normalizeHeader(cell));

  Object.entries(HEADER_ALIASES).forEach(([field, aliases]) => {
    const position = normalizedHeaders.findIndex((header) => header.length > 0 && aliases.includes(header));
    if (position !== -1) {
      index[field] = position;
    }
  });

  return index;
}

function readCell(row: string[], index: Record<string, number>, field: string): string {
  const position = index[field];
  if (position === undefined) return '';
  return cleanText(row[position]);
}

export function parsePrintShopRows(rows: string[][]): PrintShopSheetRecord[] {
  if (!Array.isArray(rows) || rows.length < 2) {
    return [];
  }

  const headerIndex = buildHeaderIndex(rows[0]);
  const records: PrintShopSheetRecord[] = [];

  for (let rowNumber = 1; rowNumber < rows.length; rowNumber += 1) {
    const row = rows[rowNumber];
    if (!Array.isArray(row) || row.length === 0) continue;

    const slug = normalizeSlug(readCell(row, headerIndex, 'slug'));
    if (!slug) continue;

    if (isFalsy(readCell(row, headerIndex, 'active'))) continue;

    const name = readCell(row, headerIndex, 'name');
    const intro = readCell(row, headerIndex, 'intro');
    const successMessage = readCell(row, headerIndex, 'successMessage');
    const logoPath = readCell(row, headerIndex, 'logoPath');
    const logoAlt = readCell(row, headerIndex, 'logoAlt');
    const email = readCell(row, headerIndex, 'email');
    const phone = readCell(row, headerIndex, 'phone');
    const address = readCell(row, headerIndex, 'address');

    const config: PrintShopConfig = {
      slug,
      name: name || slug,
      intro,
      successMessage: successMessage || `Your print job was sent to ${name || slug}.`,
      ...(logoPath ? { logoPath } : {}),
      ...(logoAlt ? { logoAlt } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...(address ? { address } : {}),
    };

    records.push({
      config,
      delivery: buildDelivery(row, headerIndex, slug, email),
    });
  }

  return records;
}

export interface PrintShopSheetDiagnostics {
  sheetRowCount: number;
  headerRow: string[];
  mappedFields: string[];
  missingFields: string[];
}

/**
 * Explains why a sheet read produced no shops, so an empty or mis-headered tab
 * is diagnosable instead of silently falling back.
 */
export function diagnosePrintShopSheet(rows: string[][]): PrintShopSheetDiagnostics {
  const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
  const headerIndex = buildHeaderIndex(headerRow);
  const expected = Object.keys(HEADER_ALIASES);
  const mappedFields = expected.filter((field) => headerIndex[field] !== undefined);
  const missingFields = expected.filter((field) => headerIndex[field] === undefined);

  return { sheetRowCount: rows.length, headerRow, mappedFields, missingFields };
}

function buildDelivery(
  row: string[],
  headerIndex: Record<string, number>,
  slug: string,
  contactEmail: string,
): PrintShopDeliveryConfig | null {
  const mode = readCell(row, headerIndex, 'deliveryMode').toLowerCase();
  const recipient = readCell(row, headerIndex, 'deliveryRecipient') || contactEmail;
  const webhookUrl = readCell(row, headerIndex, 'deliveryWebhookUrl');
  const cc = readCell(row, headerIndex, 'deliveryCc')
    .split(',')
    .map((entry) => cleanText(entry))
    .filter(Boolean);

  if (mode === 'webhook' || (!mode && webhookUrl)) {
    return webhookUrl ? { shopSlug: slug, mode: 'webhook', submissionUrl: webhookUrl } : null;
  }

  if (recipient.includes('@')) {
    return { shopSlug: slug, mode: 'email', recipient, ...(cc.length > 0 ? { cc } : {}) };
  }

  return null;
}

function fetchPrintShopRows(): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/${encodeURIComponent(PRINT_SHOPS_SHEET_RANGE)}?key=${GOOGLE_API_KEY}`;

  return new Promise((resolve, reject) => {
    const request = https.get(url, { timeout: GOOGLE_SHEETS_TIMEOUT_MS }, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const rows = parsed.values;
          // An existing but empty tab legitimately returns no values. Resolve an
          // empty list so the loader can report it as "tab is empty" rather than
          // as a transport failure.
          if (!Array.isArray(rows)) {
            resolve([]);
            return;
          }
          resolve(rows.map((row: unknown) =>
            Array.isArray(row) ? row.map((cell) => (cell == null ? '' : String(cell))) : [],
          ));
        } catch {
          reject(new Error('Failed to parse print shop response'));
        }
      });
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Print shop request timed out'));
    });
  });
}
