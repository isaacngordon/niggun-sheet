'use client';

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-N0MP01KGSP';
export const ANALYTICS_MODE_KEY = 'niggunsheet-analytics-mode';
export const ANALYTICS_PREFERENCE_EVENT = 'niggunsheet-analytics-preference';
export const ANALYTICS_PREF_VERSION_KEY = 'niggunsheet-analytics-pref-version';
const MODE_COOKIE_NAME = 'niggunsheet_analytics_mode';
const LEGACY_OPT_OUT_KEY = 'niggunsheet-analytics-opt-out';
const LEGACY_OPT_OUT_COOKIE_NAME = 'niggunsheet_analytics_opt_out';
const CURRENT_PREF_VERSION = '2';

export type AnalyticsMode = 'fallback' | 'cookie';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function readCookie(name: string) {
  if (typeof document === 'undefined') return null;

  const prefix = `${name}=`;
  const entry = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

function writeModeCookie(mode: AnalyticsMode) {
  if (typeof document === 'undefined') return;

  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${MODE_COOKIE_NAME}=${mode}; Path=/; Max-Age=${maxAge}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
}

function clearCookieByName(name: string) {
  if (typeof document === 'undefined') return;

  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  const domains = [hostname];

  if (parts.length >= 2) {
    domains.push(`.${parts.slice(-2).join('.')}`);
  }

  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  domains.forEach((domain) => {
    document.cookie = `${name}=; Path=/; Domain=${domain}; Max-Age=0; SameSite=Lax`;
  });
}

function clearAnalyticsCookies() {
  if (typeof document === 'undefined') return;

  document.cookie
    .split(';')
    .map((part) => part.trim().split('=')[0])
    .filter((name) => name === '_ga' || name.startsWith('_ga_'))
    .forEach((name) => clearCookieByName(name));
}

function updateConsentMode(mode: AnalyticsMode) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  window.gtag('consent', 'update', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: mode === 'cookie' ? 'granted' : 'denied',
  });
}

function migrateStoredAnalyticsPreference() {
  if (typeof window === 'undefined') return;

  try {
    const prefVersion = window.localStorage.getItem(ANALYTICS_PREF_VERSION_KEY);
    if (prefVersion === CURRENT_PREF_VERSION) return;

    window.localStorage.setItem(ANALYTICS_MODE_KEY, 'cookie');
    window.localStorage.removeItem(LEGACY_OPT_OUT_KEY);
    window.localStorage.setItem(ANALYTICS_PREF_VERSION_KEY, CURRENT_PREF_VERSION);
    writeModeCookie('cookie');
    clearCookieByName(LEGACY_OPT_OUT_COOKIE_NAME);
  } catch {
    // Ignore storage failures.
  }
}

export function hasAnalyticsPreference() {
  if (typeof window === 'undefined') return false;

  try {
    const localValue = window.localStorage.getItem(ANALYTICS_MODE_KEY);
    if (localValue === 'cookie' || localValue === 'fallback') return true;

    const legacyLocal = window.localStorage.getItem(LEGACY_OPT_OUT_KEY);
    if (legacyLocal === '0' || legacyLocal === '1') return true;
  } catch {
    // Ignore storage failures and fall back to cookies.
  }

  const cookieValue = readCookie(MODE_COOKIE_NAME);
  if (cookieValue === 'cookie' || cookieValue === 'fallback') return true;

  const legacyCookieValue = readCookie(LEGACY_OPT_OUT_COOKIE_NAME);
  if (legacyCookieValue === '0' || legacyCookieValue === '1') return true;

  return false;
}

export function getAnalyticsMode(): AnalyticsMode {
  if (typeof window === 'undefined') return 'cookie';

  migrateStoredAnalyticsPreference();

  try {
    const localValue = window.localStorage.getItem(ANALYTICS_MODE_KEY);
    if (localValue === 'cookie' || localValue === 'fallback') return localValue;

    const legacyLocal = window.localStorage.getItem(LEGACY_OPT_OUT_KEY);
    if (legacyLocal === '0') return 'cookie';
    if (legacyLocal === '1') return 'fallback';
  } catch {
    // Ignore storage failures and fall back to cookies.
  }

  const cookieValue = readCookie(MODE_COOKIE_NAME);
  if (cookieValue === 'cookie' || cookieValue === 'fallback') return cookieValue;

  const legacyCookieValue = readCookie(LEGACY_OPT_OUT_COOKIE_NAME);
  if (legacyCookieValue === '0') return 'cookie';
  if (legacyCookieValue === '1') return 'fallback';

  return 'cookie';
}

export function setAnalyticsMode(mode: AnalyticsMode) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(ANALYTICS_MODE_KEY, mode);
    window.localStorage.removeItem(LEGACY_OPT_OUT_KEY);
    window.localStorage.setItem(ANALYTICS_PREF_VERSION_KEY, CURRENT_PREF_VERSION);
  } catch {
    // Ignore storage failures.
  }

  writeModeCookie(mode);
  updateConsentMode(mode);

  if (mode === 'fallback') {
    clearAnalyticsCookies();
  }

  window.dispatchEvent(
    new CustomEvent(ANALYTICS_PREFERENCE_EVENT, {
      detail: { mode },
    }),
  );
}

export function applyAnalyticsPreference() {
  if (typeof window === 'undefined') return 'cookie' as AnalyticsMode;

  const mode = getAnalyticsMode();
  updateConsentMode(mode);
  if (mode === 'fallback') {
    clearAnalyticsCookies();
  }
  return mode;
}