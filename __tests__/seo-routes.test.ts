import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { resolveSiteUrl } from '@/lib/siteConfig';
import { metadata as contactMetadata } from '@/app/contact/page';
import { metadata as trackingMetadata } from '@/app/tracking-disclosure/page';

jest.mock('@/app/sheet-builder-v2/SheetBuilderApp', () => ({
  SheetBuilderApp: () => null,
}));

import { metadata as sheetBuilderMetadata } from '@/app/sheet-builder/layout';

describe('site URL canonicalization', () => {
  it('rewrites an apex NEXT_PUBLIC_SITE_URL to the canonical www host', () => {
    expect(resolveSiteUrl('https://kumzitzsheet.com')).toBe('https://www.kumzitzsheet.com');
    expect(resolveSiteUrl('https://kumzitzsheet.com/')).toBe('https://www.kumzitzsheet.com');
    expect(resolveSiteUrl('  https://Kumzitzsheet.com  ')).toBe('https://www.kumzitzsheet.com');
  });

  it('falls back to the canonical host and leaves preview hosts alone', () => {
    expect(resolveSiteUrl(undefined)).toBe('https://www.kumzitzsheet.com');
    expect(resolveSiteUrl('')).toBe('https://www.kumzitzsheet.com');
    expect(resolveSiteUrl('https://www.kumzitzsheet.com/')).toBe('https://www.kumzitzsheet.com');
    expect(resolveSiteUrl('https://beta.kumzitzsheet.com')).toBe('https://beta.kumzitzsheet.com');
  });

  it('uses the hardened resolver for the exported SITE_URL', () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = 'https://kumzitzsheet.com';

    try {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { SITE_URL } = require('@/lib/siteConfig') as typeof import('@/lib/siteConfig');
        expect(SITE_URL).toBe('https://www.kumzitzsheet.com');
      });
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });
});

describe('SEO route metadata', () => {
  it('keeps page titles compatible with the root title template', () => {
    expect(contactMetadata.title).toBe('Contact Us');
    expect(sheetBuilderMetadata.title).toBe('Sheet Builder');
    expect(trackingMetadata.title).toBe('Tracking Disclosure');
  });

  it('publishes a sitemap for primary public pages', async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toEqual(expect.arrayContaining([
      'https://www.kumzitzsheet.com/',
      'https://www.kumzitzsheet.com/songs',
      'https://www.kumzitzsheet.com/sheet-builder',
      'https://www.kumzitzsheet.com/contact',
    ]));
  });

  it('never publishes apex URLs in the sitemap', async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls.length).toBeGreaterThan(0);
    expect(urls.filter((url) => !url.startsWith('https://www.kumzitzsheet.com/'))).toEqual([]);
  });

  it('keeps private/test routes out of search indexing', () => {
    const config = robots();
    const firstRule = Array.isArray(config.rules) ? config.rules[0] : config.rules;

    expect(firstRule.allow).toBe('/');
    expect(firstRule.disallow).toEqual(expect.arrayContaining(['/api/', '/sheet-test', '/smartboard-mode']));
    expect(config.sitemap).toBe('https://www.kumzitzsheet.com/sitemap.xml');
  });
});
