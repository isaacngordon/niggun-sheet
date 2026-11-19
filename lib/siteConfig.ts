/**
 * Canonical site origin.
 *
 * The apex domain (`kumzitzsheet.com`) issues a 308 redirect to `www`, so the
 * canonical host is `https://www.kumzitzsheet.com`. Every place that emits an
 * absolute URL — canonical tags, OpenGraph, the sitemap, robots.txt, ai.txt and
 * llms.txt — must point at this host directly. Emitting apex URLs means every
 * URL we publish is a redirect, which is what Google reports as
 * "Page is not indexed: Page with redirect".
 *
 * `NEXT_PUBLIC_SITE_URL` may still be set in the Vercel project. It is inlined
 * at build time and overrides the fallback, so an apex value there used to
 * silently reintroduce the mismatch in production. `resolveSiteUrl` rewrites
 * the apex to the canonical host, so that mistake can no longer go live.
 * Preview hosts (e.g. `beta.kumzitzsheet.com`) are left untouched.
 */
const CANONICAL_SITE_URL = 'https://www.kumzitzsheet.com';
const APEX_SITE_URL = 'https://kumzitzsheet.com';

export function resolveSiteUrl(override?: string): string {
  const candidate = (override?.trim() || CANONICAL_SITE_URL).replace(/\/+$/, '');
  return candidate.toLowerCase() === APEX_SITE_URL ? CANONICAL_SITE_URL : candidate;
}

export const SITE_URL = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
