/**
 * Shared geometry and types for the generated kumzitz sheet.
 *
 * Lives outside the modal so the SVG preview can reuse the exact same numbers the
 * PDF writer uses. All values are in PDF points (612 x 792 = US Letter).
 */

export interface MeasuredSong {
  titleLines: string[];
  artistLines: string[];
  lyricLines: string[];
  height: number;
}

export type ColEntry = { songIdx: number };
export type PageCols = ColEntry[][];

/** Computed sheet geometry, shared by the PDF writer and the DOM preview. */
export interface SheetLayout {
  fontSize: number;
  measured: MeasuredSong[];
  pages: PageCols[];
  showTitles: boolean;
  setList: boolean;
}

export const PAGE_W = 612;
export const PAGE_H = 792;
export const PAD_TOP = 34;
export const PAD_SIDE = 36;
export const PAD_BOTTOM = 84;
export const COL_GAP = 8;
export const NUM_COLS = 4;
export const SONG_MARGIN = 10;
export const TITLE_SCALE = 0.9;
export const ARTIST_SCALE = 0.65;
export const TITLE_GAP = 2;

export const CONTENT_W = PAGE_W - PAD_SIDE * 2;
export const COL_W = (CONTENT_W - (NUM_COLS - 1) * COL_GAP) / NUM_COLS;
export const CONTENT_H = PAGE_H - PAD_TOP - PAD_BOTTOM;

export const SHEET_GEOMETRY = {
  pageW: PAGE_W,
  pageH: PAGE_H,
  padTop: PAD_TOP,
  padSide: PAD_SIDE,
  padBottom: PAD_BOTTOM,
  colW: COL_W,
  colGap: COL_GAP,
  numCols: NUM_COLS,
  songMargin: SONG_MARGIN,
  titleScale: TITLE_SCALE,
  artistScale: ARTIST_SCALE,
  titleGap: TITLE_GAP,
  titleColor: [26, 26, 26] as const,
  artistColor: [130, 130, 130] as const,
  lyricColor: [51, 51, 51] as const,
} as const;
