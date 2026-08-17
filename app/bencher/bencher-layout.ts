import type { CSSProperties } from 'react';

export interface BencherRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface BencherPageConfig {
  pageNumber: number;
  background: string;
}

export interface BencherPagePlacement {
  pageNumber: number;
  rect: BencherRect;
}

export type BencherMode = '2-page' | '8-page';

export interface BencherModeConfig {
  mode: BencherMode;
  label: string;
  /** Design-page width in px (shared across modes). */
  designWidth: number;
  /** Design-page height in px – derived from the physical page ratio at 768 px wide. */
  designHeight: number;
  /** Path to a multi-page PDF source (rendered via react-pdf). Takes precedence over individual page backgrounds. */
  pdfSource?: string;
  pages: BencherPageConfig[];
}

export const DEFAULT_BENCHER_MODE: BencherMode = '2-page';

export const BENCHER_MODE_CONFIGS: BencherModeConfig[] = [
  {
    mode: '2-page',
    label: 'Double Sided',
    designWidth: 768,
    designHeight: 994,
    pdfSource: '/assets/bencher/PDF1_2pg.pdf',
    pages: [
      { pageNumber: 1, background: '/assets/bencher/Bencher-2pg-p1.svg' },
      { pageNumber: 2, background: '/assets/bencher/Bencher-2pg-p2.svg' },
    ],
  },
  {
    mode: '8-page',
    label: 'Booklet',
    designWidth: 768,
    designHeight: 1187,
    pdfSource: '/assets/bencher/PDF1_SVG8.pdf',
    pages: [
      { pageNumber: 1, background: '/assets/bencher/svg8/page-1.svg' },
      { pageNumber: 2, background: '/assets/bencher/svg8/page-2.svg' },
      { pageNumber: 3, background: '/assets/bencher/svg8/page-3.svg' },
      { pageNumber: 4, background: '/assets/bencher/svg8/page-4.svg' },
      { pageNumber: 5, background: '/assets/bencher/svg8/page-5.svg' },
      { pageNumber: 6, background: '/assets/bencher/svg8/page-6.svg' },
      { pageNumber: 7, background: '/assets/bencher/svg8/page-7.svg' },
      { pageNumber: 8, background: '/assets/bencher/svg8/page-8.svg' },
    ],
  },
];

const BENCHER_TWO_PAGE_LOGO_RECT: BencherRect = {
  top: 3.5,
  left: 69.8,
  width: 25.2,
  height: 7.5,
};

const BENCHER_TWO_PAGE_SONG_DROP_RECT: BencherRect = {
  top: 4.1,
  left: 5.2,
  width: 29.7,
  height: 91.2,
};

const BENCHER_SEVEN_PAGE_MAIN_RECT: BencherRect = {
  top: 3.5,
  left: 5,
  width: 45.2,
  height: 92,
};

const BENCHER_SEVEN_PAGE_COVER_RECT: BencherRect = {
  top: 15,
  left: 15,
  width: 70,
  height: 70,
};

const BENCHER_LOGO_PLACEMENTS: Record<BencherMode, BencherPagePlacement> = {
  '2-page': {
    pageNumber: 1,
    rect: BENCHER_TWO_PAGE_LOGO_RECT,
  },
  '8-page': {
    pageNumber: 1,
    rect: BENCHER_SEVEN_PAGE_COVER_RECT,
  },
};

const BENCHER_SONG_DROP_PLACEMENTS: Record<BencherMode, BencherPagePlacement> = {
  '2-page': {
    pageNumber: 2,
    rect: BENCHER_TWO_PAGE_SONG_DROP_RECT,
  },
  '8-page': {
    pageNumber: 8,
    rect: BENCHER_SEVEN_PAGE_MAIN_RECT,
  },
};

export function rectToCss(rect: BencherRect): CSSProperties {
  return {
    top: `${rect.top}%`,
    left: `${rect.left}%`,
    width: `${rect.width}%`,
    height: `${rect.height}%`,
  };
}

export function getBencherPages(mode: BencherMode) {
  return BENCHER_MODE_CONFIGS.find((config) => config.mode === mode)?.pages ?? [];
}

export function getBencherModeConfig(mode: BencherMode): BencherModeConfig {
  return BENCHER_MODE_CONFIGS.find((config) => config.mode === mode) ?? BENCHER_MODE_CONFIGS[0];
}

export function getBencherPageBackground(mode: BencherMode, pageNumber: number) {
  return getBencherPages(mode).find((page) => page.pageNumber === pageNumber)?.background ?? '';
}

export function getBencherLogoPlacement(mode: BencherMode) {
  return BENCHER_LOGO_PLACEMENTS[mode];
}

export function getBencherSongDropPlacement(mode: BencherMode) {
  return BENCHER_SONG_DROP_PLACEMENTS[mode];
}

export function skipEveryOtherLineBreak(lyrics: string) {
  return skipEveryOtherLineBreakWithinWidth(lyrics, Number.POSITIVE_INFINITY);
}

/** Song lyric font size in design-space px. */
export const BENCHER_SONG_FONT_SIZE = 12;
/** Design-space page width the rects and font sizes are authored against. */
export const BENCHER_DESIGN_PAGE_WIDTH = 768;
const BENCHER_FONT_FALLBACK_WIDTH_RATIO = 4.3 / BENCHER_SONG_FONT_SIZE;

/** Canvas can't resolve CSS custom properties in a font string, so read the real family names once. */
let _lyricFontFamily: string | null = null;
function getLyricFontFamily(): string {
  if (_lyricFontFamily) return _lyricFontFamily;
  const fallback = 'Georgia, serif';
  if (typeof document === 'undefined') return fallback;
  const root = getComputedStyle(document.documentElement);
  const families = ['--font-frank-ruhl-libre', '--font-noto-serif-hebrew']
    .map((v) => root.getPropertyValue(v).trim())
    .filter(Boolean);
  _lyricFontFamily = families.length ? `${families.join(', ')}, ${fallback}` : fallback;
  return _lyricFontFamily;
}

export function measureBencherLyricLine(line: string, fontSize: number) {
  if (typeof document === 'undefined') {
    return line.length * fontSize * BENCHER_FONT_FALLBACK_WIDTH_RATIO;
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return line.length * fontSize * BENCHER_FONT_FALLBACK_WIDTH_RATIO;
  }

  context.font = `${fontSize}px ${getLyricFontFamily()}`;
  return context.measureText(line).width;
}

/** Reflows lyrics to the given rendered width — shared by the on-screen cards and the print view. */
export function formatBencherLyrics(lyrics: string, maxLineWidth: number, fontSize: number) {
  return skipEveryOtherLineBreakWithinWidth(lyrics || '', maxLineWidth, (line) => measureBencherLyricLine(line, fontSize));
}

/** Content width available to lyrics inside a drop-zone rect, in design-space px. */
export function bencherPrintContentWidth(rectWidthPercent: number) {
  return Math.max(0, BENCHER_DESIGN_PAGE_WIDTH * (rectWidthPercent / 100) - 24);
}

export function skipEveryOtherLineBreakWithinWidth(
  lyrics: string,
  maxLineWidth: number,
  measureLine: (line: string) => number = (line) => line.length,
) {
  return lyrics
    .split(/\r?\n/)
    .reduce<string[]>((lines, line, index) => {
      if (index % 2 === 0) {
        lines.push(line);
      } else {
        const previousLine = lines[lines.length - 1] ?? '';
        const joinedLine = `${previousLine}, ${line}`.trim();

        if (measureLine(joinedLine) <= maxLineWidth) {
          lines[lines.length - 1] = joinedLine;
        } else {
          lines.push(line);
        }
      }

      return lines;
    }, [])
    .join('\n');
}