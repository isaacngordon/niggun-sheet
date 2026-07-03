'use client';

import {
  closestCenter,
  DndContext,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import AddSongModal from '@/components/AddSongModal';
import { useDevice } from '@/hooks/useDevice';
import { useGoogleAuth } from '@/components/GoogleAuthProvider';
import type { SavedSheet } from '@/lib/google-drive';
import './sheet-builder.css';

interface Song {
  search_title?: string;
  title: string;
  lyrics: string;
  artist: string;
  drive?: string;
  youtube?: string;
}

type SheetCardFontSize = number | string;

export interface SongData {
  title: string;
  artist: string;
  lyrics: string;
}

interface SheetConfig {
  cols: number;
  fontSize: number;
}

export interface PositionedSong {
  song: SongData;
  globalIndex: number;
  orderNumber: number;
  pageIndex: number;
  columnIndex: number;
}

interface PageLayout {
  pageIndex: number;
  pageStartIndex: number;
  columns: PositionedSong[][];
  columnCounts: number[];
  slotInsertIndices: number[][];
}

interface SavedSheetPreviewData {
  sheet: SavedSheet;
  config: SheetConfig;
  pages: PageLayout[];
}

interface ConfigMeasurement {
  heights: Record<string, number>;
  hasOverflow: boolean;
}

export interface SlotDragData {
  type: 'slot';
  pageIndex: number;
  columnIndex: number;
  slotIndex: number;
  insertIndex: number;
  occupiedGlobalIndex?: number;
}

interface SheetSongDragData {
  type: 'sheet-song';
  song: SongData;
  globalIndex: number;
  pageIndex: number;
  columnIndex: number;
  orderNumber: number;
}

export interface LibrarySongDragData {
  type: 'library-song';
  song: SongData;
}

interface SheetAreaDragData {
  type: 'sheet-area';
}

type DragData = SlotDragData | SheetSongDragData | LibrarySongDragData | SheetAreaDragData;
type TourStepId =
  | 'welcome'
  | 'sheetPanel'
  | 'library'
  | 'savedSongs'
  | 'search'
  | 'sheet'
  | 'display'
  | 'manualLayout'
  | 'autoLayout'
  | 'actions';
type TourStepPlacement = 'top' | 'right' | 'bottom' | 'left';

interface TourStep {
  id: TourStepId;
  title: string;
  description: string;
  selector: string;
  placement: TourStepPlacement;
}

interface TourTargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourSnapshot {
  sidebarOpen: boolean;
  sidebarTab: 'library' | 'my';
  search: string;
  sheetTitle: string;
  sheetSongs: SongData[];
  manualLocks: number[][];
  showTitles: boolean;
  showPageNumbers: boolean;
  showOrderNumbers: boolean;
  autoFit: boolean;
  manualColumns: number;
}

const PAGE_CONTENT_HEIGHT = 636;
const PAGE_GRID_WIDTH = 512;
const GRID_GUTTER_WIDTH = 15;
const CARD_VERTICAL_GAP = 8;
const SHEET_PAGE_WIDTH = 612;
const SHEET_PAGE_HEIGHT = 792;
const MEASUREMENT_WIDTH_BUFFER = 6;
const MEASUREMENT_HEIGHT_BUFFER = 4;
const OVERFLOW_EPSILON = 1;
const SAVED_SHEET_PREVIEW_DELAY_MS = 120;
const STORAGE_KEY = 'sheetSongsV2';
const TOUR_LAUNCHER_DISMISSED_KEY = 'sheetBuilderTourLauncherDismissed';
const DEFAULT_STATUS = 'Drag songs to the sheet';
const DEFAULT_SHEET_TITLE = '';
const TOUR_CARD_WIDTH = 320;

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'This is the sheet builder',
    description: 'Pick songs from the left, put them on the sheet, then move them until the order looks right.',
    selector: '[data-tour="toolbar"]',
    placement: 'bottom',
  },
  {
    id: 'sheetPanel',
    title: 'Save and open sheets',
    description: 'Use this part to save your sheet or open one you already made. You can keep up to three saved sheets here.',
    selector: '[data-tour="sheet-section"]',
    placement: 'bottom',
  },
  {
    id: 'actions',
    title: 'Extra buttons',
    description: 'These buttons help you clear the page or print it.',
    selector: '[data-tour="actions-section"]',
    placement: 'bottom',
  },
  {
    id: 'display',
    title: 'Show or hide extras',
    description: 'Turn song names and numbers on or off here.',
    selector: '[data-tour="display-section"]',
    placement: 'bottom',
  },
  {
    id: 'manualLayout',
    title: 'Pick columns yourself',
    description: 'Choose how many columns you want on the page.',
    selector: '[data-tour="layout-section"]',
    placement: 'bottom',
  },
  {
    id: 'autoLayout',
    title: 'Let the site choose',
    description: 'Auto tries to fit everything for you.',
    selector: '[data-tour="layout-section"]',
    placement: 'bottom',
  },
  {
    id: 'savedSongs',
    title: 'Your saved songs',
    description: 'Your own songs show up here after you sign in.',
    selector: '[data-tour="saved-songs-tab"]',
    placement: 'right',
  },
  {
    id: 'search',
    title: 'Find a song',
    description: 'Type here to look for a song.',
    selector: '[data-tour="search-box"]',
    placement: 'right',
  },
  {
    id: 'library',
    title: 'Song list',
    description: 'This is the song list. Drag a song in, or double-click it to add it fast.',
    selector: '[data-tour="library-list"]',
    placement: 'right',
  },
  {
    id: 'sheet',
    title: 'Your sheet',
    description: 'This is your page. Drag songs around until they are where you want them.',
    selector: '[data-tour="sheet-canvas"]',
    placement: 'top',
  },
];

const CONFIGS: SheetConfig[] = [
  { cols: 1, fontSize: 14 },
  { cols: 2, fontSize: 14 },
  { cols: 2, fontSize: 13 },
  { cols: 2, fontSize: 12 },
  { cols: 3, fontSize: 14 },
  { cols: 3, fontSize: 13 },
  { cols: 3, fontSize: 12 },
  { cols: 2, fontSize: 11 },
  { cols: 3, fontSize: 11 },
  { cols: 2, fontSize: 10 },
  { cols: 3, fontSize: 10 },
  { cols: 2, fontSize: 9 },
  { cols: 3, fontSize: 9 },
  { cols: 2, fontSize: 8 },
  { cols: 3, fontSize: 8 },
];

const SAFE_FONT_SIZES = [14, 13, 12, 11, 10, 9, 8, 7];
const ONE_COLUMN_MIN_FONT_SIZE = 14;
const ONE_COLUMN_MAX_FONT_SIZE = 20;
const ONE_COLUMN_FONT_SIZE_STEP = 0.5;
const ONE_COLUMN_DYNAMIC_CONFIGS: SheetConfig[] = Array.from(
  { length: Math.round((ONE_COLUMN_MAX_FONT_SIZE - ONE_COLUMN_MIN_FONT_SIZE) / ONE_COLUMN_FONT_SIZE_STEP) + 1 },
  (_, index) => ({
    cols: 1,
    fontSize: Number((ONE_COLUMN_MIN_FONT_SIZE + index * ONE_COLUMN_FONT_SIZE_STEP).toFixed(2)),
  }),
);

function songKey(song: SongData) {
  return `${song.title}|${song.artist}`;
}

function configKey(config: SheetConfig) {
  return `${config.cols}-${config.fontSize}`;
}

function getColumnWidth(columns: number) {
  return (PAGE_GRID_WIDTH - GRID_GUTTER_WIDTH * Math.max(columns - 1, 0)) / Math.max(columns, 1);
}

function getMeasurementColumnWidth(columns: number) {
  const widthBuffer = columns === 1 ? 0 : MEASUREMENT_WIDTH_BUFFER;
  return Math.max(getColumnWidth(columns) - widthBuffer, 0);
}

function getSongLayoutRules(showTitles: boolean, showOrderNumbers: boolean) {
  const orderOnly = showOrderNumbers && !showTitles;

  return {
    orderOnly,
    hasTitleRow: showTitles,
  };
}

function estimateSongHeight(song: SongData, fontSize: number, showTitles: boolean, showOrderNumbers: boolean) {
  const layoutRules = getSongLayoutRules(showTitles, showOrderNumbers);
  const lyricLines = (song.lyrics || '').split('\n').length;
  const titleHeight = layoutRules.hasTitleRow ? fontSize * 1.4 + 4 : 0;
  const lyricHeight = lyricLines * fontSize * 1.35;
  return Math.ceil(titleHeight + lyricHeight + 8);
}

function getSongHeight(
  song: SongData,
  config: SheetConfig,
  measurements: Record<string, ConfigMeasurement>,
  showTitles: boolean,
  showOrderNumbers: boolean,
) {
  const measurement = measurements[configKey(config)];
  return measurement?.heights[songKey(song)] ?? estimateSongHeight(song, config.fontSize, showTitles, showOrderNumbers);
}

function finalizePageLayout(pageIndex: number, pageStartIndex: number, columns: PositionedSong[][], totalColumns: number): PageLayout {
  const normalizedColumns = Array.from({ length: totalColumns }, (_, columnIndex) => columns[columnIndex] ?? []);
  const columnCounts = normalizedColumns.map((column) => column.length);
  const slotInsertIndices = normalizedColumns.map((column, columnIndex) => {
    const startIndex = pageStartIndex + columnCounts.slice(0, columnIndex).reduce((sum, count) => sum + count, 0);
    return Array.from({ length: column.length + 1 }, (_, slotIndex) => startIndex + slotIndex);
  });

  return {
    pageIndex,
    pageStartIndex,
    columns: normalizedColumns,
    columnCounts,
    slotInsertIndices,
  };
}

function getColumnHeightForSongs(
  songs: SongData[],
  config: SheetConfig,
  measurements: Record<string, ConfigMeasurement>,
  showTitles: boolean,
  showOrderNumbers: boolean,
) {
  return songs.reduce((totalHeight, song, index) => {
    const songHeight = getSongHeight(song, config, measurements, showTitles, showOrderNumbers);
    return totalHeight + songHeight + (index > 0 ? CARD_VERTICAL_GAP : 0);
  }, 0);
}

function buildBalancedColumns(
  pageSongs: SongData[],
  pageIndex: number,
  pageStartIndex: number,
  config: SheetConfig,
  measurements: Record<string, ConfigMeasurement>,
  showTitles: boolean,
  showOrderNumbers: boolean,
) {
  const columnCount = config.cols;
  const bestResult = {
    columns: [] as SongData[][],
    spread: Number.POSITIVE_INFINITY,
    shortest: Number.NEGATIVE_INFINITY,
    tallest: Number.NEGATIVE_INFINITY,
  };

  function finalizeCandidate(candidateColumns: SongData[][]) {
    const paddedColumns = Array.from({ length: columnCount }, (_, columnIndex) => candidateColumns[columnIndex] ?? []);
    const heights = paddedColumns.map((columnSongs) =>
      getColumnHeightForSongs(columnSongs, config, measurements, showTitles, showOrderNumbers),
    );
    const tallest = Math.max(...heights);
    if (tallest > PAGE_CONTENT_HEIGHT) {
      return;
    }

    const nonEmptyHeights = heights.filter((height, index) => paddedColumns[index].length > 0);
    const spread = nonEmptyHeights.length > 0 ? Math.max(...nonEmptyHeights) - Math.min(...nonEmptyHeights) : 0;
    const shortest = nonEmptyHeights.length > 0 ? Math.min(...nonEmptyHeights) : 0;

    if (
      spread < bestResult.spread ||
      (spread === bestResult.spread && shortest > bestResult.shortest) ||
      (spread === bestResult.spread && shortest === bestResult.shortest && tallest > bestResult.tallest)
    ) {
      bestResult.columns = paddedColumns;
      bestResult.spread = spread;
      bestResult.shortest = shortest;
      bestResult.tallest = tallest;
    }
  }

  function walk(columnIndex: number, songIndex: number, candidateColumns: SongData[][]) {
    const columnsRemaining = columnCount - columnIndex;
    const songsRemaining = pageSongs.length - songIndex;

    if (columnIndex === columnCount - 1) {
      finalizeCandidate([...candidateColumns, pageSongs.slice(songIndex)]);
      return;
    }

    const minTake = songsRemaining >= columnsRemaining ? 1 : 0;
    const maxTake = songsRemaining - Math.max(columnsRemaining - 1, 0);

    for (let takeCount = minTake; takeCount <= maxTake; takeCount += 1) {
      const nextColumnSongs = pageSongs.slice(songIndex, songIndex + takeCount);
      const nextHeight = getColumnHeightForSongs(nextColumnSongs, config, measurements, showTitles, showOrderNumbers);
      if (nextHeight > PAGE_CONTENT_HEIGHT) {
        continue;
      }

      walk(columnIndex + 1, songIndex + takeCount, [...candidateColumns, nextColumnSongs]);
    }
  }

  walk(0, 0, []);

  const chosenColumns = bestResult.columns.length > 0
    ? bestResult.columns
    : Array.from({ length: columnCount }, (_, columnIndex) => (columnIndex === 0 ? [...pageSongs] : []));

  return chosenColumns.map((columnSongs, columnIndex) =>
    columnSongs.map((song, offset) => ({
      song,
      globalIndex: pageStartIndex + chosenColumns.slice(0, columnIndex).reduce((sum, column) => sum + column.length, 0) + offset,
      orderNumber: pageStartIndex + chosenColumns.slice(0, columnIndex).reduce((sum, column) => sum + column.length, 0) + offset + 1,
      pageIndex,
      columnIndex,
    })),
  );
}

function findBestAutoPageSongCount(
  remainingSongs: SongData[],
  config: SheetConfig,
  measurements: Record<string, ConfigMeasurement>,
  showTitles: boolean,
  showOrderNumbers: boolean,
) {
  let low = 1;
  let high = remainingSongs.length;
  let bestCount = 1;
  const fitCache = new Map<number, boolean>();

  const fitsCount = (count: number) => {
    const cached = fitCache.get(count);
    if (cached !== undefined) {
      return cached;
    }

    const pageSongs = remainingSongs.slice(0, count);
    const columns = buildBalancedColumns(pageSongs, 0, 0, config, measurements, showTitles, showOrderNumbers);
    const fits = columns.every((column) =>
      getColumnHeightForSongs(column.map((entry) => entry.song), config, measurements, showTitles, showOrderNumbers) <= PAGE_CONTENT_HEIGHT,
    );
    fitCache.set(count, fits);
    return fits;
  };

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (fitsCount(mid)) {
      bestCount = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return bestCount;
}

function paginateAutoSongs(
  songs: SongData[],
  config: SheetConfig,
  measurements: Record<string, ConfigMeasurement>,
  showTitles: boolean,
  showOrderNumbers: boolean,
) {
  const pages: PageLayout[] = [];
  let cursor = 0;
  let pageIndex = 0;

  while (cursor < songs.length || pages.length === 0) {
    const pageStartIndex = cursor;
    const pageSongCount = songs.length === 0 ? 0 : findBestAutoPageSongCount(
      songs.slice(cursor),
      config,
      measurements,
      showTitles,
      showOrderNumbers,
    );
    const pageSongs = songs.slice(cursor, cursor + Math.max(pageSongCount, songs.length === 0 ? 0 : 1));
    const columns = buildBalancedColumns(
      pageSongs,
      pageIndex,
      pageStartIndex,
      config,
      measurements,
      showTitles,
      showOrderNumbers,
    );

    pages.push(finalizePageLayout(pageIndex, pageStartIndex, columns, config.cols));
    cursor += pageSongs.length;
    pageIndex += 1;
  }

  return pages;
}

function paginateManualSongs(
  songs: SongData[],
  config: SheetConfig,
  manualLocks: number[][],
  measurements: Record<string, ConfigMeasurement>,
  showTitles: boolean,
  showOrderNumbers: boolean,
) {
  const pages: PageLayout[] = [];
  let cursor = 0;
  let pageIndex = 0;

  while (cursor < songs.length || pages.length === 0) {
    const pageStartIndex = cursor;
    const columns = Array.from({ length: config.cols }, () => [] as PositionedSong[]);
    const lockedCounts = manualLocks[pageIndex] ?? [];

    for (let columnIndex = 0; columnIndex < config.cols; columnIndex += 1) {
      if (columnIndex < lockedCounts.length) {
        const lockedCount = lockedCounts[columnIndex] ?? 0;
        for (let slot = 0; slot < lockedCount && cursor < songs.length; slot += 1) {
          columns[columnIndex].push({
            song: songs[cursor],
            globalIndex: cursor,
            orderNumber: cursor + 1,
            pageIndex,
            columnIndex,
          });
          cursor += 1;
        }
        continue;
      }

      let usedHeight = 0;

      while (cursor < songs.length) {
        const song = songs[cursor];
        const songHeight = getSongHeight(song, config, measurements, showTitles, showOrderNumbers);
        const nextHeight = columns[columnIndex].length === 0 ? songHeight : usedHeight + CARD_VERTICAL_GAP + songHeight;

        if (columns[columnIndex].length > 0 && nextHeight > PAGE_CONTENT_HEIGHT) {
          break;
        }

        columns[columnIndex].push({
          song,
          globalIndex: cursor,
          orderNumber: cursor + 1,
          pageIndex,
          columnIndex,
        });

        usedHeight = columns[columnIndex].length === 1 ? songHeight : nextHeight;
        cursor += 1;

        if (usedHeight >= PAGE_CONTENT_HEIGHT) {
          break;
        }
      }
    }

    if (cursor === pageStartIndex && cursor < songs.length) {
      columns[0].push({
        song: songs[cursor],
        globalIndex: cursor,
        orderNumber: cursor + 1,
        pageIndex,
        columnIndex: 0,
      });
      cursor += 1;
    }

    pages.push(finalizePageLayout(pageIndex, pageStartIndex, columns, config.cols));
    pageIndex += 1;
  }

  return pages;
}

function chooseAutoFitConfig(
  songs: SongData[],
  measurements: Record<string, ConfigMeasurement>,
  showTitles: boolean,
  showOrderNumbers: boolean,
) {
  if (songs.length === 0) {
    return CONFIGS[0];
  }

  const dynamicOneColumnConfig = resolveOneColumnDynamicConfig(
    songs,
    measurements,
    showTitles,
    showOrderNumbers,
    (config) => paginateAutoSongs(songs, config, measurements, showTitles, showOrderNumbers),
  );

  if (dynamicOneColumnConfig) {
    const oneColumnPages = paginateAutoSongs(songs, dynamicOneColumnConfig, measurements, showTitles, showOrderNumbers);
    if (oneColumnPages.length <= 1) {
      return dynamicOneColumnConfig;
    }
  }

  const candidateConfigs = dynamicOneColumnConfig
    ? dedupeConfigs([dynamicOneColumnConfig, ...CONFIGS.filter((config) => config.cols !== 1)])
    : CONFIGS;

  // Auto-fit keeps the existing CONFIGS progression for multi-column layouts.
  // One-column is an exception: it expands to the largest font size that
  // preserves its minimum page count.
  // It should not create a second page while a later config can keep the sheet on one page.
  for (const config of candidateConfigs) {
    if (!configCanRenderWithoutOverflow(config, songs, measurements, showTitles, showOrderNumbers)) continue;

    const pages = paginateAutoSongs(songs, config, measurements, showTitles, showOrderNumbers);
    if (pages.length <= 1) {
      return config;
    }
  }

  let bestConfig = CONFIGS[0];
  let bestOverflowPenalty = Number.POSITIVE_INFINITY;
  let bestPageCount = Number.POSITIVE_INFINITY;
  let bestFontSize = Number.NEGATIVE_INFINITY;
  let bestColumnCount = Number.NEGATIVE_INFINITY;
  let bestLastPageFill = Number.NEGATIVE_INFINITY;
  let bestAverageFill = Number.NEGATIVE_INFINITY;
  let bestMinFill = Number.NEGATIVE_INFINITY;

  candidateConfigs.forEach((config, index) => {
    const pages = paginateAutoSongs(songs, config, measurements, showTitles, showOrderNumbers);
    const overflowPenalty = configCanRenderWithoutOverflow(config, songs, measurements, showTitles, showOrderNumbers) ? 0 : 1;
    const pageCount = pages.length;
    const fontSize = config.fontSize;
    const columnCount = config.cols;
    const preferHigherColumnCount = pageCount > 1;

    const nonEmptyColumnFills: number[] = [];
    const lastPageColumnFills: number[] = [];

    pages.forEach((page, pageIndex) => {
      page.columns.forEach((column) => {
        if (column.length === 0) {
          return;
        }

        const columnHeight = getColumnHeightForSongs(
          column.map((entry) => entry.song),
          config,
          measurements,
          showTitles,
          showOrderNumbers,
        );
        const fill = columnHeight / PAGE_CONTENT_HEIGHT;
        nonEmptyColumnFills.push(fill);

        if (pageIndex === pages.length - 1) {
          lastPageColumnFills.push(fill);
        }
      });
    });

    const averageFill = nonEmptyColumnFills.length > 0
      ? nonEmptyColumnFills.reduce((sum, fill) => sum + fill, 0) / nonEmptyColumnFills.length
      : 0;
    const lastPageFill = lastPageColumnFills.length > 0
      ? lastPageColumnFills.reduce((sum, fill) => sum + fill, 0) / lastPageColumnFills.length
      : 0;
    const minFill = nonEmptyColumnFills.length > 0 ? Math.min(...nonEmptyColumnFills) : 0;

    const isBetter =
      overflowPenalty < bestOverflowPenalty ||
      (overflowPenalty === bestOverflowPenalty && pageCount < bestPageCount) ||
      (overflowPenalty === bestOverflowPenalty && pageCount === bestPageCount && preferHigherColumnCount && columnCount > bestColumnCount) ||
      (overflowPenalty === bestOverflowPenalty && pageCount === bestPageCount && (!preferHigherColumnCount || columnCount === bestColumnCount) && fontSize > bestFontSize) ||
      (overflowPenalty === bestOverflowPenalty && pageCount === bestPageCount && preferHigherColumnCount && columnCount === bestColumnCount && fontSize > bestFontSize) ||
      (overflowPenalty === bestOverflowPenalty && pageCount === bestPageCount && fontSize === bestFontSize && columnCount === bestColumnCount && lastPageFill > bestLastPageFill) ||
      (overflowPenalty === bestOverflowPenalty && pageCount === bestPageCount && fontSize === bestFontSize && columnCount === bestColumnCount && lastPageFill === bestLastPageFill && averageFill > bestAverageFill) ||
      (overflowPenalty === bestOverflowPenalty && pageCount === bestPageCount && fontSize === bestFontSize && columnCount === bestColumnCount && lastPageFill === bestLastPageFill && averageFill === bestAverageFill && minFill > bestMinFill) ||
      (overflowPenalty === bestOverflowPenalty && pageCount === bestPageCount && lastPageFill === bestLastPageFill && averageFill === bestAverageFill && minFill === bestMinFill && index < candidateConfigs.indexOf(bestConfig));

    if (isBetter) {
      bestConfig = config;
      bestOverflowPenalty = overflowPenalty;
      bestPageCount = pageCount;
      bestFontSize = fontSize;
      bestColumnCount = columnCount;
      bestLastPageFill = lastPageFill;
      bestAverageFill = averageFill;
      bestMinFill = minFill;
    }
  });

  return bestConfig;
}

function collectAutoFitDiagnostics(
  songs: SongData[],
  measurements: Record<string, ConfigMeasurement>,
  showTitles: boolean,
  showOrderNumbers: boolean,
) {
  return CONFIGS.map((config) => {
    const pages = paginateAutoSongs(songs, config, measurements, showTitles, showOrderNumbers);
    const overflowPenalty = configCanRenderWithoutOverflow(config, songs, measurements, showTitles, showOrderNumbers) ? 0 : 1;
    const nonEmptyColumnFills: number[] = [];
    const pageColumnCounts = pages.map((page) => page.columns.map((column) => column.length));

    pages.forEach((page) => {
      page.columns.forEach((column) => {
        if (column.length === 0) {
          return;
        }

        const columnHeight = getColumnHeightForSongs(
          column.map((entry) => entry.song),
          config,
          measurements,
          showTitles,
          showOrderNumbers,
        );
        nonEmptyColumnFills.push(columnHeight / PAGE_CONTENT_HEIGHT);
      });
    });

    const averageFill = nonEmptyColumnFills.length > 0
      ? nonEmptyColumnFills.reduce((sum, fill) => sum + fill, 0) / nonEmptyColumnFills.length
      : 0;
    const minFill = nonEmptyColumnFills.length > 0 ? Math.min(...nonEmptyColumnFills) : 0;

    return {
      config: `${config.cols} cols / ${config.fontSize}px`,
      cols: config.cols,
      fontSize: config.fontSize,
      overflowPenalty,
      pageCount: pages.length,
      averageFill: Number(averageFill.toFixed(3)),
      minFill: Number(minFill.toFixed(3)),
      pageColumnCounts: pageColumnCounts.map((counts) => `[${counts.join(', ')}]`).join(' '),
    };
  });
}

function logAutoFitSnapshot(
  reason: string,
  songs: SongData[],
  measurements: Record<string, ConfigMeasurement>,
  showTitles: boolean,
  showOrderNumbers: boolean,
  selectedConfig: SheetConfig,
  pageLayouts?: PageLayout[],
) {
  console.groupCollapsed(`[SheetBuilder][Auto] ${reason}`);
  console.log('songCount', songs.length);
  console.log('selectedConfig', selectedConfig);
  console.table(collectAutoFitDiagnostics(songs, measurements, showTitles, showOrderNumbers));

  if (pageLayouts) {
    console.log(
      'renderedLayout',
      pageLayouts.map((page) => ({
        pageIndex: page.pageIndex,
        columnSongCounts: page.columns.map((column) => column.length),
      })),
    );
  }

  console.log('songOrder', songs.map((song) => song.title));
  console.groupEnd();
}

function dedupeConfigs(configs: SheetConfig[]) {
  const seen = new Set<string>();
  return configs.filter((config) => {
    const key = configKey(config);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getMeasurementConfigSet(additionalConfigs: SheetConfig[] = []) {
  return dedupeConfigs([
    ...CONFIGS,
    ...ONE_COLUMN_DYNAMIC_CONFIGS,
    ...[1, 2, 3].flatMap((cols) => SAFE_FONT_SIZES.map((fontSize) => ({ cols, fontSize }))),
    ...additionalConfigs,
  ]);
}

function configCanRenderWithoutOverflow(
  config: SheetConfig,
  songs: SongData[],
  measurements: Record<string, ConfigMeasurement>,
  showTitles: boolean,
  showOrderNumbers: boolean,
) {
  const measurement = measurements[configKey(config)];
  if (measurement?.hasOverflow) {
    return false;
  }

  return songs.every((song) => getSongHeight(song, config, measurements, showTitles, showOrderNumbers) <= PAGE_CONTENT_HEIGHT);
}

function resolveOneColumnDynamicConfig(
  songs: SongData[],
  measurements: Record<string, ConfigMeasurement>,
  showTitles: boolean,
  showOrderNumbers: boolean,
  paginate: (config: SheetConfig) => PageLayout[],
) {
  const minStep = Math.round(ONE_COLUMN_MIN_FONT_SIZE / ONE_COLUMN_FONT_SIZE_STEP);
  const maxFontSize = ONE_COLUMN_MAX_FONT_SIZE;
  const maxStep = Math.round(maxFontSize / ONE_COLUMN_FONT_SIZE_STEP);
  const pageCountCache = new Map<number, number>();

  const getFontSizeForStep = (step: number) => Number((step * ONE_COLUMN_FONT_SIZE_STEP).toFixed(2));

  const getPageCount = (step: number) => {
    const cached = pageCountCache.get(step);
    if (cached !== undefined) {
      return cached;
    }

    const pageCount = paginate({ cols: 1, fontSize: getFontSizeForStep(step) }).length;
    pageCountCache.set(step, pageCount);
    return pageCount;
  };

  const fitsAtStep = (step: number, targetPageCount: number) => {
    const config = { cols: 1, fontSize: getFontSizeForStep(step) };
    if (!configCanRenderWithoutOverflow(config, songs, measurements, showTitles, showOrderNumbers)) {
      return false;
    }

    return getPageCount(step) <= targetPageCount;
  };

  const minPageCount = getPageCount(minStep);
  if (!fitsAtStep(minStep, minPageCount)) {
    return null;
  }

  let low = minStep;
  let high = maxStep;
  let bestStep = minStep;

  while (low <= high) {
    const step = Math.floor((low + high) / 2);
    if (fitsAtStep(step, minPageCount)) {
      bestStep = step;
      low = step + 1;
    } else {
      high = step - 1;
    }
  }

  return {
    cols: 1,
    fontSize: getFontSizeForStep(bestStep),
  } satisfies SheetConfig;
}

function resolveManualOverflowConfig(
  preferredConfig: SheetConfig,
  songs: SongData[],
  manualLocks: number[][],
  measurements: Record<string, ConfigMeasurement>,
  showTitles: boolean,
  showOrderNumbers: boolean,
) {
  if (preferredConfig.cols === 1) {
    const dynamicConfig = resolveOneColumnDynamicConfig(
      songs,
      measurements,
      showTitles,
      showOrderNumbers,
      (config) => paginateManualSongs(songs, config, manualLocks, measurements, showTitles, showOrderNumbers),
    );

    if (dynamicConfig) {
      return dynamicConfig;
    }
  }

  if (
    songs.length === 0 ||
    configCanRenderWithoutOverflow(preferredConfig, songs, measurements, showTitles, showOrderNumbers)
  ) {
    return preferredConfig;
  }

  const measurementConfigs = getMeasurementConfigSet();
  const sameColumnFallbacks = measurementConfigs
    .filter((config) => config.cols === preferredConfig.cols && config.fontSize < preferredConfig.fontSize)
    .sort((left, right) => right.fontSize - left.fontSize);

  const widerColumnFallbacks = measurementConfigs
    .filter((config) => config.cols < preferredConfig.cols && config.fontSize <= preferredConfig.fontSize)
    .sort((left, right) => {
      if (left.cols !== right.cols) {
        return left.cols - right.cols;
      }

      return right.fontSize - left.fontSize;
    });

  const narrowerColumnFallbacks = measurementConfigs
    .filter((config) => config.cols > preferredConfig.cols && config.fontSize <= preferredConfig.fontSize)
    .sort((left, right) => {
      if (left.cols !== right.cols) {
        return left.cols - right.cols;
      }

      return right.fontSize - left.fontSize;
    });

  const fallbackConfig = [...sameColumnFallbacks, ...widerColumnFallbacks, ...narrowerColumnFallbacks].find((config) =>
    configCanRenderWithoutOverflow(config, songs, measurements, showTitles, showOrderNumbers),
  );

  return fallbackConfig ?? preferredConfig;
}

function optimizeSongsForAutoLayout(
  songs: SongData[],
  config: SheetConfig,
  measurements: Record<string, ConfigMeasurement>,
  showTitles: boolean,
  showOrderNumbers: boolean,
) {
  if (songs.length <= 1) {
    return songs.map(cloneSong);
  }

  type SongWithHeight = {
    song: SongData;
    originalIndex: number;
    height: number;
  };

  type LayoutBin = {
    index: number;
    songs: SongWithHeight[];
    height: number;
  };

  const songsWithHeights = songs.map((song, index) => ({
    song,
    originalIndex: index,
    height: getSongHeight(song, config, measurements, showTitles, showOrderNumbers),
  })) satisfies SongWithHeight[];
  const totalHeight = songsWithHeights.reduce((sum, entry) => sum + entry.height, 0) + Math.max(songs.length - 1, 0) * CARD_VERTICAL_GAP;
  const minPageCount = Math.max(1, Math.ceil(totalHeight / (config.cols * PAGE_CONTENT_HEIGHT)));
  const targetPageCount = Math.max(
    minPageCount,
    paginateAutoSongs(songs, config, measurements, showTitles, showOrderNumbers).length,
  );

  for (let pageCount = targetPageCount; pageCount <= targetPageCount + 2; pageCount += 1) {
    const bins: LayoutBin[] = Array.from({ length: pageCount * config.cols }, (_, index) => ({
      index,
      songs: [],
      height: 0,
    }));

    let canPlaceAllSongs = true;

    for (const entry of songsWithHeights
      .slice()
      .sort((left, right) => right.height - left.height || left.originalIndex - right.originalIndex)) {
      if (!canPlaceAllSongs) {
        break;
      }

      let bestBinIndex = -1;
      let bestRemainingHeight = Number.POSITIVE_INFINITY;

      for (let index = 0; index < bins.length; index += 1) {
        const bin = bins[index];
        const nextHeight = bin.height + (bin.songs.length > 0 ? CARD_VERTICAL_GAP : 0) + entry.height;
        if (nextHeight > PAGE_CONTENT_HEIGHT) {
          continue;
        }

        const remainingHeight = PAGE_CONTENT_HEIGHT - nextHeight;
        if (
          remainingHeight < bestRemainingHeight ||
          (remainingHeight === bestRemainingHeight && bestBinIndex >= 0 && bin.index < bins[bestBinIndex].index) ||
          (remainingHeight === bestRemainingHeight && bestBinIndex < 0)
        ) {
          bestBinIndex = index;
          bestRemainingHeight = remainingHeight;
        }
      }

      if (bestBinIndex < 0) {
        canPlaceAllSongs = false;
        break;
      }

      const bestBin = bins[bestBinIndex];
      bestBin.songs.push(entry);
      bestBin.height += (bestBin.songs.length > 1 ? CARD_VERTICAL_GAP : 0) + entry.height;
    }

    if (!canPlaceAllSongs) {
      continue;
    }

    return bins
      .flatMap((bin) =>
        bin.songs
          .sort((left, right) => left.originalIndex - right.originalIndex)
          .map((entry) => cloneSong(entry.song)),
      );
  }

  return songs.map(cloneSong);
}

function runAutoLayoutOptimization(
  songs: SongData[],
  measurements: Record<string, ConfigMeasurement>,
  showTitles: boolean,
  showOrderNumbers: boolean,
) {
  const firstConfig = chooseAutoFitConfig(songs, measurements, showTitles, showOrderNumbers);
  const firstPassSongs = optimizeSongsForAutoLayout(songs, firstConfig, measurements, showTitles, showOrderNumbers);
  const secondConfig = chooseAutoFitConfig(firstPassSongs, measurements, showTitles, showOrderNumbers);

  return optimizeSongsForAutoLayout(firstPassSongs, secondConfig, measurements, showTitles, showOrderNumbers);
}

function arraysEqual(a: number[] | undefined, b: number[] | undefined) {
  if (!a && !b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function songsOrderEqual(a: SongData[], b: SongData[]) {
  if (a.length !== b.length) return false;
  return a.every((song, index) => songKey(song) === songKey(b[index]));
}

function trimManualLocks(locks: number[][], keepUntilPageIndex: number) {
  return locks.slice(0, keepUntilPageIndex + 1).map((pageLocks) => [...pageLocks]);
}

function flattenPageLayouts(layouts: PageLayout[]) {
  return layouts.flatMap((page) =>
    page.columns.flatMap((column) => column.map((positionedSong) => cloneSong(positionedSong.song))),
  );
}

function cloneSong(song: SongData): SongData {
  return { title: song.title, artist: song.artist, lyrics: song.lyrics };
}

function cloneManualLocks(locks: number[][]) {
  return locks.map((page) => [...page]);
}

function formatSavedSheetDate(value: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function SheetCardContent({
  song,
  fontSize,
  showTitles,
  showOrderNumbers,
  orderNumber,
  columnCount,
  onRemove,
}: {
  song: SongData;
  fontSize: SheetCardFontSize;
  showTitles: boolean;
  showOrderNumbers: boolean;
  orderNumber: number;
  columnCount?: number;
  onRemove?: () => void;
}) {
  const { orderOnly } = getSongLayoutRules(showTitles, showOrderNumbers);
  const orderOnlyColumnClass = orderOnly ? `sb2-order-layout-${columnCount ?? 1}` : '';

  return (
    <>
      <div className={orderOnly ? `sb2-song-card-content-order-only ${orderOnlyColumnClass}` : ''}>
        {!orderOnly && (showTitles || showOrderNumbers) && (
          <div className={`sb2-song-card-title ${orderOnly ? 'sb2-song-card-title-order-only' : ''}`} style={{ fontSize }}>
            {showOrderNumbers && <span className={`sb2-order-number ${orderOnly ? 'sb2-order-number-order-only' : ''}`}>{orderNumber}</span>}
            {showTitles && <span>{showTitles && showOrderNumbers ? ` ${song.title}` : song.title}</span>}
          </div>
        )}
        <div className={`sb2-song-card-lyrics ${orderOnly ? 'sb2-song-card-lyrics-order-only' : ''}`} style={{ fontSize }}>
          {orderOnly && showOrderNumbers ? (
            <>
              <span className="sb2-order-number sb2-order-number-order-only">{orderNumber}</span>{' '}
              {song.lyrics || ''}
            </>
          ) : song.lyrics || ''}
        </div>
      </div>
      {onRemove && (
        <button
          className="sb2-remove-btn"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          ×
        </button>
      )}
    </>
  );
}

export function SidebarSongDraggable({
  dragId,
  song,
  used,
  onDoubleClick,
  privateItem = false,
}: {
  dragId: string;
  song: SongData;
  used: boolean;
  onDoubleClick: () => void;
  privateItem?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: {
      type: 'library-song',
      song,
    } satisfies LibrarySongDragData,
  });

  return (
    <div
      ref={setNodeRef}
      className={`sb2-song-item ${used ? 'used' : ''} ${privateItem ? 'sb2-private-item' : ''} ${isDragging ? 'is-dragging' : ''}`}
      onDoubleClick={() => {
        if (!used) onDoubleClick();
      }}
      {...attributes}
      {...listeners}
    >
      <div className="sb2-song-item-head">
        <div className="sb2-song-item-title">{song.title}</div>
        {used ? <span className="sb2-song-item-badge">On sheet</span> : null}
      </div>
      <div className="sb2-song-item-artist">{song.artist || 'Unknown'}</div>
    </div>
  );
}

export function DropSlot({
  slotData,
  active,
  expanded = false,
  preview = false,
}: {
  slotData: SlotDragData;
  active: boolean;
  expanded?: boolean;
  preview?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${slotData.pageIndex}:${slotData.columnIndex}:${slotData.slotIndex}:${slotData.insertIndex}`,
    data: slotData,
  });

  return <div ref={setNodeRef} className={`sb2-drop-slot ${expanded ? 'sb2-drop-slot-expanded' : ''} ${preview ? 'preview' : ''} ${active || isOver ? 'active' : ''}`} />;
}

export function SlotStackDropTarget({
  slotData,
  className,
  children,
}: {
  slotData: SlotDragData;
  className: string;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: `slot-stack:${slotData.pageIndex}:${slotData.columnIndex}:${slotData.slotIndex}:${slotData.insertIndex}`,
    data: slotData,
  });

  return <div ref={setNodeRef} className={className}>{children}</div>;
}

export function PreviewSongCard({
  song,
  fontSize,
  showTitles,
  showOrderNumbers,
  orderNumber,
  columnCount,
}: {
  song: SongData;
  fontSize: SheetCardFontSize;
  showTitles: boolean;
  showOrderNumbers: boolean;
  orderNumber: number;
  columnCount: number;
}) {
  return (
    <div className="sb2-song-card sb2-song-card-preview" aria-hidden>
      <SheetCardContent
        song={song}
        fontSize={fontSize}
        showTitles={showTitles}
        showOrderNumbers={showOrderNumbers}
        orderNumber={orderNumber}
        columnCount={columnCount}
      />
    </div>
  );
}

function SheetAreaDropZone({
  children,
  enabled,
  className,
  style,
  containerRef,
}: {
  children: React.ReactNode;
  enabled: boolean;
  className?: string;
  style?: React.CSSProperties;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const { setNodeRef } = useDroppable({
    id: 'sheet-area',
    disabled: !enabled,
    data: {
      type: 'sheet-area',
    } satisfies SheetAreaDragData,
  });

  const handleContainerRef = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);

    if (containerRef) {
      containerRef.current = node;
    }
  }, [containerRef, setNodeRef]);

  return <div ref={handleContainerRef} className={`sb2-page-container${className ? ` ${className}` : ''}`} style={style}>{children}</div>;
}

function PrintSheetPages({
  pageLayouts,
  config,
  showTitles,
  showPageNumbers,
  showOrderNumbers,
}: {
  pageLayouts: PageLayout[];
  config: SheetConfig;
  showTitles: boolean;
  showPageNumbers: boolean;
  showOrderNumbers: boolean;
}) {
  return (
    <div className="sb2-page-container sb2-print-root" aria-hidden>
      {pageLayouts.map((page) => (
        <div key={`print-page-${page.pageIndex}`} className="sb2-sheet-page">
          <div className="sb2-page-header" />
          <div
            className={`sb2-packery-grid ${config.cols === 2 ? 'two-columns' : ''} ${config.cols === 3 ? 'three-columns' : ''}`}
            style={{ '--sb2-columns': config.cols } as React.CSSProperties}
          >
            {page.columns.map((column, columnIndex) => (
              <div key={`print-page-${page.pageIndex}-column-${columnIndex}`} className="sb2-sheet-column">
                {column.map((positionedSong) => (
                  <div key={`print-page-${page.pageIndex}-column-${columnIndex}-${positionedSong.globalIndex}`} className="sb2-slot-stack">
                    <div className="sb2-song-card">
                      <SheetCardContent
                        song={positionedSong.song}
                        fontSize={config.fontSize}
                        showTitles={showTitles}
                        showOrderNumbers={showOrderNumbers}
                        orderNumber={positionedSong.orderNumber}
                        columnCount={config.cols}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="sb2-page-footer">{showPageNumbers ? `${page.pageIndex + 1}` : ''}</div>
        </div>
      ))}
    </div>
  );
}

export function SheetSongDraggable({
  positionedSong,
  fontSize,
  showTitles,
  showOrderNumbers,
  columnCount,
  onRemove,
}: {
  positionedSong: PositionedSong;
  fontSize: SheetCardFontSize;
  showTitles: boolean;
  showOrderNumbers: boolean;
  columnCount: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sheet:${positionedSong.globalIndex}:${songKey(positionedSong.song)}`,
    data: {
      type: 'sheet-song',
      song: positionedSong.song,
      globalIndex: positionedSong.globalIndex,
      pageIndex: positionedSong.pageIndex,
      columnIndex: positionedSong.columnIndex,
      orderNumber: positionedSong.orderNumber,
    } satisfies SheetSongDragData,
  });

  return (
    <div
      ref={setNodeRef}
      className={`sb2-song-card ${isDragging ? 'sb2-drag-source-active' : ''}`}
      {...attributes}
      {...listeners}
    >
      <SheetCardContent
        song={positionedSong.song}
        fontSize={fontSize}
        showTitles={showTitles}
        showOrderNumbers={showOrderNumbers}
        orderNumber={positionedSong.orderNumber}
        columnCount={columnCount}
        onRemove={onRemove}
      />
    </div>
  );
}

function MeasurementBank({
  configs,
  songs,
  showTitles,
  showOrderNumbers,
  setMeasureRef,
}: {
  configs: SheetConfig[];
  songs: SongData[];
  showTitles: boolean;
  showOrderNumbers: boolean;
  setMeasureRef: (key: string, node: HTMLDivElement | null) => void;
}) {
  return (
    <div className="sb2-measure-root" aria-hidden>
      {configs.map((config) => {
        const key = configKey(config);
        return (
          <div key={key} className="sb2-measure-set" ref={(node) => setMeasureRef(key, node)}>
            <div className="sb2-measure-column" style={{ width: getMeasurementColumnWidth(config.cols) }}>
              {songs.map((song, index) => (
                <div key={`${key}-${index}-${songKey(song)}`} className="sb2-song-card sb2-measure-card" data-song-key={songKey(song)}>
                  <SheetCardContent
                    song={song}
                    fontSize={config.fontSize}
                    showTitles={showTitles}
                    showOrderNumbers={showOrderNumbers}
                    orderNumber={index + 1}
                    columnCount={config.cols}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SheetBuilderApp() {
  const { isPhone, width } = useDevice();
  const { user, privateSongs, savedSheets, preferences, addSong, addSongs, saveSheet, setPref } = useGoogleAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [sheetSongs, setSheetSongs] = useState<SongData[]>([]);
  const [manualLocks, setManualLocks] = useState<number[][]>([]);
  const [sidebarTab, setSidebarTabState] = useState<'library' | 'my'>((preferences.sbSidebarTab as 'library' | 'my') || 'library');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTitles, setShowTitles] = useState(preferences.sbShowTitles !== undefined ? !!preferences.sbShowTitles : true);
  const [showPageNumbers, setShowPageNumbers] = useState(preferences.sbShowPageNumbers !== undefined ? !!preferences.sbShowPageNumbers : true);
  const [showOrderNumbers, setShowOrderNumbers] = useState(!!preferences.sbShowOrderNumbers);
  const [autoFit, setAutoFit] = useState(preferences.sbAutoFit !== undefined ? !!preferences.sbAutoFit : true);
  const [manualColumns, setManualColumns] = useState(typeof preferences.sbManualColumns === 'number' ? preferences.sbManualColumns : 1);
  const [manualFontSize, setManualFontSize] = useState(14);
  const [sheetTitle, setSheetTitle] = useState(typeof preferences.sbSheetTitle === 'string' ? preferences.sbSheetTitle : DEFAULT_SHEET_TITLE);
  const [currentSavedSheetId, setCurrentSavedSheetId] = useState(typeof preferences.sbCurrentSavedSheetId === 'string' ? preferences.sbCurrentSavedSheetId : '');
  const [showSaveSheetModal, setShowSaveSheetModal] = useState(false);
  const [saveDraftSheetTitle, setSaveDraftSheetTitle] = useState('');
  const [showSavedSheetsModal, setShowSavedSheetsModal] = useState(false);
  const [showOverwriteSheetModal, setShowOverwriteSheetModal] = useState(false);
  const [overwriteTargetSheetId, setOverwriteTargetSheetId] = useState('');
  const [previewSavedSheetId, setPreviewSavedSheetId] = useState('');
  const [hasMounted, setHasMounted] = useState(false);
  const [measurements, setMeasurements] = useState<Record<string, ConfigMeasurement>>({});
  const [singlePagePreviewScale, setSinglePagePreviewScale] = useState(1);
  const [activeDragData, setActiveDragData] = useState<DragData | null>(null);
  const [overSlotData, setOverSlotData] = useState<SlotDragData | null>(null);
  const [libraryPreviewActive, setLibraryPreviewActive] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [tourTargetRect, setTourTargetRect] = useState<TourTargetRect | null>(null);
  const [showTourLauncher, setShowTourLauncher] = useState(false);

  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedSheetPreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measurementRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const measurementSignatureRef = useRef('');
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const loadedSavedSongsRef = useRef(false);
  const autoLogSignatureRef = useRef('');
  const overSlotRef = useRef<SlotDragData | null>(null);
  const previewSheetSongsRef = useRef<SongData[] | null>(null);
  const previewManualLocksRef = useRef<number[][] | null>(null);
  const dragSnapshotSongsRef = useRef<SongData[] | null>(null);
  const dragSnapshotManualLocksRef = useRef<number[][] | null>(null);
  const tourSnapshotRef = useRef<TourSnapshot | null>(null);

  const clearSavedSheetPreviewTimer = useCallback(() => {
    if (savedSheetPreviewTimerRef.current) {
      clearTimeout(savedSheetPreviewTimerRef.current);
      savedSheetPreviewTimerRef.current = null;
    }
  }, []);

  const updateStatus = useCallback((message: string) => {
    setStatus(message);
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = setTimeout(() => {
      setStatus(DEFAULT_STATUS);
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }

      if (savedSheetPreviewTimerRef.current) {
        clearTimeout(savedSheetPreviewTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const dismissed = localStorage.getItem(TOUR_LAUNCHER_DISMISSED_KEY);
    setShowTourLauncher(dismissed !== '1');
  }, []);

  useEffect(() => {
    if (preferences.sbSidebarTab) setSidebarTabState(preferences.sbSidebarTab as 'library' | 'my');
    if (preferences.sbShowTitles !== undefined) setShowTitles(!!preferences.sbShowTitles);
    if (preferences.sbShowPageNumbers !== undefined) setShowPageNumbers(!!preferences.sbShowPageNumbers);
    if (preferences.sbShowOrderNumbers !== undefined) setShowOrderNumbers(!!preferences.sbShowOrderNumbers);
    if (preferences.sbAutoFit !== undefined) setAutoFit(!!preferences.sbAutoFit);
    if (typeof preferences.sbManualColumns === 'number') setManualColumns(preferences.sbManualColumns);
    if (typeof preferences.sbSheetTitle === 'string') setSheetTitle(preferences.sbSheetTitle);
    if (typeof preferences.sbCurrentSavedSheetId === 'string') {
      setCurrentSavedSheetId(preferences.sbCurrentSavedSheetId);
    }
  }, [preferences, showSavedSheetsModal]);

  const setSidebarTab = useCallback((value: 'library' | 'my') => {
    setSidebarTabState(value);
    if (user) setPref('sbSidebarTab', value);
  }, [setPref, user]);

  const currentTourStep = tourOpen ? TOUR_STEPS[tourStepIndex] : null;

  useEffect(() => {
    if (!isPhone) setSidebarOpen(false);
  }, [isPhone]);

  useEffect(() => {
    async function load() {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const res = await fetch('/api/songs', { signal: controller.signal });
        if (!res.ok) throw new Error('Failed');
        setAllSongs(await res.json());
      } catch {
        setAllSongs([
          { title: 'אדיר הוא', artist: 'Traditional', lyrics: 'אדיר הוא\nיבנה ביתו בקרוב\nבמהרה בימינו בקרוב' },
          { title: 'עוד ישמע', artist: 'Traditional', lyrics: 'עוד ישמע בערי יהודה\nובחוצות ירושלים' },
          { title: 'ושמחת', artist: 'Traditional', lyrics: 'ושמחת בחגך\nוהיית אך שמח' },
        ]);
      } finally {
        clearTimeout(timeout);
      }
    }

    load();
  }, []);

  const privateSongsAsSongs = useMemo<Song[]>(() =>
    privateSongs.map((song) => ({
      title: song.title,
      artist: song.artist,
      lyrics: song.lyrics,
      youtube: song.youtubeLinks?.join(' ') || '',
      drive: song.driveLink || '',
    })),
  [privateSongs]);

  const availableSongsMap = useMemo(() => {
    const map = new Map<string, SongData>();
    [...allSongs, ...privateSongsAsSongs].forEach((song) => {
      map.set(`${song.title}|${song.artist}`, cloneSong(song));
    });
    return map;
  }, [allSongs, privateSongsAsSongs]);

  useEffect(() => {
    if (loadedSavedSongsRef.current) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      loadedSavedSongsRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) {
        loadedSavedSongsRef.current = true;
        return;
      }

      const restoredSongs = parsed
        .filter((song): song is SongData => !!song?.title && !!song?.artist)
        .map((song) => availableSongsMap.get(`${song.title}|${song.artist}`) ?? cloneSong(song));

      setSheetSongs(restoredSongs);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      loadedSavedSongsRef.current = true;
    }
  }, [availableSongsMap]);

  useEffect(() => {
    if (!loadedSavedSongsRef.current) return;
    if (sheetSongs.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sheetSongs));
  }, [sheetSongs]);

  const filteredSongs = useMemo(() => {
    const query = search.toLowerCase();
    if (!query) return allSongs;
    return allSongs.filter((song) => song.title.toLowerCase().includes(query) || (song.artist || '').toLowerCase().includes(query));
  }, [allSongs, search]);

  const filteredPrivateSongs = useMemo(() => {
    const query = search.toLowerCase();
    if (!query) return privateSongsAsSongs;
    return privateSongsAsSongs.filter((song) => song.title.toLowerCase().includes(query) || (song.artist || '').toLowerCase().includes(query));
  }, [privateSongsAsSongs, search]);

  const tourDemoSongs = useMemo(() => allSongs.slice(0, 3).map(cloneSong), [allSongs]);
  const tourSearchTerm = useMemo(() => {
    const sourceTitle = allSongs[0]?.title ?? '';
    const [firstWord = 'avinu'] = sourceTitle.split(/\s+/).filter(Boolean);
    return firstWord;
  }, [allSongs]);

  const restoreTourSnapshot = useCallback(() => {
    const snapshot = tourSnapshotRef.current;
    if (!snapshot) {
      return;
    }

    setSidebarOpen(snapshot.sidebarOpen);
    setSidebarTabState(snapshot.sidebarTab);
    setSearch(snapshot.search);
    setSheetTitle(snapshot.sheetTitle);
    setSheetSongs(snapshot.sheetSongs.map(cloneSong));
    setManualLocks(cloneManualLocks(snapshot.manualLocks));
    setShowTitles(snapshot.showTitles);
    setShowPageNumbers(snapshot.showPageNumbers);
    setShowOrderNumbers(snapshot.showOrderNumbers);
    setAutoFit(snapshot.autoFit);
    setManualColumns(snapshot.manualColumns);
  }, []);

  const handleCloseTour = useCallback(() => {
    restoreTourSnapshot();
    tourSnapshotRef.current = null;
    setTourTargetRect(null);
    setTourOpen(false);
    setTourStepIndex(0);
    setStatus(DEFAULT_STATUS);
  }, [restoreTourSnapshot]);

  const handleStartTour = useCallback(() => {
    if (tourOpen) {
      return;
    }

    if (false) {
      setShowTourLauncher(false);
      localStorage.setItem(TOUR_LAUNCHER_DISMISSED_KEY, '1');
    }

    tourSnapshotRef.current = {
      sidebarOpen,
      sidebarTab,
      search,
      sheetTitle,
      sheetSongs: sheetSongs.map(cloneSong),
      manualLocks: cloneManualLocks(manualLocks),
      showTitles,
      showPageNumbers,
      showOrderNumbers,
      autoFit,
      manualColumns,
    };

    setTourStepIndex(0);
    setTourOpen(true);
  }, [autoFit, manualColumns, manualLocks, search, sheetSongs, sheetTitle, showOrderNumbers, showPageNumbers, showTitles, showTourLauncher, sidebarOpen, sidebarTab, tourOpen]);

  useEffect(() => {
    const onStartTour = () => {
      handleStartTour();
    };

    window.addEventListener('sheet-builder:start-tour', onStartTour);
    return () => window.removeEventListener('sheet-builder:start-tour', onStartTour);
  }, [handleStartTour]);

  const handleNextTourStep = useCallback(() => {
    if (tourStepIndex >= TOUR_STEPS.length - 1) {
      handleCloseTour();
      return;
    }

    setTourStepIndex((prev) => prev + 1);
  }, [handleCloseTour, tourStepIndex]);

  const handlePreviousTourStep = useCallback(() => {
    setTourStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    if (!tourOpen || !currentTourStep) {
      return;
    }

    const demoSearch = tourSearchTerm.toLowerCase();

    if (currentTourStep.id === 'welcome') {
      if (isPhone) {
        setSidebarOpen(false);
      }
      setSearch('');
      return;
    }

    if (currentTourStep.id === 'sheetPanel') {
      if (isPhone) {
        setSidebarOpen(false);
      }
      setSearch('');
      setSheetTitle('Tour Demo Sheet');
      return;
    }

    if (currentTourStep.id === 'library') {
      setSidebarTabState('library');
      setSearch('');
      if (isPhone) {
        setSidebarOpen(true);
      }
      return;
    }

    if (currentTourStep.id === 'savedSongs') {
      setSidebarTabState('library');
      setSearch('');
      if (isPhone) {
        setSidebarOpen(true);
      }
      return;
    }

    if (currentTourStep.id === 'search') {
      setSidebarTabState('library');
      setSearch(demoSearch);
      if (isPhone) {
        setSidebarOpen(true);
      }
      return;
    }

    if (currentTourStep.id === 'sheet') {
      setSearch('');
      if (tourDemoSongs.length > 0) {
        setSheetSongs(tourDemoSongs.map(cloneSong));
        setManualLocks([]);
      }
      if (isPhone) {
        setSidebarOpen(false);
      }
      return;
    }

    if (currentTourStep.id === 'display') {
      setSearch('');
      setShowTitles(true);
      setShowPageNumbers(true);
      setShowOrderNumbers(true);
      return;
    }

    if (currentTourStep.id === 'manualLayout') {
      if (isPhone) {
        setSidebarOpen(false);
      }
      setSearch('');
      setAutoFit(false);
      setManualColumns(2);
      setManualLocks([]);
      return;
    }

    if (currentTourStep.id === 'autoLayout') {
      if (isPhone) {
        setSidebarOpen(false);
      }
      setSearch('');
      setAutoFit(true);
      setManualLocks([]);
      return;
    }

    if (currentTourStep.id === 'actions') {
      setSearch('');
      if (isPhone) {
        setSidebarOpen(false);
      }
    }
  }, [currentTourStep, isPhone, tourDemoSongs, tourOpen, tourSearchTerm]);

  useLayoutEffect(() => {
    if (!tourOpen || !currentTourStep) {
      setTourTargetRect(null);
      return;
    }

    let frameId = 0;

    const syncTargetRect = () => {
      const target = document.querySelector(currentTourStep.selector) as HTMLElement | null;
      if (!target) {
        return;
      }

      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const rect = target.getBoundingClientRect();
      setTourTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    frameId = window.requestAnimationFrame(syncTargetRect);
    window.addEventListener('resize', syncTargetRect);
    window.addEventListener('scroll', syncTargetRect, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', syncTargetRect);
      window.removeEventListener('scroll', syncTargetRect, true);
    };
  }, [allSongs.length, currentTourStep, isPhone, manualColumns, showOrderNumbers, showPageNumbers, showTitles, sidebarOpen, sidebarTab, tourOpen]);

  const tourCardStyle = useMemo(() => {
    if (!tourOpen || !currentTourStep || !tourTargetRect || typeof window === 'undefined') {
      return undefined;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const targetRight = tourTargetRect.left + tourTargetRect.width;
    const maxLeft = Math.max(16, viewportWidth - TOUR_CARD_WIDTH - 16);
    const centeredLeft = Math.min(maxLeft, Math.max(16, tourTargetRect.left + (tourTargetRect.width / 2) - (TOUR_CARD_WIDTH / 2)));
    const rightAlignedLeft = Math.min(maxLeft, Math.max(16, targetRight + 16));
    const leftAlignedLeft = Math.min(maxLeft, Math.max(16, tourTargetRect.left - TOUR_CARD_WIDTH - 16));

    if (tourStepIndex < 6) {
      const toolbar = document.querySelector('[data-tour="toolbar"]') as HTMLElement | null;
      if (toolbar) {
        const toolbarRect = toolbar.getBoundingClientRect();
        const toolbarCenteredLeft = Math.min(
          maxLeft,
          Math.max(16, toolbarRect.left + (toolbarRect.width / 2) - (TOUR_CARD_WIDTH / 2)),
        );
        return {
          top: Math.max(16, Math.min(viewportHeight - 220, toolbarRect.bottom + 16)),
          left: toolbarCenteredLeft,
        };
      }
    }

    if (currentTourStep.placement === 'top') {
      return {
        top: Math.max(16, tourTargetRect.top - 220),
        left: centeredLeft,
      };
    }

    if (currentTourStep.placement === 'left') {
      return {
        top: Math.max(16, Math.min(viewportHeight - 220, tourTargetRect.top)),
        left: leftAlignedLeft,
      };
    }

    if (currentTourStep.placement === 'right') {
      return {
        top: Math.max(16, Math.min(viewportHeight - 220, tourTargetRect.top)),
        left: rightAlignedLeft,
      };
    }

    return {
      top: Math.max(16, Math.min(viewportHeight - 220, tourTargetRect.top + tourTargetRect.height + 16)),
      left: centeredLeft,
    };
  }, [currentTourStep, tourOpen, tourStepIndex, tourTargetRect]);

  const sortedSavedSheets = useMemo(() => {
    return [...savedSheets].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [savedSheets]);

  const currentSavedSheet = useMemo(() => {
    if (!currentSavedSheetId) return null;
    return savedSheets.find((entry) => entry.id === currentSavedSheetId) ?? null;
  }, [currentSavedSheetId, savedSheets]);

  const overwriteTargetSheet = useMemo(() => {
    if (!overwriteTargetSheetId) return null;
    return sortedSavedSheets.find((entry) => entry.id === overwriteTargetSheetId) ?? null;
  }, [overwriteTargetSheetId, sortedSavedSheets]);

  const canUseSavedSheets = hasMounted && !!user;
  const savedSheetsDisabled = hasMounted ? !user : undefined;

  const previewSavedSheet = useMemo(() => {
    if (!previewSavedSheetId) return null;
    return sortedSavedSheets.find((entry) => entry.id === previewSavedSheetId) ?? null;
  }, [previewSavedSheetId, sortedSavedSheets]);

  const savedSheetPreview = useMemo<SavedSheetPreviewData | null>(() => {
    if (!previewSavedSheet) return null;

    const previewConfig = previewSavedSheet.autoFit
      ? chooseAutoFitConfig(previewSavedSheet.songs, measurements, previewSavedSheet.showTitles, previewSavedSheet.showOrderNumbers)
      : resolveManualOverflowConfig(
          { cols: previewSavedSheet.manualColumns, fontSize: previewSavedSheet.manualFontSize },
          previewSavedSheet.songs,
          previewSavedSheet.manualLocks,
          measurements,
          previewSavedSheet.showTitles,
          previewSavedSheet.showOrderNumbers,
        );

    const previewPages = previewSavedSheet.autoFit
      ? paginateAutoSongs(previewSavedSheet.songs, previewConfig, measurements, previewSavedSheet.showTitles, previewSavedSheet.showOrderNumbers)
      : paginateManualSongs(
          previewSavedSheet.songs,
          previewConfig,
          previewSavedSheet.manualLocks,
          measurements,
          previewSavedSheet.showTitles,
          previewSavedSheet.showOrderNumbers,
        );

    return {
      sheet: previewSavedSheet,
      config: previewConfig,
      pages: previewPages,
    };
  }, [measurements, previewSavedSheet]);

  useEffect(() => {
    if (!showSavedSheetsModal) {
      return;
    }

    const hasPreviewTarget = sortedSavedSheets.some((entry) => entry.id === previewSavedSheetId);
    if (!hasPreviewTarget) {
      setPreviewSavedSheetId(currentSavedSheetId || sortedSavedSheets[0]?.id || '');
    }
  }, [currentSavedSheetId, previewSavedSheetId, showSavedSheetsModal, sortedSavedSheets]);

  const usedSongKeys = useMemo(() => new Set(sheetSongs.map((song) => songKey(song))), [sheetSongs]);

  const measurementConfigs = useMemo(() => {
    return getMeasurementConfigSet([{ cols: manualColumns, fontSize: manualFontSize }]);
  }, [manualColumns, manualFontSize]);

  const setMeasureRef = useCallback((key: string, node: HTMLDivElement | null) => {
    measurementRefs.current[key] = node;
  }, []);

  useLayoutEffect(() => {
    const nextMeasurements: Record<string, ConfigMeasurement> = {};

    measurementConfigs.forEach((config) => {
      const key = configKey(config);
      const root = measurementRefs.current[key];
      if (!root) return;

      const cards = Array.from(root.querySelectorAll('.sb2-measure-card')) as HTMLDivElement[];
      const heights: Record<string, number> = {};
      let hasOverflow = false;

      cards.forEach((card) => {
        const cardKey = card.dataset.songKey;
        if (!cardKey) return;
        const heightBuffer = config.cols === 1 ? 0 : MEASUREMENT_HEIGHT_BUFFER;
        heights[cardKey] = Math.ceil(card.getBoundingClientRect().height) + heightBuffer;
        const title = card.querySelector('.sb2-song-card-title') as HTMLElement | null;
        const lyrics = card.querySelector('.sb2-song-card-lyrics') as HTMLElement | null;
        const titleHasOverflow = !!title && (
          title.scrollWidth - title.clientWidth > OVERFLOW_EPSILON ||
          title.scrollHeight - title.clientHeight > OVERFLOW_EPSILON
        );
        const lyricsHaveOverflow = !!lyrics && (
          lyrics.scrollWidth - lyrics.clientWidth > OVERFLOW_EPSILON ||
          lyrics.scrollHeight - lyrics.clientHeight > OVERFLOW_EPSILON
        );

        if (titleHasOverflow || lyricsHaveOverflow) {
          hasOverflow = true;
        }
      });

      nextMeasurements[key] = { heights, hasOverflow };
    });

    const signature = JSON.stringify(nextMeasurements);
    if (signature !== measurementSignatureRef.current) {
      measurementSignatureRef.current = signature;
      setMeasurements(nextMeasurements);
    }
  }, [measurementConfigs, sheetSongs, showOrderNumbers, showTitles]);

  const autoConfig = useMemo(() => chooseAutoFitConfig(sheetSongs, measurements, showTitles, showOrderNumbers), [
    measurements,
    sheetSongs,
    showOrderNumbers,
    showTitles,
  ]);

  const manualConfig = useMemo(() => {
    return resolveManualOverflowConfig(
      { cols: manualColumns, fontSize: manualFontSize },
      sheetSongs,
      manualLocks,
      measurements,
      showTitles,
      showOrderNumbers,
    );
  }, [manualColumns, manualFontSize, manualLocks, measurements, sheetSongs, showOrderNumbers, showTitles]);

  const activeConfig = useMemo<SheetConfig>(() => {
    return autoFit ? autoConfig : manualConfig;
  }, [autoConfig, autoFit, manualConfig]);

  const pageLayouts = useMemo(() => {
    return autoFit
      ? paginateAutoSongs(sheetSongs, activeConfig, measurements, showTitles, showOrderNumbers)
      : paginateManualSongs(sheetSongs, activeConfig, manualLocks, measurements, showTitles, showOrderNumbers);
  }, [activeConfig, autoFit, manualLocks, measurements, sheetSongs, showOrderNumbers, showTitles]);

  useEffect(() => {
    if (!autoFit || sheetSongs.length === 0) {
      autoLogSignatureRef.current = '';
      return;
    }

    const signature = JSON.stringify({
      songs: sheetSongs.map((song) => song.title),
      config: activeConfig,
      pages: pageLayouts.map((page) => page.columns.map((column) => column.length)),
    });

    if (signature === autoLogSignatureRef.current) {
      return;
    }

    autoLogSignatureRef.current = signature;
    logAutoFitSnapshot('Auto layout recomputed', sheetSongs, measurements, showTitles, showOrderNumbers, activeConfig, pageLayouts);
  }, [activeConfig, autoFit, measurements, pageLayouts, sheetSongs, showOrderNumbers, showTitles]);

  const buildPreviewManualLocks = useCallback((slotData: SlotDragData, dragData: SheetSongDragData) => {
    if (autoFit) {
      return manualLocks;
    }

    const nextLocks = trimManualLocks(manualLocks, Math.min(dragData.pageIndex, slotData.pageIndex));
    const targetPage = pageLayouts[slotData.pageIndex];
    const currentCounts = targetPage?.columnCounts ?? [];
    const existingLocks = nextLocks[slotData.pageIndex] ?? [];
    const lockCount = Math.max(existingLocks.length, slotData.columnIndex);

    while (nextLocks.length <= slotData.pageIndex) {
      nextLocks.push([]);
    }

    nextLocks[slotData.pageIndex] = currentCounts.slice(0, lockCount);
    return nextLocks;
  }, [autoFit, manualLocks, pageLayouts]);

  const buildInsertedManualLocks = useCallback((slotData: SlotDragData) => {
    if (autoFit) {
      return manualLocks;
    }

    const nextLocks = trimManualLocks(manualLocks, slotData.pageIndex);
    const targetPage = pageLayouts[slotData.pageIndex];
    const currentCounts = targetPage?.columnCounts ?? [];
    const existingLocks = nextLocks[slotData.pageIndex] ?? [];
    const lockCount = Math.max(existingLocks.length, slotData.columnIndex);

    while (nextLocks.length <= slotData.pageIndex) {
      nextLocks.push([]);
    }

    nextLocks[slotData.pageIndex] = currentCounts.slice(0, lockCount);
    return nextLocks;
  }, [autoFit, manualLocks, pageLayouts]);

  const buildReorderedSongs = useCallback((dragData: SheetSongDragData, slotData: SlotDragData) => {
    const nextSongs = [...sheetSongs];
    const [movedSong] = nextSongs.splice(dragData.globalIndex, 1);
    if (!movedSong) {
      return null;
    }

    const targetIndex = slotData.insertIndex > dragData.globalIndex
      ? slotData.insertIndex - 1
      : slotData.insertIndex;
    nextSongs.splice(targetIndex, 0, movedSong);
    return nextSongs;
  }, [sheetSongs]);

  const reorderSongsInList = useCallback((songs: SongData[], draggedSong: SongData, insertIndex: number) => {
    const currentIndex = songs.findIndex((song) => songKey(song) === songKey(draggedSong));
    if (currentIndex === -1) {
      return songs;
    }

    const nextSongs = [...songs];
    const [movedSong] = nextSongs.splice(currentIndex, 1);
    if (!movedSong) {
      return songs;
    }

    const targetIndex = insertIndex > currentIndex ? insertIndex - 1 : insertIndex;
    nextSongs.splice(targetIndex, 0, movedSong);
    return nextSongs;
  }, []);

  const resolveInsertIndex = useCallback((slotData: SlotDragData, dragData: DragData | null) => {
    if (slotData.occupiedGlobalIndex == null) {
      return slotData.insertIndex;
    }

    if (dragData?.type === 'sheet-song' && dragData.globalIndex < slotData.occupiedGlobalIndex) {
      return slotData.insertIndex + 1;
    }

    return slotData.insertIndex;
  }, []);

  const insertSongInList = useCallback((songs: SongData[], insertedSong: SongData, insertIndex: number) => {
    const nextSongs = [...songs];
    nextSongs.splice(insertIndex, 0, cloneSong(insertedSong));
    return nextSongs;
  }, []);

  const overPageIndex = overSlotData?.pageIndex ?? null;
  const previewManualLocks = useMemo(() => {
    if (activeDragData?.type === 'library-song' && overSlotData) {
      return buildInsertedManualLocks(overSlotData);
    }

    return manualLocks;
  }, [activeDragData, buildInsertedManualLocks, manualLocks, overSlotData]);

  const previewSheetSongs = useMemo(() => {
    if (
      activeDragData?.type === 'library-song' &&
      libraryPreviewActive &&
      !usedSongKeys.has(songKey(activeDragData.song))
    ) {
      const baseSongs = dragSnapshotSongsRef.current ?? sheetSongs;
      const insertIndex = overSlotData?.insertIndex ?? baseSongs.length;
      return insertSongInList(baseSongs, activeDragData.song, insertIndex);
    }

    return null;
  }, [activeDragData, insertSongInList, libraryPreviewActive, overSlotData, sheetSongs, usedSongKeys]);

  const previewSongKey = useMemo(() => {
    if (activeDragData?.type === 'library-song' || activeDragData?.type === 'sheet-song') {
      return songKey(activeDragData.song);
    }

    return null;
  }, [activeDragData]);

  const renderedPageLayouts = useMemo(() => {
    if (!previewSheetSongs) {
      return pageLayouts;
    }

    return autoFit
      ? paginateAutoSongs(previewSheetSongs, activeConfig, measurements, showTitles, showOrderNumbers)
      : paginateManualSongs(previewSheetSongs, activeConfig, previewManualLocks, measurements, showTitles, showOrderNumbers);
  }, [activeConfig, autoFit, measurements, pageLayouts, previewManualLocks, previewSheetSongs, showOrderNumbers, showTitles]);

  useLayoutEffect(() => {
    if (isPhone || renderedPageLayouts.length !== 1) {
      setSinglePagePreviewScale((current) => (current === 1 ? current : 1));
      return;
    }

    const container = pageContainerRef.current;
    if (!container) {
      return;
    }

    const updateSinglePagePreviewScale = () => {
      const styles = window.getComputedStyle(container);
      const containerRect = container.getBoundingClientRect();
      const horizontalPadding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
      const verticalPadding = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
      const availableWidth = Math.max(container.clientWidth - horizontalPadding, 0);
      const availableHeight = Math.max(window.innerHeight - containerRect.top - verticalPadding, 0);
      const nextScale = Math.min(
        availableWidth / SHEET_PAGE_WIDTH,
        availableHeight / SHEET_PAGE_HEIGHT,
        1,
      );

      setSinglePagePreviewScale((current) => (Math.abs(current - nextScale) < 0.001 ? current : nextScale));
    };

    updateSinglePagePreviewScale();

    const frameId = window.requestAnimationFrame(() => {
      updateSinglePagePreviewScale();
      window.requestAnimationFrame(updateSinglePagePreviewScale);
    });
    const settleTimeoutId = window.setTimeout(updateSinglePagePreviewScale, 250);
    const lateSettleTimeoutId = window.setTimeout(updateSinglePagePreviewScale, 1000);

    const resizeObserver = new ResizeObserver(updateSinglePagePreviewScale);
    resizeObserver.observe(container);
    window.addEventListener('resize', updateSinglePagePreviewScale);
    window.visualViewport?.addEventListener('resize', updateSinglePagePreviewScale);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(settleTimeoutId);
      window.clearTimeout(lateSettleTimeoutId);
      window.removeEventListener('resize', updateSinglePagePreviewScale);
      window.visualViewport?.removeEventListener('resize', updateSinglePagePreviewScale);
    };
  }, [isPhone, renderedPageLayouts.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const collisionDetection = useCallback((args: Parameters<typeof pointerWithin>[0]) => {
    if (activeDragData?.type === 'sheet-song' || activeDragData?.type === 'library-song') {
      const slotContainers = args.droppableContainers.filter((container) => container.data.current?.type === 'slot');
      const pointerHits = pointerWithin({
        ...args,
        droppableContainers: slotContainers,
      });

      if (pointerHits.length > 0) {
        return pointerHits;
      }

      return closestCenter({
        ...args,
        droppableContainers: slotContainers,
      });
    }

    return pointerWithin(args);
  }, [activeDragData]);

  const handleAddSong = useCallback((song: SongData) => {
    if (usedSongKeys.has(songKey(song))) {
      updateStatus(`"${song.title}" is already on the sheet`);
      return;
    }

    setSheetSongs((prev) => [...prev, cloneSong(song)]);
    updateStatus(`Added ${song.title}`);
  }, [updateStatus, usedSongKeys]);

  const handleClearAll = useCallback(() => {
    if (!confirm('Clear all songs from the sheet?')) return;
    setSheetSongs([]);
    setManualLocks([]);
    updateStatus('Sheet cleared');
  }, [updateStatus]);

  const handleToggleTitles = useCallback(() => {
      const next = !showTitles;
      setShowTitles(next);
      if (user) setPref('sbShowTitles', next);
    }, [setPref, showTitles, user]);

  const handleTogglePageNumbers = useCallback(() => {
      const next = !showPageNumbers;
      setShowPageNumbers(next);
      if (user) setPref('sbShowPageNumbers', next);
    }, [setPref, showPageNumbers, user]);

  const handleToggleOrderNumbers = useCallback(() => {
      const next = !showOrderNumbers;
      setShowOrderNumbers(next);
      if (user) setPref('sbShowOrderNumbers', next);
    }, [setPref, showOrderNumbers, user]);

  const handleSetColumns = useCallback((columns: number) => {
    setAutoFit(false);
    setManualColumns(columns);
    setManualLocks([]);
    if (user) {
      setPref('sbAutoFit', false);
      setPref('sbManualColumns', columns);
    }
  }, [setPref, user]);

  const handleSetAuto = useCallback(() => {
    const optimizedSongs = runAutoLayoutOptimization(sheetSongs, measurements, showTitles, showOrderNumbers);
    const optimizedConfig = chooseAutoFitConfig(optimizedSongs, measurements, showTitles, showOrderNumbers);
    const optimizedPages = paginateAutoSongs(optimizedSongs, optimizedConfig, measurements, showTitles, showOrderNumbers);

    logAutoFitSnapshot('Auto button clicked: before', sheetSongs, measurements, showTitles, showOrderNumbers, autoConfig, pageLayouts);
    logAutoFitSnapshot('Auto button clicked: after', optimizedSongs, measurements, showTitles, showOrderNumbers, optimizedConfig, optimizedPages);

    setSheetSongs(optimizedSongs);
    setManualLocks([]);
    setAutoFit(true);
    if (user) setPref('sbAutoFit', true);
    updateStatus('Auto layout optimized');
  }, [autoConfig, measurements, pageLayouts, setPref, sheetSongs, showOrderNumbers, showTitles, updateStatus, user]);

  const handleRemoveSong = useCallback((targetSong: SongData) => {
    const sourcePageIndex = pageLayouts.findIndex((page) =>
      page.columns.some((column) => column.some((positionedSong) => songKey(positionedSong.song) === songKey(targetSong))),
    );

    setSheetSongs((prev) => prev.filter((song) => songKey(song) !== songKey(targetSong)));
    if (!autoFit && sourcePageIndex >= 0) {
      setManualLocks((prev) => trimManualLocks(prev, sourcePageIndex));
    }
    updateStatus(`Removed ${targetSong.title}`);
  }, [autoFit, pageLayouts, updateStatus]);

  const handlePrint = useCallback(() => window.print(), []);

  const persistSheetIdentity = useCallback((nextTitle: string, nextId: string) => {
    setSheetTitle(nextTitle);
    setCurrentSavedSheetId(nextId);
    if (user) {
      setPref('sbSheetTitle', nextTitle);
      setPref('sbCurrentSavedSheetId', nextId);
    }
  }, [setPref, user]);

  const executeSaveSheet = useCallback(async (title: string, targetSheetId?: string) => {
    const trimmedTitle = title.trim();
    const savedSheet = await saveSheet({
      id: targetSheetId,
      title: trimmedTitle,
      songs: sheetSongs.map(cloneSong),
      showTitles,
      showPageNumbers,
      showOrderNumbers,
      autoFit,
      manualColumns,
      manualFontSize,
      manualLocks: cloneManualLocks(manualLocks),
    });

    persistSheetIdentity(savedSheet.title, savedSheet.id);
    updateStatus(`Saved ${savedSheet.title}`);
    return savedSheet;
  }, [autoFit, manualColumns, manualFontSize, manualLocks, persistSheetIdentity, saveSheet, sheetSongs, showOrderNumbers, showPageNumbers, showTitles, updateStatus]);

  const saveNamedSheet = useCallback(async (title: string, overwriteId?: string) => {
    if (!user) {
      updateStatus('Sign in to save your sheets');
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      updateStatus('Type a sheet name first');
      return;
    }

    try {
      const matching = sortedSavedSheets.find(
        (entry) => entry.title.trim() === trimmedTitle && (currentSavedSheetId ? entry.id === currentSavedSheetId : true),
      );
      await executeSaveSheet(trimmedTitle, overwriteId ?? matching?.id ?? currentSavedSheetId ?? undefined);
      setShowSaveSheetModal(false);
      setShowOverwriteSheetModal(false);
    } catch (error) {
      console.error('[SheetBuilder] Failed to save sheet:', error);

      if (error instanceof Error && error.message.includes('Saved sheet limit reached')) {
        setOverwriteTargetSheetId(currentSavedSheetId || sortedSavedSheets[0]?.id || '');
        setShowSaveSheetModal(false);
        setShowOverwriteSheetModal(true);
        return;
      }

      updateStatus('Could not save the sheet');
    }
  }, [currentSavedSheetId, executeSaveSheet, sortedSavedSheets, updateStatus, user]);

  const handleOpenSaveSheetModal = useCallback(() => {
    if (!user) {
      updateStatus('Sign in to save your sheets');
      return;
    }

    setSaveDraftSheetTitle(sheetTitle);
    setShowSaveSheetModal(true);
  }, [sheetTitle, updateStatus, user]);

  const handleConfirmOverwriteSheet = useCallback(async () => {
    if (!overwriteTargetSheetId) {
      updateStatus('Pick a sheet to replace');
      return;
    }

    try {
      await saveNamedSheet(saveDraftSheetTitle || sheetTitle, overwriteTargetSheetId);
      setShowOverwriteSheetModal(false);
    } catch (error) {
      console.error('[SheetBuilder] Failed to overwrite sheet:', error);
      updateStatus('Could not replace the sheet');
    }
  }, [overwriteTargetSheetId, saveDraftSheetTitle, saveNamedSheet, sheetTitle, updateStatus]);

  const handleCancelOverwriteSheet = useCallback(() => {
    setShowOverwriteSheetModal(false);
  }, []);

  const handleLoadSavedSheet = useCallback((savedSheetId: string) => {
    if (!savedSheetId) {
      updateStatus('Pick a saved sheet first');
      return;
    }

    const savedSheet = sortedSavedSheets.find((entry) => entry.id === savedSheetId);
    if (!savedSheet) {
      updateStatus('That saved sheet was not found');
      return;
    }

    setSheetSongs(savedSheet.songs.map(cloneSong));
    setShowTitles(savedSheet.showTitles);
    setShowPageNumbers(savedSheet.showPageNumbers);
    setShowOrderNumbers(savedSheet.showOrderNumbers);
    setAutoFit(savedSheet.autoFit);
    setManualColumns(savedSheet.manualColumns);
    setManualFontSize(savedSheet.manualFontSize);
    setManualLocks(cloneManualLocks(savedSheet.manualLocks));
    persistSheetIdentity(savedSheet.title, savedSheet.id);

    if (user) {
      setPref('sbShowTitles', savedSheet.showTitles);
      setPref('sbShowPageNumbers', savedSheet.showPageNumbers);
      setPref('sbShowOrderNumbers', savedSheet.showOrderNumbers);
      setPref('sbAutoFit', savedSheet.autoFit);
      setPref('sbManualColumns', savedSheet.manualColumns);
    }

    setShowSavedSheetsModal(false);
    updateStatus(`Opened ${savedSheet.title}`);
  }, [persistSheetIdentity, setPref, sortedSavedSheets, updateStatus, user]);

  const handleOpenSavedSheetsModal = useCallback(() => {
    if (!user) {
      updateStatus('Sign in to open your saved sheets');
      return;
    }

    clearSavedSheetPreviewTimer();
    setPreviewSavedSheetId(currentSavedSheetId || sortedSavedSheets[0]?.id || '');
    setShowSavedSheetsModal(true);
  }, [clearSavedSheetPreviewTimer, currentSavedSheetId, sortedSavedSheets, updateStatus, user]);

  const handleCloseSavedSheetsModal = useCallback(() => {
    clearSavedSheetPreviewTimer();
    setPreviewSavedSheetId('');
    setShowSavedSheetsModal(false);
  }, [clearSavedSheetPreviewTimer]);

  const handlePreviewSavedSheetIntent = useCallback((savedSheetId: string) => {
    if (!savedSheetId || savedSheetId === previewSavedSheetId) {
      clearSavedSheetPreviewTimer();
      return;
    }

    clearSavedSheetPreviewTimer();
    savedSheetPreviewTimerRef.current = setTimeout(() => {
      setPreviewSavedSheetId(savedSheetId);
      savedSheetPreviewTimerRef.current = null;
    }, SAVED_SHEET_PREVIEW_DELAY_MS);
  }, [clearSavedSheetPreviewTimer, previewSavedSheetId]);

  const handlePreviewSavedSheetFocus = useCallback((savedSheetId: string) => {
    clearSavedSheetPreviewTimer();
    setPreviewSavedSheetId(savedSheetId);
  }, [clearSavedSheetPreviewTimer]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        handlePrint();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handlePrint]);

  const applyManualLockUpdate = useCallback((
    previousLocks: number[][],
    targetPageIndex: number,
    targetColumnIndex: number,
    anchorPageIndex: number,
  ) => {
    const nextLocks = trimManualLocks(previousLocks, anchorPageIndex);
    const targetPage = pageLayouts[targetPageIndex];
    const currentCounts = targetPage?.columnCounts ?? [];
    const existingLocks = nextLocks[targetPageIndex] ?? [];
    const lockCount = Math.max(existingLocks.length, targetColumnIndex);

    while (nextLocks.length <= targetPageIndex) {
      nextLocks.push([]);
    }

    nextLocks[targetPageIndex] = currentCounts.slice(0, lockCount);
    return nextLocks;
  }, [pageLayouts]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const nextActiveDragData = (event.active.data.current as DragData | null) ?? null;
    overSlotRef.current = null;
    previewSheetSongsRef.current = null;
    previewManualLocksRef.current = null;
    setLibraryPreviewActive(false);
    dragSnapshotSongsRef.current = nextActiveDragData?.type === 'sheet-song' || nextActiveDragData?.type === 'library-song'
      ? sheetSongs.map(cloneSong)
      : null;
    dragSnapshotManualLocksRef.current = nextActiveDragData?.type === 'sheet-song' || nextActiveDragData?.type === 'library-song'
      ? manualLocks.map((page) => [...page])
      : null;
    setActiveDragData(nextActiveDragData);
  }, [manualLocks, sheetSongs]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overData = event.over?.data.current as DragData | undefined;
    const nextOverSlotData = overData?.type === 'slot' ? overData : null;
    const snapshotSongs = dragSnapshotSongsRef.current ?? sheetSongs;
    const isValidLibraryHover = nextOverSlotData !== null;

    if (nextOverSlotData) {
      overSlotRef.current = nextOverSlotData;

      if (activeDragData?.type === 'sheet-song') {
        const resolvedInsertIndex = resolveInsertIndex(nextOverSlotData, activeDragData);
        setSheetSongs((prev) => {
          const nextSongs = reorderSongsInList(prev, activeDragData.song, resolvedInsertIndex);
          previewSheetSongsRef.current = nextSongs;
          return songsOrderEqual(prev, nextSongs) ? prev : nextSongs;
        });

        if (!autoFit) {
          const nextLocks = buildPreviewManualLocks(nextOverSlotData, activeDragData);
          previewManualLocksRef.current = nextLocks;
          setManualLocks(nextLocks);
        }
      }
    }

    if (activeDragData?.type === 'library-song') {
      setLibraryPreviewActive(isValidLibraryHover);
      const alreadyExists = snapshotSongs.some((song) => songKey(song) === songKey(activeDragData.song));
      if (isValidLibraryHover && !alreadyExists) {
        const resolvedInsertIndex = resolveInsertIndex(nextOverSlotData, activeDragData);
        const nextSongs = insertSongInList(snapshotSongs, activeDragData.song, resolvedInsertIndex);
        previewSheetSongsRef.current = nextSongs;
        if (!autoFit) {
          previewManualLocksRef.current = buildInsertedManualLocks(nextOverSlotData);
        }
      } else {
        previewSheetSongsRef.current = null;
        previewManualLocksRef.current = null;
      }
    }

    setOverSlotData(nextOverSlotData);
  }, [activeDragData, autoFit, buildInsertedManualLocks, buildPreviewManualLocks, insertSongInList, reorderSongsInList, sheetSongs]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const activeData = event.active.data.current as DragData | undefined;
    const overData = event.over?.data.current as DragData | undefined;
    const resolvedSlotData = overSlotRef.current ?? (overData?.type === 'slot' ? overData : null);

    overSlotRef.current = null;
    previewSheetSongsRef.current = null;
    previewManualLocksRef.current = null;
    setLibraryPreviewActive(false);
    setActiveDragData(null);
    setOverSlotData(null);

    if (!activeData) {
      return;
    }

    if (activeData.type === 'library-song') {
      const snapshotSongs = dragSnapshotSongsRef.current ?? sheetSongs;
      const alreadyExists = snapshotSongs.some((song) => songKey(song) === songKey(activeData.song));

      if (resolvedSlotData) {
        if (!alreadyExists) {
          const resolvedInsertIndex = resolveInsertIndex(resolvedSlotData, activeData);
          const nextSongs = previewSheetSongsRef.current ?? insertSongInList(snapshotSongs, activeData.song, resolvedInsertIndex);
          setSheetSongs(nextSongs);
          if (!autoFit) {
            setManualLocks(previewManualLocksRef.current ?? buildInsertedManualLocks(resolvedSlotData));
          }
          updateStatus(`Added ${activeData.song.title}`);
        }
      }

      dragSnapshotSongsRef.current = null;
      dragSnapshotManualLocksRef.current = null;
      return;
    }

    if (!resolvedSlotData) {
      if (activeData.type === 'sheet-song') {
        setSheetSongs(dragSnapshotSongsRef.current ?? sheetSongs);
        if (!autoFit) {
          setManualLocks(dragSnapshotManualLocksRef.current ?? manualLocks);
        }
      }
      dragSnapshotSongsRef.current = null;
      dragSnapshotManualLocksRef.current = null;
      return;
    }

    if (activeData.type === 'sheet-song') {
      dragSnapshotSongsRef.current = null;
      dragSnapshotManualLocksRef.current = null;

      updateStatus(`Moved ${activeData.song.title}`);
    }
  }, [autoFit, buildInsertedManualLocks, handleAddSong, insertSongInList, manualLocks, sheetSongs, updateStatus]);

  const columns = activeConfig.cols;
  const mobileSheetScale = isPhone ? Math.min((width - 16) / 612, 0.95) : 1;
  const singlePagePreview = !isPhone && renderedPageLayouts.length === 1;
  const singlePagePreviewStyle = singlePagePreview
    ? ({ '--sb2-single-page-scale': singlePagePreviewScale } as React.CSSProperties)
    : undefined;
  const sidebarSongCount = sidebarTab === 'library' ? filteredSongs.length : filteredPrivateSongs.length;
  const sidebarHeading = sidebarTab === 'library' ? 'Choose songs' : 'Use your private songs';
  const sidebarDescription = sidebarTab === 'library'
    ? 'Search the library, then drag or double-click a song to add it.'
    : user
      ? 'Open your own songs and add them to the current sheet.'
      : 'Sign in to work with songs that only you can see.';
  const sidebarCountLabel = sidebarTab === 'library'
    ? `${sidebarSongCount} songs available`
    : `${sidebarSongCount} private songs`;
  const searchPlaceholder = sidebarTab === 'library' ? 'Search by title or artist' : 'Search your songs';
  const currentSheetLabel = currentSavedSheet?.title || (sheetSongs.length > 0 ? 'Unsaved sheet' : 'Empty sheet');
  const layoutSummary = autoFit ? 'Auto fit' : `${columns} columns`;
  const displaySummary = [
    showTitles ? 'Titles' : null,
    showPageNumbers ? 'Page #' : null,
    showOrderNumbers ? 'Order #' : null,
  ].filter(Boolean).join(', ') || 'Lyrics only';

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className="sb2-root"
        style={isPhone ? ({ '--mobile-sheet-scale': mobileSheetScale } as React.CSSProperties) : undefined}
      >
        <MeasurementBank
          configs={measurementConfigs}
          songs={sheetSongs}
          showTitles={showTitles}
          showOrderNumbers={showOrderNumbers}
          setMeasureRef={setMeasureRef}
        />

        <div className="sb2-header-wrap"><Header /></div>

        <div className="sb2-main-layout">
          <div className={`sb2-sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

          <div className={`sb2-sidebar ${sidebarOpen ? 'open' : ''}`} data-tour="sidebar">
            <div className="sb2-sidebar-header" data-tour="sidebar-header">
              <div className="sb2-sidebar-intro">
                <span className="sb2-sidebar-step">Step 1</span>
                <h2>{sidebarHeading}</h2>
                <p>{sidebarDescription}</p>
              </div>
              <div className="sb2-sidebar-tabs">
                <button className={`sb2-sidebar-tab ${sidebarTab === 'library' ? 'active' : ''}`} onClick={() => setSidebarTab('library')}>
                  Song Library
                </button>
                <button className={`sb2-sidebar-tab ${sidebarTab === 'my' ? 'active' : ''}`} data-tour="saved-songs-tab" onClick={() => setSidebarTab('my')}>
                  My Songs{privateSongs.length > 0 ? ` (${privateSongs.length})` : ''}
                </button>
              </div>
              <label className="sb2-field-label" htmlFor="sb2-search-box">{sidebarCountLabel}</label>
              <input
                id="sb2-search-box"
                type="text"
                className="sb2-search-box"
                data-tour="search-box"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="sb2-sidebar-hint"><strong>Quick add:</strong> Double-click a song to add it fast, or drag it into the sheet to place it where you want.</div>

            {sidebarTab === 'library' ? (
              <div className="sb2-songs-list" data-tour="library-list">
                {filteredSongs.map((song, index) => {
                  const normalizedSong = cloneSong(song);
                  const key = songKey(normalizedSong);
                  return (
                    <SidebarSongDraggable
                      key={`library-${index}-${key}`}
                      dragId={`library:${index}:${key}`}
                      song={normalizedSong}
                      used={usedSongKeys.has(key)}
                      onDoubleClick={() => {
                        handleAddSong(normalizedSong);
                        if (isPhone) setSidebarOpen(false);
                      }}
                    />
                  );
                })}
                {allSongs.length === 0 && <div className="sb2-loading">Loading songs...</div>}
              </div>
            ) : (
              <div className="sb2-songs-list" data-tour="saved-songs-panel">
                {!user ? (
                  <div className="sb2-my-songs-signin">
                    <p>Sign in at the top to open your private songs.</p>
                  </div>
                ) : (
                  <>
                    <div className="sb2-my-songs-toolbar">
                      <button className="sb2-my-songs-add-btn" onClick={() => setShowAddForm(true)}>+ Add Song</button>
                    </div>
                    <AddSongModal open={showAddForm} onClose={() => setShowAddForm(false)} onSave={addSong} onSaveBulk={addSongs} />
                    {filteredPrivateSongs.length === 0 ? (
                      <div className="sb2-loading">{search ? 'Nothing matched that search.' : 'You do not have private songs yet. Add one from Songs.'}</div>
                    ) : (
                      filteredPrivateSongs.map((song, index) => {
                        const normalizedSong = cloneSong(song);
                        const key = songKey(normalizedSong);
                        return (
                          <SidebarSongDraggable
                            key={`my-${index}-${key}`}
                            dragId={`library:private:${index}:${key}`}
                            song={normalizedSong}
                            used={usedSongKeys.has(key)}
                            privateItem
                            onDoubleClick={() => {
                              handleAddSong(normalizedSong);
                              if (isPhone) setSidebarOpen(false);
                            }}
                          />
                        );
                      })
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="sb2-main-area">
            {false ? (
              <section className="sb2-tour-launch" aria-label="Sheet builder walkthrough">
                <div className="sb2-tour-launch-copy">
                  <span className="sb2-tour-launch-eyebrow">Quick walkthrough</span>
                  <h2>Click here for a guided tour</h2>
                  <p>
                    Start the guided walkthrough and it will highlight one tool at a time.
                    {isPhone ? ' It will also open the song list when you need it.' : ''}
                  </p>
                </div>
                <button type="button" className="sb2-tour-launch-btn" onClick={handleStartTour}>
                  Start walkthrough
                </button>
              </section>
            ) : null}
            <div className="sb2-toolbar" data-tour="toolbar">
              <div className="sb2-utility-bar">
                {/* File Ops */}
                <div className="sb2-utility-group" data-tour="sheet-section">
                  <button onClick={handleClearAll} className="sb2-icon-btn" title="New Sheet">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                  </button>
                  <button onClick={handleOpenSaveSheetModal} disabled={savedSheetsDisabled} className="sb2-icon-btn sb2-icon-btn-strong" title="Save Sheet">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  </button>
                  <button onClick={handleOpenSavedSheetsModal} disabled={savedSheetsDisabled} className="sb2-icon-btn" title="Open Saved Sheets">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                  </button>
                  <button onClick={handlePrint} className="sb2-icon-btn" title="Print Sheet">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  </button>
                </div>
                
                <div className="sb2-utility-divider" />

                {/* Layout Dropdown */}
                <div className="sb2-utility-group" data-tour="layout-section">
                  <select 
                    className="sb2-compact-select" 
                    value={autoFit ? 'auto' : columns} 
                    onChange={(e) => {
                      if (e.target.value === 'auto') handleSetAuto();
                      else handleSetColumns(Number(e.target.value));
                    }}
                    title="Column Layout"
                  >
                    <option value="auto">Auto Fit</option>
                    <option value="1">1 Column</option>
                    <option value="2">2 Columns</option>
                    <option value="3">3 Columns</option>
                  </select>
                </div>

                <div className="sb2-utility-divider" />

                {/* Display Formatting / Toggles */}
                <div className="sb2-utility-group" data-tour="display-section">
                  <button className={`sb2-icon-btn sb2-toggle-btn ${showTitles ? 'active' : ''}`} style={{ width: 'auto', padding: '0 8px' }} onClick={handleToggleTitles} title="Show Titles">
                    <span style={{ fontSize: '13px', fontWeight: 500, letterSpacing: '0.2px' }}>Titles</span>
                  </button>
                  <button className={`sb2-icon-btn sb2-toggle-btn ${showOrderNumbers ? 'active' : ''}`} onClick={handleToggleOrderNumbers} title="Show Order Numbers">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><polyline points="3 6 4 6 4 11"></polyline><path d="M3 17h2c.5 0 1-.5 1-1s-.5-1-1-1H3"></path><path d="M3 22h2c.5 0 1-.5 1-1s-.5-1-1-1H3"></path></svg>
                  </button>
                  <button className={`sb2-icon-btn sb2-toggle-btn ${showPageNumbers ? 'active' : ''}`} onClick={handleTogglePageNumbers} title="Show Page Numbers">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><text x="9" y="16" fontSize="8" fontWeight="bold">#</text></svg>
                  </button>
                </div>

                <div className="sb2-toolbar-spacer" style={{ flexGrow: 1 }} />

                {/* Status & Mode */}
                <div className="sb2-utility-status">
                  <div className="sb2-status" role="status" aria-live="polite">
                     {status} <span style={{opacity: 0.5, marginLeft: '8px'}}>• {displaySummary}</span>
                  </div>
                </div>
              </div>
            </div>

            <div data-tour="sheet-canvas">
              <SheetAreaDropZone
                enabled={activeDragData?.type === 'library-song'}
                className={singlePagePreview ? 'sb2-single-page-preview' : undefined}
                style={singlePagePreviewStyle}
                containerRef={pageContainerRef}
              >
                {renderedPageLayouts.map((page) => {
                  const pageMarkup = (
                    <div key={`page-${page.pageIndex}`} className={`sb2-sheet-page ${overPageIndex === page.pageIndex ? 'drag-over' : ''}`}>
                  <div className="sb2-page-header" />
                  <div
                    className={`sb2-packery-grid ${columns === 2 ? 'two-columns' : ''} ${columns === 3 ? 'three-columns' : ''}`}
                    style={{ '--sb2-columns': columns } as React.CSSProperties}
                  >
                    {page.columns.map((column, columnIndex) => (
                      <div key={`page-${page.pageIndex}-column-${columnIndex}`} className="sb2-sheet-column">
                        {page.slotInsertIndices[columnIndex].map((insertIndex, slotIndex) => {
                          const positionedSong = column[slotIndex];
                          const isPreviewSong =
                            previewSongKey !== null &&
                            positionedSong !== undefined &&
                            songKey(positionedSong.song) === previewSongKey;
                          const slotData: SlotDragData = {
                            type: 'slot',
                            pageIndex: page.pageIndex,
                            columnIndex,
                            slotIndex,
                            insertIndex,
                            occupiedGlobalIndex: positionedSong?.globalIndex,
                          };

                          const stackClassName = `sb2-slot-stack ${!positionedSong ? 'sb2-slot-stack-empty' : ''}`;
                          const stackContent = (
                            <>
                              <DropSlot
                                slotData={slotData}
                                expanded={!positionedSong}
                                preview={false}
                                active={
                                  overSlotData?.pageIndex === slotData.pageIndex &&
                                  overSlotData.columnIndex === slotData.columnIndex &&
                                  overSlotData.slotIndex === slotData.slotIndex
                                }
                              />
                              {isPreviewSong && positionedSong && (
                                <PreviewSongCard
                                  song={positionedSong.song}
                                  fontSize={activeConfig.fontSize}
                                  showTitles={showTitles}
                                  showOrderNumbers={showOrderNumbers}
                                  orderNumber={positionedSong.orderNumber}
                                  columnCount={columns}
                                />
                              )}
                              {positionedSong && !isPreviewSong && (
                                <SheetSongDraggable
                                  positionedSong={positionedSong}
                                  fontSize={activeConfig.fontSize}
                                  showTitles={showTitles}
                                  showOrderNumbers={showOrderNumbers}
                                  columnCount={columns}
                                  onRemove={() => handleRemoveSong(positionedSong.song)}
                                />
                              )}
                            </>
                          );

                          return positionedSong ? (
                            <SlotStackDropTarget
                              key={`page-${page.pageIndex}-column-${columnIndex}-slot-${slotIndex}`}
                              slotData={slotData}
                              className={stackClassName}
                            >
                              {stackContent}
                            </SlotStackDropTarget>
                          ) : (
                            <div
                              key={`page-${page.pageIndex}-column-${columnIndex}-slot-${slotIndex}`}
                              className={stackClassName}
                            >
                              {stackContent}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="sb2-page-footer">{showPageNumbers ? `${page.pageIndex + 1}` : ''}</div>
                  </div>
                  );

                  if (!singlePagePreview) {
                    return pageMarkup;
                  }

                  return (
                    <div key={`page-frame-${page.pageIndex}`} className="sb2-sheet-page-frame sb2-sheet-page-frame-single">
                      {pageMarkup}
                    </div>
                  );
                })}
              </SheetAreaDropZone>
            </div>

          </div>
        </div>

        {tourOpen && currentTourStep && tourTargetRect && (
          <div className="sb2-tour-layer" role="dialog" aria-modal="true" aria-label="Sheet builder walkthrough">
            <div
              className="sb2-tour-scrim-segment sb2-tour-scrim-top"
              style={{
                top: 0,
                left: 0,
                width: '100vw',
                height: Math.max(0, tourTargetRect.top - 6),
              }}
              onClick={handleCloseTour}
            />
            <div
              className="sb2-tour-scrim-segment sb2-tour-scrim-left"
              style={{
                top: Math.max(0, tourTargetRect.top - 6),
                left: 0,
                width: Math.max(0, tourTargetRect.left - 6),
                height: tourTargetRect.height + 12,
              }}
              onClick={handleCloseTour}
            />
            <div
              className="sb2-tour-scrim-segment sb2-tour-scrim-right"
              style={{
                top: Math.max(0, tourTargetRect.top - 6),
                left: tourTargetRect.left + tourTargetRect.width + 6,
                width: Math.max(0, window.innerWidth - (tourTargetRect.left + tourTargetRect.width + 6)),
                height: tourTargetRect.height + 12,
              }}
              onClick={handleCloseTour}
            />
            <div
              className="sb2-tour-scrim-segment sb2-tour-scrim-bottom"
              style={{
                top: tourTargetRect.top + tourTargetRect.height + 6,
                left: 0,
                width: '100vw',
                height: Math.max(0, window.innerHeight - (tourTargetRect.top + tourTargetRect.height + 6)),
              }}
              onClick={handleCloseTour}
            />
            <div
              className="sb2-tour-highlight"
              style={{
                top: tourTargetRect.top - 6,
                left: tourTargetRect.left - 6,
                width: tourTargetRect.width + 12,
                height: tourTargetRect.height + 12,
              }}
            />
            <div className="sb2-tour-card" style={tourCardStyle}>
              <div className="sb2-tour-step-count">Step {tourStepIndex + 1} of {TOUR_STEPS.length}</div>
              <div className="sb2-tour-progress" aria-hidden>
                {TOUR_STEPS.map((step, index) => (
                  <span
                    key={step.id}
                    className={`sb2-tour-progress-dot ${index === tourStepIndex ? 'is-active' : ''} ${index < tourStepIndex ? 'is-complete' : ''}`}
                  />
                ))}
              </div>
              <h2>{currentTourStep.title}</h2>
              <p>{currentTourStep.description}</p>
              <div className="sb2-tour-actions">
                <button className="sb2-toolbar-button-subtle" onClick={handleCloseTour}>Close Tour</button>
                <div className="sb2-tour-actions-right">
                  <button onClick={handlePreviousTourStep} disabled={tourStepIndex === 0}>Back</button>
                  <button className="sb2-toolbar-button-strong" onClick={handleNextTourStep}>
                    {tourStepIndex === TOUR_STEPS.length - 1 ? 'Done' : 'Next'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <PrintSheetPages
          pageLayouts={renderedPageLayouts}
          config={activeConfig}
          showTitles={showTitles}
          showPageNumbers={showPageNumbers}
          showOrderNumbers={showOrderNumbers}
        />

        <button className="sb2-sidebar-toggle" onClick={() => setSidebarOpen((value) => !value)} aria-label={sidebarOpen ? 'Close song library' : 'Open song library'}>
          {sidebarOpen ? 'Close' : 'Songs'}
        </button>

        {showSavedSheetsModal && (
          <div className="sb2-sheet-browser-backdrop" onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseSavedSheetsModal();
            }
          }}>
            <div className="sb2-sheet-browser-modal">
              <div className="sb2-sheet-browser-header sb2-utility-bar">
                <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: '12px' }}>
                  <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>Saved Sheets</h2>
                  <div className="sb2-utility-divider" style={{ margin: 0 }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>Point to a sheet name to preview it. Click it to open it.</p>
                </div>
                <button className="sb2-icon-btn sb2-sheet-browser-close" onClick={handleCloseSavedSheetsModal} aria-label="Close saved sheets">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <div className="sb2-sheet-browser-body">
                <div className="sb2-sheet-browser-list">
                  {sortedSavedSheets.length === 0 ? (
                    <div className="sb2-sheet-browser-empty">You do not have saved sheets yet.</div>
                  ) : (
                    sortedSavedSheets.map((savedSheet) => {
                      const isCurrent = savedSheet.id === currentSavedSheetId;
                      const isPreviewed = savedSheet.id === previewSavedSheetId;

                      return (
                        <button
                          key={savedSheet.id}
                          type="button"
                          className={`sb2-sheet-browser-item ${isPreviewed ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
                          onMouseEnter={() => handlePreviewSavedSheetIntent(savedSheet.id)}
                          onMouseLeave={clearSavedSheetPreviewTimer}
                          onFocus={() => handlePreviewSavedSheetFocus(savedSheet.id)}
                          onClick={() => handleLoadSavedSheet(savedSheet.id)}
                        >
                          <span className="sb2-sheet-browser-item-title">{savedSheet.title}</span>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="sb2-sheet-browser-preview">
                  {!savedSheetPreview ? (
                    <div className="sb2-sheet-browser-empty">Point to a sheet name to preview it.</div>
                  ) : (
                    <div
                      className="sb2-sheet-browser-thumbnail-wrap sb2-sheet-browser-thumbnail-panel"
                      role="button"
                      tabIndex={0}
                      aria-label={`Open saved sheet ${savedSheetPreview.sheet.title}`}
                      onClick={() => handleLoadSavedSheet(savedSheetPreview.sheet.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleLoadSavedSheet(savedSheetPreview.sheet.id);
                        }
                      }}
                    >
                      <div className="sb2-sheet-browser-thumbnail-header">
                        <div>
                          <div className="sb2-sheet-browser-thumbnail-title">{savedSheetPreview.sheet.title}</div>
                          <div className="sb2-sheet-browser-thumbnail-date">Updated {formatSavedSheetDate(savedSheetPreview.sheet.updatedAt)}</div>
                        </div>
                        <div className="sb2-sheet-browser-thumbnail-meta">
                          <span>{savedSheetPreview.sheet.songs.length} songs</span>
                          <span>{savedSheetPreview.pages.length} page{savedSheetPreview.pages.length === 1 ? '' : 's'}</span>
                          <span>{savedSheetPreview.config.cols} col</span>
                        </div>
                      </div>

                      <div
                        className={`sb2-sheet-browser-scroll-hint ${savedSheetPreview.pages.length > 1 ? 'visible' : 'hidden'}`}
                        aria-hidden={savedSheetPreview.pages.length <= 1}
                      >
                        {savedSheetPreview.pages.length > 1 ? 'Scroll to see every page' : ''}
                      </div>

                      {savedSheetPreview.pages.map((page) => (
                        <div key={page.pageIndex} className="sb2-sheet-browser-page-frame">
                          <div className="sb2-sheet-browser-page-scale">
                            <div className="sb2-sheet-page sb2-sheet-page-thumbnail">
                              <div className="sb2-page-header" />
                              <div
                                className={`sb2-packery-grid sb2-packery-grid-thumbnail ${savedSheetPreview.config.cols === 2 ? 'two-columns' : ''} ${savedSheetPreview.config.cols === 3 ? 'three-columns' : ''}`}
                                style={{ '--sb2-columns': savedSheetPreview.config.cols } as React.CSSProperties}
                              >
                                {page.columns.map((column, columnIndex) => (
                                  <div key={`${page.pageIndex}-${columnIndex}`} className="sb2-sheet-column">
                                    {column.map((positionedSong) => (
                                      <div key={`${page.pageIndex}-${columnIndex}-${positionedSong.globalIndex}`} className="sb2-song-card sb2-sheet-thumbnail-card">
                                        <SheetCardContent
                                          song={positionedSong.song}
                                          fontSize={savedSheetPreview.config.fontSize}
                                          showTitles={savedSheetPreview.sheet.showTitles}
                                          showOrderNumbers={savedSheetPreview.sheet.showOrderNumbers}
                                          orderNumber={positionedSong.orderNumber}
                                          columnCount={savedSheetPreview.config.cols}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                              <div className="sb2-page-footer">{savedSheetPreview.sheet.showPageNumbers ? `${page.pageIndex + 1}` : ''}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showSaveSheetModal && (
          <div className="sb2-sheet-browser-backdrop" onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowSaveSheetModal(false);
            }
          }}>
            <form
              className="sb2-overwrite-modal sb2-save-modal"
              onSubmit={(event) => {
                event.preventDefault();
                void saveNamedSheet(saveDraftSheetTitle);
              }}
            >
              <div className="sb2-sheet-browser-header sb2-utility-bar" style={{ gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: '12px' }}>
                  <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>Save Sheet</h2>
                  <div className="sb2-utility-divider" style={{ margin: 0 }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>Type a name for this sheet.</p>
                </div>
                <button type="button" className="sb2-icon-btn sb2-sheet-browser-close" onClick={() => setShowSaveSheetModal(false)} aria-label="Close save dialog">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <div className="sb2-save-modal-body">
                <input
                  type="text"
                  className="sb2-sheet-title-input sb2-save-modal-input"
                  placeholder="Type a sheet name"
                  value={saveDraftSheetTitle}
                  onChange={(event) => setSaveDraftSheetTitle(event.target.value)}
                  autoFocus
                />
              </div>

              <div className="sb2-overwrite-modal-footer">
                <button type="submit" className="sb2-overwrite-confirm-btn" disabled={!saveDraftSheetTitle.trim()}>
                  Save
                </button>
              </div>
            </form>
          </div>
        )}

        {showOverwriteSheetModal && (
          <div className="sb2-sheet-browser-backdrop" onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCancelOverwriteSheet();
            }
          }}>
            <div className="sb2-overwrite-modal">
              <div className="sb2-sheet-browser-header sb2-utility-bar" style={{ gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: '12px' }}>
                  <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>Saved sheet limit full</h2>
                  <div className="sb2-utility-divider" style={{ margin: 0 }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>Pick one to replace.</p>
                </div>
                <button type="button" className="sb2-icon-btn sb2-sheet-browser-close" onClick={() => setShowOverwriteSheetModal(false)} aria-label="Close dialog">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <div className="sb2-overwrite-modal-body">
                <div className="sb2-overwrite-sheet-list">
                  {sortedSavedSheets.map((savedSheet) => (
                    <button
                      key={savedSheet.id}
                      type="button"
                      className={`sb2-overwrite-sheet-item ${overwriteTargetSheetId === savedSheet.id ? 'active' : ''}`}
                      onClick={() => setOverwriteTargetSheetId(savedSheet.id)}
                    >
                      <span className="sb2-overwrite-sheet-title">{savedSheet.title}</span>
                      <span className="sb2-overwrite-sheet-date">Updated {formatSavedSheetDate(savedSheet.updatedAt)}</span>
                    </button>
                  ))}
                </div>

                <div className="sb2-overwrite-sheet-summary">
                  <div className="sb2-overwrite-sheet-summary-label">Sheet to replace</div>
                  <div className="sb2-overwrite-sheet-summary-title">{overwriteTargetSheet?.title ?? 'Nothing picked yet'}</div>
                  <div className="sb2-overwrite-sheet-summary-text">
                    {overwriteTargetSheet
                      ? `This will replace "${overwriteTargetSheet.title}" with the sheet you have open now.`
                      : 'Pick a saved sheet to replace.'}
                  </div>
                </div>
              </div>

              <div className="sb2-overwrite-modal-footer">
                <button type="button" onClick={handleCancelOverwriteSheet}>Cancel</button>
                <button type="button" className="sb2-overwrite-confirm-btn" onClick={handleConfirmOverwriteSheet} disabled={!overwriteTargetSheetId}>
                  Replace Saved Sheet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}

export default SheetBuilderApp;