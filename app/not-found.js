'use client';

import Link from 'next/link';
import Header from './components/Header';
import Footer from './components/Footer';

export default function NotFound() {
  return (
    <>
      <style jsx>{`
        #error-content {
          text-align: center;
          padding: 5rem 2rem;
          min-height: 60vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        p {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        a {
          color: #EAB308;
          text-decoration: none;
        }

        a:hover {
          text-decoration: underline;
        }
      `}</style>

      <Header />

      <div id="error-content">
        <h1>404 Not Found</h1>
        <p>Oops! The page you're looking for doesn't exist.</p>
        <p>
          You may want to head back to the <Link href="/">homepage</Link>.
        </p>
      </div>

      <Footer />
    </>
  );
}
