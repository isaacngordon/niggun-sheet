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
    expect(contactMetadata.title).toBe('Get in Touch');
    expect(sheetBuilderMetadata.title).toBe('Sheet Builder');
    expect(trackingMetadata.title).toBe('Tracking Disclosure');
  });

  it('publishes a sitemap for primary public pages', () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toEqual(expect.arrayContaining([
      'https://niggunsheet.com/',
      'https://niggunsheet.com/songs',
      'https://niggunsheet.com/sheet-builder',
      'https://niggunsheet.com/contact',
      'https://niggunsheet.com/project-growth-page',
    ]));
  });

  it('keeps private/test routes out of search indexing', () => {
    const config = robots();
    const firstRule = Array.isArray(config.rules) ? config.rules[0] : config.rules;

    expect(firstRule.allow).toBe('/');
    expect(firstRule.disallow).toEqual(expect.arrayContaining(['/api/', '/sheet-test', '/smartboard-mode']));
    expect(config.sitemap).toBe('https://niggunsheet.com/sitemap.xml');
  });
});
