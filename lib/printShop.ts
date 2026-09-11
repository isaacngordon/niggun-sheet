import { getPrintShopDeliveryBySlug, isPrintShopDeliveryConfigured } from '@/lib/printShopDelivery';

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

type SearchParamReader = {
  get(name: string): string | null;
} | null | undefined;

const PRINT_SHOPS: Record<string, PrintShopConfig> = {
  'print-on-point': {
    slug: 'print-on-point',
    name: 'Print On Point',
    intro: 'Send your finished niggun sheet directly to Print On Point for pickup in Cedarhurst.',
    successMessage: 'Your print job was sent to Print On Point.',
    logoPath: '/assets/print-shops/print-on-point.svg',
    logoAlt: 'Print On Point logo',
    email: 'Print@PrintOnPoint.com',
    phone: '516-341-7202',
    address: '413 Central Avenue, Cedarhurst NY 11516',
  },
  'partner-print': {
    slug: 'partner-print',
    name: 'Print On Point',
    intro: 'Send your finished niggun sheet directly to Print On Point for pickup in Cedarhurst.',
    successMessage: 'Your print job was sent to Print On Point.',
    logoPath: '/assets/print-shops/print-on-point.svg',
    logoAlt: 'Print On Point logo',
    email: 'Print@PrintOnPoint.com',
    phone: '516-341-7202',
    address: '413 Central Avenue, Cedarhurst NY 11516',
  },
};

function normalizeSlug(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

export function getPrintShopBySlug(slug: string | null | undefined): PrintShopConfig | null {
  const normalized = normalizeSlug(slug);
  return normalized ? PRINT_SHOPS[normalized] || null : null;
}

export function getPrintShopFromSearchParams(searchParams: SearchParamReader): PrintShopConfig | null {
  return getPrintShopBySlug(searchParams?.get('printShop') || searchParams?.get('shop'));
}

export function isPrintShopConfigured(shop: PrintShopConfig | null | undefined): shop is PrintShopConfig {
  return Boolean(shop && isPrintShopDeliveryConfigured(getPrintShopDeliveryBySlug(shop.slug)));
}

export function listPrintShops(): PrintShopConfig[] {
  return Object.values(PRINT_SHOPS);
}