import './globals.css';

export const metadata = {
  title: 'Niggun Sheet',
  description: 'The next generation of Kumzits Sheets - Drag and Drop your perfect niggun',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-N0MP01KGSP"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-N0MP01KGSP');
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
