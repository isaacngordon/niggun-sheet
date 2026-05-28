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
import Header from '@/components/Header';
import { useOptionalGoogleAuth } from '@/components/GoogleAuthProvider';
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
  BENCHER_LOGO_RECT,
  BENCHER_PAGES,
  BENCHER_SONG_DROP_RECT,
  getBencherPageBackground,
  rectToCss,
  skipEveryOtherLineBreakWithinWidth,
} from './bencher-layout';
import '../sheet-builder-v2/sheet-builder.css';
import './bencher.css';

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

const BENCHER_SONG_FONT_SIZE = 12;

function songKey(song: SongData) {
  return `${song.title}|${song.artist}`;
}

function cloneSong<T extends SongData>(song: T): T {
  return { ...song, title: song.title, artist: song.artist, lyrics: song.lyrics };
}

function measureBencherLyricLine(line: string) {
  if (typeof document === 'undefined') {
    return line.length * 4.3;
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return line.length * 4.3;
  }

  context.font = `${BENCHER_SONG_FONT_SIZE}px var(--font-frank-ruhl-libre), var(--font-noto-serif-hebrew), Arial, Helvetica, sans-serif`;
  return context.measureText(line).width;
}

function formatDraggedBencherSong<T extends SongData>(song: T, maxLineWidth: number): T {
  return { ...song, lyrics: skipEveryOtherLineBreakWithinWidth(song.lyrics || '', maxLineWidth, measureBencherLyricLine) };
}

function songsOrderEqual(a: SongData[], b: SongData[]) {
  if (a.length !== b.length) return false;
  return a.every((song, index) => songKey(song) === songKey(b[index]));
}

function isSlotDragData(value: unknown): value is SlotDragData {
  return !!value && typeof value === 'object' && (value as { type?: unknown }).type === 'slot';
}

function SongDropZone({
  positionedSongs,
  activeSlot,
  previewSongKey,
  showTitles,
  onRemove,
}: {
  positionedSongs: PositionedSong[];
  activeSlot: SlotDragData | null;
  previewSongKey: string | null;
  showTitles: boolean;
  onRemove: (index: number) => void;
}) {
  const dropZoneRef = useRef<HTMLElement>(null);
  const [maxLyricLineWidth, setMaxLyricLineWidth] = useState(Number.POSITIVE_INFINITY);
  const slots = Array.from({ length: positionedSongs.length + 1 }, (_, slotIndex) => slotIndex);

  useEffect(() => {
    const element = dropZoneRef.current;
    if (!element) {
      return;
    }

    const updateMaxLineWidth = () => {
      const contentWidth = element.clientWidth - 24;
      setMaxLyricLineWidth(Math.max(0, contentWidth));
    };

    updateMaxLineWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateMaxLineWidth);
      return () => window.removeEventListener('resize', updateMaxLineWidth);
    }

    const observer = new ResizeObserver(updateMaxLineWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={dropZoneRef}
      className="bencher-song-drop-zone"
      style={rectToCss(BENCHER_SONG_DROP_RECT)}
      aria-label="Drop songs in the left third of page two"
      data-testid="bencher-song-drop-zone"
    >
      <div className="sb2-packery-grid bencher-sheet-builder-grid" style={{ '--sb2-columns': 1 } as CSSProperties}>
        <div className="sb2-sheet-column">
          {slots.map((insertIndex) => {
            const positionedSong = positionedSongs[insertIndex];
            const displayPositionedSong = positionedSong
              ? {
                ...positionedSong,
                song: formatDraggedBencherSong(positionedSong.song, maxLyricLineWidth),
              }
              : undefined;
            const slotData: SlotDragData = {
              type: 'slot',
              pageIndex: 1,
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
                    fontSize={BENCHER_SONG_FONT_SIZE}
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
                      fontSize={BENCHER_SONG_FONT_SIZE}
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

      {positionedSongs.length === 0 && <div className="bencher-drop-hint">Drag songs here</div>}
    </section>
  );
}

export default function BencherApp() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [showTitles, setShowTitles] = useState(true);
  const [activeDragData, setActiveDragData] = useState<BencherDragData | null>(null);
  const [activeSlot, setActiveSlot] = useState<SlotDragData | null>(null);
  const [libraryPreviewActive, setLibraryPreviewActive] = useState(false);
  const [bencerTitle, setBencherTitle] = useState('');
  const [currentBencherLayoutId, setCurrentBencherLayoutId] = useState<string | null>(null);
  const [showBencherLibrary, setShowBencherLibrary] = useState(false);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [overwriteTargetId, setOverwriteTargetId] = useState('');
  const overSlotRef = useRef<SlotDragData | null>(null);
  const previewSelectedSongsRef = useRef<Song[] | null>(null);
  const dragSnapshotSongsRef = useRef<Song[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const auth = useOptionalGoogleAuth();

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

  const usedSongKeys = useMemo(() => new Set(selectedSongs.map(songKey)), [selectedSongs]);

  const addSong = useCallback((song: Song) => {
    if (usedSongKeys.has(songKey(song))) {
      return;
    }

    setSelectedSongs((current) => [...current, cloneSong(song)]);
  }, [usedSongKeys]);

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
      pageIndex: 1,
      columnIndex: 0,
    }));
  }, [renderedSongs]);

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
    overSlotRef.current = null;
    previewSelectedSongsRef.current = null;
    setLibraryPreviewActive(false);
    dragSnapshotSongsRef.current =
      nextActiveDragData?.type === 'sheet-song' || nextActiveDragData?.type === 'library-song'
        ? selectedSongs.map(cloneSong)
        : null;
    setActiveDragData(nextActiveDragData);
  }, [selectedSongs]);

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

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setLogoSrc(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    document.body.classList.add('bencher-active');
    return () => document.body.classList.remove('bencher-active');
  }, []);

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

        <main className="bencher-workspace">
          <aside className="bencher-sidebar" aria-label="Song library">
            <div className="bencher-sidebar-header">
              <h1>Bencher Builder</h1>
              <p>Drag songs into the left third of page two.</p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search songs..."
              className="bencher-search"
            />

            <div className="bencher-song-library">
              {filteredSongs.map((song, index) => {
                const normalizedSong = cloneSong(song);
                const key = songKey(normalizedSong);

                return (
                <div key={`bencher-library-${index}-${key}`} data-testid="bencher-library-song">
                  <SidebarSongDraggable
                    dragId={`bencher-library:${index}:${key}`}
                    song={normalizedSong}
                    used={usedSongKeys.has(key)}
                    onDoubleClick={() => addSong(normalizedSong)}
                  />
                </div>
                );
              })}
            </div>
          </aside>

          <section className="bencher-preview" aria-label="Two-page bencher preview">
            <div className="bencher-actions">
              <button type="button" onClick={() => setSelectedSongs([])}>Clear songs</button>
              <button
                type="button"
                className={showTitles ? '' : 'bencher-action-active'}
                onClick={() => setShowTitles((v) => !v)}
              >
                {showTitles ? 'Hide titles' : 'Show titles'}
              </button>

              <span className="bencher-actions-divider" aria-hidden />

              <div className="bencher-save-group">
                <input
                  type="text"
                  className="bencher-title-input"
                  placeholder="Name this layout"
                  value={bencerTitle}
                  onChange={(event) => setBencherTitle(event.target.value)}
                  disabled={!auth?.user}
                  title={!auth?.user ? 'Sign in to save layouts' : undefined}
                />
                <button
                  type="button"
                  disabled={!auth?.user}
                  title={!auth?.user ? 'Sign in to save layouts' : 'Save layout'}
                  onClick={async () => {
                    if (!auth?.user) return;
                    const trimmed = bencerTitle.trim();
                    if (!trimmed) return;
                    try {
                      const matching = auth.bencherLayouts.find(
                        (l) => l.title.trim() === trimmed && (currentBencherLayoutId ? l.id === currentBencherLayoutId : true),
                      );
                      const saved = await auth.saveBencherLayout({
                        id: matching?.id ?? currentBencherLayoutId ?? undefined,
                        title: trimmed,
                        songs: selectedSongs.map((s) => ({ title: s.title, artist: s.artist, lyrics: s.lyrics })),
                        logoSrc,
                        showTitles,
                      });
                      setCurrentBencherLayoutId(saved.id);
                    } catch {
                      if (auth.bencherLayouts.length >= 3) {
                        setOverwriteTargetId(currentBencherLayoutId ?? auth.bencherLayouts[0]?.id ?? '');
                        setShowOverwriteModal(true);
                      }
                    }
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

              <span className="bencher-actions-divider" aria-hidden />

              <button type="button" onClick={() => window.print()}>Print</button>
            </div>

            <div className="bencher-pages" data-testid="bencher-pages">
              {BENCHER_PAGES.map((page) => (
                <div
                  key={page.pageNumber}
                  className={`bencher-page bencher-page-${page.pageNumber} ${activeSlot?.pageIndex === page.pageNumber - 1 ? 'drag-over' : ''}`}
                  style={{ backgroundImage: `url('${getBencherPageBackground(page.pageNumber)}')` }}
                  aria-label={`Bencher page ${page.pageNumber}`}
                  data-testid={`bencher-page-${page.pageNumber}`}
                  data-measure-root={`bencher-page-${page.pageNumber}`}
                >
                  {page.pageNumber === 1 && (
                    <button
                      type="button"
                      className="bencher-logo-target"
                      style={rectToCss(BENCHER_LOGO_RECT)}
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Upload rectangular logo for top right of page one"
                      data-testid="bencher-logo-target"
                    >
                      {logoSrc ? <img src={logoSrc} alt="Uploaded logo" /> : <span>Upload logo</span>}
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} />
                    </button>
                  )}

                  {page.pageNumber === 2 && (
                    <SongDropZone
                      positionedSongs={positionedSongs}
                      activeSlot={activeSlot}
                      previewSongKey={previewSongKey}
                      showTitles={showTitles}
                      onRemove={removeSong}
                    />
                  )}

                  <div className="bencher-page-footer" aria-hidden>Printed at NiggunSheet.com</div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

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
                  try {
                    const saved = await auth.saveBencherLayout({
                      id: overwriteTargetId,
                      title: bencerTitle.trim(),
                      songs: selectedSongs.map((s) => ({ title: s.title, artist: s.artist, lyrics: s.lyrics })),
                      logoSrc,
                      showTitles,
                    });
                    setCurrentBencherLayoutId(saved.id);
                    setShowOverwriteModal(false);
                  } catch {
                    // ignore
                  }
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
