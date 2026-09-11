import {
  getPrintShopBySlug,
  getPrintShopFromSearchParams,
  isPrintShopConfigured,
} from '@/lib/printShop';
import {
  getPrintShopDeliveryBySlug,
  isPrintShopDeliveryConfigured,
} from '@/lib/printShopDelivery';

describe('print shop configuration', () => {
  it('finds a shop by slug case-insensitively', () => {
    expect(getPrintShopBySlug('PRINT-ON-POINT')?.name).toBe('Print On Point');
  });

  it('reads the shop from the printShop query parameter', () => {
    const params = new URLSearchParams('printShop=print-on-point');
    expect(getPrintShopFromSearchParams(params)?.slug).toBe('print-on-point');
  });

  it('falls back to the shop query parameter', () => {
    const params = new URLSearchParams('shop=partner-print');
    expect(getPrintShopFromSearchParams(params)?.slug).toBe('partner-print');
  });

  it('treats configured shops as ready for submission', () => {
    expect(isPrintShopConfigured(getPrintShopBySlug('print-on-point'))).toBe(true);
  });

  it('treats configured inbox delivery as ready', () => {
    expect(isPrintShopDeliveryConfigured(getPrintShopDeliveryBySlug('print-on-point'))).toBe(true);
  });
});