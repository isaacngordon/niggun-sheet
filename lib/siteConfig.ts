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
 * Set `NEXT_PUBLIC_SITE_URL` to the same value in the Vercel project
 * (Production). It is inlined at build time and overrides this fallback, so a
 * stale value there will reintroduce the mismatch.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kumzitzsheet.com'
).replace(/\/+$/, '');
