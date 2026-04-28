'use client';

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/Header';
import AddSongModal from '@/components/AddSongModal';
import { useDevice } from '@/hooks/useDevice';
import { useGoogleAuth } from '@/components/GoogleAuthProvider';
import './sheet-builder.css';

interface Song {
  search_title?: string;
  title: string;
  lyrics: string;
  artist: string;
  drive?: string;
  youtube?: string;
}

interface SongData {
  title: string;
  artist: string;
  lyrics: string;
}

interface SheetConfig {
  cols: number;
  fontSize: number;
}

interface PositionedSong {
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

interface ConfigMeasurement {
  heights: Record<string, number>;
  hasOverflow: boolean;
}

interface SlotDragData {
  type: 'slot';
  pageIndex: number;
  columnIndex: number;
  slotIndex: number;
  insertIndex: number;
}

interface SheetSongDragData {
  type: 'sheet-song';
  song: SongData;
  globalIndex: number;
  pageIndex: number;
  columnIndex: number;
  orderNumber: number;
}

interface LibrarySongDragData {
  type: 'library-song';
  song: SongData;
}

type DragData = SlotDragData | SheetSongDragData | LibrarySongDragData;

interface ActiveDragPreview {
  width: number | null;
  height: number | null;
  fallbackCenterX: number | null;
  fallbackCenterY: number | null;
}

interface PointerPosition {
  x: number;
  y: number;
}

function getActivatorClientCoordinates(event: Event | null) {
  if (!event) return null;

  const pointerLikeEvent = event as Event & {
    clientX?: number;
    clientY?: number;
    touches?: ArrayLike<{ clientX: number; clientY: number }>;
    changedTouches?: ArrayLike<{ clientX: number; clientY: number }>;
  };

  if (typeof pointerLikeEvent.clientX === 'number' && typeof pointerLikeEvent.clientY === 'number') {
    return { clientX: pointerLikeEvent.clientX, clientY: pointerLikeEvent.clientY };
  }

  const firstTouch = pointerLikeEvent.touches?.[0] ?? pointerLikeEvent.changedTouches?.[0];
  if (firstTouch) {
    return { clientX: firstTouch.clientX, clientY: firstTouch.clientY };
  }

  return null;
}

const PAGE_CONTENT_HEIGHT = 592;
const PAGE_GRID_WIDTH = 512;
const GRID_GUTTER_WIDTH = 15;
const CARD_VERTICAL_GAP = 8;
const STORAGE_KEY = 'sheetSongsV2';
const DEFAULT_STATUS = 'Drag songs to the sheet';

const CONFIGS: SheetConfig[] = [
  { cols: 1, fontSize: 14 },
  { cols: 2, fontSize: 14 },
  { cols: 2, fontSize: 12 },
  { cols: 3, fontSize: 14 },
  { cols: 3, fontSize: 12 },
  { cols: 2, fontSize: 10 },
  { cols: 3, fontSize: 10 },
];

function songKey(song: SongData) {
  return `${song.title}|${song.artist}`;
}

function configKey(config: SheetConfig) {
  return `${config.cols}-${config.fontSize}`;
}

function getColumnWidth(columns: number) {
  return (PAGE_GRID_WIDTH - GRID_GUTTER_WIDTH * Math.max(columns - 1, 0)) / Math.max(columns, 1);
}

function estimateSongHeight(song: SongData, fontSize: number, showTitles: boolean, showOrderNumbers: boolean) {
  const lyricLines = (song.lyrics || '').split('\n').length;
  const titleHeight = showTitles || showOrderNumbers ? fontSize * 1.4 + 4 : 0;
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
    tallest: Number.POSITIVE_INFINITY,
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

    if (spread < bestResult.spread || (spread === bestResult.spread && tallest < bestResult.tallest)) {
      bestResult.columns = paddedColumns;
      bestResult.spread = spread;
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
  for (let count = remainingSongs.length; count >= 1; count -= 1) {
    const pageSongs = remainingSongs.slice(0, count);
    const columns = buildBalancedColumns(pageSongs, 0, 0, config, measurements, showTitles, showOrderNumbers);
    const fits = columns.every((column) =>
      getColumnHeightForSongs(column.map((entry) => entry.song), config, measurements, showTitles, showOrderNumbers) <= PAGE_CONTENT_HEIGHT,
    );
    if (fits) {
      return count;
    }
  }

  return 1;
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

  let bestConfig = CONFIGS[0];
  let bestOverflowPenalty = Number.POSITIVE_INFINITY;
  let bestPageCount = Number.POSITIVE_INFINITY;

  CONFIGS.forEach((config, index) => {
    const measurement = measurements[configKey(config)];
    const overflowPenalty = measurement?.hasOverflow ? 1 : 0;
    const pageCount = paginateAutoSongs(songs, config, measurements, showTitles, showOrderNumbers).length;

    const isBetter =
      overflowPenalty < bestOverflowPenalty ||
      (overflowPenalty === bestOverflowPenalty && pageCount < bestPageCount) ||
      (overflowPenalty === bestOverflowPenalty && pageCount === bestPageCount && index < CONFIGS.indexOf(bestConfig));

    if (isBetter) {
      bestConfig = config;
      bestOverflowPenalty = overflowPenalty;
      bestPageCount = pageCount;
    }
  });

  return bestConfig;
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

function arraysEqual(a: number[] | undefined, b: number[] | undefined) {
  if (!a && !b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function trimManualLocks(locks: number[][], keepUntilPageIndex: number) {
  return locks.slice(0, keepUntilPageIndex + 1).map((pageLocks) => [...pageLocks]);
}

function cloneSong(song: SongData): SongData {
  return { title: song.title, artist: song.artist, lyrics: song.lyrics };
}

function SheetCardContent({
  song,
  fontSize,
  showTitles,
  showOrderNumbers,
  orderNumber,
  onRemove,
}: {
  song: SongData;
  fontSize: number;
  showTitles: boolean;
  showOrderNumbers: boolean;
  orderNumber: number;
  onRemove?: () => void;
}) {
  return (
    <>
      {(showTitles || showOrderNumbers) && (
        <div className="sb2-song-card-title" style={{ fontSize }}>
          {showOrderNumbers && <span className="sb2-order-number">{orderNumber}.</span>}
          {showTitles && <span>{showTitles && showOrderNumbers ? ` ${song.title}` : song.title}</span>}
        </div>
      )}
      <div className="sb2-song-card-lyrics" style={{ fontSize }}>
        {song.lyrics || ''}
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

function SidebarSongDraggable({
  song,
  used,
  onDoubleClick,
  privateItem = false,
}: {
  song: SongData;
  used: boolean;
  onDoubleClick: () => void;
  privateItem?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library:${songKey(song)}`,
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
      <div className="sb2-song-item-title">{song.title}</div>
      <div className="sb2-song-item-artist">{song.artist || 'Unknown'}</div>
    </div>
  );
}

function DropSlot({ slotData, active }: { slotData: SlotDragData; active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${slotData.pageIndex}:${slotData.columnIndex}:${slotData.slotIndex}:${slotData.insertIndex}`,
    data: slotData,
  });

  return <div ref={setNodeRef} className={`sb2-drop-slot ${active || isOver ? 'active' : ''}`} />;
}

function SheetSongDraggable({
  positionedSong,
  fontSize,
  showTitles,
  showOrderNumbers,
  onRemove,
}: {
  positionedSong: PositionedSong;
  fontSize: number;
  showTitles: boolean;
  showOrderNumbers: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sheet:${songKey(positionedSong.song)}`,
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
            <div className="sb2-measure-column" style={{ width: getColumnWidth(config.cols) }}>
              {songs.map((song, index) => (
                <div key={`${key}-${songKey(song)}`} className="sb2-song-card sb2-measure-card" data-song-key={songKey(song)}>
                  <SheetCardContent
                    song={song}
                    fontSize={config.fontSize}
                    showTitles={showTitles}
                    showOrderNumbers={showOrderNumbers}
                    orderNumber={index + 1}
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

export default function SheetBuilderApp() {
  const { isPhone, width } = useDevice();
  const { user, privateSongs, preferences, addSong, addSongs, setPref } = useGoogleAuth();

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
  const [measurements, setMeasurements] = useState<Record<string, ConfigMeasurement>>({});
  const [activeDragData, setActiveDragData] = useState<DragData | null>(null);
  const [activeDragPreview, setActiveDragPreview] = useState<ActiveDragPreview | null>(null);
  const [pointerPosition, setPointerPosition] = useState<PointerPosition | null>(null);
  const [overSlotData, setOverSlotData] = useState<SlotDragData | null>(null);

  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measurementRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const measurementSignatureRef = useRef('');
  const loadedSavedSongsRef = useRef(false);

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
    };
  }, []);

  useEffect(() => {
    if (preferences.sbSidebarTab) setSidebarTabState(preferences.sbSidebarTab as 'library' | 'my');
    if (preferences.sbShowTitles !== undefined) setShowTitles(!!preferences.sbShowTitles);
    if (preferences.sbShowPageNumbers !== undefined) setShowPageNumbers(!!preferences.sbShowPageNumbers);
    if (preferences.sbShowOrderNumbers !== undefined) setShowOrderNumbers(!!preferences.sbShowOrderNumbers);
    if (preferences.sbAutoFit !== undefined) setAutoFit(!!preferences.sbAutoFit);
    if (typeof preferences.sbManualColumns === 'number') setManualColumns(preferences.sbManualColumns);
  }, [preferences]);

  const setSidebarTab = useCallback((value: 'library' | 'my') => {
    setSidebarTabState(value);
    if (user) setPref('sbSidebarTab', value);
  }, [setPref, user]);

  useEffect(() => {
    if (!isPhone) setSidebarOpen(false);
  }, [isPhone]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/songs');
        if (!res.ok) throw new Error('Failed');
        setAllSongs(await res.json());
      } catch {
        setAllSongs([
          { title: 'אדיר הוא', artist: 'Traditional', lyrics: 'אדיר הוא\nיבנה ביתו בקרוב\nבמהרה בימינו בקרוב' },
          { title: 'עוד ישמע', artist: 'Traditional', lyrics: 'עוד ישמע בערי יהודה\nובחוצות ירושלים' },
          { title: 'ושמחת', artist: 'Traditional', lyrics: 'ושמחת בחגך\nוהיית אך שמח' },
        ]);
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

  const usedSongKeys = useMemo(() => new Set(sheetSongs.map((song) => songKey(song))), [sheetSongs]);

  const measurementConfigs = useMemo(() => {
    return dedupeConfigs([...CONFIGS, { cols: manualColumns, fontSize: manualFontSize }]);
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
        heights[cardKey] = card.offsetHeight;
        const title = card.querySelector('.sb2-song-card-title') as HTMLElement | null;
        const lyrics = card.querySelector('.sb2-song-card-lyrics') as HTMLElement | null;
        if ((title && title.scrollWidth > title.clientWidth) || (lyrics && lyrics.scrollWidth > lyrics.clientWidth)) {
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

  useEffect(() => {
    if (autoFit) {
      setManualFontSize(autoConfig.fontSize);
    }
  }, [autoConfig.fontSize, autoFit]);

  const activeConfig = useMemo<SheetConfig>(() => {
    return autoFit ? autoConfig : { cols: manualColumns, fontSize: manualFontSize };
  }, [autoConfig, autoFit, manualColumns, manualFontSize]);

  const pageLayouts = useMemo(() => {
    return autoFit
      ? paginateAutoSongs(sheetSongs, activeConfig, measurements, showTitles, showOrderNumbers)
      : paginateManualSongs(sheetSongs, activeConfig, manualLocks, measurements, showTitles, showOrderNumbers);
  }, [activeConfig, autoFit, manualLocks, measurements, sheetSongs, showOrderNumbers, showTitles]);

  const overPageIndex = overSlotData?.pageIndex ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const handleAddSong = useCallback((song: SongData) => {
    if (usedSongKeys.has(songKey(song))) {
      updateStatus(`"${song.title}" is already on the sheet`);
      return;
    }

    setSheetSongs((prev) => [...prev, cloneSong(song)]);
    updateStatus(`Added "${song.title}"`);
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
    setAutoFit(true);
    if (user) setPref('sbAutoFit', true);
  }, [setPref, user]);

  const handleRemoveSong = useCallback((targetSong: SongData) => {
    const sourcePageIndex = pageLayouts.findIndex((page) =>
      page.columns.some((column) => column.some((positionedSong) => songKey(positionedSong.song) === songKey(targetSong))),
    );

    setSheetSongs((prev) => prev.filter((song) => songKey(song) !== songKey(targetSong)));
    if (!autoFit && sourcePageIndex >= 0) {
      setManualLocks((prev) => trimManualLocks(prev, sourcePageIndex));
    }
    updateStatus(`Removed "${targetSong.title}"`);
  }, [autoFit, pageLayouts, updateStatus]);

  const handlePrint = useCallback(() => window.print(), []);

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
    const initialRect = event.active.rect.current.initial;
    const activatorCoordinates = getActivatorClientCoordinates(event.activatorEvent);

    setActiveDragData((event.active.data.current as DragData | null) ?? null);
    setActiveDragPreview({
      width: event.active.rect.current.initial?.width ?? null,
      height: event.active.rect.current.initial?.height ?? null,
      fallbackCenterX: initialRect ? initialRect.left + initialRect.width / 2 : null,
      fallbackCenterY: initialRect ? initialRect.top + initialRect.height / 2 : null,
    });
    setPointerPosition(
      activatorCoordinates
        ? { x: activatorCoordinates.clientX, y: activatorCoordinates.clientY }
        : (initialRect
          ? { x: initialRect.left + initialRect.width / 2, y: initialRect.top + initialRect.height / 2 }
          : null),
    );
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overData = event.over?.data.current as DragData | undefined;
    setOverSlotData(overData?.type === 'slot' ? overData : null);
  }, []);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    if (!activeDragPreview?.fallbackCenterX || !activeDragPreview?.fallbackCenterY) {
      return;
    }

    setPointerPosition({
      x: activeDragPreview.fallbackCenterX + event.delta.x,
      y: activeDragPreview.fallbackCenterY + event.delta.y,
    });
  }, [activeDragPreview]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const activeData = event.active.data.current as DragData | undefined;
    const overData = event.over?.data.current as DragData | undefined;

    setActiveDragData(null);
    setActiveDragPreview(null);
    setPointerPosition(null);
    setOverSlotData(null);

    if (!activeData || !overData || overData.type !== 'slot') {
      return;
    }

    if (activeData.type === 'library-song') {
      if (usedSongKeys.has(songKey(activeData.song))) {
        updateStatus(`"${activeData.song.title}" is already on the sheet`);
        return;
      }

      setSheetSongs((prev) => {
        const next = [...prev];
        next.splice(overData.insertIndex, 0, cloneSong(activeData.song));
        return next;
      });

      if (!autoFit) {
        setManualLocks((prev) => applyManualLockUpdate(prev, overData.pageIndex, overData.columnIndex, overData.pageIndex));
      }

      updateStatus(`Added "${activeData.song.title}"`);
      return;
    }

    if (activeData.type === 'sheet-song') {
      if (activeData.globalIndex === overData.insertIndex || activeData.globalIndex + 1 === overData.insertIndex) {
        if (!autoFit) {
          setManualLocks((prev) => applyManualLockUpdate(
            prev,
            overData.pageIndex,
            overData.columnIndex,
            Math.min(activeData.pageIndex, overData.pageIndex),
          ));
        }
        return;
      }

      setSheetSongs((prev) => {
        const next = [...prev];
        const [movedSong] = next.splice(activeData.globalIndex, 1);
        if (!movedSong) return prev;
        const targetIndex = overData.insertIndex > activeData.globalIndex ? overData.insertIndex - 1 : overData.insertIndex;
        next.splice(targetIndex, 0, movedSong);
        return next;
      });

      if (!autoFit) {
        setManualLocks((prev) => applyManualLockUpdate(
          prev,
          overData.pageIndex,
          overData.columnIndex,
          Math.min(activeData.pageIndex, overData.pageIndex),
        ));
      }

      updateStatus(`Moved "${activeData.song.title}"`);
    }
  }, [applyManualLockUpdate, autoFit, updateStatus, usedSongKeys]);

  const columns = activeConfig.cols;
  const mobileSheetScale = isPhone ? Math.min((width - 16) / 612, 0.95) : 1;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
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

          <div className={`sb2-sidebar ${sidebarOpen ? 'open' : ''}`}>
            <div className="sb2-sidebar-header">
              <div className="sb2-sidebar-tabs">
                <button className={`sb2-sidebar-tab ${sidebarTab === 'library' ? 'active' : ''}`} onClick={() => setSidebarTab('library')}>
                  Song Library
                </button>
                <button className={`sb2-sidebar-tab ${sidebarTab === 'my' ? 'active' : ''}`} onClick={() => setSidebarTab('my')}>
                  My Songs{privateSongs.length > 0 ? ` (${privateSongs.length})` : ''}
                </button>
              </div>
              <input
                type="text"
                className="sb2-search-box"
                placeholder="Search songs..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="sb2-sidebar-hint"><strong>Tip:</strong> Drag songs to the sheet or double-click to add them. Drag cards on the sheet to reorder.</div>

            {sidebarTab === 'library' ? (
              <div className="sb2-songs-list">
                {filteredSongs.map((song) => {
                  const normalizedSong = cloneSong(song);
                  const key = songKey(normalizedSong);
                  return (
                    <SidebarSongDraggable
                      key={key}
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
              <div className="sb2-songs-list">
                {!user ? (
                  <div className="sb2-my-songs-signin">
                    <p>Sign in from the header to access your private songs.</p>
                  </div>
                ) : (
                  <>
                    <div className="sb2-my-songs-toolbar">
                      <button className="sb2-my-songs-add-btn" onClick={() => setShowAddForm(true)}>+ Add Song</button>
                    </div>
                    <AddSongModal open={showAddForm} onClose={() => setShowAddForm(false)} onSave={addSong} onSaveBulk={addSongs} />
                    {filteredPrivateSongs.length === 0 ? (
                      <div className="sb2-loading">{search ? 'No matches' : 'No private songs yet. Add songs from the Song Directory.'}</div>
                    ) : (
                      filteredPrivateSongs.map((song) => {
                        const normalizedSong = cloneSong(song);
                        const key = songKey(normalizedSong);
                        return (
                          <SidebarSongDraggable
                            key={`my-${key}`}
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
            <div className="sb2-toolbar">
              <div className="sb2-toolbar-group"><button onClick={handleClearAll}>Clear All</button></div>
              <div className="sb2-toolbar-group">
                <button onClick={handleToggleTitles}>{showTitles ? 'Hide Titles' : 'Show Titles'}</button>
                <button onClick={handleTogglePageNumbers}>{showPageNumbers ? 'Hide Page #' : 'Show Page #'}</button>
                <button onClick={handleToggleOrderNumbers}>{showOrderNumbers ? 'Hide Order #' : 'Show Order #'}</button>
              </div>
              <div className="sb2-toolbar-group">
                <span className="sb2-toolbar-label">Columns:</span>
                <div className="sb2-column-controls">
                  <button className={!autoFit && columns === 1 ? 'active' : ''} onClick={() => handleSetColumns(1)}>1</button>
                  <button className={!autoFit && columns === 2 ? 'active' : ''} onClick={() => handleSetColumns(2)}>2</button>
                  <button className={!autoFit && columns === 3 ? 'active' : ''} onClick={() => handleSetColumns(3)}>3</button>
                  <button className={autoFit ? 'active' : ''} onClick={handleSetAuto}>Auto</button>
                </div>
              </div>
              <div className="sb2-toolbar-group spacer" />
              <div className="sb2-toolbar-group">
                <button className="sb2-print-btn" onClick={handlePrint}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Print
                </button>
              </div>
              <div className="sb2-toolbar-group"><span className="sb2-status">{status}</span></div>
            </div>

            <div className="sb2-page-container">
              {pageLayouts.map((page) => (
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
                          const slotData: SlotDragData = {
                            type: 'slot',
                            pageIndex: page.pageIndex,
                            columnIndex,
                            slotIndex,
                            insertIndex,
                          };

                          return (
                            <div key={`page-${page.pageIndex}-column-${columnIndex}-slot-${slotIndex}`} className="sb2-slot-stack">
                              <DropSlot
                                slotData={slotData}
                                active={
                                  overSlotData?.pageIndex === slotData.pageIndex &&
                                  overSlotData.columnIndex === slotData.columnIndex &&
                                  overSlotData.slotIndex === slotData.slotIndex
                                }
                              />
                              {positionedSong && (
                                <SheetSongDraggable
                                  positionedSong={positionedSong}
                                  fontSize={activeConfig.fontSize}
                                  showTitles={showTitles}
                                  showOrderNumbers={showOrderNumbers}
                                  onRemove={() => handleRemoveSong(positionedSong.song)}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="sb2-page-footer">{showPageNumbers ? `${page.pageIndex + 1}` : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button className="sb2-sidebar-toggle" onClick={() => setSidebarOpen((value) => !value)} aria-label={sidebarOpen ? 'Close song library' : 'Open song library'}>
          {sidebarOpen ? 'Close' : 'Songs'}
        </button>
      </div>

      {activeDragData && activeDragData.type !== 'slot' && (pointerPosition || activeDragPreview) ? (
        <div
          className="sb2-song-card sb2-drag-overlay-card"
          style={{
            width: activeDragPreview?.width ? `${activeDragPreview.width}px` : undefined,
            minHeight: activeDragPreview?.height ? `${activeDragPreview.height}px` : undefined,
            position: 'fixed',
            left: `${(pointerPosition?.x ?? activeDragPreview?.fallbackCenterX ?? 0) - (activeDragPreview?.width ?? 0) / 2}px`,
            top: `${(pointerPosition?.y ?? activeDragPreview?.fallbackCenterY ?? 0) - (activeDragPreview?.height ?? 0) / 2}px`,
            zIndex: 10000,
          }}
        >
          <SheetCardContent
            song={activeDragData.song}
            fontSize={activeConfig.fontSize}
            showTitles={showTitles}
            showOrderNumbers={showOrderNumbers && activeDragData.type === 'sheet-song'}
            orderNumber={activeDragData.type === 'sheet-song' ? activeDragData.orderNumber : 0}
          />
        </div>
      ) : null}
    </DndContext>
  );
}