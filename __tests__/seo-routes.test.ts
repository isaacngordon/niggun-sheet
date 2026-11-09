import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { metadata as contactMetadata } from '@/app/contact/page';
import { metadata as trackingMetadata } from '@/app/tracking-disclosure/page';

jest.mock('@/app/sheet-builder-v2/SheetBuilderApp', () => ({
  SheetBuilderApp: () => null,
}));

import { metadata as sheetBuilderMetadata } from '@/app/sheet-builder/layout';

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

  it('keeps private/test routes out of search indexing', () => {
    const config = robots();
    const firstRule = Array.isArray(config.rules) ? config.rules[0] : config.rules;

    expect(firstRule.allow).toBe('/');
    expect(firstRule.disallow).toEqual(expect.arrayContaining(['/api/', '/sheet-test', '/smartboard-mode']));
    expect(config.sitemap).toBe('https://www.kumzitzsheet.com/sitemap.xml');
  });
});
