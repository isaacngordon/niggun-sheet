import { applyPrintShopDeliveries, getFallbackPrintShopDeliveries, getPrintShopDeliveryBySlug, isPrintShopDeliveryConfigured } from '@/lib/printShopDelivery';
import type { PrintShopDeliveryConfig } from '@/lib/printShopDelivery';

export interface PrintShopConfig {
  slug: string;
  name: string;
  intro: string;
  successMessage: string;
  logoPath?: string;
  logoAlt?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface PrintShopRecord {
  config: PrintShopConfig;
  delivery: PrintShopDeliveryConfig | null;
}

type SearchParamReader = {
  get(name: string): string | null;
} | null | undefined;

/**
 * Legacy slug aliases. Keeps old links working without duplicating a shop's
 * full definition -- aliases resolve to the canonical shop slug.
 */
const PRINT_SHOP_ALIASES: Record<string, string> = {
  'partner-print': 'print-on-point',
};

/**
 * Bundled fallback shop. Print shops are normally sourced from the `PrintShops`
 * tab of the Google Sheet (see `lib/printShopSheet.ts`). This entry only keeps
 * the order flow working when the sheet cannot be reached.
 */
const FALLBACK_PRINT_SHOPS: Record<string, PrintShopConfig> = {
  'print-on-point': {
    slug: 'print-on-point',
    name: 'Print On Point',
    intro: 'Send your finished kumzitz sheet directly to Print On Point for pickup in Cedarhurst.',
    successMessage: 'Your print job was sent to Print On Point.',
    logoPath: '/assets/print-shops/print-on-point.svg',
    logoAlt: 'Print On Point logo',
    email: 'Print@PrintOnPoint.com',
    phone: '516-341-7202',
    address: '413 Central Avenue, Cedarhurst NY 11516',
  },
};

let registry: Record<string, PrintShopConfig> = { ...FALLBACK_PRINT_SHOPS };

function normalizeKey(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

function normalizeSlug(value: string | null | undefined): string {
  const normalized = normalizeKey(value);
  return PRINT_SHOP_ALIASES[normalized] || normalized;
}

export function getPrintShopBySlug(slug: string | null | undefined): PrintShopConfig | null {
  const normalized = normalizeSlug(slug);
  return normalized ? registry[normalized] || null : null;
}

export function getPrintShopFromSearchParams(searchParams: SearchParamReader): PrintShopConfig | null {
  return getPrintShopBySlug(searchParams?.get('printShop') || searchParams?.get('shop'));
}

export function isPrintShopConfigured(shop: PrintShopConfig | null | undefined): shop is PrintShopConfig {
  return Boolean(shop && isPrintShopDeliveryConfigured(getPrintShopDeliveryBySlug(shop.slug)));
}

export function listPrintShops(): PrintShopConfig[] {
  return Object.values(registry);
}

export function getFallbackPrintShopRecords(): PrintShopRecord[] {
  const fallbackDeliveries = new Map(
    getFallbackPrintShopDeliveries().map((delivery) => [delivery.shopSlug, delivery]),
  );

  return Object.values(FALLBACK_PRINT_SHOPS).map((config) => ({
    config,
    delivery: fallbackDeliveries.get(config.slug) ?? null,
  }));
}

/** Replaces the shop registry with records loaded from the spreadsheet. */
export function applyPrintShopRecords(records: PrintShopRecord[]): void {
  const usableRecords = records.filter((record) => normalizeKey(record.config.slug).length > 0);
  if (usableRecords.length === 0) {
    return;
  }

  const nextShops: Record<string, PrintShopConfig> = {};
  const nextDeliveries: PrintShopDeliveryConfig[] = [];

  usableRecords.forEach((record) => {
    const slug = normalizeKey(record.config.slug);
    nextShops[slug] = { ...record.config, slug };

    if (record.delivery) {
      nextDeliveries.push({ ...record.delivery, shopSlug: slug });
    }
  });

  registry = nextShops;
  applyPrintShopDeliveries(nextDeliveries);
}

let hydrationPromise: Promise<void> | null = null;

/**
 * Client-side hydration: pulls the print shop list from the spreadsheet-backed
 * API route and merges it into the registry. Safe to call multiple times and a
 * no-op on the server, where the sheet is read directly.
 */
export function ensurePrintShopsLoaded(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (!hydrationPromise) {
    hydrationPromise = fetch('/api/print-shops')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { shops?: PrintShopRecord[] } | null) => {
        if (payload && Array.isArray(payload.shops)) {
          applyPrintShopRecords(payload.shops);
        }
      })
      .catch(() => {
        // Keep the bundled fallback registry in place.
      });
  }

  return hydrationPromise;
}