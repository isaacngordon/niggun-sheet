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
      <Header />
      
      {/* Hero Section with Background Image */}
      <section className="relative overflow-hidden py-20 md:py-32" style={{
        backgroundImage: 'url(/assets/background_small.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        {/* Dark overlay for better text contrast */}
        <div className="absolute inset-0 bg-black/50"></div>
        
        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Hero Title - High Contrast */}
            <h1 className="text-hero text-shadow-lg mb-6">
              Discover Your Perfect Niggun
            </h1>
            
            {/* Hero Description - Improved Contrast */}
            <p className="text-body-large mb-8 max-w-2xl mx-auto text-shadow">
              Goodbye Copy and Paste, Hello Drag and Drop<br />
              <span className="text-text-primary font-medium">The next generation of Kumzits Sheets has arrived</span>
            </p>
            
            {/* Search Input */}
            <div className="max-w-xl mx-auto mb-8">
              <input 
                type="search" 
                placeholder="Search for a niggun..." 
                className="input-primary text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            
            {/* CTA Buttons - High Contrast */}
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a 
                href="https://drive.google.com/file/d/1X_aY7tb7E9RxKVyXDYkGAC_wMGznGJe6/view?usp=drive_link" 
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Download Niggun Sheet
              </a>
              <a 
                href="https://drive.google.com/file/d/1GrpBue_ukxtR7mKjuGZljXL_X-I7Y4wu/view?usp=drive_link" 
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Download Simcha Sheet
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Sub-Hero Section */}
      <section className="py-20 md:py-32 bg-bg-primary">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-heading-1 mb-6">
              Create Your Own Sheet
            </h2>
            <p className="text-body-large mb-8 max-w-2xl mx-auto">
              This is where you can save hours of time looking for the songs you need<br />
              <span className="text-text-primary font-medium">Just drag and drop and you're good to go</span>
            </p>
            <a 
              href="/sheet-builder" 
              className="btn-primary inline-flex items-center gap-2"
            >
              Try Sheet Builder
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Corner Banner */}
      <CornerBanner />

      <Footer />
    </>
  );
}
