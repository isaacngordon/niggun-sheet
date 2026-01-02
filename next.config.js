/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Output configuration for Vercel
  output: 'standalone',
  
  // Configure static asset serving
  images: {
    unoptimized: true,
  },
  
  // Disable x-powered-by header
  poweredByHeader: false,
  
  // Configure custom headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Origin, X-Requested-With, Content-Type, Accept, Authorization' },
        ],
      },
    ];
  },
  
  // Rewrites to serve static HTML files for complex pages
  async rewrites() {
    return [
      {
        source: '/songs',
        destination: '/songs.html',
      },
      {
        source: '/sheet-builder',
        destination: '/sheet-builder.html',
      },
    ];
  },
};

module.exports = nextConfig;
