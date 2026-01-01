'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import CornerBanner from './components/CornerBanner';

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const performSearch = () => {
    if (searchQuery) {
      router.push(`/songs?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  return (
    <>
      <style jsx>{`
        :root {
          --bg-dark: #0d0d0d;
          --bg-darker: #050505;
          --accent: #EAB308;
          --text-primary: #ffffff;
          --text-secondary: #a0a0a0;
        }

        .container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .hero-section {
          background-color: var(--bg-darker);
          position: relative;
          overflow: hidden;
          padding: 5rem 0;
        }

        .hero-content {
          position: relative;
          z-index: 10;
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }

        .hero-title {
          font-size: 3.5rem;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          font-weight: 800;
        }

        .hero-description {
          font-size: 1.25rem;
          margin-bottom: 2.5rem;
          color: var(--text-secondary);
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero-search {
          max-width: 500px;
          margin: 0 auto 2rem;
        }

        .hero-search input {
          width: 100%;
          padding: 1rem 1.5rem;
          border-radius: 0.5rem;
          background-color: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          font-size: 1rem;
        }

        .hero-search input:focus {
          outline: none;
          border-color: var(--accent);
        }

        .hero-buttons {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .hero-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 1rem;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .primary-button {
          background-color: var(--accent);
          color: #000000;
        }

        .primary-button:hover {
          background-color: #c98f00;
        }

        .secondary-button {
          background-color: transparent;
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
        }

        .secondary-button:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        .subhero-section {
          padding: 5rem 0;
          background-color: var(--bg-dark);
        }

        .subhero-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .subhero-title {
          font-size: 2.25rem;
          margin-bottom: 1.5rem;
          font-weight: 700;
        }

        .subhero-description {
          color: var(--text-secondary);
          max-width: 700px;
          margin-bottom: 2rem;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.5rem;
          }
          
          .hero-description {
            font-size: 1.125rem;
          }
          
          .hero-buttons {
            flex-direction: column;
            width: 100%;
            max-width: 300px;
            margin: 0 auto;
          }
          
          .subhero-title {
            font-size: 1.75rem;
          }
        }

        .text-header-link {
          color: #a0a0a0;
        }
      `}</style>

      <Header />
      
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">Discover Your Perfect Niggun</h1>
            <p className="hero-description">
              Goodbye Copy and Paste, Hello Drag and Drop <br />
              the next generation of Kumzits Sheets has arrived
            </p>
            <div className="hero-search">
              <input 
                type="search" 
                placeholder="Search for a niggun..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="hero-buttons">
              <a href="https://drive.google.com/file/d/1X_aY7tb7E9RxKVyXDYkGAC_wMGznGJe6/view?usp=drive_link" target="_blank" rel="noopener noreferrer" className="hero-button primary-button">
                Download Niggun Sheet
              </a>
              <a href="https://drive.google.com/file/d/1GrpBue_ukxtR7mKjuGZljXL_X-I7Y4wu/view?usp=drive_link" target="_blank" rel="noopener noreferrer" className="hero-button secondary-button">
                Download Simcha Sheet
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="subhero-section">
        <div className="container">
          <div className="subhero-content">
            <h2 className="subhero-title">Create Your Own Sheet</h2>
            <p className="subhero-description">
              This is where you can save hours of time looking for the songs you need<br />just drag and drop and you're good to go
            </p>
            <a href="/sheet-builder" className="hero-button primary-button">Try Sheet Builder</a>
          </div>
        </div>
      </section>

      <CornerBanner />
      <Footer />

      <script src="/js/asteroids.js"></script>
    </>
  );
}
