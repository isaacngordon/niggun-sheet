export type PrintShopDeliveryConfig =
  | {
      shopSlug: string;
      mode: 'email';
      recipient: string;
      cc?: string[];
    }
  | {
      shopSlug: string;
      mode: 'webhook';
      submissionUrl: string;
    };

/**
 * Bundled fallback delivery target.
 *
 * The live registry is hydrated from the `PrintShops` tab of the Google Sheet
 * via `lib/printShopSheet.ts`, which is the source of truth. This map only
 * keeps the print-shop order flow working if the sheet cannot be reached.
 */
const FALLBACK_PRINT_SHOP_DELIVERY: Record<string, PrintShopDeliveryConfig> = {
  'print-on-point': {
    shopSlug: 'print-on-point',
    mode: 'email',
    recipient: 'Print@PrintOnPoint.com',
  },
};

let registry: Record<string, PrintShopDeliveryConfig> = { ...FALLBACK_PRINT_SHOP_DELIVERY };

function normalizeSlug(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

export function getPrintShopDeliveryBySlug(slug: string | null | undefined): PrintShopDeliveryConfig | null {
  const normalized = normalizeSlug(slug);
  return normalized ? registry[normalized] || null : null;
}

export function isPrintShopDeliveryConfigured(delivery: PrintShopDeliveryConfig | null | undefined): delivery is PrintShopDeliveryConfig {
  if (!delivery) return false;
  if (delivery.mode === 'webhook') {
    return /^https:\/\//i.test(delivery.submissionUrl);
  }
  return delivery.recipient.includes('@');
}

export function listPrintShopDeliveries(): PrintShopDeliveryConfig[] {
  return Object.values(registry);
}

/** Replaces the delivery registry with the provided records. */
export function applyPrintShopDeliveries(deliveries: PrintShopDeliveryConfig[]): void {
  if (deliveries.length === 0) {
    return;
  }

  const next: Record<string, PrintShopDeliveryConfig> = {};
  deliveries.forEach((delivery) => {
    const normalized = normalizeSlug(delivery.shopSlug);
    if (normalized) {
      next[normalized] = delivery;
    }
  });

  if (Object.keys(next).length > 0) {
    registry = next;
  }
}

export function getFallbackPrintShopDeliveries(): PrintShopDeliveryConfig[] {
  return Object.values(FALLBACK_PRINT_SHOP_DELIVERY);
}