/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';
const { version } = require('./package.json');

const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  // The bencher PDF route renders its overlays with headless Chromium. Both the
  // puppeteer client and the serverless Chromium build ship binaries/wasm that
  // cannot be bundled, and the route reads these public assets from disk at
  // runtime — without listing them here the route crashes in a serverless
  // deployment (Vercel) even though it works locally.
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  outputFileTracingIncludes: {
    '/api/bencher/generate-pdf': [
      './public/assets/bencher/**',
      './public/assets/fonts/**',
      './public/assets/Andy-heading-flourish.svg',
      // The serverless Chromium build unpacks its browser from bin/*.br at
      // runtime. Externalizing the package is not enough on its own — the
      // tracing step does not discover these files, so the function fails with
      // 'The input directory "/var/task/node_modules/@sparticuz/chromium/bin"
      // does not exist' unless they are listed explicitly.
      './node_modules/@sparticuz/chromium/bin/**',
    ],
  },
  // Expose the Google OAuth client id to client bundles.
  // Fallback supports deployments that set GOOGLE_CLIENT_ID only.
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
    NEXT_PUBLIC_GOOGLE_CLIENT_ID_BETA: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_BETA || '',
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || version,
  },
  // CORS headers for API routes + security headers
  async headers() {
    const cspScriptSrc = [
      "'self'",
      'https://accounts.google.com',
      'https://apis.google.com',
      'https://www.youtube.com',
      'https://unpkg.com',
      'https://www.googletagmanager.com',
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ].join(' ');

    const csp = [
      "default-src 'self'",
      `script-src ${cspScriptSrc}`,
      "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://www.googleapis.com https://sheets.googleapis.com https://accounts.google.com https://formsubmit.co https://www.google-analytics.com https://region1.google-analytics.com https://www.google.com https://stats.g.doubleclick.net",
      "frame-src 'self' blob: data: https://accounts.google.com https://content.googleapis.com https://www.youtube.com",
      "img-src 'self' data: https: https://www.google-analytics.com https://stats.g.doubleclick.net",
      "worker-src 'self' blob:",
      "object-src 'self'",
      "base-uri 'self'",
    ].join('; ') + ';';

    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://niggunsheet.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Origin, X-Requested-With, Content-Type, Accept, Authorization' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
