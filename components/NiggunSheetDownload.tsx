'use client';

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { jsPDF } from 'jspdf';

// ─── Types ───────────────────────────────────────────────────────

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

// ─── Layout constants (in PDF points, 1pt = 1/72") ──────────────

const PAGE_W = 612;           // letter width
const PAGE_H = 792;           // letter height
const PAD_TOP = 34;
const PAD_SIDE = 36;
const PAD_BOTTOM = 84;        // footer clearance
const COL_GAP = 8;
const SONG_MARGIN = 10;
const TARGET_PAGES = 2;
const NUM_COLS = 4;

const CONTENT_W = PAGE_W - PAD_SIDE * 2;                         // 540
const COL_W = (CONTENT_W - (NUM_COLS - 1) * COL_GAP) / NUM_COLS; // ~129
const CONTENT_H = PAGE_H - PAD_TOP - PAD_BOTTOM;                 // 674

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

// ─── Text wrapping utility ───────────────────────────────────────

export function wrapText(pdf: jsPDF, text: string, maxWidth: number): string[] {
  // Split on existing newlines, then wrap each physical line
  const result: string[] = [];
  for (const rawLine of text.split('\n')) {
    if (rawLine.trim() === '') {
      result.push('');
      continue;
    }
    const words = rawLine.split(/\s+/);
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
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

// ─── Measure a song's height ─────────────────────────────────────

const TITLE_SCALE = 0.9;
const ARTIST_SCALE = 0.65;
const TITLE_GAP = 2; // extra pts between title and lyrics

export interface MeasuredSong {
  titleLines: string[];
  artistLines: string[];
  lyricLines: string[];
  height: number;
}

export function measureSong(pdf: jsPDF, song: Song, fontSize: number, colW: number, opts: PDFOptions): MeasuredSong {
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

// ─── Distribute songs into columns/pages ─────────────────────────

type ColEntry = { songIdx: number };
type PageCols = ColEntry[][];

export function distribute(
  heights: number[],
  maxPages: number = Infinity,
): { pages: PageCols[]; fitted: number } {
  const totalSlots = maxPages * NUM_COLS;
  const pages: PageCols[] = [Array.from({ length: NUM_COLS }, () => [])];
  let pageIdx = 0;
  let colIdx = 0;
  let colHeight = 0;
  let fitted = 0;

  for (let s = 0; s < heights.length; s++) {
    const h = heights[s];

    if (colHeight + h > CONTENT_H && colHeight > 0) {
      colIdx++;
      colHeight = 0;

      if (colIdx >= NUM_COLS) {
        pageIdx++;
        colIdx = 0;
        if (pageIdx >= maxPages) break; // hard cap
        pages.push(Array.from({ length: NUM_COLS }, () => []));
      }
    }

    pages[pageIdx][colIdx].push({ songIdx: s });
    colHeight += h;
    fitted++;
  }

  return { pages, fitted };
}

// ─── Check if any original line would word-wrap at given font size ─

export function linesRespected(pdf: jsPDF, songs: Song[], fontSize: number, opts: PDFOptions): boolean {
  const maxW = COL_W - 6;

  // Check lyrics (only in non-setList mode)
  if (!opts.setList) {
    pdf.setFontSize(fontSize);
    pdf.setFont('FrankRuhlLibre', 'medium');
    for (const song of songs) {
      if (!song.lyrics) continue;
      for (const rawLine of song.lyrics.split('\n')) {
        if (rawLine.trim() === '') continue;
        if (pdf.getTextWidth(rawLine) > maxW) return false;
      }
    }
  }

  // Check titles
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

// ─── Count pages needed for a given font size ────────────────────

export function countPages(pdf: jsPDF, songs: Song[], fontSize: number, opts: PDFOptions): number {
  const heights = songs.map((song) => measureSong(pdf, song, fontSize, COL_W, opts).height);
  const { pages } = distribute(heights);
  return pages.length;
}

// ─── Find best font size (binary search to maximise size within target) ─

const MIN_FONT = 5;

export function fitsAt(pdf: jsPDF, songs: Song[], fontSize: number, opts: PDFOptions, targetPages: number): boolean {
  return countPages(pdf, songs, fontSize, opts) <= targetPages && linesRespected(pdf, songs, fontSize, opts);
}

export function findBestFontSize(pdf: jsPDF, songs: Song[], opts: PDFOptions): number {
  const targetPages = opts.setList ? 1 : TARGET_PAGES;
  // First try the predefined configs from largest to smallest
  for (const config of CONFIGS) {
    if (fitsAt(pdf, songs, config.fontSize, opts, targetPages)) {
      return config.fontSize;
    }
  }

  // If smallest config still overflows, binary-search for exact fit
  let lo = MIN_FONT;
  let hi = CONFIGS[CONFIGS.length - 1].fontSize;
  for (let i = 0; i < 20; i++) {
    const mid = Math.round((lo + hi) * 10) / 10; // round to 0.1
    if (mid === lo) break;
    if (fitsAt(pdf, songs, mid, opts, targetPages)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return lo;
}

// ─── Load font as ArrayBuffer → base64 ──────────────────────────

async function loadFont(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ─── Render sheetskin background ─────────────────────────────────

async function loadImageBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

// ─── Build PDF natively ──────────────────────────────────────────

async function buildPDF(songs: Song[], opts: PDFOptions): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  // Load & register fonts
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

  // Auto-fit: find largest font that fits in TARGET_PAGES
  const fontSize = findBestFontSize(pdf, songs, opts);
  const lineH = fontSize * 1.25;

  // Pre-measure all songs
  const measured = songs.map((song) => measureSong(pdf, song, fontSize, COL_W, opts));

  // Distribute into target pages (hard cap)
  const targetPages = opts.setList ? 1 : TARGET_PAGES;
  const heights = measured.map((m) => m.height);
  const { pages: allPages } = distribute(heights, targetPages);

  // Ensure exactly targetPages pages exist (pad with empty pages if needed)
  while (allPages.length < targetPages) {
    allPages.push(Array.from({ length: NUM_COLS }, () => []));
  }

  // Render each page
  for (let p = 0; p < allPages.length; p++) {
    if (p > 0) pdf.addPage();

    // Background
    pdf.addImage(bgDataUrl, 'PNG', 0, 0, PAGE_W, PAGE_H);

    const pageCols = allPages[p];

    // Draw column separator lines (set list only)
    if (opts.setList) {
      for (let c = 1; c < NUM_COLS; c++) {
        const lineX = PAGE_W - PAD_SIDE - c * COL_W - (c - 0.5) * COL_GAP;
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.5);
        pdf.line(lineX, PAD_TOP, lineX, PAGE_H - PAD_BOTTOM);
      }
    }

    for (let c = 0; c < NUM_COLS; c++) {
      // RTL: rightmost column first → column 0 is rightmost
      const colX = PAGE_W - PAD_SIDE - (c + 1) * COL_W - c * COL_GAP;
      let y = PAD_TOP;

      for (const entry of pageCols[c]) {
        const { titleLines, artistLines, lyricLines } = measured[entry.songIdx];
        const titleFontSize = fontSize * TITLE_SCALE;
        const titleLineH = titleFontSize * 1.25;
        const hasBody = lyricLines.length > 0 || artistLines.length > 0;

        // Title (LTR for English — bold in normal mode, regular in set list)
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

        // Artist (set list mode — Inter regular, smaller, lighter)
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

        // Lyrics (medium Frank Ruhl Libre, RTL for Hebrew)
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

// ─── Context ─────────────────────────────────────────────────────

type PreviewState = 'closed' | 'loading' | 'generating' | 'ready' | 'error';

interface DownloadContextValue {
  downloading: boolean;
  download: () => void;
}

const DownloadContext = createContext<DownloadContextValue>({
  downloading: false,
  download: () => {},
});

export function useNiggunSheetDownload() {
  return useContext(DownloadContext);
}

// ─── Provider + preview ──────────────────────────────────────────

export function NiggunSheetDownloadProvider({ children }: { children: React.ReactNode }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [state, setState] = useState<PreviewState>('closed');
  const [previewSource, setPreviewSource] = useState<string>('');
  const pdfRef = useRef<jsPDF | null>(null);
  const printSourceRef = useRef<string>('');
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [showTitles, setShowTitles] = useState(true);
  const [setList, setSetList] = useState(false);

  useEffect(() => {
    fetch('/api/songs')
      .then((r) => r.ok ? r.json() : Promise.reject('API error'))
      .then((data: Song[]) => setSongs(data))
      .catch(() => {});
  }, []);

  const generatePreview = useCallback(async (opts: PDFOptions) => {
    setState('generating');
    try {
      const pdf = await buildPDF(songs, opts);
      pdfRef.current = pdf;
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const dataUrl = pdf.output('datauristring');

      if (printSourceRef.current) {
        try { URL.revokeObjectURL(printSourceRef.current); } catch {}
      }

      printSourceRef.current = blobUrl;
      setPreviewSource(dataUrl);
      setState('ready');
    } catch (err) {
      console.error('PDF generation error:', err);
      setState('error');
    }
  }, [songs]);

  const download = useCallback(() => {
    if (state !== 'closed' || songs.length === 0) return;
    setState('loading');

    setTimeout(() => {
      generatePreview({ showTitles, setList });
    }, 400);
  }, [state, songs, showTitles, setList, generatePreview]);

  const handleToggleTitles = useCallback((checked: boolean) => {
    setShowTitles(checked);
    if (state === 'ready') generatePreview({ showTitles: checked, setList });
  }, [state, setList, generatePreview]);

  const handleToggleSetList = useCallback((checked: boolean) => {
    setSetList(checked);
    if (checked) setShowTitles(true);
    if (state === 'ready') generatePreview({ showTitles: checked ? true : showTitles, setList: checked });
  }, [state, showTitles, generatePreview]);

  const savePDF = useCallback(() => {
    if (pdfRef.current) {
      pdfRef.current.save('niggun-sheet.pdf');
    }
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

  const closePreview = useCallback(() => {
    if (printSourceRef.current) {
      try { URL.revokeObjectURL(printSourceRef.current); } catch {}
      printSourceRef.current = '';
    }
    setPreviewSource('');
    pdfRef.current = null;
    setState('closed');
  }, []);

  const busy = state === 'loading' || state === 'generating';

  return (
    <DownloadContext.Provider value={{ downloading: busy, download }}>
      {children}

      {/* ─── Preview overlay ──────────────────────────────── */}
      {state !== 'closed' && (
        <div className="ns-preview-overlay">
          {/* Toolbar */}
          <div className="ns-preview-toolbar">
            <span className="ns-preview-title">Niggun Sheet Preview</span>
            <div className="ns-preview-actions">
              {state === 'ready' && (
                <>
                  <label className={`ns-preview-checkbox${setList ? ' ns-preview-checkbox-disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={showTitles}
                      disabled={setList}
                      onChange={(e) => handleToggleTitles(e.target.checked)}
                    />
                    Show song names
                  </label>
                  <label className="ns-preview-checkbox">
                    <input
                      type="checkbox"
                      checked={setList}
                      onChange={(e) => handleToggleSetList(e.target.checked)}
                    />
                    Song list only
                  </label>
                  <button className="ns-preview-btn ns-preview-btn-download" onClick={savePDF}>
                    ↓ Save PDF
                  </button>
                  <button className="ns-preview-btn ns-preview-btn-download" onClick={printPDF}>
                    Print
                  </button>
                </>
              )}
              <button
                className="ns-preview-btn ns-preview-btn-close"
                onClick={closePreview}
                disabled={busy}
              >
                Close
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="ns-preview-content">
            {(state === 'loading' || state === 'generating') && (
              <div className="ns-preview-loading">
                <div className="ns-modal-spinner" />
                <p className="ns-preview-loading-text">
                  {state === 'loading' ? 'Getting your sheet ready...' : 'Making your PDF...'}
                </p>
              </div>
            )}

            {state === 'ready' && previewSource && (
              <iframe
                ref={previewFrameRef}
                className="ns-preview-iframe"
                src={previewSource}
                title="Niggun Sheet Preview"
              />
            )}

            {state === 'error' && (
              <div className="ns-preview-loading">
                <div className="ns-modal-icon ns-modal-icon-error">X</div>
                <p className="ns-preview-loading-text">That did not work.</p>
                <button className="ns-preview-btn ns-preview-btn-download" onClick={closePreview}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </DownloadContext.Provider>
  );
}
