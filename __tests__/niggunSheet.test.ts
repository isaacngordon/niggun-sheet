/**
 * Unit tests for pure functions in NiggunSheetDownload.tsx
 *
 * We mock jsPDF since the real library needs font binaries / canvas.
 * The mock's getTextWidth approximates width as chars * fontSize * factor.
 */
import {
  wrapText,
  measureSong,
  distribute,
  linesRespected,
  countPages,
  fitsAt,
  findBestFontSize,
  Song,
  PDFOptions,
} from '@/components/NiggunSheetDownload';

/* ── jsPDF mock ──────────────────────────────────────────────── */

let currentFontSize = 10;

const mockPDF = {
  setFontSize: jest.fn((s: number) => { currentFontSize = s; }),
  setFont: jest.fn(),
  // Approximate: each character is ~0.55 * fontSize wide
  getTextWidth: jest.fn((text: string) => text.length * currentFontSize * 0.55),
};

// Cast once for convenience
const pdf = mockPDF as unknown as import('jspdf').jsPDF;

beforeEach(() => {
  currentFontSize = 10;
  jest.clearAllMocks();
});

/* ── wrapText ────────────────────────────────────────────────── */

describe('wrapText', () => {
  it('returns single line when text fits', () => {
    currentFontSize = 8;
    const lines = wrapText(pdf, 'Hello', 200);
    expect(lines).toEqual(['Hello']);
  });

  it('preserves empty lines from newlines', () => {
    currentFontSize = 8;
    const lines = wrapText(pdf, 'Line1\n\nLine3', 200);
    expect(lines).toEqual(['Line1', '', 'Line3']);
  });

  it('wraps long text to multiple lines', () => {
    currentFontSize = 10;
    // Each char ≈ 5.5pt, 20-char words → 110pt each. maxWidth=130 → 1 word per line
    const lines = wrapText(pdf, 'abcdefghijklmnopqrst uvwxyzabcdefghijklmn', 130);
    expect(lines.length).toBe(2);
  });

  it('handles multiple newlines', () => {
    currentFontSize = 8;
    const lines = wrapText(pdf, 'a\nb\nc', 200);
    expect(lines).toEqual(['a', 'b', 'c']);
  });
});

/* ── distribute ──────────────────────────────────────────────── */

describe('distribute', () => {
  const CONTENT_H = 674; // PAGE_H - PAD_TOP - PAD_BOTTOM

  it('fits small songs into a single page', () => {
    const heights = new Array(8).fill(80); // 8 songs × 80pt = 640pt < 674
    const { pages, fitted } = distribute(heights);
    expect(pages.length).toBe(1);
    expect(fitted).toBe(8);
  });

  it('spills into next column when height exceeds content area', () => {
    // 9 songs × 80pt = 720pt → needs 2 columns
    const heights = new Array(9).fill(80);
    const { pages, fitted } = distribute(heights);
    expect(pages.length).toBe(1);
    expect(fitted).toBe(9);
    // Column 0 should have ~8 songs, column 1 should have 1
    expect(pages[0][0].length).toBeGreaterThan(0);
    expect(pages[0][1].length).toBeGreaterThan(0);
  });

  it('respects maxPages limit', () => {
    // Many tall songs to fill > 2 pages
    const heights = new Array(100).fill(200);
    const { pages, fitted } = distribute(heights, 2);
    expect(pages.length).toBeLessThanOrEqual(2);
    expect(fitted).toBeLessThan(100);
  });

  it('returns 1 page for empty input', () => {
    const { pages, fitted } = distribute([]);
    expect(pages.length).toBe(1);
    expect(fitted).toBe(0);
  });

  it('handles exactly one song', () => {
    const { pages, fitted } = distribute([100]);
    expect(pages.length).toBe(1);
    expect(fitted).toBe(1);
    expect(pages[0][0]).toEqual([{ songIdx: 0 }]);
  });

  it('creates a second page when 4 columns are full', () => {
    // 4 columns × 674pt = 2696pt. 14 songs × 200pt = 2800pt → needs 2nd page
    const heights = new Array(14).fill(200);
    const { pages } = distribute(heights);
    expect(pages.length).toBe(2);
  });
});

/* ── measureSong ─────────────────────────────────────────────── */

describe('measureSong', () => {
  const baseSong: Song = {
    title: 'Test Song',
    lyrics: 'שלום\nעולם',
    artist: 'Artist Name',
  };

  it('includes title and lyrics in normal mode', () => {
    const opts: PDFOptions = { showTitles: true, setList: false };
    const m = measureSong(pdf, baseSong, 8, 129, opts);
    expect(m.titleLines.length).toBeGreaterThan(0);
    expect(m.lyricLines.length).toBeGreaterThan(0);
    expect(m.artistLines).toEqual([]);
    expect(m.height).toBeGreaterThan(0);
  });

  it('omits title when showTitles is false', () => {
    const opts: PDFOptions = { showTitles: false, setList: false };
    const m = measureSong(pdf, baseSong, 8, 129, opts);
    expect(m.titleLines).toEqual([]);
    expect(m.lyricLines.length).toBeGreaterThan(0);
  });

  it('shows only title and artist in set list mode', () => {
    const opts: PDFOptions = { showTitles: true, setList: true };
    const m = measureSong(pdf, baseSong, 8, 129, opts);
    expect(m.titleLines.length).toBeGreaterThan(0);
    expect(m.artistLines.length).toBeGreaterThan(0);
    expect(m.lyricLines).toEqual([]);
  });

  it('uses reduced margin in set list mode', () => {
    // Compare same song with no artist/lyrics to isolate the margin difference
    const noArtistSong: Song = { title: 'Test Song', lyrics: '', artist: '' };
    const opts1: PDFOptions = { showTitles: true, setList: false };
    const opts2: PDFOptions = { showTitles: true, setList: true };
    const h1 = measureSong(pdf, noArtistSong, 8, 129, opts1).height;
    const h2 = measureSong(pdf, noArtistSong, 8, 129, opts2).height;
    // Set list margin is 60% of normal → h2 should be less
    expect(h2).toBeLessThan(h1);
  });
});

/* ── linesRespected ──────────────────────────────────────────── */

describe('linesRespected', () => {
  const COL_W_MINUS6 = 129 - 6; // ~123pt

  it('returns true for short lines at large font', () => {
    const songs: Song[] = [{ title: 'Hi', lyrics: 'שלום', artist: '' }];
    expect(linesRespected(pdf, songs, 8, { showTitles: true, setList: false })).toBe(true);
  });

  it('returns false when a lyric line is too wide', () => {
    // Create a line that exceeds column width at font size 10
    const longLine = 'א'.repeat(50); // 50 * 10 * 0.55 = 275pt > 123pt
    const songs: Song[] = [{ title: 'T', lyrics: longLine, artist: '' }];
    expect(linesRespected(pdf, songs, 10, { showTitles: true, setList: false })).toBe(false);
  });

  it('skips lyric check in setList mode', () => {
    const longLine = 'א'.repeat(50);
    const songs: Song[] = [{ title: 'T', lyrics: longLine, artist: '' }];
    // In set list mode lyrics are ignored, so only titles matter
    expect(linesRespected(pdf, songs, 10, { showTitles: true, setList: true })).toBe(true);
  });

  it('returns false when title is too wide', () => {
    const longTitle = 'A'.repeat(50); // 50 * (10*0.9) * 0.55 = 247pt > 123pt
    const songs: Song[] = [{ title: longTitle, lyrics: 'ok', artist: '' }];
    expect(linesRespected(pdf, songs, 10, { showTitles: true, setList: false })).toBe(false);
  });

  it('skips title check when showTitles is false', () => {
    const longTitle = 'A'.repeat(50);
    const songs: Song[] = [{ title: longTitle, lyrics: 'ok', artist: '' }];
    expect(linesRespected(pdf, songs, 10, { showTitles: false, setList: false })).toBe(true);
  });
});

/* ── countPages ──────────────────────────────────────────────── */

describe('countPages', () => {
  it('returns 1 for a handful of short songs', () => {
    const songs: Song[] = Array.from({ length: 4 }, (_, i) => ({
      title: `Song ${i}`,
      lyrics: 'שלום',
      artist: '',
    }));
    const n = countPages(pdf, songs, 8, { showTitles: true, setList: false });
    expect(n).toBe(1);
  });

  it('returns more pages for many songs', () => {
    const songs: Song[] = Array.from({ length: 60 }, (_, i) => ({
      title: `Song ${i}`,
      lyrics: 'שלום\nעולם\nline3\nline4\nline5\nline6\nline7\nline8',
      artist: '',
    }));
    const n = countPages(pdf, songs, 8, { showTitles: true, setList: false });
    expect(n).toBeGreaterThan(1);
  });
});

/* ── fitsAt ──────────────────────────────────────────────────── */

describe('fitsAt', () => {
  const fewSongs: Song[] = Array.from({ length: 4 }, (_, i) => ({
    title: `Song ${i}`,
    lyrics: 'שלום',
    artist: '',
  }));

  it('returns true when songs fit within target pages', () => {
    expect(fitsAt(pdf, fewSongs, 8, { showTitles: true, setList: false }, 2)).toBe(true);
  });

  it('returns false when a very large font overflows pages', () => {
    const manySongs: Song[] = Array.from({ length: 60 }, (_, i) => ({
      title: `Song ${i}`,
      lyrics: 'שלום\nעולם\nline3\nline4\nline5',
      artist: '',
    }));
    expect(fitsAt(pdf, manySongs, 10.5, { showTitles: true, setList: false }, 1)).toBe(false);
  });
});

/* ── findBestFontSize ────────────────────────────────────────── */

describe('findBestFontSize', () => {
  it('returns a font size >= 5 (minimum)', () => {
    const songs: Song[] = Array.from({ length: 60 }, (_, i) => ({
      title: `Song ${i}`,
      lyrics: 'שלום\nעולם\nline3\nline4',
      artist: '',
    }));
    const size = findBestFontSize(pdf, songs, { showTitles: true, setList: false });
    expect(size).toBeGreaterThanOrEqual(5);
  });

  it('picks a larger font for fewer songs', () => {
    const few: Song[] = [{ title: 'Song', lyrics: 'שלום', artist: '' }];
    const many: Song[] = Array.from({ length: 50 }, (_, i) => ({
      title: `Song ${i}`,
      lyrics: 'שלום\nעולם\nline3\nline4\nline5\nline6',
      artist: '',
    }));
    const sizeFew = findBestFontSize(pdf, few, { showTitles: true, setList: false });
    const sizeMany = findBestFontSize(pdf, many, { showTitles: true, setList: false });
    expect(sizeFew).toBeGreaterThanOrEqual(sizeMany);
  });

  it('targets 1 page in set list mode', () => {
    const songs: Song[] = Array.from({ length: 30 }, (_, i) => ({
      title: `Song ${i}`,
      lyrics: 'שלום\nעולם',
      artist: 'Artist',
    }));
    const size = findBestFontSize(pdf, songs, { showTitles: true, setList: true });
    expect(size).toBeGreaterThanOrEqual(5);
    // Verify it actually fits in 1 page
    expect(countPages(pdf, songs, size, { showTitles: true, setList: true })).toBeLessThanOrEqual(1);
  });
});
