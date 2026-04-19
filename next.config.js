/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
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
      "connect-src 'self' https://www.googleapis.com https://sheets.googleapis.com https://accounts.google.com https://formsubmit.co",
      "frame-src https://accounts.google.com https://content.googleapis.com https://www.youtube.com",
      "img-src 'self' data: https:",
      "object-src 'none'",
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
