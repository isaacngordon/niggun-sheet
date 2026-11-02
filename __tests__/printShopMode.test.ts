const STORAGE_KEY = 'kumzitz-sheet:print-shop-slug';
const LEGACY_STORAGE_KEY = 'niggun-sheet:print-shop-slug';

/**
 * The lock resolves once per document load, so every case needs a fresh module
 * instance to avoid leaking the cached decision between tests.
 */
function loadModule() {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/lib/printShopMode') as typeof import('@/lib/printShopMode');
}

function setUrl(url: string) {
  window.history.replaceState({}, '', url);
}

function setNavigationType(type: 'navigate' | 'reload' | 'back_forward') {
  Object.defineProperty(window.performance, 'getEntriesByType', {
    configurable: true,
    value: () => [{ type }],
  });
}

function setReferrer(value: string) {
  Object.defineProperty(document, 'referrer', {
    configurable: true,
    get: () => value,
  });
}

describe('print shop mode locking', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setNavigationType('navigate');
    setReferrer('');
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('enters and persists when the URL carries a shop param', () => {
    setUrl('/bencher?printShop=print-on-point');
    const { resolvePrintShopSlug } = loadModule();

    expect(resolvePrintShopSlug(window.location.search)).toBe('print-on-point');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('print-on-point');
  });

  it('accepts the legacy `shop` param', () => {
    setUrl('/bencher?shop=print-on-point');
    const { resolvePrintShopSlug } = loadModule();

    expect(resolvePrintShopSlug(window.location.search)).toBe('print-on-point');
  });

  it('resumes after reloading a URL that lost the param', () => {
    window.localStorage.setItem(STORAGE_KEY, 'print-on-point');
    setUrl('/bencher/two-sided');
    setNavigationType('reload');
    const { resolvePrintShopSlug } = loadModule();

    expect(resolvePrintShopSlug(window.location.search)).toBe('print-on-point');
  });

  it('resumes from a legacy-stored slug', () => {
    window.localStorage.setItem(LEGACY_STORAGE_KEY, 'print-on-point');
    setUrl('/bencher/two-sided');
    setNavigationType('reload');
    const { resolvePrintShopSlug } = loadModule();

    expect(resolvePrintShopSlug(window.location.search)).toBe('print-on-point');
  });

  it('stays locked across in-app navigation that drops the param', () => {
    setUrl('/bencher?printShop=print-on-point');
    const { resolvePrintShopSlug } = loadModule();
    expect(resolvePrintShopSlug(window.location.search)).toBe('print-on-point');

    // A client-side route change does not produce a new document navigation.
    setUrl('/bencher/two-sided');
    expect(resolvePrintShopSlug(window.location.search)).toBe('print-on-point');
  });

  it('treats back/forward as resuming rather than exiting', () => {
    window.localStorage.setItem(STORAGE_KEY, 'print-on-point');
    setUrl('/bencher');
    setNavigationType('back_forward');
    const { resolvePrintShopSlug } = loadModule();

    expect(resolvePrintShopSlug(window.location.search)).toBe('print-on-point');
  });

  it('exits on a fresh navigation to an address without the param', () => {
    window.localStorage.setItem(STORAGE_KEY, 'print-on-point');
    setUrl('/');
    setNavigationType('navigate');
    setReferrer('');
    const { resolvePrintShopSlug } = loadModule();

    expect(resolvePrintShopSlug(window.location.search)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('keeps the mode after a full page load from a link inside the site', () => {
    window.localStorage.setItem(STORAGE_KEY, 'print-on-point');
    setUrl('/songs');
    setNavigationType('navigate');
    // Same-origin referrer: the visitor clicked a link, not a typed address.
    setReferrer(`${window.location.origin}/bencher`);
    const { resolvePrintShopSlug } = loadModule();

    expect(resolvePrintShopSlug(window.location.search)).toBe('print-on-point');
  });

  it('exits on a full page load referred from another site', () => {
    window.localStorage.setItem(STORAGE_KEY, 'print-on-point');
    setUrl('/');
    setNavigationType('navigate');
    setReferrer('https://example.com/somewhere');
    const { resolvePrintShopSlug } = loadModule();

    expect(resolvePrintShopSlug(window.location.search)).toBeNull();
  });

  it('does nothing when there is no stored slug and no param', () => {
    setUrl('/songs');
    const { resolvePrintShopSlug } = loadModule();

    expect(resolvePrintShopSlug(window.location.search)).toBeNull();
  });

  it('switches to a different shop when a new param arrives', () => {
    setUrl('/bencher?printShop=print-on-point');
    const { resolvePrintShopSlug } = loadModule();
    expect(resolvePrintShopSlug(window.location.search)).toBe('print-on-point');

    setUrl('/bencher?printShop=other-shop');
    expect(resolvePrintShopSlug(window.location.search)).toBe('other-shop');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('other-shop');
  });

  it('clears the lock when explicitly released', () => {
    setUrl('/bencher?printShop=print-on-point');
    const { resolvePrintShopSlug, clearPrintShopMode } = loadModule();
    expect(resolvePrintShopSlug(window.location.search)).toBe('print-on-point');

    // The URL must no longer carry the param; otherwise re-entering is correct.
    setUrl('/bencher/two-sided');
    clearPrintShopMode();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(resolvePrintShopSlug(window.location.search)).toBeNull();
  });

  it('re-enters from the URL even after an explicit release', () => {
    setUrl('/bencher?printShop=print-on-point');
    const { resolvePrintShopSlug, clearPrintShopMode } = loadModule();
    expect(resolvePrintShopSlug(window.location.search)).toBe('print-on-point');

    clearPrintShopMode();
    expect(resolvePrintShopSlug(window.location.search)).toBe('print-on-point');
  });
});
