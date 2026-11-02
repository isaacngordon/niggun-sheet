import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kumzitzsheet.com';

// Assistants are the intended audience for /ai.txt and /llms.txt, so they are allowed
// explicitly rather than relying on the wildcard rule alone.
const AI_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bingbot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/sheet-test', '/smartboard-mode'],
      },
      ...AI_AGENTS.map((userAgent) => ({
        userAgent,
        allow: ['/', '/ai.txt', '/llms.txt', '/songs'],
        disallow: ['/api/', '/sheet-test'],
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
