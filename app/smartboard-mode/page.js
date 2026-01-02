'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function SmartboardModeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState(48); // 3em = 48px
  const [lyrics, setLyrics] = useState('Loading...');

  useEffect(() => {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);

    // Get lyrics from URL parameter
    const lyricsParam = searchParams.get('lyrics') || 'No lyrics available';
    
    // Strip HTML tags
    const stripHtmlTags = (html) => {
      if (!html) return "";
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent || "";
    };

    setLyrics(stripHtmlTags(lyricsParam));
  }, [searchParams]);

  const increaseFontSize = () => {
    setFontSize(prev => prev + 2);
  };

  const decreaseFontSize = () => {
    setFontSize(prev => prev - 2);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <>
      <style jsx>{`
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          transition: background-color 0.5s, color 0.5s;
        }

        .page-container {
          min-height: 100vh;
          background-color: ${darkMode ? 'black' : 'white'};
          color: ${darkMode ? 'white' : 'black'};
          transition: background-color 0.5s, color 0.5s;
        }

        .primary-button {
          background-color: #f2cb05;
          color: #000000;
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }

        .secondary-button {
          background-color: transparent;
          color: #f2cb05;
          padding: 10px 20px;
          border: 1px solid #f2cb05;
          border-radius: 5px;
          cursor: pointer;
        }

        #song-lyrics-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 75vh;
        }

        #song-details {
          max-width: 80%;
          text-align: center;
        }

        #song-lyrics {
          font-size: ${fontSize}px;
          white-space: pre-line;
        }

        #mode-toggle {
          position: fixed;
          top: 10px;
          right: 10px;
          z-index: 1;
        }

        .switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 34px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 34px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: #f2cb05;
        }

        input:checked + .slider:before {
          transform: translateX(26px);
        }

        #font-size-controls {
          position: fixed;
          bottom: 10px;
          right: 10px;
          display: flex;
          gap: 10px;
        }

        .font-size-button {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background-color: #f2cb05;
          color: #000;
          border: none;
          font-size: 1.5em;
          cursor: pointer;
          font-weight: bold;
        }

        .font-size-button:hover {
          background-color: #d4a904;
        }
      `}</style>

      <div className="page-container">
        <div id="mode-toggle">
          <label className="switch">
            <input 
              type="checkbox" 
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div>
          <button 
            className="primary-button"
            style={{ marginLeft: '10px', marginTop: '10px' }}
            onClick={handleBack}
          >
            Back
          </button>
        </div>

        <div id="song-lyrics-container">
          <h2>Song Lyrics</h2>
          <div id="song-details">
            <p id="song-lyrics">{lyrics}</p>
          </div>
        </div>

        <div id="font-size-controls">
          <button className="font-size-button" onClick={increaseFontSize}>+</button>
          <button className="font-size-button" onClick={decreaseFontSize}>-</button>
        </div>
      </div>
    </>
  );
}

export default function SmartboardModePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SmartboardModeContent />
    </Suspense>
  );
}
