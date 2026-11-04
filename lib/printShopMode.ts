/**
 * Print shop mode persistence.
 *
 * A visitor who arrives through a print shop link (`?printShop=<slug>`) keeps
 * that shop active while they browse the rest of the site: the slug is
 * persisted, so reloading the page, following any in-app link, or using browser
 * back/forward all keep them in the shop.
 *
 * The mode is only released by a fresh document navigation to an address with
 * no shop parameter AND no same-origin referrer -- i.e. someone deliberately
 * typing the plain site address or opening a bookmark. That way browsing the
 * site never drops the mode, but the operator can still get out.
 */

const STORAGE_KEY = 'kumzitz-sheet:print-shop-slug';
const LEGACY_STORAGE_KEY = 'niggun-sheet:print-shop-slug';

type InitialMode =
  | { kind: 'entered'; slug: string }
  | { kind: 'resumed'; slug: string }
  | { kind: 'none' };

/**
 * Resolved once per document load. Caching this is what lets an in-app
 * navigation to a parameter-less URL keep the lock, while a typed address
 * clears it.
 */
let initialMode: InitialMode | null = null;

function readStoredSlug(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredSlug(slug: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, slug);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode); the query param still works for this page.
  }
}

function clearStoredSlug(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Extracts a normalised shop slug from a search string. */
export function printShopSlugFromSearch(search: string): string | null {
  if (!search) return null;
  const params = new URLSearchParams(search);
  const raw = params.get('printShop') || params.get('shop');
  const slug = (raw || '').trim().toLowerCase();
  return slug || null;
}

/**
 * Whether a document load should release the lock.
 *
 * Reloads, back/forward, and client-side routing never release it. A fresh
 * navigation only releases when it looks deliberate: no shop param, and no
 * same-origin referrer. A same-origin referrer means the visitor clicked a link
 * inside the site -- including a full page load from a plain anchor -- so the
 * mode must survive that.
 */
function shouldReleaseLockOnLoad(): boolean {
  let type: string;
  try {
    const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    type = entry?.type ?? 'navigate';
  } catch {
    type = 'navigate';
  }

  if (type !== 'navigate') {
    return false;
  }

  const referrer = document.referrer;
  if (!referrer) {
    return true;
  }

  try {
    return new URL(referrer).origin !== window.location.origin;
  } catch {
    return true;
  }
}

function resolveInitialMode(): InitialMode {
  const fromUrl = printShopSlugFromSearch(window.location.search);
  if (fromUrl) {
    writeStoredSlug(fromUrl);
    return { kind: 'entered', slug: fromUrl };
  }

  const stored = readStoredSlug();
  if (!stored) {
    return { kind: 'none' };
  }

  // No slug in the URL. Keep the mode unless this looks like a deliberate
  // fresh entry into the site without the parameter.
  if (shouldReleaseLockOnLoad()) {
    clearStoredSlug();
    return { kind: 'none' };
  }

  return { kind: 'resumed', slug: stored };
}

/**
 * Resolves the active print shop slug for the current URL, honouring the lock.
 * Returns `null` when the visitor is not in print shop mode.
 */
export function resolvePrintShopSlug(search: string): string | null {
  if (typeof window === 'undefined') return null;

  if (initialMode === null) {
    initialMode = resolveInitialMode();
  }

  // A shop param on any later navigation re-enters (or switches) the mode.
  const fromUrl = printShopSlugFromSearch(search);
  if (fromUrl) {
    writeStoredSlug(fromUrl);
    initialMode = { kind: 'entered', slug: fromUrl };
    return fromUrl;
  }

  if (initialMode.kind === 'none') {
    return null;
  }

  return readStoredSlug() ?? initialMode.slug;
}

/** Clears the lock. Intended for tests and explicit operator escape hatches. */
export function clearPrintShopMode(): void {
  clearStoredSlug();
  initialMode = { kind: 'none' };
}
