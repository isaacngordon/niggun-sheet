import type { MetadataRoute } from 'next';
import { getSongs } from '@/app/api/songs/data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://niggunsheet.com';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/songs`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/sheet-builder`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/sheet-builder-v2`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/bencher`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/bencher/two-sided`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/bencher/booklet`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/project-growth-page`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/tracking-disclosure`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  let songPages: MetadataRoute.Sitemap = [];
  try {
    const songs = await getSongs();
    const seen = new Set<string>();
    songPages = songs
      .filter((s) => {
        const slug = slugify(s.title);
        if (seen.has(slug)) return false;
        seen.add(slug);
        return true;
      })
      .map((s) => ({
        url: `${SITE_URL}/songs/${slugify(s.title)}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
  } catch {
    // If songs can't be fetched, still serve static pages
  }

  return [...staticPages, ...songPages];
}
