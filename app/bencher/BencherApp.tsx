'use client';

import {
  closestCenter,
  DndContext,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import HTMLFlipBook from 'react-pageflip';
import AddSongModal from '@/components/AddSongModal';
import Header from '@/components/Header';
import BencherPrintView from './PrintView';
import { useOptionalGoogleAuth } from '@/components/GoogleAuthProvider';
import type { PrivateSong } from '@/lib/google-drive';

const PdfPageBackground = dynamic(() => import('./PdfPageBackground'), {
  ssr: false,
  loading: () => <div className="bencher-page-art bencher-pdf-loading" />,
});
import {
  DropSlot,
  PreviewSongCard,
  SheetSongDraggable,
  SidebarSongDraggable,
  SlotStackDropTarget,
  type PositionedSong,
  type SlotDragData,
  type SongData,
} from '@/app/sheet-builder-v2/SheetBuilderApp';
import {
  type BencherPagePlacement,
  type BencherRect,
  BENCHER_MODE_CONFIGS,
  type BencherMode,
  getBencherModeConfig,
  getBencherPageBackground,
  getBencherLogoPlacement,
  getBencherPages,
  getBencherSongDropPlacement,
  rectToCss,
  BENCHER_SONG_FONT_SIZE,
  BENCHER_DESIGN_PAGE_WIDTH,
  bencherPrintContentWidth,
  formatBencherLyrics,
} from './bencher-layout';
import { downloadPdf } from './imposeBooklet';

interface Song extends SongData {
  search_title?: string;
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

type BencherDragData = SlotDragData | SheetSongDragData | LibrarySongDragData;


const COVER_FONT_OPTIONS = [
  { value: 'times-new-roman', label: 'Times New Roman', family: '"Times New Roman", Times, serif' },
  { value: 'georgia', label: 'Georgia', family: 'Georgia, "Times New Roman", serif' },
  { value: 'noto-serif-hebrew', label: 'Noto Serif Hebrew', family: 'var(--font-noto-serif-hebrew), "Times New Roman", serif' },
  { value: 'frank-ruhl-libre', label: 'Frank Ruhl Libre', family: 'var(--font-frank-ruhl-libre), "Times New Roman", serif' },
  { value: 'arial', label: 'Arial', family: 'Arial, Helvetica, sans-serif' },
] as const;

type CoverFont = (typeof COVER_FONT_OPTIONS)[number]['value'];

function OrnamentFlourish({ flipped }: { flipped?: boolean }) {
  const src = flipped ? '/assets/ornament-flipped.png' : '/assets/ornament.png';
  return (
    <div className="bencher-cover-ornament" aria-hidden="true">
      <img src={src} alt="" />
    </div>
  );
}

/** Fetch a public asset and return its base64 data URL. */
async function assetToDataUrl(assetPath: string): Promise<string | null> {
  try {
    const res = await fetch(assetPath);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function songKey(song: SongData) {
  return `${song.title}|${song.artist}`;
}

function cloneSong<T extends SongData>(song: T): T {
  return { ...song, title: song.title, artist: song.artist, lyrics: song.lyrics };
}

function clampBencherPage(pageNumber: number, pageCount: number) {
  return Math.max(1, Math.min(pageCount, pageNumber));
}

function getRenderedBencherTextMetrics(element: HTMLElement, rectWidthPercent: number) {
  const pageElement = element.closest('.bencher-page');
  const renderedPageWidth =
    pageElement instanceof HTMLElement ? pageElement.getBoundingClientRect().width : 0;
  const renderedDropZoneWidth = element.getBoundingClientRect().width;
  const fallbackPageWidth =
    rectWidthPercent > 0 ? renderedDropZoneWidth / (rectWidthPercent / 100) : BENCHER_DESIGN_PAGE_WIDTH;
  const pageWidth = renderedPageWidth > 0 ? renderedPageWidth : fallbackPageWidth;
  const scale = pageWidth > 0 ? pageWidth / BENCHER_DESIGN_PAGE_WIDTH : 1;

  return {
    renderedDropZoneWidth,
    scale,
    fontSize: Number((BENCHER_SONG_FONT_SIZE * scale).toFixed(2)),
  };
}

function formatDraggedBencherSong<T extends SongData>(song: T, maxLineWidth: number, fontSize: number): T {
  return {
    ...song,
    lyrics: formatBencherLyrics(song.lyrics || '', maxLineWidth, fontSize),
  };
}

function songsOrderEqual(a: SongData[], b: SongData[]) {
  if (a.length !== b.length) return false;
  return a.every((song, index) => songKey(song) === songKey(b[index]));
}

function isSlotDragData(value: unknown): value is SlotDragData {
  return !!value && typeof value === 'object' && (value as { type?: unknown }).type === 'slot';
}

function SongDropZone({
  pagePlacement,
  positionedSongs,
  activeSlot,
  previewSongKey,
  showTitles,
  onRemove,
}: {
  pagePlacement: BencherPagePlacement;
  positionedSongs: PositionedSong[];
  activeSlot: SlotDragData | null;
  previewSongKey: string | null;
  showTitles: boolean;
  onRemove: (index: number) => void;
}) {
  const dropZoneRef = useRef<HTMLElement>(null);
  const [maxLyricLineWidth, setMaxLyricLineWidth] = useState(Number.POSITIVE_INFINITY);
  const [songFontSize, setSongFontSize] = useState(BENCHER_SONG_FONT_SIZE);
  const [isPrinting, setIsPrinting] = useState(false);
  const slots = Array.from({ length: positionedSongs.length + 1 }, (_, slotIndex) => slotIndex);

  const printContentWidth = useMemo(
    () => bencherPrintContentWidth(pagePlacement.rect.width),
    [pagePlacement.rect.width],
  );

  const effectiveSongFontSize = isPrinting ? BENCHER_SONG_FONT_SIZE : songFontSize;
  const effectiveMaxLyricLineWidth = isPrinting ? printContentWidth : maxLyricLineWidth;

  useEffect(() => {
    const element = dropZoneRef.current;
    if (!element) {
      return;
    }

    const updateTextMetrics = () => {
      const { renderedDropZoneWidth, scale, fontSize } = getRenderedBencherTextMetrics(element, pagePlacement.rect.width);
      const contentWidth = renderedDropZoneWidth - 24 * scale;
      setMaxLyricLineWidth(Math.max(0, contentWidth));
      setSongFontSize(fontSize);
    };

    updateTextMetrics();

    window.addEventListener('resize', updateTextMetrics);
    window.visualViewport?.addEventListener('resize', updateTextMetrics);

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        window.removeEventListener('resize', updateTextMetrics);
        window.visualViewport?.removeEventListener('resize', updateTextMetrics);
      };
    }

    const observer = new ResizeObserver(updateTextMetrics);
    observer.observe(element);

    const pageElement = element.closest('.bencher-page');
    if (pageElement instanceof HTMLElement) {
      observer.observe(pageElement);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateTextMetrics);
      window.visualViewport?.removeEventListener('resize', updateTextMetrics);
    };
  }, [pagePlacement.rect.width]);

  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  return (
    <section
      ref={dropZoneRef}
      className="bencher-song-drop-zone"
      style={rectToCss(pagePlacement.rect)}
      aria-label={`Drop songs on page ${pagePlacement.pageNumber}`}
      data-testid="bencher-song-drop-zone"
    >
      <div className="sb2-packery-grid bencher-sheet-builder-grid" style={{ '--sb2-columns': 1 } as CSSProperties}>
        <div className="sb2-sheet-column">
          {slots.map((insertIndex) => {
            const positionedSong = positionedSongs[insertIndex];
            const displayPositionedSong = positionedSong
              ? {
                ...positionedSong,
                song: formatDraggedBencherSong(positionedSong.song, effectiveMaxLyricLineWidth, effectiveSongFontSize),
              }
              : undefined;
            const slotData: SlotDragData = {
              type: 'slot',
              pageIndex: pagePlacement.pageNumber - 1,
              columnIndex: 0,
              slotIndex: insertIndex,
              insertIndex,
              occupiedGlobalIndex: positionedSong?.globalIndex,
            };
            const active =
              activeSlot?.pageIndex === slotData.pageIndex &&
              activeSlot.columnIndex === slotData.columnIndex &&
              activeSlot.slotIndex === slotData.slotIndex;
            const isPreviewSong = displayPositionedSong !== undefined && previewSongKey === songKey(displayPositionedSong.song);
            const content = (
              <>
                <DropSlot slotData={slotData} expanded={!positionedSong} preview={false} active={active} />
                {displayPositionedSong && isPreviewSong ? (
                  <PreviewSongCard
                    song={displayPositionedSong.song}
                    fontSize={effectiveSongFontSize}
                    showTitles={showTitles}
                    showOrderNumbers={false}
                    orderNumber={displayPositionedSong.orderNumber}
                    columnCount={1}
                  />
                ) : null}
                {displayPositionedSong ? (
                  !isPreviewSong ? (
                    <SheetSongDraggable
                      positionedSong={displayPositionedSong}
                      fontSize={effectiveSongFontSize}
                      showTitles={showTitles}
                      showOrderNumbers={false}
                      columnCount={1}
                      onRemove={() => onRemove(displayPositionedSong.globalIndex)}
                    />
                  ) : null
                ) : null}
              </>
            );

            return positionedSong ? (
              <SlotStackDropTarget key={`slot-stack-${insertIndex}`} slotData={slotData} className="sb2-slot-stack">
                {content}
              </SlotStackDropTarget>
            ) : (
              <div key={`slot-stack-${insertIndex}`} className="sb2-slot-stack sb2-slot-stack-empty">
                {content}
              </div>
            );
          })}
        </div>
      </div>

      {positionedSongs.length === 0 && <div className="bencher-drop-hint">Put songs here</div>}
    </section>
  );
}

function CoverCaptionTextarea({ value, onChange, fontFamily }: { value: string; onChange: (v: string) => void; fontFamily: string }) {
  const [local, setLocal] = useState(value);
  const syncedRef = useRef(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external → local only when external value differs from what we last sent
  useEffect(() => {
    if (value !== syncedRef.current) {
      setLocal(value);
      syncedRef.current = value;
    }
  }, [value]);

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setLocal(next);
    syncedRef.current = next;
    onChange(next);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (e.key !== 'Enter') return;
    e.preventDefault();

    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = local.slice(0, start);
    const after = local.slice(end);

    // Don't add a second ~ if the line before is already just a ~
    const prevLine = before.split('\n').pop() ?? '';
    const insert = prevLine.trim() === '~' ? '\n' : '\n~\n';

    const next = before + insert + after;
    setLocal(next);
    syncedRef.current = next;
    onChange(next);

    // Restore cursor after the inserted text
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const newPos = start + insert.length;
        textareaRef.current.selectionStart = newPos;
        textareaRef.current.selectionEnd = newPos;
      }
    });
  }, [local, onChange]);

  return (
    <textarea
      ref={textareaRef}
      className="bencher-cover-caption-text"
      style={{ fontFamily }}
      value={local}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      placeholder="Cover title / caption…"
      aria-label="Cover title or caption"
      rows={3}
    />
  );
}

interface BencherAppProps {
  mode: BencherMode;
}

export default function BencherApp({ mode: pageMode }: BencherAppProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [sidebarTab, setSidebarTab] = useState<'library' | 'my'>('library');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [coverText, setCoverText] = useState('');
  const [coverFont, setCoverFont] = useState<CoverFont>('times-new-roman');
  const [coverMode, setCoverMode] = useState<'logo' | 'caption'>('logo');
  const [showTitles, setShowTitles] = useState(true);
  const [currentPreviewPage, setCurrentPreviewPage] = useState(1);
  const [activeDragData, setActiveDragData] = useState<BencherDragData | null>(null);
  const [activeSlot, setActiveSlot] = useState<SlotDragData | null>(null);
  const [libraryPreviewActive, setLibraryPreviewActive] = useState(false);
  const [bencerTitle, setBencherTitle] = useState('');
  const [currentBencherLayoutId, setCurrentBencherLayoutId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveDraftTitle, setSaveDraftTitle] = useState('');
  const [showBencherLibrary, setShowBencherLibrary] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [overwriteTargetId, setOverwriteTargetId] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [twoSidedPreviewScale, setTwoSidedPreviewScale] = useState(1);
  const overSlotRef = useRef<SlotDragData | null>(null);
  const previewSelectedSongsRef = useRef<Song[] | null>(null);
  const dragSnapshotSongsRef = useRef<Song[] | null>(null);
  const currentPreviewPageRef = useRef(1);
  const isPageTurningRef = useRef(false);
  const flipBookRef = useRef<{
    pageFlip: () => {
      getCurrentPageIndex: () => number;
      flip: (page: number, corner?: 'top' | 'bottom') => void;
      getBoundsRect: () => { left: number; top: number; pageWidth: number; height: number };
      flipNext: (corner?: 'top' | 'bottom') => void;
      flipPrev: (corner?: 'top' | 'bottom') => void;
      turnToPage: (page: number) => void;
      flipController?: {
        flip: (globalPos: { x: number; y: number }) => void;
      };
    } | undefined;
  } | null>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const auth = useOptionalGoogleAuth();
  const bencherPages = useMemo(() => getBencherPages(pageMode), [pageMode]);
  const displayPages = useMemo(() =>
    pageMode === '8-page' ? [...bencherPages].reverse() : bencherPages,
  [bencherPages, pageMode]);
  const bencherLogoPlacement = useMemo(() => getBencherLogoPlacement(pageMode), [pageMode]);
  const bencherSongDropPlacement = useMemo(() => getBencherSongDropPlacement(pageMode), [pageMode]);
  const bencherPageCount = bencherPages.length;
  const songDropPageNumber = bencherSongDropPlacement.pageNumber;
  const { designWidth, designHeight, pdfSource } = useMemo(() => getBencherModeConfig(pageMode), [pageMode]);
  const bencherHelpSteps = useMemo(() => [
    `Click the logo box on page ${bencherLogoPlacement.pageNumber} if you want to upload your own logo.`,
    `Songs go onto page ${songDropPageNumber}. Drag them in from the left, or double-click to add them fast.`,
    'Double-sided fits on one sheet of paper. 8-page booklet for larger type.',
    'When the pages look right, print the bencher or clear songs and try a different mix.',
  ], [bencherLogoPlacement.pageNumber, songDropPageNumber]);
  const clampPage = useCallback((pageNumber: number) => clampBencherPage(pageNumber, bencherPageCount), [bencherPageCount]);

  useEffect(() => {
    if (pageMode !== '2-page') {
      setTwoSidedPreviewScale(1);
      return;
    }

    const container = pagesRef.current;
    if (!container) return;

    const updateScale = () => {
      const { width, height } = container.getBoundingClientRect();
      const styles = window.getComputedStyle(container);
      const availableWidth = width - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      const availableHeight = height - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
      setTwoSidedPreviewScale(Math.min(1, availableWidth / designWidth, availableHeight / designHeight));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    window.addEventListener('resize', updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [designHeight, designWidth, pageMode]);

  const flipToPage = useCallback((targetPage: number) => {
    if (isPageTurningRef.current) {
      return;
    }

    const clampedTargetPage = clampPage(targetPage);
    const flip = flipBookRef.current?.pageFlip();
    const sourcePage = flip ? clampPage(flip.getCurrentPageIndex() + 1) : currentPreviewPageRef.current;

    if (clampedTargetPage === sourcePage) {
      return;
    }

    if (flip) {
      // Adjacent page: use built-in flip animation
      if (Math.abs(clampedTargetPage - sourcePage) === 1) {
        isPageTurningRef.current = true;
        if (clampedTargetPage > sourcePage) {
          flip.flipNext();
        } else {
          flip.flipPrev();
        }
        // onFlip callback will clear isPageTurningRef
        return;
      }

      // Multi-page jump: instant
      flip.turnToPage(clampedTargetPage - 1);
    }

    currentPreviewPageRef.current = clampedTargetPage;
    setCurrentPreviewPage(clampedTargetPage);
  }, [clampPage]);

  const turnToPage = useCallback((targetPage: number) => {
    const clampedTargetPage = clampPage(targetPage);
    const flip = flipBookRef.current?.pageFlip();
    if (flip) {
      flip.turnToPage(clampedTargetPage - 1);
    }
    currentPreviewPageRef.current = clampedTargetPage;
    setCurrentPreviewPage(clampedTargetPage);
  }, [clampPage]);

  const saveNamedLayout = useCallback(async (title: string, overwriteId?: string) => {
    if (!auth?.user) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      const matching = auth.bencherLayouts.find(
        (l) => l.title.trim() === trimmed && (currentBencherLayoutId ? l.id === currentBencherLayoutId : true),
      );
      const saved = await auth.saveBencherLayout({
        id: overwriteId ?? matching?.id ?? currentBencherLayoutId ?? undefined,
        title: trimmed,
        songs: selectedSongs.map((s) => ({ title: s.title, artist: s.artist, lyrics: s.lyrics })),
        logoSrc,
        showTitles,
      });
      setBencherTitle(trimmed);
      setCurrentBencherLayoutId(saved.id);
      setShowSaveModal(false);
      setShowOverwriteModal(false);
    } catch {
      if (auth.bencherLayouts.length >= 3) {
        setOverwriteTargetId(currentBencherLayoutId ?? auth.bencherLayouts[0]?.id ?? '');
        setShowSaveModal(false);
        setShowOverwriteModal(true);
      }
    }
  }, [auth, currentBencherLayoutId, logoSrc, selectedSongs, showTitles]);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/songs')
      .then((response) => response.json())
      .then((data: Song[]) => {
        if (!cancelled && Array.isArray(data)) {
          setSongs(data.map((song) => ({ ...song, artist: song.artist || 'Unknown', lyrics: song.lyrics || '' })));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSongs([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSongs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return songs;
    }

    return songs.filter((song) => {
      const haystack = `${song.title} ${song.artist ?? ''} ${song.search_title ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [search, songs]);

  const privateSongsAsSongs = useMemo<Song[]>(() =>
    (auth?.privateSongs ?? []).map((song) => ({
      title: song.title,
      artist: song.artist,
      lyrics: song.lyrics,
      youtube: song.youtubeLinks?.join(' ') || '',
      drive: song.driveLink || '',
    })),
  [auth?.privateSongs]);

  const filteredPrivateSongs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return privateSongsAsSongs;
    }

    return privateSongsAsSongs.filter((song) => {
      const haystack = `${song.title} ${song.artist ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [privateSongsAsSongs, search]);

  const usedSongKeys = useMemo(() => new Set(selectedSongs.map(songKey)), [selectedSongs]);

  const handleSavePrivateSong = useCallback(async (song: Omit<PrivateSong, 'id' | 'createdAt'>) => {
    if (!auth) {
      return;
    }

    await auth.addSong(song);
  }, [auth]);

  const handleSavePrivateSongs = useCallback(async (privateSongs: Omit<PrivateSong, 'id' | 'createdAt'>[]) => {
    if (!auth) {
      return;
    }

    await auth.addSongs(privateSongs);
  }, [auth]);

  const addSong = useCallback((song: Song) => {
    if (usedSongKeys.has(songKey(song))) {
      return;
    }

    turnToPage(songDropPageNumber);
    setSelectedSongs((current) => [...current, cloneSong(song)]);
  }, [songDropPageNumber, turnToPage, usedSongKeys]);

  const removeSong = useCallback((indexToRemove: number) => {
    setSelectedSongs((current) => current.filter((_, index) => index !== indexToRemove));
  }, []);

  const resolveInsertIndex = useCallback((slotData: SlotDragData, dragData: BencherDragData | null) => {
    if (slotData.occupiedGlobalIndex == null) {
      return slotData.insertIndex;
    }

    if (dragData?.type === 'sheet-song' && dragData.globalIndex < slotData.occupiedGlobalIndex) {
      return slotData.insertIndex + 1;
    }

    return slotData.insertIndex;
  }, []);

  const insertSongInList = useCallback((songsToInsertInto: Song[], insertedSong: SongData, insertIndex: number) => {
    const next = [...songsToInsertInto];
    next.splice(Math.max(0, Math.min(insertIndex, next.length)), 0, cloneSong(insertedSong) as Song);
    return next;
  }, []);

  const reorderSongsInList = useCallback((songsToReorder: Song[], draggedSong: SongData, insertIndex: number) => {
    const currentIndex = songsToReorder.findIndex((song) => songKey(song) === songKey(draggedSong));
    if (currentIndex === -1) {
      return songsToReorder;
    }

    const next = [...songsToReorder];
    const [movedSong] = next.splice(currentIndex, 1);
    if (!movedSong) {
      return songsToReorder;
    }

    const targetIndex = insertIndex > currentIndex ? insertIndex - 1 : insertIndex;
    next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, movedSong);
    return next;
  }, []);

  const renderedSongs = useMemo(() => {
    if (
      activeDragData?.type === 'library-song' &&
      libraryPreviewActive &&
      !usedSongKeys.has(songKey(activeDragData.song))
    ) {
      if (previewSelectedSongsRef.current) {
        return previewSelectedSongsRef.current;
      }

      const snapshotSongs = dragSnapshotSongsRef.current ?? selectedSongs;
      const insertIndex = activeSlot ? resolveInsertIndex(activeSlot, activeDragData) : snapshotSongs.length;
      return insertSongInList(snapshotSongs, activeDragData.song, insertIndex);
    }

    return selectedSongs;
  }, [activeDragData, activeSlot, insertSongInList, libraryPreviewActive, resolveInsertIndex, selectedSongs, usedSongKeys]);

  const positionedSongs = useMemo<PositionedSong[]>(() => {
    return renderedSongs.map((song, index) => ({
      song,
      globalIndex: index,
      orderNumber: index + 1,
      pageIndex: songDropPageNumber - 1,
      columnIndex: 0,
    }));
  }, [renderedSongs, songDropPageNumber]);

  const previewSongKey = useMemo(() => {
    if (activeDragData?.type === 'library-song' || activeDragData?.type === 'sheet-song') {
      return songKey(activeDragData.song);
    }

    return null;
  }, [activeDragData]);

  const clearDragState = useCallback(() => {
    overSlotRef.current = null;
    previewSelectedSongsRef.current = null;
    dragSnapshotSongsRef.current = null;
    setLibraryPreviewActive(false);
    setActiveDragData(null);
    setActiveSlot(null);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const nextActiveDragData = (event.active.data.current as BencherDragData | null) ?? null;
    if (nextActiveDragData?.type === 'library-song' || nextActiveDragData?.type === 'sheet-song') {
      turnToPage(songDropPageNumber);
    }
    overSlotRef.current = null;
    previewSelectedSongsRef.current = null;
    setLibraryPreviewActive(false);
    dragSnapshotSongsRef.current =
      nextActiveDragData?.type === 'sheet-song' || nextActiveDragData?.type === 'library-song'
        ? selectedSongs.map(cloneSong)
        : null;
    setActiveDragData(nextActiveDragData);
  }, [selectedSongs, songDropPageNumber, turnToPage]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overData = event.over?.data.current as BencherDragData | undefined;
    const nextOverSlotData = isSlotDragData(overData) ? overData : null;
    const snapshotSongs = dragSnapshotSongsRef.current ?? selectedSongs;
    const isValidLibraryHover = nextOverSlotData !== null;

    if (nextOverSlotData) {
      overSlotRef.current = nextOverSlotData;

      if (activeDragData?.type === 'sheet-song') {
        const resolvedInsertIndex = resolveInsertIndex(nextOverSlotData, activeDragData);
        setSelectedSongs((current) => {
          const nextSongs = reorderSongsInList(current, activeDragData.song, resolvedInsertIndex);
          previewSelectedSongsRef.current = nextSongs;
          return songsOrderEqual(current, nextSongs) ? current : nextSongs;
        });
      }
    }

    if (activeDragData?.type === 'library-song') {
      setLibraryPreviewActive(isValidLibraryHover);
      const alreadyExists = snapshotSongs.some((song) => songKey(song) === songKey(activeDragData.song));

      if (isValidLibraryHover && !alreadyExists && nextOverSlotData) {
        const resolvedInsertIndex = resolveInsertIndex(nextOverSlotData, activeDragData);
        previewSelectedSongsRef.current = insertSongInList(snapshotSongs, activeDragData.song, resolvedInsertIndex);
      } else {
        previewSelectedSongsRef.current = null;
      }
    }

    setActiveSlot(nextOverSlotData);
  }, [activeDragData, insertSongInList, reorderSongsInList, resolveInsertIndex, selectedSongs]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const activeData = event.active.data.current as BencherDragData | undefined;
    const overData = event.over?.data.current as BencherDragData | undefined;
    const resolvedSlotData = overSlotRef.current ?? (isSlotDragData(overData) ? overData : null);

    setLibraryPreviewActive(false);
    setActiveDragData(null);
    setActiveSlot(null);

    if (!activeData) {
      clearDragState();
      return;
    }

    if (activeData.type === 'library-song') {
      const snapshotSongs = dragSnapshotSongsRef.current ?? selectedSongs;
      const alreadyExists = snapshotSongs.some((song) => songKey(song) === songKey(activeData.song));

      if (resolvedSlotData && !alreadyExists) {
        const resolvedInsertIndex = resolveInsertIndex(resolvedSlotData, activeData);
        setSelectedSongs(previewSelectedSongsRef.current ?? insertSongInList(snapshotSongs, activeData.song, resolvedInsertIndex));
      }

      clearDragState();
      return;
    }

    if (!resolvedSlotData && activeData.type === 'sheet-song') {
      setSelectedSongs(dragSnapshotSongsRef.current ?? selectedSongs);
    }

    clearDragState();
  }, [clearDragState, insertSongInList, resolveInsertIndex, selectedSongs]);

  const handleDragCancel = useCallback(() => {
    if (activeDragData?.type === 'sheet-song') {
      setSelectedSongs(dragSnapshotSongsRef.current ?? selectedSongs);
    }

    clearDragState();
  }, [activeDragData, clearDragState, selectedSongs]);

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

  const handleLogoChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoSrc(String(reader.result ?? ''));
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePrint = useCallback(() => {
    if (!pdfSource) return;
    // Print the client-rendered SVG/HTML view (BencherPrintView), not a
    // generated PDF — plain page content prints via window.print() with no
    // native-PDF-viewer isolation issues, no server round-trip, no popup.
    document.body.classList.add('bencher-svg-printing');
    const cleanup = () => document.body.classList.remove('bencher-svg-printing');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    // Fallback in case `afterprint` doesn't fire for some reason.
    setTimeout(cleanup, 60000);
  }, [pdfSource]);

  const handleDownloadStraightPdf = useCallback(async () => {
    if (!pdfSource) return;
    setIsDownloading(true);
    try {
      const res = await fetch('/api/bencher/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: '2-page',
          logoSrc: logoSrc || undefined,
          coverText: coverText || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(`[E03] ${err.message || 'Server error'}`);
      }
      const pdfBytes = new Uint8Array(await res.arrayBuffer());
      downloadPdf(pdfBytes, 'bencher-straight.pdf');
    } catch (err) {
      const code = (err instanceof Error && err.message.match(/\[E\d+\]/)) ? err.message : `[E99] ${err instanceof Error ? err.message : 'Unknown'}`;
      console.error('Straight PDF generation failed:', err);
      alert(`Failed to generate straight PDF: ${code}`);
    } finally {
      setIsDownloading(false);
    }
  }, [coverText, logoSrc, pdfSource]);

  useEffect(() => {
    document.body.classList.add('bencher-active');
    return () => {
      document.body.classList.remove('bencher-active');
    };
  }, []);

  useEffect(() => {
    isPageTurningRef.current = false;
    const startPage = pageMode === '8-page' ? bencherPageCount : 1;
    currentPreviewPageRef.current = startPage;
    setCurrentPreviewPage(startPage);

    const flip = flipBookRef.current?.pageFlip();
    if (flip) {
      flip.turnToPage(startPage - 1);
    }
  }, [pageMode, bencherPageCount]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const flip = flipBookRef.current?.pageFlip();
      if (!flip) {
        return;
      }

      const visiblePage = clampPage(flip.getCurrentPageIndex() + 1);
      const desiredPage = clampPage(currentPreviewPageRef.current);

      if (visiblePage !== desiredPage) {
        flip.turnToPage(desiredPage - 1);
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [clampPage, currentPreviewPage, pageMode]);

  const bencherPageNodes = useMemo(() => displayPages.map((page) => (
    <div
      key={page.pageNumber}
      className="bencher-flip-sheet"
      aria-label={`Bencher page ${page.pageNumber}`}
    >
      <div
        className={`bencher-page bencher-page-${page.pageNumber} ${activeSlot?.pageIndex === page.pageNumber - 1 ? 'drag-over' : ''}`}
        data-testid={`bencher-page-${page.pageNumber}`}
        data-measure-root={`bencher-page-${page.pageNumber}`}
      >
        {(() => {
          if (pdfSource) {
            return (
              <PdfPageBackground
                file={pdfSource}
                pageNumber={page.pageNumber}
                width={designWidth}
              />
            );
          }
          const bg = getBencherPageBackground(pageMode, page.pageNumber);
          const isPdf = bg.endsWith('.pdf');
          return isPdf ? (
            <embed
              className="bencher-page-art"
              src={bg}
              type="application/pdf"
              aria-hidden="true"
            />
          ) : (
            <img
              className="bencher-page-art"
              src={bg}
              alt=""
              aria-hidden="true"
            />
          );
        })()}

        {pageMode === '2-page' && page.pageNumber === bencherLogoPlacement.pageNumber && (
          <button
            type="button"
            className="bencher-logo-target"
            style={rectToCss(bencherLogoPlacement.rect)}
            onClick={() => fileInputRef.current?.click()}
            aria-label={`Upload logo for page ${bencherLogoPlacement.pageNumber}`}
            data-testid="bencher-logo-target"
          >
            {logoSrc ? <img src={logoSrc} alt="Uploaded logo" /> : <span>Upload logo</span>}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} />
          </button>
        )}
        {pageMode === '8-page' && page.pageNumber === bencherLogoPlacement.pageNumber && coverMode === 'logo' && (
          <>
            <button
              type="button"
              className="bencher-logo-target"
              style={rectToCss(bencherLogoPlacement.rect)}
              onClick={() => fileInputRef.current?.click()}
              aria-label={`Upload rectangular logo for page ${bencherLogoPlacement.pageNumber}`}
              data-testid="bencher-logo-target"
            >
              {logoSrc ? <img src={logoSrc} alt="Uploaded logo" /> : <span>Upload logo</span>}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} />
            </button>
            <div className="bencher-cover-prompt" style={rectToCss({ ...bencherLogoPlacement.rect, top: bencherLogoPlacement.rect.top + bencherLogoPlacement.rect.height + 1, height: 6 })}>
              <button type="button" className="bencher-cover-prompt-btn" onClick={() => setCoverMode('caption')}>
                + Add text
              </button>
            </div>
          </>
        )}
        {pageMode === '8-page' && page.pageNumber === bencherLogoPlacement.pageNumber && coverMode === 'caption' && (
          <div
            className={`bencher-cover-caption-zone${!logoSrc ? ' bencher-cover-caption-zone-no-logo' : ''}`}
            style={rectToCss(bencherLogoPlacement.rect)}
          >
            {logoSrc ? (
              <>
                <button
                  type="button"
                  className="bencher-cover-caption-logo"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload cover image"
                  title="Upload cover image"
                >
                  <img src={logoSrc} alt="Cover image" />
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} />
                </button>
                {/* Ornaments drawn on top of the logo */}
                <OrnamentFlourish />
                <OrnamentFlourish flipped />
              </>
            ) : (
              <>
                <CoverCaptionTextarea value={coverText} onChange={setCoverText} fontFamily={COVER_FONT_OPTIONS.find(o => o.value === coverFont)?.family ?? COVER_FONT_OPTIONS[0].family} />
                <OrnamentFlourish flipped />
                <button
                  type="button"
                  className="bencher-cover-caption-logo"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload cover image"
                  title="Upload cover image"
                >
                  <span>+ Add image</span>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} />
                </button>
              </>
            )}
            {logoSrc && (
              <CoverCaptionTextarea value={coverText} onChange={setCoverText} fontFamily={COVER_FONT_OPTIONS.find(o => o.value === coverFont)?.family ?? COVER_FONT_OPTIONS[0].family} />
            )}
          </div>
        )}

        {pageMode !== '8-page' && page.pageNumber === bencherSongDropPlacement.pageNumber && (
          <SongDropZone
            pagePlacement={bencherSongDropPlacement}
            positionedSongs={positionedSongs}
            activeSlot={activeSlot}
            previewSongKey={previewSongKey}
            showTitles={showTitles}
            onRemove={removeSong}
          />
        )}

        <div className="bencher-page-footer" aria-hidden>Made with NiggunSheet.com</div>
      </div>
    </div>
  )), [activeSlot, bencherLogoPlacement, bencherSongDropPlacement, coverFont, coverMode, designWidth, displayPages, handleLogoChange, logoSrc, pageMode, pdfSource, positionedSongs, previewSongKey, removeSong, showTitles]);

  const activeModeLabel = BENCHER_MODE_CONFIGS.find((config) => config.mode === pageMode)?.label ?? 'Double Sided';
  const pageSummary = `Page ${currentPreviewPage} of ${bencherPageCount}`;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="bencher-app">
        <Header />

        <main className="bencher-workspace" style={pageMode === '8-page' ? { gridTemplateColumns: '1fr' } : undefined}>
          {pageMode !== '8-page' && <aside className="sb2-sidebar bencher-sidebar" aria-label="Song library">
            <div className="sb2-sidebar-header">
              <div className="sb2-sidebar-tabs">
                <button
                  className={`sb2-sidebar-tab ${sidebarTab === 'library' ? 'active' : ''}`}
                  onClick={() => setSidebarTab('library')}
                  title="Look through all songs"
                >
                  Song Library
                </button>
                <button
                  className={`sb2-sidebar-tab ${sidebarTab === 'my' ? 'active' : ''}`}
                  onClick={() => setSidebarTab('my')}
                  title="Look through your saved songs"
                >
                  My Songs{(auth?.privateSongs.length ?? 0) > 0 ? ` (${auth?.privateSongs.length ?? 0})` : ''}
                </button>
              </div>
              <input
                type="text"
                className="sb2-search-box"
                placeholder="Search songs..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                title="Find songs by name or singer"
              />
            </div>
            <div className="sb2-sidebar-hint"><strong>Tip:</strong> Drag songs to page {songDropPageNumber} or double-click to add them. Drag cards on the page to reorder.</div>

            {sidebarTab === 'library' ? (
              <div className="sb2-songs-list">
                {filteredSongs.map((song, index) => {
                  const normalizedSong = cloneSong(song);
                  const key = songKey(normalizedSong);

                  return (
                    <div key={`bencher-library-${index}-${key}`} data-testid="bencher-library-song">
                      <SidebarSongDraggable
                        dragId={`library:${index}:${key}`}
                        song={normalizedSong}
                        used={usedSongKeys.has(key)}
                        onDoubleClick={() => addSong(normalizedSong)}
                      />
                    </div>
                  );
                })}
                {songs.length === 0 && <div className="sb2-loading">Loading songs...</div>}
              </div>
            ) : (
              <div className="sb2-songs-list">
                {!auth?.user ? (
                  <div className="sb2-my-songs-signin">
                    <p>Sign in at the top to open your private songs.</p>
                  </div>
                ) : (
                  <>
                    <div className="sb2-my-songs-toolbar">
                      <button className="sb2-my-songs-add-btn" onClick={() => setShowAddForm(true)} title="Add a private song to your Bencher library">+ Add Song</button>
                    </div>
                    <AddSongModal open={showAddForm} onClose={() => setShowAddForm(false)} onSave={handleSavePrivateSong} onSaveBulk={handleSavePrivateSongs} />
                    {filteredPrivateSongs.length === 0 ? (
                      <div className="sb2-loading">{search ? 'Nothing matched that search.' : 'You do not have private songs yet. Add one from the Song Library.'}</div>
                    ) : (
                      filteredPrivateSongs.map((song, index) => {
                        const normalizedSong = cloneSong(song);
                        const key = songKey(normalizedSong);

                        return (
                          <SidebarSongDraggable
                            key={`bencher-private-${index}-${key}`}
                            dragId={`library:private:${index}:${key}`}
                            song={normalizedSong}
                            used={usedSongKeys.has(key)}
                            privateItem
                            onDoubleClick={() => addSong(normalizedSong)}
                          />
                        );
                      })
                    )}
                  </>
                )}
              </div>
            )}
          </aside>}

          <section
            className={`bencher-preview bencher-mode-${pageMode}`}
            aria-label="Bencher preview"
            style={{
              '--bencher-design-width': designWidth,
              '--bencher-design-height': designHeight,
              '--bencher-print-width': pageMode === '8-page' ? '5.5in' : '8.5in',
              '--bencher-print-height': pageMode === '8-page' ? '8.5in' : '11in',
            } as React.CSSProperties}
          >
            <div className="bencher-top-prompts">
              <div className="bencher-topline">
                <div className="bencher-topline-main">
                  <div className="bencher-topline-copy">
                    <span className="bencher-topline-eyebrow">Bencher mode</span>
                    <h2>Bencher controls</h2>
                  </div>
                  <div className="bencher-topline-actions">
                    <button type="button" className="bencher-utility-trigger" onClick={() => setShowPromoModal(true)}>
                      About this bencher
                    </button>
                    <button type="button" className="bencher-utility-trigger" onClick={() => setShowHelpModal(true)}>
                      How it works
                    </button>
                  </div>
                </div>
                <div className="bencher-topline-meta" aria-label="Current bencher summary">
                  <div className="bencher-topline-meta-item">
                    <span>Songs</span>
                    <strong>{selectedSongs.length}</strong>
                  </div>
                  <div className="bencher-topline-meta-item">
                    <span>Style</span>
                    <strong>{activeModeLabel}</strong>
                  </div>
                  <div className="bencher-topline-meta-item">
                    <span>Page</span>
                    <strong>{pageSummary}</strong>
                  </div>
                </div>
              </div>
            </div>
            <div className="sb2-toolbar bencher-actions">
              <div className="sb2-toolbar-rail bencher-actions-rail">
                {pageMode !== '8-page' && (
                <div className="sb2-toolbar-section">
                  <div className="sb2-toolbar-section-title">Songs</div>
                  <div className="sb2-toolbar-action-row">
                    <button type="button" onClick={() => setSelectedSongs([])} title="Remove all songs from this bencher">Clear songs</button>
                    <button
                      type="button"
                      className={showTitles ? '' : 'active'}
                      onClick={() => setShowTitles((v) => !v)}
                      title={showTitles ? 'Hide song titles on the bencher pages' : 'Show song titles on the bencher pages'}
                    >
                      {showTitles ? 'Hide titles' : 'Show titles'}
                    </button>
                  </div>
                </div>
                )}

                {(pageMode === '8-page' || logoSrc) && (
                <div className="sb2-toolbar-section">
                  <div className="sb2-toolbar-section-title">{pageMode === '8-page' ? 'Cover' : 'Logo'}</div>
                  <div className="sb2-toolbar-action-row">
                    {pageMode === '8-page' && coverMode === 'caption' && (
                      <>
                        <span className="bencher-cover-mode-hint">Caption mode — edit text on cover page</span>
                        <select
                          className="bencher-cover-font-select"
                          value={coverFont}
                          onChange={(e) => setCoverFont(e.target.value as CoverFont)}
                          aria-label="Cover caption font"
                          title="Choose a font for the cover text"
                        >
                          {COVER_FONT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </>
                    )}
                    {pageMode === '8-page' && coverMode === 'logo' && (
                      <span className="bencher-cover-mode-hint">Upload a logo on the cover page, or add text</span>
                    )}
                    {(logoSrc || coverText) && (
                      <button
                        type="button"
                        className="bencher-cover-clear-btn"
                        onClick={() => { setLogoSrc(null); setCoverText(''); setCoverMode('logo'); }}
                        title={pageMode === '8-page' ? 'Remove logo and cover text' : 'Remove logo'}
                      >
                        {pageMode === '8-page' ? 'Clear cover' : 'Clear logo'}
                      </button>
                    )}
                  </div>
                </div>
                )}

                <div className="sb2-toolbar-section">
                  <div className="sb2-toolbar-section-title">Page</div>
                  <div className="sb2-column-controls" aria-label="Bencher page">
                    {bencherPages.map((page) => {
                      const label = pageMode === '8-page' ? bencherPages.length + 1 - page.pageNumber : page.pageNumber;
                      return (
                      <button
                        key={`bencher-page-nav-${page.pageNumber}`}
                        type="button"
                        className={currentPreviewPage === page.pageNumber ? 'active' : ''}
                        aria-label={`Show page ${label}`}
                        aria-pressed={currentPreviewPage === page.pageNumber}
                        onClick={() => flipToPage(page.pageNumber)}
                        title={`Jump to page ${label}`}
                      >
                        {label}
                      </button>
                      );
                    })}
                  </div>
                </div>

                <div className="sb2-toolbar-section">
                  <div className="sb2-toolbar-section-title">Save</div>
                  <div className="sb2-toolbar-action-row">
                    <button
                      type="button"
                      disabled={!auth?.user}
                      title={!auth?.user ? 'Sign in to save layouts' : 'Save layout'}
                      onClick={() => {
                        if (!auth?.user) return;
                        setSaveDraftTitle(bencerTitle);
                        setShowSaveModal(true);
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={!auth?.user}
                      title={!auth?.user ? 'Sign in to access saved layouts' : 'Browse saved layouts'}
                      onClick={() => {
                        if (!auth?.user) return;
                        setShowBencherLibrary(true);
                      }}
                    >
                      Library
                    </button>
                  </div>
                </div>

                <div className="sb2-toolbar-section">
                  <div className="sb2-toolbar-section-title">Print</div>
                  <div className="sb2-toolbar-action-row">
                    <button type="button" className="bencher-download-btn" onClick={handlePrint} disabled={!pdfSource} title={pdfSource ? 'Open the print dialog' : 'No PDF available for this mode'}>Print</button>
                    {pageMode === '8-page' && (
                      <button type="button" className="bencher-download-btn" onClick={handleDownloadStraightPdf} disabled={!pdfSource || isDownloading} title="Download a straight (non-imposed) PDF for print shops">Straight PDF</button>
                    )}
                  </div>
                </div>

                <div className="sb2-toolbar-status-wrap bencher-mode-switch-wrap">
                  <div className="sb2-status bencher-status">{pageSummary}</div>
                </div>
              </div>
            </div>

            <div
              ref={pagesRef}
              className="bencher-pages"
              data-testid="bencher-pages"
            >
              {(() => {
                const prevPage = clampPage(currentPreviewPage - 1);
                const nextPage = clampPage(currentPreviewPage + 1);
                const toLabel = (p: number) => pageMode === '8-page' ? bencherPageCount + 1 - p : p;
                return (<>
              <button type="button" className="bencher-page-turn-button bencher-page-turn-button-left"
                aria-label={`Flip to page ${toLabel(prevPage)}`} title={`Flip to page ${toLabel(prevPage)}`}
                data-testid="bencher-turn-left-button"
                onClick={() => flipToPage(prevPage)} disabled={currentPreviewPage === 1}>
                <span className="bencher-page-turn-button-label" aria-hidden>Page</span>
                <span className="bencher-page-turn-button-number" aria-hidden>{toLabel(prevPage)}</span>
              </button>
              <button type="button" className="bencher-page-turn-button bencher-page-turn-button-right"
                aria-label={`Flip to page ${toLabel(nextPage)}`} title={`Flip to page ${toLabel(nextPage)}`}
                data-testid="bencher-turn-right-button"
                onClick={() => flipToPage(nextPage)} disabled={currentPreviewPage === bencherPageCount}>
                <span className="bencher-page-turn-button-label" aria-hidden>Page</span>
                <span className="bencher-page-turn-button-number" aria-hidden>{toLabel(nextPage)}</span>
              </button>
                </>);
              })()}

              <div
                className={`bencher-flipbook-wrap${pageMode === '2-page' ? ' bencher-single-page-wrap' : ''}`}
                style={pageMode === '2-page' ? {
                  '--bencher-preview-scale': twoSidedPreviewScale,
                  '--bencher-preview-scaled-width': `${designWidth * twoSidedPreviewScale}px`,
                  '--bencher-preview-scaled-height': `${designHeight * twoSidedPreviewScale}px`,
                } as CSSProperties : undefined}
              >
                <HTMLFlipBook
                  key={pageMode}
                  ref={flipBookRef}
                  className={`bencher-flipbook${pageMode === '2-page' ? ' bencher-two-sided-flipbook' : ''}`}
                  style={pageMode === '2-page' ? {
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    transform: `scale(${twoSidedPreviewScale})`,
                    transformOrigin: 'top left',
                  } : {}}
                  width={designWidth}
                  height={designHeight}
                  size={pageMode === '2-page' ? 'fixed' : 'stretch'}
                  minWidth={0}
                  maxWidth={0}
                  minHeight={0}
                  maxHeight={0}
                  startPage={0}
                  drawShadow
                  flippingTime={900}
                  usePortrait={pageMode !== '8-page'}
                  startZIndex={10}
                  autoSize={false}
                  maxShadowOpacity={0.55}
                  showCover={pageMode === '8-page'}
                  mobileScrollSupport={false}
                  clickEventForward
                  useMouseEvents={false}
                  swipeDistance={30}
                  showPageCorners={false}
                  disableFlipByClick={false}
                  renderOnlyPageLengthChange={false}
                  onChangeState={(event) => {
                    const turning = event.data === 'flipping';
                    isPageTurningRef.current = turning;
                  }}
                  onFlip={(event) => {
                    const nextPage = clampPage((event.data as number) + 1);
                    currentPreviewPageRef.current = nextPage;
                    isPageTurningRef.current = false;
                    setCurrentPreviewPage(nextPage);
                  }}
                >
                {bencherPageNodes}
                </HTMLFlipBook>
              </div>

            </div>
          </section>
        </main>
      </div>

      <BencherPrintView
        mode={pageMode}
        logoSrc={logoSrc}
        coverText={coverText}
        songs={pageMode === '2-page' ? selectedSongs.map(s => ({ title: s.title, artist: s.artist, lyrics: s.lyrics })) : []}
        showTitles={showTitles}
      />

      {showSaveModal && auth?.user && (
        <div
          className="bencher-modal-backdrop"
          onClick={(event) => { if (event.target === event.currentTarget) setShowSaveModal(false); }}
        >
          <form
            className="bencher-modal bencher-modal-save"
            onSubmit={(event) => {
              event.preventDefault();
              saveNamedLayout(saveDraftTitle);
            }}
          >
            <div className="bencher-modal-header">
              <h2>Save Bencher Layout</h2>
              <button type="button" className="bencher-modal-close" onClick={() => setShowSaveModal(false)} aria-label="Close">×</button>
            </div>
            <div className="bencher-modal-body">
              <p className="bencher-modal-overwrite-desc">Choose a name for this layout:</p>
              <input
                type="text"
                className="bencher-title-input bencher-modal-title-input"
                placeholder="Layout name"
                value={saveDraftTitle}
                onChange={(event) => setSaveDraftTitle(event.target.value)}
                autoFocus
              />
            </div>
            <div className="bencher-modal-footer">
              <button type="button" onClick={() => setShowSaveModal(false)}>Cancel</button>
              <button type="submit" className="bencher-modal-confirm" disabled={!saveDraftTitle.trim()}>Save</button>
            </div>
          </form>
        </div>
      )}

      {showPromoModal && (
        <div
          className="bencher-modal-backdrop"
          onClick={(event) => { if (event.target === event.currentTarget) setShowPromoModal(false); }}
        >
          <div className="bencher-modal bencher-modal-info">
            <div className="bencher-modal-header">
              <h2>Bencher Mode</h2>
              <button type="button" className="bencher-modal-close" onClick={() => setShowPromoModal(false)} aria-label="Close">×</button>
            </div>
            <div className="bencher-modal-body bencher-modal-body-spacious">
              <p className="bencher-modal-lead">Making a shabbos or hosting a shabbaton?</p>
              <p className="bencher-modal-copy">
                Do not want to hire a graphic designer? Bencher mode gives you a preformatted bencher in two styles:
                {' '}Double Sided and Booklet. Upload your logo or monogram, add oneg songs in the back, and print.
              </p>
            </div>
            <div className="bencher-modal-footer">
              <button type="button" className="bencher-modal-confirm" onClick={() => setShowPromoModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showHelpModal && (
        <div
          className="bencher-modal-backdrop"
          onClick={(event) => { if (event.target === event.currentTarget) setShowHelpModal(false); }}
        >
          <div className="bencher-modal bencher-modal-info">
            <div className="bencher-modal-header">
              <h2>How the bencher works</h2>
              <button type="button" className="bencher-modal-close" onClick={() => setShowHelpModal(false)} aria-label="Close">×</button>
            </div>
            <div className="bencher-modal-body bencher-modal-body-spacious">
              <ol className="bencher-help-list">
                {bencherHelpSteps.map((step, index) => (
                  <li key={`bencher-help-${index}`} className="bencher-help-step">
                    <span className="bencher-help-step-number" aria-hidden="true">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className="bencher-modal-overwrite-desc">If a page feels crowded, take out a song or switch to another style.</p>
            </div>
            <div className="bencher-modal-footer">
              <button type="button" className="bencher-modal-confirm" onClick={() => setShowHelpModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showBencherLibrary && auth?.user && (
        <div
          className="bencher-modal-backdrop"
          onClick={(event) => { if (event.target === event.currentTarget) setShowBencherLibrary(false); }}
        >
          <div className="bencher-modal">
            <div className="bencher-modal-header">
              <h2>Saved Bencher Layouts</h2>
              <button type="button" className="bencher-modal-close" onClick={() => setShowBencherLibrary(false)} aria-label="Close">×</button>
            </div>
            <div className="bencher-modal-body">
              {auth.bencherLayouts.length === 0 ? (
                <div className="bencher-modal-empty">No saved layouts yet.</div>
              ) : (
                [...auth.bencherLayouts]
                  .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                  .map((layout) => (
                    <div key={layout.id} className={`bencher-modal-item ${layout.id === currentBencherLayoutId ? 'current' : ''}`}>
                      <button
                        type="button"
                        className="bencher-modal-item-load"
                        title={`Load ${layout.title}`}
                        onClick={() => {
                          setSelectedSongs(layout.songs.map((s) => ({ ...s })) as Song[]);
                          setLogoSrc(layout.logoSrc);
                          setShowTitles(layout.showTitles);
                          setBencherTitle(layout.title);
                          setCurrentBencherLayoutId(layout.id);
                          setShowBencherLibrary(false);
                        }}
                      >
                        <span className="bencher-modal-item-title">{layout.title}</span>
                        <span className="bencher-modal-item-meta">{layout.songs.length} songs</span>
                      </button>
                      <button
                        type="button"
                        className="bencher-modal-item-delete"
                        onClick={() => auth.deleteBencherLayout(layout.id)}
                        aria-label={`Delete ${layout.title}`}
                        title={`Delete ${layout.title}`}
                      >
                        ×
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {showOverwriteModal && auth?.user && (
        <div
          className="bencher-modal-backdrop"
          onClick={(event) => { if (event.target === event.currentTarget) setShowOverwriteModal(false); }}
        >
          <div className="bencher-modal bencher-modal-overwrite">
            <div className="bencher-modal-header">
              <h2>Layout limit reached</h2>
              <button type="button" className="bencher-modal-close" onClick={() => setShowOverwriteModal(false)} aria-label="Close">×</button>
            </div>
            <div className="bencher-modal-body">
              <p className="bencher-modal-overwrite-desc">Choose a saved layout to overwrite:</p>
              {auth.bencherLayouts.map((layout) => (
                <label key={layout.id} className={`bencher-modal-overwrite-option ${overwriteTargetId === layout.id ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="overwrite-target"
                    value={layout.id}
                    checked={overwriteTargetId === layout.id}
                    onChange={() => setOverwriteTargetId(layout.id)}
                  />
                  {layout.title}
                </label>
              ))}
            </div>
            <div className="bencher-modal-footer">
              <button type="button" onClick={() => setShowOverwriteModal(false)}>Cancel</button>
              <button
                type="button"
                className="bencher-modal-confirm"
                disabled={!overwriteTargetId}
                onClick={async () => {
                  if (!overwriteTargetId || !auth) return;
                  saveNamedLayout(saveDraftTitle || bencerTitle, overwriteTargetId);
                }}
              >
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
