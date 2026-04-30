'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useNiggunSheetDownload } from '@/components/NiggunSheetDownload';

export default function HomePage() {
  const { download } = useNiggunSheetDownload();

  return (
    <>
      <Header />
      
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">The Ultimate Kumzitz Companion</div>
            <h1 className="hero-title">
              Discover Your<br />
              <span className="text-accent">Perfect Niggun</span>
            </h1>
            <p className="hero-description">
              Drag + Drop<br />
              The next generation of Kumzitz Sheets has arrived.
            </p>
            <div className="hero-search">
              <SearchInput />
            </div>
            <div className="hero-buttons">
              <button
                onClick={download}
                className="hero-button primary-button"
              >
                Download Niggun Sheet
              </button>
              <a
                href="https://drive.google.com/file/d/1GrpBue_ukxtR7mKjuGZljXL_X-I7Y4wu/view?usp=drive_link"
                target="_blank"
                rel="noopener noreferrer"
                className="hero-button secondary-button"
              >
                Download Simcha Sheet
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg></div>
              <h3>Smartboard Friendly Mode</h3>
              <p>Project scrolling lyrics that follow the music in real time for seamless group singing</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg></div>
              <h3>Drag & Drop</h3>
              <p>Create custom sheets effortlessly by dragging songs exactly where you want them</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg></div>
              <h3>Print Ready</h3>
              <p>Export beautiful, professionally formatted sheets ready for your next kumzitz</p>
            </div>
          </div>
        </div>
      </section>

      {/* Subhero Section */}
      <section className="subhero-section">
        <div className="container">
          <div className="subhero-content">
            <h2 className="subhero-title">Create Your Own Sheet</h2>
            <p className="subhero-description">
              Save hours of time looking for the songs you need.<br />
              Just search, drag, drop, and print. It&apos;s that simple.
            </p>
            <Link href="/sheet-builder" className="hero-button primary-button">
              Try Sheet Builder
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">Built for Rebbeim</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">Smartboard</div>
              <div className="stat-label">Friendly</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">Use Your Own</div>
              <div className="stat-label">Songs</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

// Client component for search input
function SearchInput() {
  return (
    <form action="/songs" method="get" className="search-form">
      <div className="search-wrapper">
        <span className="search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></span>
        <input
          type="search"
          name="search"
          placeholder="Search for a niggun..."
          className="hero-search-input"
        />
      </div>
    </form>
  );
}
