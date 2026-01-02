'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';

function SongDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [songData, setSongData] = useState({
    title: 'Loading...',
    artist: 'Loading...',
    lyrics: 'Loading...',
    drive: '',
    youtube: '',
    spotify: ''
  });

  useEffect(() => {
    const title = searchParams.get('title') || 'Song Details';
    const artist = searchParams.get('artist') || 'Unknown Artist';
    const lyrics = searchParams.get('lyrics') || 'No lyrics available';
    const drive = searchParams.get('drive') || '';
    const youtube = searchParams.get('youtube') || '';
    const spotify = searchParams.get('spotify') || '';

    // Strip HTML tags from lyrics
    const stripHtmlTags = (html) => {
      if (!html) return "";
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent || "";
    };

    setSongData({
      title,
      artist,
      lyrics: stripHtmlTags(lyrics),
      drive,
      youtube,
      spotify
    });
  }, [searchParams]);

  const handleBack = () => {
    router.back();
  };

  return (
    <>
      <style jsx>{`
        .content-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          background-color: #121212;
          color: #f8f8f8;
        }

        #song-details {
          max-width: 800px;
          width: 90%;
          margin: 3rem auto;
          background-color: #1a1a1a;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          padding: 2rem;
        }
        
        #song-details h2 {
          color: #f8f8f8;
          margin-top: 0;
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 1rem;
          margin-bottom: 2rem;
        }
        
        #details-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        #details-container p {
          margin: 0.5rem 0;
          line-height: 1.6;
        }
        
        #details-container strong {
          color: #f8f8f8;
          font-weight: 600;
          margin-right: 0.5rem;
          display: inline-block;
          min-width: 80px;
        }
        
        #song-artist, #song-lyrics {
          direction: rtl;
          text-align: right;
          color: #f8f8f8;
        }
        
        #song-lyrics {
          background-color: rgba(255, 255, 255, 0.05);
          padding: 1.5rem;
          border-radius: 6px;
          white-space: pre-line;
          margin: 1.5rem 0 !important;
          border-left: 3px solid rgba(255, 255, 255, 0.2);
          max-height: 300px;
          overflow-y: auto;
        }
        
        .links-section {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
          flex-wrap: wrap;
        }
        
        .link-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background-color: #232323;
          padding: 0.75rem 1.25rem;
          border-radius: 6px;
          color: rgb(255, 218, 42) !important;
          text-decoration: none !important;
          transition: all 0.2s;
          border-left: 3px solid rgb(255, 218, 42);
        }
        
        .link-button:hover {
          background-color: #2d2d2d;
          transform: translateY(-2px);
        }
        
        .link-button.disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        
        .link-button span {
          color: rgb(255, 218, 42) !important;
        }
        
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background-color: rgba(255, 218, 42, 0.1);
          color: rgb(255, 218, 42) !important;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          text-decoration: none !important;
          transition: all 0.2s;
          cursor: pointer;
          border: none;
          font-size: 1rem;
        }
        
        .back-button:hover {
          background-color: rgba(255, 218, 42, 0.2);
        }
        
        @media (max-width: 768px) {
          #song-details {
            width: 95%;
            padding: 1.5rem;
            margin: 2rem auto;
          }
          
          #details-container strong {
            min-width: 70px;
          }
          
          .links-section {
            flex-direction: column;
            gap: 0.75rem;
          }
        }
      `}</style>

      <Header />

      <div className="content-wrapper">
        <div id="song-details">
          <div className="header-row">
            <button onClick={handleBack} className="back-button">← Back</button>
          </div>
          
          <h2>{songData.title}</h2>
          
          <div id="details-container">
            <p><strong>Artist:</strong> <span id="song-artist">{songData.artist}</span></p>
            
            <p><strong>Lyrics:</strong></p>
            <div id="song-lyrics">{songData.lyrics}</div>
            
            <div className="links-section">
              <a 
                href={songData.drive || '#'} 
                className={`link-button ${!songData.drive || songData.drive === 'null' || songData.drive === 'undefined' ? 'disabled' : ''}`}
                target="_blank" 
                rel="noopener noreferrer"
              >
                <span>
                  {songData.drive && songData.drive !== 'null' && songData.drive !== 'undefined' 
                    ? 'Google Drive' 
                    : 'Google Drive (Not Available)'}
                </span>
              </a>
              <a 
                href={songData.youtube || '#'} 
                className={`link-button ${!songData.youtube || songData.youtube === 'null' || songData.youtube === 'undefined' ? 'disabled' : ''}`}
                target="_blank" 
                rel="noopener noreferrer"
              >
                <span>
                  {songData.youtube && songData.youtube !== 'null' && songData.youtube !== 'undefined' 
                    ? 'YouTube' 
                    : 'YouTube (Not Available)'}
                </span>
              </a>
              <a 
                href={songData.spotify || '#'} 
                className={`link-button ${!songData.spotify || songData.spotify === 'null' || songData.spotify === 'undefined' ? 'disabled' : ''}`}
                target="_blank" 
                rel="noopener noreferrer"
              >
                <span>
                  {songData.spotify && songData.spotify !== 'null' && songData.spotify !== 'undefined' 
                    ? 'Spotify' 
                    : 'Spotify (Not Available)'}
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default function SongDetailsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SongDetailsContent />
    </Suspense>
  );
}
