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

const PRINT_SHOP_DELIVERY: Record<string, PrintShopDeliveryConfig> = {
  'print-on-point': {
    shopSlug: 'print-on-point',
    mode: 'email',
    recipient: 'Print@PrintOnPoint.com',
  },
  'partner-print': {
    shopSlug: 'partner-print',
    mode: 'email',
    recipient: 'Print@PrintOnPoint.com',
  },
};

function normalizeSlug(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

export function getPrintShopDeliveryBySlug(slug: string | null | undefined): PrintShopDeliveryConfig | null {
  const normalized = normalizeSlug(slug);
  return normalized ? PRINT_SHOP_DELIVERY[normalized] || null : null;
}

export function isPrintShopDeliveryConfigured(delivery: PrintShopDeliveryConfig | null | undefined): delivery is PrintShopDeliveryConfig {
  if (!delivery) return false;
  if (delivery.mode === 'webhook') {
    return /^https:\/\//i.test(delivery.submissionUrl);
  }
  return delivery.recipient.includes('@');
}