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

export type BencherMode = '2-page' | '4-page';

export interface BencherModeConfig {
  mode: BencherMode;
  label: string;
  pages: BencherPageConfig[];
}

export const DEFAULT_BENCHER_MODE: BencherMode = '2-page';

export const BENCHER_MODE_CONFIGS: BencherModeConfig[] = [
  {
    mode: '2-page',
    label: 'Double Sided',
    pages: [
      { pageNumber: 1, background: '/assets/bencher/Bencher-2pg-p1.svg' },
      { pageNumber: 2, background: '/assets/bencher/Bencher-2pg-p2.svg' },
    ],
  },
  {
    mode: '4-page',
    label: 'Booklet',
    pages: [
      { pageNumber: 1, background: '/assets/bencher/Bencher-4pg-p1.svg' },
      { pageNumber: 2, background: '/assets/bencher/Bencher-4pg-p2.svg' },
      { pageNumber: 3, background: '/assets/bencher/Bencher-4pg-p3.svg' },
      { pageNumber: 4, background: '/assets/bencher/Bencher-4pg-p4.svg' },
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

const BENCHER_FOUR_PAGE_MAIN_RECT: BencherRect = {
  top: 3.5,
  left: 5,
  width: 45.2,
  height: 92,
};

const BENCHER_FOUR_PAGE_LOGO_RECT: BencherRect = {
  top: 4,
  left: 51.8,
  width: 42.9,
  height: 9.3,
};

const BENCHER_LOGO_PLACEMENTS: Record<BencherMode, BencherPagePlacement> = {
  '2-page': {
    pageNumber: 1,
    rect: BENCHER_TWO_PAGE_LOGO_RECT,
  },
  '4-page': {
    pageNumber: 1,
    rect: BENCHER_FOUR_PAGE_LOGO_RECT,
  },
};

const BENCHER_SONG_DROP_PLACEMENTS: Record<BencherMode, BencherPagePlacement> = {
  '2-page': {
    pageNumber: 2,
    rect: BENCHER_TWO_PAGE_SONG_DROP_RECT,
  },
  '4-page': {
    pageNumber: 4,
    rect: BENCHER_FOUR_PAGE_MAIN_RECT,
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