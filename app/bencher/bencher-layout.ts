import type { CSSProperties } from 'react';

export interface BencherRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface BencherPageConfig {
  pageNumber: 1 | 2;
  background: string;
}

export const BENCHER_PAGES: BencherPageConfig[] = [
  { pageNumber: 1, background: '/assets/bencher/Bencher-p1.jpg' },
  { pageNumber: 2, background: '/assets/bencher/Bencher-p2.jpg' },
];

export const BENCHER_LOGO_RECT: BencherRect = {
  top: 3.5,
  left: 69.8,
  width: 25.2,
  height: 7.5,
};

export const BENCHER_SONG_DROP_RECT: BencherRect = {
  top: 4.1,
  left: 5.2,
  width: 29.7,
  height: 91.2,
};

export function rectToCss(rect: BencherRect): CSSProperties {
  return {
    top: `${rect.top}%`,
    left: `${rect.left}%`,
    width: `${rect.width}%`,
    height: `${rect.height}%`,
  };
}

export function getBencherPageBackground(pageNumber: 1 | 2) {
  return BENCHER_PAGES.find((page) => page.pageNumber === pageNumber)?.background ?? '';
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