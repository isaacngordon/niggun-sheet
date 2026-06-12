'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { jsPDF } from 'jspdf';

export interface Song {
  search_title?: string;
  title: string;
  lyrics: string;
  artist: string;
}

interface LayoutConfig {
  columns: number;
  fontSize: number;
}

export interface PDFOptions {
  showTitles: boolean;
  setList: boolean;
}

const PAGE_W = 612;
const PAGE_H = 792;
const PAD_TOP = 34;
const PAD_SIDE = 36;
const PAD_BOTTOM = 84;
const COL_GAP = 8;
const SONG_MARGIN = 10;
const TARGET_PAGES = 2;
const NUM_COLS = 4;

const CONTENT_W = PAGE_W - PAD_SIDE * 2;
const COL_W = (CONTENT_W - (NUM_COLS - 1) * COL_GAP) / NUM_COLS;
const CONTENT_H = PAGE_H - PAD_TOP - PAD_BOTTOM;

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

function wrapText(pdf: jsPDF, text: string, maxWidth: number): string[] {
  const result: string[] = [];
  for (const rawLine of text.split('\n')) {
    if (rawLine.trim() === '') {
      result.push('');
      continue;
    }
    const words = rawLine.split(/\s+/);
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (pdf.getTextWidth(test) > maxWidth && current) {
        result.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) result.push(current);
  }
  return result;
}

const TITLE_SCALE = 0.9;
const ARTIST_SCALE = 0.65;
const TITLE_GAP = 2;

interface MeasuredSong {
  titleLines: string[];
  artistLines: string[];
  lyricLines: string[];
  height: number;
}

function measureSong(pdf: jsPDF, song: Song, fontSize: number, colW: number, opts: PDFOptions): MeasuredSong {
  const lineH = fontSize * 1.25;
  const titleFontSize = fontSize * TITLE_SCALE;
  const titleLineH = titleFontSize * 1.25;

  let titleLines: string[] = [];
  if (opts.showTitles) {
    pdf.setFontSize(titleFontSize);
    pdf.setFont('Inter', opts.setList ? 'normal' : 'bold');
    titleLines = wrapText(pdf, song.title, colW - 6);
  }

  const artistFontSize = fontSize * ARTIST_SCALE;
  const artistLineH = artistFontSize * 1.25;
  let artistLines: string[] = [];

  if (opts.setList && song.artist) {
    pdf.setFontSize(artistFontSize);
    pdf.setFont('Inter', 'normal');
    artistLines = wrapText(pdf, song.artist, colW - 6);
  }

  let lyricLines: string[] = [];
  if (!opts.setList) {
    pdf.setFontSize(fontSize);
    pdf.setFont('FrankRuhlLibre', 'medium');
    lyricLines = song.lyrics ? wrapText(pdf, song.lyrics, colW - 6) : [];
  }

  const hasBody = lyricLines.length > 0 || artistLines.length > 0;
  const margin = opts.setList ? SONG_MARGIN * 0.6 : SONG_MARGIN;
  const height =
    titleLines.length * titleLineH +
    (titleLines.length > 0 && hasBody ? TITLE_GAP : 0) +
    artistLines.length * artistLineH +
    lyricLines.length * lineH +
    margin;

  return { titleLines, artistLines, lyricLines, height };
}

type ColEntry = { songIdx: number };
type PageCols = ColEntry[][];

function distribute(heights: number[], maxPages: number = Infinity): { pages: PageCols[]; fitted: number } {
  const pages: PageCols[] = [Array.from({ length: NUM_COLS }, () => [])];
  let pageIdx = 0;
  let colIdx = 0;
  let colHeight = 0;
  let fitted = 0;

  for (let s = 0; s < heights.length; s += 1) {
    const h = heights[s];
    if (colHeight + h > CONTENT_H && colHeight > 0) {
      colIdx += 1;
      colHeight = 0;

      if (colIdx >= NUM_COLS) {
        pageIdx += 1;
        colIdx = 0;
        if (pageIdx >= maxPages) break;
        pages.push(Array.from({ length: NUM_COLS }, () => []));
      }
    }

    pages[pageIdx][colIdx].push({ songIdx: s });
    colHeight += h;
    fitted += 1;
  }

  return { pages, fitted };
}

function linesRespected(pdf: jsPDF, songs: Song[], fontSize: number, opts: PDFOptions): boolean {
  const maxW = COL_W - 6;

  if (!opts.setList) {
    pdf.setFontSize(fontSize);
    pdf.setFont('FrankRuhlLibre', 'medium');
    for (const song of songs) {
      if (!song.lyrics) continue;
      for (const rawLine of song.lyrics.split('\n')) {
        if (rawLine.trim() !== '' && pdf.getTextWidth(rawLine) > maxW) return false;
      }
    }
  }

  if (opts.showTitles) {
    const titleFontSize = fontSize * TITLE_SCALE;
    pdf.setFontSize(titleFontSize);
    pdf.setFont('Inter', opts.setList ? 'normal' : 'bold');
    for (const song of songs) {
      if (pdf.getTextWidth(song.title) > maxW) return false;
    }
  }

  return true;
}

function countPages(pdf: jsPDF, songs: Song[], fontSize: number, opts: PDFOptions): number {
  const heights = songs.map((song) => measureSong(pdf, song, fontSize, COL_W, opts).height);
  const { pages } = distribute(heights);
  return pages.length;
}

const MIN_FONT = 5;

function fitsAt(pdf: jsPDF, songs: Song[], fontSize: number, opts: PDFOptions, targetPages: number): boolean {
  return countPages(pdf, songs, fontSize, opts) <= targetPages && linesRespected(pdf, songs, fontSize, opts);
}

function findBestFontSize(pdf: jsPDF, songs: Song[], opts: PDFOptions): number {
  const targetPages = opts.setList ? 1 : TARGET_PAGES;
  for (const config of CONFIGS) {
    if (fitsAt(pdf, songs, config.fontSize, opts, targetPages)) {
      return config.fontSize;
    }
  }

  let lo = MIN_FONT;
  let hi = CONFIGS[CONFIGS.length - 1].fontSize;
  for (let i = 0; i < 20; i += 1) {
    const mid = Math.round((lo + hi) * 10) / 10;
    if (mid === lo) break;
    if (fitsAt(pdf, songs, mid, opts, targetPages)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return lo;
}

async function loadFont(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function loadImageBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

async function buildPDF(songs: Song[], opts: PDFOptions): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const [regular64, medium64, bold64, interRegular64, interBold64, bgDataUrl] = await Promise.all([
    loadFont('/assets/fonts/FrankRuhlLibre-400.ttf'),
    loadFont('/assets/fonts/FrankRuhlLibre-500.ttf'),
    loadFont('/assets/fonts/FrankRuhlLibre-700.ttf'),
    loadFont('/assets/fonts/Inter-400.ttf'),
    loadFont('/assets/fonts/Inter-700.ttf'),
    loadImageBase64('/assets/sheetskin.png'),
  ]);

  pdf.addFileToVFS('FrankRuhlLibre-Regular.ttf', regular64);
  pdf.addFont('FrankRuhlLibre-Regular.ttf', 'FrankRuhlLibre', 'normal');
  pdf.addFileToVFS('FrankRuhlLibre-Medium.ttf', medium64);
  pdf.addFont('FrankRuhlLibre-Medium.ttf', 'FrankRuhlLibre', 'medium');
  pdf.addFileToVFS('FrankRuhlLibre-Bold.ttf', bold64);
  pdf.addFont('FrankRuhlLibre-Bold.ttf', 'FrankRuhlLibre', 'bold');
  pdf.addFileToVFS('Inter-Regular.ttf', interRegular64);
  pdf.addFont('Inter-Regular.ttf', 'Inter', 'normal');
  pdf.addFileToVFS('Inter-Bold.ttf', interBold64);
  pdf.addFont('Inter-Bold.ttf', 'Inter', 'bold');

  pdf.setFont('FrankRuhlLibre', 'normal');
  pdf.setR2L(true);

  const fontSize = findBestFontSize(pdf, songs, opts);
  const lineH = fontSize * 1.25;
  const measured = songs.map((song) => measureSong(pdf, song, fontSize, COL_W, opts));
  const targetPages = opts.setList ? 1 : TARGET_PAGES;
  const heights = measured.map((m) => m.height);
  const { pages: allPages } = distribute(heights, targetPages);

  while (allPages.length < targetPages) {
    allPages.push(Array.from({ length: NUM_COLS }, () => []));
  }

  for (let p = 0; p < allPages.length; p += 1) {
    if (p > 0) pdf.addPage();
    pdf.addImage(bgDataUrl, 'PNG', 0, 0, PAGE_W, PAGE_H);

    const pageCols = allPages[p];

    if (opts.setList) {
      for (let c = 1; c < NUM_COLS; c += 1) {
        const lineX = PAGE_W - PAD_SIDE - c * COL_W - (c - 0.5) * COL_GAP;
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.5);
        pdf.line(lineX, PAD_TOP, lineX, PAGE_H - PAD_BOTTOM);
      }
    }

    for (let c = 0; c < NUM_COLS; c += 1) {
      const colX = PAGE_W - PAD_SIDE - (c + 1) * COL_W - c * COL_GAP;
      let y = PAD_TOP;

      for (const entry of pageCols[c]) {
        const { titleLines, artistLines, lyricLines } = measured[entry.songIdx];
        const titleFontSize = fontSize * TITLE_SCALE;
        const titleLineH = titleFontSize * 1.25;
        const hasBody = lyricLines.length > 0 || artistLines.length > 0;

        if (titleLines.length > 0) {
          pdf.setR2L(false);
          pdf.setFont('Inter', opts.setList ? 'normal' : 'bold');
          pdf.setFontSize(titleFontSize);
          pdf.setTextColor(opts.setList ? 60 : 26, opts.setList ? 60 : 26, opts.setList ? 60 : 26);
          for (const line of titleLines) {
            y += titleLineH;
            pdf.text(line, colX + COL_W - 3, y, { align: 'right' });
          }
          if (hasBody) y += TITLE_GAP;
        }

        if (artistLines.length > 0) {
          const artistFontSize = fontSize * ARTIST_SCALE;
          const artistLineH = artistFontSize * 1.25;
          pdf.setR2L(false);
          pdf.setFont('Inter', 'normal');
          pdf.setFontSize(artistFontSize);
          pdf.setTextColor(130, 130, 130);
          for (const line of artistLines) {
            y += artistLineH;
            pdf.text(line, colX + COL_W - 3, y, { align: 'right' });
          }
        }

        if (lyricLines.length > 0) {
          pdf.setR2L(true);
          pdf.setFontSize(fontSize);
          pdf.setFont('FrankRuhlLibre', 'medium');
          pdf.setTextColor(51, 51, 51);
          for (const line of lyricLines) {
            y += lineH;
            pdf.text(line, colX + COL_W - 3, y, { align: 'right' });
          }
        }

        y += opts.setList ? SONG_MARGIN * 0.6 : SONG_MARGIN;
      }
    }
  }

  return pdf;
}

type PreviewState = 'loading' | 'generating' | 'ready' | 'error';

export default function NiggunSheetDownloadModal({ onClose }: { onClose: () => void }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [state, setState] = useState<PreviewState>('loading');
  const [previewSource, setPreviewSource] = useState('');
  const [showTitles, setShowTitles] = useState(true);
  const [setList, setSetList] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pdfRef = useRef<jsPDF | null>(null);
  const printSourceRef = useRef('');
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);

  const generatePreview = useCallback(async (loadedSongs: Song[], opts: PDFOptions) => {
    setState('generating');
    try {
      const pdf = await buildPDF(loadedSongs, opts);
      pdfRef.current = pdf;
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);

      if (printSourceRef.current) {
        try { URL.revokeObjectURL(printSourceRef.current); } catch {}
      }

      printSourceRef.current = blobUrl;
      setPreviewSource(blobUrl);
      setState('ready');
    } catch (err) {
      console.error('PDF generation error:', err);
      setState('error');
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [mounted]);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/songs');
        if (!response.ok) {
          throw new Error(`Failed to load songs (${response.status})`);
        }
        const loadedSongs = await response.json() as Song[];
        if (cancelled) return;
        setSongs(loadedSongs);
        await generatePreview(loadedSongs, { showTitles: true, setList: false });
      } catch (err) {
        console.error('Preview generation error:', err);
        if (!cancelled) {
          setState('error');
        }
      }
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      if (printSourceRef.current) {
        try { URL.revokeObjectURL(printSourceRef.current); } catch {}
        printSourceRef.current = '';
      }
    };
  }, [generatePreview]);

  const handleToggleTitles = useCallback((checked: boolean) => {
    setShowTitles(checked);
    void generatePreview(songs, { showTitles: checked, setList });
  }, [generatePreview, setList, songs]);

  const handleToggleSetList = useCallback((checked: boolean) => {
    setSetList(checked);
    const nextShowTitles = checked ? true : showTitles;
    if (checked) setShowTitles(true);
    void generatePreview(songs, { showTitles: nextShowTitles, setList: checked });
  }, [generatePreview, showTitles, songs]);

  const savePDF = useCallback(() => {
    pdfRef.current?.save('niggun-sheet.pdf');
  }, []);

  const printPDF = useCallback(() => {
    const source = printSourceRef.current || previewSource;
    if (!source) return;

    const frame = previewFrameRef.current ?? document.createElement('iframe');
    const isTemporaryFrame = frame !== previewFrameRef.current;
    if (isTemporaryFrame) {
      frame.style.position = 'fixed';
      frame.style.right = '0';
      frame.style.bottom = '0';
      frame.style.width = '0';
      frame.style.height = '0';
      frame.style.border = '0';
      frame.style.opacity = '0';
      document.body.appendChild(frame);
    }

    const triggerPrint = () => {
      window.setTimeout(() => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
        } finally {
          if (isTemporaryFrame) {
            window.setTimeout(() => frame.remove(), 1000);
          }
        }
      }, 250);
    };

    if (frame.src !== source) {
      frame.onload = () => {
        frame.onload = null;
        triggerPrint();
      };
      frame.src = source;
      return;
    }

    triggerPrint();
  }, [previewSource]);

  const busy = state === 'loading' || state === 'generating';

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className="ns-preview-overlay">
      <div className="ns-preview-toolbar">
        <span className="ns-preview-title">Niggun Sheet Preview</span>
        <div className="ns-preview-actions">
          {state === 'ready' ? (
            <>
              <label className={`ns-preview-checkbox${setList ? ' ns-preview-checkbox-disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={showTitles}
                  disabled={setList}
                  onChange={(event) => handleToggleTitles(event.target.checked)}
                />
                Show Titles
              </label>
              <label className="ns-preview-checkbox">
                <input
                  type="checkbox"
                  checked={setList}
                  onChange={(event) => handleToggleSetList(event.target.checked)}
                />
                Set List
              </label>
              <button className="ns-preview-btn ns-preview-btn-download" onClick={savePDF}>
                ↓ Download PDF
              </button>
              <button className="ns-preview-btn ns-preview-btn-download" onClick={printPDF}>
                Print
              </button>
            </>
          ) : null}
          <button className="ns-preview-btn ns-preview-btn-close" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>
      </div>

      <div className="ns-preview-content">
        {busy ? (
          <div className="ns-preview-loading">
            <div className="ns-modal-spinner" />
            <p className="ns-preview-loading-text">
              {state === 'loading' ? 'Preparing your sheet…' : 'Generating PDF…'}
            </p>
          </div>
        ) : null}

        {state === 'ready' && previewSource ? (
          <iframe
            ref={previewFrameRef}
            className="ns-preview-iframe"
            src={previewSource}
            title="Niggun Sheet Preview"
          />
        ) : null}

        {state === 'error' ? (
          <div className="ns-preview-loading">
            <div className="ns-modal-icon ns-modal-icon-error">X</div>
            <p className="ns-preview-loading-text">Something went wrong</p>
            <button className="ns-preview-btn ns-preview-btn-download" onClick={onClose}>
              Close
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}