import { applyPrintShopRecords, getPrintShopBySlug, listPrintShops } from '@/lib/printShop';
import { getPrintShopDeliveryBySlug, isPrintShopDeliveryConfigured } from '@/lib/printShopDelivery';
import { parsePrintShopRows, normalizeSheetRange } from '@/lib/printShopSheet';

const HEADER = [
  'slug',
  'name',
  'intro',
  'successMessage',
  'logoPath',
  'logoAlt',
  'email',
  'phone',
  'address',
  'deliveryMode',
  'deliveryRecipient',
  'deliveryCc',
  'deliveryWebhookUrl',
  'active',
];

describe('print shop spreadsheet parsing', () => {
  it('maps a row into a shop config and email delivery', () => {
    const records = parsePrintShopRows([
      HEADER,
      [
        'acme-print',
        'Acme Print',
        'Send your sheet to Acme.',
        'Your job went to Acme.',
        '/assets/print-shops/acme.svg',
        'Acme logo',
        'orders@acme.test',
        '555-0100',
        '1 Main St',
        'email',
        'jobs@acme.test',
        'owner@acme.test, backup@acme.test',
        '',
        'TRUE',
      ],
    ]);

    expect(records).toHaveLength(1);
    const [record] = records;
    expect(record.config.slug).toBe('acme-print');
    expect(record.config.name).toBe('Acme Print');
    expect(record.config.logoPath).toBe('/assets/print-shops/acme.svg');
    expect(record.delivery).toEqual({
      shopSlug: 'acme-print',
      mode: 'email',
      recipient: 'jobs@acme.test',
      cc: ['owner@acme.test', 'backup@acme.test'],
    });
  });

  it('supports webhook delivery', () => {
    const records = parsePrintShopRows([
      HEADER,
      ['hook-print', 'Hook Print', '', '', '', '', 'hi@hook.test', '', '', 'webhook', '', '', 'https://hook.test/orders', 'yes'],
    ]);

    expect(records[0].delivery).toEqual({
      shopSlug: 'hook-print',
      mode: 'webhook',
      submissionUrl: 'https://hook.test/orders',
    });
  });

  it('skips inactive rows', () => {
    const records = parsePrintShopRows([
      HEADER,
      ['off-print', 'Off Print', '', '', '', '', '', '', '', 'email', 'x@off.test', '', '', 'FALSE'],
    ]);

    expect(records).toHaveLength(0);
  });

  it('matches columns by header name regardless of order', () => {
    const records = parsePrintShopRows([
      ['name', 'slug', 'deliveryRecipient'],
      ['Reordered Print', 'reordered-print', 'desk@reordered.test'],
    ]);

    expect(records[0].config.slug).toBe('reordered-print');
    expect(records[0].config.name).toBe('Reordered Print');
    expect(records[0].delivery).toMatchObject({ mode: 'email', recipient: 'desk@reordered.test' });
  });

  it('returns nothing when the sheet has no data rows', () => {
    expect(parsePrintShopRows([HEADER])).toHaveLength(0);
    expect(parsePrintShopRows([])).toHaveLength(0);
  });
});

describe('print shop sheet range normalization', () => {
  it('rewrites a bare start column with an end row, which Sheets reads as empty', () => {
    expect(normalizeSheetRange('PrintShops!A:N1000')).toBe('PrintShops!A1:N1000');
  });

  it('leaves an already explicit range alone', () => {
    expect(normalizeSheetRange('PrintShops!A1:N1000')).toBe('PrintShops!A1:N1000');
  });

  it('leaves a column-only range alone so it keeps reading the whole tab', () => {
    expect(normalizeSheetRange('Sheet1!A:G')).toBe('Sheet1!A:G');
  });

  it('leaves a bare tab name alone', () => {
    expect(normalizeSheetRange('PrintShops')).toBe('PrintShops');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeSheetRange('  PrintShops!A:N1000  ')).toBe('PrintShops!A1:N1000');
  });
});

describe('print shop registry hydration', () => {
  it('makes spreadsheet shops resolvable through the sync lookup helpers', () => {
    const records = parsePrintShopRows([
      HEADER,
      ['sheet-only-print', 'Sheet Only Print', 'Intro', 'Done', '', '', 'help@sheetonly.test', '', '', 'email', 'help@sheetonly.test', '', '', 'true'],
    ]);

    applyPrintShopRecords(records);

    expect(getPrintShopBySlug('SHEET-ONLY-PRINT')?.name).toBe('Sheet Only Print');
    expect(isPrintShopDeliveryConfigured(getPrintShopDeliveryBySlug('sheet-only-print'))).toBe(true);
    expect(listPrintShops().map((shop) => shop.slug)).toEqual(['sheet-only-print']);
  });

  it('ignores an empty record list so the previous registry stays usable', () => {
    applyPrintShopRecords([]);
    expect(getPrintShopBySlug('sheet-only-print')).not.toBeNull();
  });
});
