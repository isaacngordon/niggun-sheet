/**
 * @jest-environment node
 *
 * The server pass has no `window`, and jsdom's global `window` cannot be
 * removed from a jsdom test file, so the guard is covered here instead.
 */
import { resolvePrintShopSlug, clearPrintShopMode } from '@/lib/printShopMode';

describe('print shop mode on the server', () => {
  it('has no window at all in this environment', () => {
    expect(typeof window).toBe('undefined');
  });

  it('resolves to null instead of touching window', () => {
    expect(resolvePrintShopSlug('?printShop=print-on-point')).toBeNull();
  });

  it('tolerates being cleared without a window', () => {
    expect(() => clearPrintShopMode()).not.toThrow();
  });
});
