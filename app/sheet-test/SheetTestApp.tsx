'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import Header from '@/components/Header';
import './sheet-test.css';

// ─── Types ───────────────────────────────────────────────────────

interface Song {
  search_title?: string;
  title: string;
  lyrics: string;
  artist: string;
}

interface LayoutConfig {
  columns: number;
  fontSize: number;
}

// Target: fit all songs onto exactly 2 pages
const TARGET_PAGES = 2;

// Page dimensions matching CSS (sheetskin border + footer clearance)
// padding: 34px top, 36px sides, 84px bottom → usable height = 792 - 34 - 84 = 674px
const PAGE_CONTENT_HEIGHT = 674;

// Song spacing: 10px margin-bottom per card
const SONG_MARGIN = 10;

// Configs to try, ordered from most readable to most compact.
// The algorithm picks the first one that fits in TARGET_PAGES.
const CONFIGS: LayoutConfig[] = [
  { columns: 4, fontSize: 10.5 },
  { columns: 4, fontSize: 9.5 },
  { columns: 4, fontSize: 9 },
  { columns: 4, fontSize: 8.5 },
  { columns: 4, fontSize: 8 },
  { columns: 4, fontSize: 7.5 },
  { columns: 4, fontSize: 7 },
  { columns: 4, fontSize: 6.5 },
];

// ─── Layout Utilities ────────────────────────────────────────────

function countPages(songs: Song[], config: LayoutConfig): number {
  if (songs.length === 0) return 0;
  let pageCount = 1;
  let currentPageHeight = 0;

  songs.forEach((song) => {
    const lines = song.lyrics ? song.lyrics.split('\n').length : 0;
    const lineHeight = config.fontSize * 1.25;
    const cardHeight = (lines + 2) * lineHeight + SONG_MARGIN;
    const effectiveHeight = cardHeight / config.columns;

    if (
      currentPageHeight + effectiveHeight > PAGE_CONTENT_HEIGHT &&
      currentPageHeight > 0
    ) {
      pageCount++;
      currentPageHeight = 0;
    }
    currentPageHeight += effectiveHeight;
  });

  return pageCount;
}

function findBestConfig(songs: Song[]): LayoutConfig {
  // Pick the first (most readable) config that fits in TARGET_PAGES
  for (const config of CONFIGS) {
    if (countPages(songs, config) <= TARGET_PAGES) {
      return config;
    }
  }
  // Fallback: most compact
  return CONFIGS[CONFIGS.length - 1];
}

function distributeToPages(songs: Song[], config: LayoutConfig): Song[][] {
  if (songs.length === 0) return [];
  const pages: Song[][] = [[]];
  let currentPageHeight = 0;

  songs.forEach((song) => {
    const lines = song.lyrics ? song.lyrics.split('\n').length : 0;
    const lineHeight = config.fontSize * 1.25;
    const cardHeight = (lines + 2) * lineHeight + SONG_MARGIN;
    const effectiveHeight = cardHeight / config.columns;

    if (
      currentPageHeight + effectiveHeight > PAGE_CONTENT_HEIGHT &&
      pages[pages.length - 1].length > 0
    ) {
      pages.push([]);
      currentPageHeight = 0;
    }
    pages[pages.length - 1].push(song);
    currentPageHeight += effectiveHeight;
  });

  return pages;
}

// ─── Main Component ──────────────────────────────────────────────

export default function SheetTestApp() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'generating' | 'done' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const pagesRef = useRef<HTMLDivElement>(null);

  // ─── Load all songs from API on mount ────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/songs');
        if (!res.ok) throw new Error('API returned ' + res.status);
        const data: Song[] = await res.json();
        setSongs(data);
        setStatus('ready');
      } catch (err) {
        setErrorMsg(String(err));
        setStatus('error');
      }
    }
    load();
  }, []);

  // ─── Auto-fit layout ─────────────────────────────────────────

  const config = songs.length > 0 ? findBestConfig(songs) : { columns: 3, fontSize: 12 };
  const pages = distributeToPages(songs, config);
  const columnClass = 'four-columns';

  // ─── Generate & Download ─────────────────────────────────────

  const generate = useCallback(async () => {
    if (!pagesRef.current) return;
    setStatus('generating');

    try {
      const pageElements = pagesRef.current.querySelectorAll('.st-sheet-page');
      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

      for (let i = 0; i < pageElements.length; i++) {
        const el = pageElements[i] as HTMLElement;

        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 612,
          height: 792,
        });

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `kumzits-sheet-page-${i + 1}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (i < pageElements.length - 1) await delay(300);
      }

      setStatus('done');
    } catch (err) {
      console.error('Error generating JPG:', err);
      setErrorMsg(String(err));
      setStatus('error');
    }
  }, []);

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="st-root">
      <div className="st-header-wrap">
        <Header />
      </div>

      <div className="st-controls">
        <div className="st-info">
          {status === 'loading' && 'Loading songs from Google Sheets...'}
          {status === 'ready' && `${songs.length} songs · ${pages.length} page${pages.length !== 1 ? 's' : ''} · ${config.columns} col · ${config.fontSize}px`}
          {status === 'generating' && 'Generating JPGs...'}
          {status === 'done' && `Done! Downloaded ${pages.length} page${pages.length !== 1 ? 's' : ''}.`}
          {status === 'error' && `Error: ${errorMsg}`}
        </div>

        <button
          className="st-generate-btn"
          onClick={generate}
          disabled={status === 'loading' || status === 'generating' || songs.length === 0}
        >
          {status === 'generating' ? 'Generating...' : 'Generate & Download JPG'}
        </button>

        {status === 'done' && (
          <button className="st-again-btn" onClick={() => setStatus('ready')}>
            Reset
          </button>
        )}
      </div>

      {/* Rendered pages (visible as preview, captured by html2canvas) */}
      <div className="st-page-container" ref={pagesRef}>
        {pages.map((pageSongs, pageIdx) => (
          <div key={pageIdx} className="st-sheet-page">
            <div className={`st-packery-grid ${columnClass}`}>
              {pageSongs.map((song, idx) => (
                <div key={idx} className="st-song-card">
                  <div className="st-song-card-title" style={{ fontSize: config.fontSize }}>
                    {song.title}
                  </div>
                  <div className="st-song-card-lyrics" style={{ fontSize: config.fontSize }}>
                    {song.lyrics || ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
