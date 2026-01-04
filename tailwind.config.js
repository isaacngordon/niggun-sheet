/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Brand Colors
        brand: {
          yellow: '#FFD700', // Gold/Yellow - Primary accent
          'yellow-dark': '#EAB308', // Darker yellow for hover states
          'yellow-darker': '#CA8A04', // Even darker for active states
        },
        // Background Colors
        bg: {
          primary: '#000000', // Pure black
          secondary: '#0d0d0d', // Very dark gray
          tertiary: '#1a1a1a', // Slightly lighter dark gray
          elevated: '#2d2d2d', // Elevated surfaces
        },
        // Text Colors
        text: {
          primary: '#FFFFFF', // White - High contrast
          secondary: '#E5E5E5', // Light gray - Still readable
          tertiary: '#B3B3B3', // Medium gray - Less emphasis
          muted: '#808080', // Muted gray - Least emphasis
        },
        // Accent Colors
        accent: {
          success: '#10B981', // Green
          error: '#EF4444', // Red
          warning: '#F59E0B', // Orange
          info: '#3B82F6', // Blue
        },
        // Border Colors
        border: {
          primary: 'rgba(255, 255, 255, 0.2)', // 20% white
          secondary: 'rgba(255, 255, 255, 0.1)', // 10% white
          accent: '#FFD700', // Brand yellow
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', 'sans-serif'],
      },
      fontSize: {
        'hero': ['3.5rem', { lineHeight: '1.1', fontWeight: '800' }],
        'hero-mobile': ['2.5rem', { lineHeight: '1.1', fontWeight: '800' }],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(255, 215, 0, 0.3)',
        'glow-sm': '0 0 10px rgba(255, 215, 0, 0.2)',
      },
    },
  },
  plugins: [],
}
