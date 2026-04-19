#!/usr/bin/env python3
"""Write the new SheetBuilderApp.tsx with Packery + Draggabilly."""
import os

TARGET = os.path.join(os.path.dirname(__file__), 'app', 'sheet-builder-v2', 'SheetBuilderApp.tsx')

CONTENT = r"""'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Header from '@/components/Header';
import { useDevice } from '@/hooks/useDevice';
import './sheet-builder.css';

// ─── Types ───────────────────────────────────────────────────────

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

interface PageState {
  wrapper: HTMLDivElement;
  grid: HTMLDivElement;
  footer: HTMLDivElement;
  packery: any;
  songs: SongData[];
  draggies: { element: HTMLDivElement; draggie: any }[];
}

// ─── Constants ───────────────────────────────────────────────────

const PAGE_CONTENT_HEIGHT = 592;
const STORAGE_KEY = 'sheetSongsV2';
const FONT_SIZES = [14, 12, 10, 9, 8];

const CONFIGS = [
  { cols: 1, fontSize: 14 },
  { cols: 2, fontSize: 14 },
  { cols: 2, fontSize: 12 },
  { cols: 3, fontSize: 14 },
  { cols: 3, fontSize: 12 },
  { cols: 2, fontSize: 10 },
  { cols: 3, fontSize: 10 },
];

// ─── Script Loader ───────────────────────────────────────────────

let scriptsLoaded = false;
let scriptsPromise: Promise<void> | null = null;

function loadPackeryScripts(): Promise<void> {
  if (scriptsLoaded) return Promise.resolve();
  if (scriptsPromise) return scriptsPromise;

  scriptsPromise = new Promise((resolve, reject) => {
    const packeryScript = document.createElement('script');
    packeryScript.src = 'https://unpkg.com/packery@3/dist/packery.pkgd.min.js';
    packeryScript.onload = () => {
      const draggabillyScript = document.createElement('script');
      draggabillyScript.src = 'https://unpkg.com/draggabilly@3/dist/draggabilly.pkgd.min.js';
      draggabillyScript.onload = () => {
        scriptsLoaded = true;
        resolve();
      };
      draggabillyScript.onerror = reject;
      document.head.appendChild(draggabillyScript);
    };
    packeryScript.onerror = reject;
    document.head.appendChild(packeryScript);
  });

  return scriptsPromise;
}

// ─── SheetBuilder Engine (imperative, uses real Packery + Draggabilly) ────

class SheetBuilderEngine {
  pages: PageState[] = [];
  columns = 1;
  fontSize = 14;
  autoFit = true;
  showTitles = true;
  showPageNumbers = true;
  showOrderNumbers = false;
  containerEl: HTMLDivElement | null = null;

  private onStatusChange: (msg: string) => void = () => {};
  private onSongsChange: () => void = () => {};
  private statusTimer: ReturnType<typeof setTimeout> | null = null;

  setCallbacks(onStatus: (msg: string) => void, onSongsChange: () => void) {
    this.onStatusChange = onStatus;
    this.onSongsChange = onSongsChange;
  }

  updateStatus(message: string) {
    this.onStatusChange(message);
    if (this.statusTimer) clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => {
      this.onStatusChange('Drag songs to the sheet');
    }, 3000);
  }

  getAllSongs(): SongData[] {
    const all: SongData[] = [];
    this.pages.forEach((page) => page.songs.forEach((s) => all.push(s)));
    return all;
  }

  syncToLocalStorage() {
    const allSongs = this.getAllSongs();
    if (allSongs.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allSongs));
    }
    this.onSongsChange();
  }

  // ─── Page Management ─────────────────────────────────────────

  addNewPage(): PageState {
    const Packery = (window as any).Packery;
    const pageIndex = this.pages.length;

    const wrapper = document.createElement('div');
    wrapper.className = 'sb2-sheet-page';
    wrapper.dataset.pageIndex = String(pageIndex);

    const header = document.createElement('div');
    header.className = 'sb2-page-header';
    wrapper.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'sb2-packery-grid';
    if (this.columns === 2) grid.classList.add('two-columns');
    if (this.columns === 3) grid.classList.add('three-columns');

    const gridSizer = document.createElement('div');
    gridSizer.className = 'sb2-grid-sizer';
    grid.appendChild(gridSizer);

    const gutterSizer = document.createElement('div');
    gutterSizer.className = 'sb2-gutter-sizer';
    grid.appendChild(gutterSizer);

    wrapper.appendChild(grid);

    const disclaimer = document.createElement('div');
    disclaimer.className = 'sb2-page-disclaimer';
    disclaimer.innerHTML =
      '<div>Download at niggunsheet.com</div><div>This sheet contains pesukim and is considered shaimos</div>';
    wrapper.appendChild(disclaimer);

    const footer = document.createElement('div');
    footer.className = 'sb2-page-footer';
    footer.textContent = this.showPageNumbers ? `${pageIndex + 1}` : '';
    wrapper.appendChild(footer);

    this.containerEl?.appendChild(wrapper);

    const packery = new Packery(grid, {
      itemSelector: '.sb2-song-card',
      columnWidth: '.sb2-grid-sizer',
      gutter: '.sb2-gutter-sizer',
      percentPosition: false,
      originLeft: true,
      transitionDuration: '0.25s',
      resize: false,
    });

    const page: PageState = { wrapper, grid, packery, footer, songs: [], draggies: [] };
    this.pages.push(page);
    this.setupPageDropZone(wrapper, page);
    return page;
  }

  setupPageDropZone(wrapper: HTMLDivElement, page: PageState) {
    wrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      wrapper.classList.add('drag-over');
    });
    wrapper.addEventListener('dragleave', (e) => {
      if (!wrapper.contains(e.relatedTarget as Node)) wrapper.classList.remove('drag-over');
    });
    wrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      wrapper.classList.remove('drag-over');
      try {
        const songData = JSON.parse(e.dataTransfer?.getData('application/json') || '{}');
        if (songData?.title) this.addSongFromSidebar(songData, page);
      } catch { /* ignore */ }
    });
  }

  // ─── Card Creation ───────────────────────────────────────────

  createSongCard(song: SongData, page: PageState, preCalculatedOrder: number | null = null): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'sb2-song-card';
    card.dataset.title = song.title;
    card.dataset.artist = song.artist;

    let orderNum: number | null = null;
    if (this.showOrderNumbers) {
      if (preCalculatedOrder !== null) {
        orderNum = preCalculatedOrder;
      } else {
        orderNum = 1;
        for (const p of this.pages) {
          if (p === page) {
            const idx = p.songs.indexOf(song);
            orderNum += idx >= 0 ? idx : p.songs.length;
            break;
          }
          orderNum += p.songs.length;
        }
      }
    }

    if (this.showTitles || this.showOrderNumbers) {
      const titleEl = document.createElement('div');
      titleEl.className = 'sb2-song-card-title';
      if (this.showOrderNumbers && this.showTitles) {
        titleEl.textContent = `${orderNum} ${song.title}`;
      } else if (this.showOrderNumbers) {
        titleEl.textContent = `${orderNum}`;
      } else {
        titleEl.textContent = song.title;
      }
      titleEl.style.fontSize = `${this.fontSize}px`;
      card.appendChild(titleEl);
    }

    const lyricsEl = document.createElement('div');
    lyricsEl.className = 'sb2-song-card-lyrics';
    lyricsEl.textContent = song.lyrics || '';
    lyricsEl.style.fontSize = `${this.fontSize}px`;
    card.appendChild(lyricsEl);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'sb2-remove-btn';
    removeBtn.innerHTML = '&times;';
    removeBtn.onclick = (e) => { e.stopPropagation(); this.removeSong(page, song, card); };
    removeBtn.onpointerdown = (e) => e.stopPropagation();
    card.appendChild(removeBtn);

    return card;
  }

  // ─── Add / Remove / Move ─────────────────────────────────────

  addSongToSheet(song: Song | SongData) {
    const isDuplicate = this.pages.some((p) => p.songs.some((s) => s.title === song.title && s.artist === song.artist));
    if (isDuplicate) { this.updateStatus(`"${song.title}" is already on the sheet`); return; }

    let targetPage = this.pages[this.pages.length - 1];
    if (!targetPage) targetPage = this.addNewPage();

    const songData: SongData = { title: song.title, artist: song.artist, lyrics: song.lyrics };
    targetPage.songs.push(songData);

    if (this.autoFit) this.autoScale();
    this.rebuildPage(targetPage);
    this.checkAndHandleOverflow(targetPage);
    this.checkAndEnforceLineBreaks();
    this.consolidatePages();
    this.syncToLocalStorage();
    this.updateStatus(`Added "${song.title}"`);
  }

  addSongFromSidebar(song: SongData, targetPage: PageState) {
    const isDuplicate = this.pages.some((p) => p.songs.some((s) => s.title === song.title && s.artist === song.artist));
    if (isDuplicate) { this.updateStatus(`"${song.title}" is already on the sheet`); return; }

    targetPage.songs.push(song);
    if (this.autoFit) this.autoScale();
    this.rebuildPage(targetPage);
    this.checkAndHandleOverflow(targetPage);
    this.checkAndEnforceLineBreaks();
    this.consolidatePages();
    this.syncToLocalStorage();
    this.updateStatus(`Added "${song.title}" to page ${this.pages.indexOf(targetPage) + 1}`);
  }

  addCardToPage(songData: SongData, page: PageState) {
    const Draggabilly = (window as any).Draggabilly;
    const card = this.createSongCard(songData, page);
    page.grid.appendChild(card);
    page.songs.push(songData);
    page.packery.appended(card);

    const draggie = new Draggabilly(card);
    page.draggies.push({ element: card, draggie });
    page.packery.bindDraggabillyEvents(draggie);
    this.setupCardDragHandlers(card, draggie, page);
    page.packery.layout();

    card.offsetHeight;
    const item = page.packery.getItem(card);
    const cardBottom = item ? item.position.y + card.offsetHeight : 0;
    return { card, draggie, overflow: cardBottom > PAGE_CONTENT_HEIGHT };
  }

  removeCardFromPage(card: HTMLDivElement, draggie: any, page: PageState, songData: SongData) {
    draggie.destroy();
    page.draggies = page.draggies.filter((d) => d.element !== card);
    const songIndex = page.songs.findIndex((s) => s.title === songData.title && s.artist === songData.artist);
    if (songIndex > -1) page.songs.splice(songIndex, 1);
    page.packery.remove(card);
    page.packery.layout();
  }

  removeSong(page: PageState, song: SongData, card: HTMLDivElement) {
    page.packery.remove(card);
    page.packery.layout();

    const index = page.songs.findIndex((s) => s.title === song.title && s.artist === song.artist);
    if (index > -1) page.songs.splice(index, 1);

    const draggieIndex = page.draggies.findIndex((d) => d.element === card);
    if (draggieIndex > -1) {
      page.draggies[draggieIndex].draggie.destroy();
      page.draggies.splice(draggieIndex, 1);
    }

    this.consolidatePages();
    if (this.autoFit) {
      this.autoScale();
      this.rebuildAllCards();
      this.checkAndEnforceLineBreaks();
      this.pages.forEach((p) => this.checkAndHandleOverflow(p));
      this.consolidatePages();
    }
    this.syncToLocalStorage();
    this.updateStatus(`Removed "${song.title}"`);
  }

  // ─── Drag Handlers (Draggabilly + Packery native) ────────────

  setupCardDragHandlers(card: HTMLDivElement, draggie: any, page: PageState) {
    let currentTargetPage: PageState | null = null;
    let lastPointer: any = null;

    draggie.on('dragStart', () => {
      card.classList.add('is-dragging');
      currentTargetPage = null;
    });

    draggie.on('dragMove', (_event: any, pointer: any) => {
      lastPointer = pointer;
      const px = pointer.pageX;
      const py = pointer.pageY;

      let hoveredPage: PageState | null = null;
      for (const p of this.pages) {
        const r = p.wrapper.getBoundingClientRect();
        const sx = window.scrollX;
        const sy = window.scrollY;
        if (px >= r.left + sx && px <= r.right + sx && py >= r.top + sy && py <= r.bottom + sy) {
          hoveredPage = p;
          break;
        }
      }

      this.pages.forEach((p) => p.wrapper.classList.remove('drag-over'));
      if (hoveredPage && hoveredPage !== page) hoveredPage.wrapper.classList.add('drag-over');
      currentTargetPage = hoveredPage;
    });

    draggie.on('dragEnd', (_event: any, pointer: any) => {
      card.classList.remove('is-dragging');
      this.pages.forEach((p) => p.wrapper.classList.remove('drag-over'));
      const dropPointer = lastPointer || pointer;

      if (currentTargetPage && currentTargetPage !== page) {
        const songData = page.songs.find((s) => s.title === card.dataset.title);
        if (songData) {
          const insertIndex = this.findInsertIndex(currentTargetPage, dropPointer.pageX, dropPointer.pageY);
          const de = page.draggies.find((d) => d.element === card);
          if (de) this.removeCardFromPage(card, de.draggie, page, songData);
          this.addCardAtPosition(songData, currentTargetPage, insertIndex);
          this.checkPageOverflow(currentTargetPage);
          this.consolidatePages();
          if (this.showOrderNumbers) this.rebuildAllCards();
          this.syncToLocalStorage();
          this.updateStatus(`Moved "${songData.title}"`);
          return;
        }
      }

      // Same page — Packery handles reordering natively
      this.updateSongOrder(page);
      this.checkPageOverflow(page);
      this.consolidatePages();
      this.syncToLocalStorage();
    });
  }

  findInsertIndex(targetPage: PageState, dropX: number, dropY: number): number {
    const gridRect = targetPage.grid.getBoundingClientRect();
    const relativeX = dropX - gridRect.left;
    const relativeY = dropY - gridRect.top + targetPage.grid.scrollTop;
    const cards = Array.from(targetPage.grid.querySelectorAll('.sb2-song-card')) as HTMLDivElement[];
    let insertIndex = cards.length;

    for (let i = 0; i < cards.length; i++) {
      const item = targetPage.packery.getItem(cards[i]);
      if (!item) continue;
      const cardY = item.position.y;
      const cardHeight = cards[i].offsetHeight;
      if (relativeY < cardY + cardHeight / 2) { insertIndex = i; break; }
      if (Math.abs(relativeY - cardY) < cardHeight / 2) {
        const cardX = item.position.x;
        const cardWidth = cards[i].offsetWidth;
        if (relativeX > cardX + cardWidth / 2) { insertIndex = i; break; }
      }
    }
    return insertIndex;
  }

  addCardAtPosition(songData: SongData, page: PageState, insertIndex: number) {
    const Draggabilly = (window as any).Draggabilly;
    const card = this.createSongCard(songData, page);

    const existingCards = Array.from(page.grid.querySelectorAll('.sb2-song-card'));
    if (insertIndex < existingCards.length) {
      page.grid.insertBefore(card, existingCards[insertIndex]);
      page.songs.splice(insertIndex, 0, songData);
    } else {
      page.grid.appendChild(card);
      page.songs.push(songData);
    }

    page.packery.prepended(card);
    page.packery.layout();

    const draggie = new Draggabilly(card);
    page.draggies.push({ element: card, draggie });
    page.packery.bindDraggabillyEvents(draggie);
    this.setupCardDragHandlers(card, draggie, page);
  }

  updateSongOrder(page: PageState) {
    const items = page.packery.getItemElements();
    const newOrder: SongData[] = [];
    items.forEach((item: HTMLElement) => {
      const title = item.dataset.title;
      const song = page.songs.find((s) => s.title === title);
      if (song) newOrder.push(song);
    });
    page.songs = newOrder;
    if (this.showOrderNumbers) this.rebuildAllCards();
    this.syncToLocalStorage();
  }

  // ─── Layout & Overflow ───────────────────────────────────────

  rebuildPage(page: PageState) {
    const songsBackup = [...page.songs];
    page.draggies.forEach((d) => d.draggie.destroy());
    page.draggies = [];
    page.songs = [];
    const cards = page.grid.querySelectorAll('.sb2-song-card');
    cards.forEach((card) => page.packery.remove(card));

    page.grid.classList.remove('two-columns', 'three-columns');
    if (this.columns === 2) page.grid.classList.add('two-columns');
    if (this.columns === 3) page.grid.classList.add('three-columns');

    const Draggabilly = (window as any).Draggabilly;
    songsBackup.forEach((song) => {
      const card = this.createSongCard(song, page);
      page.grid.appendChild(card);
      page.songs.push(song);
      page.packery.appended(card);
      const draggie = new Draggabilly(card);
      page.draggies.push({ element: card, draggie });
      page.packery.bindDraggabillyEvents(draggie);
      this.setupCardDragHandlers(card, draggie, page);
    });
    page.packery.layout();
  }

  rebuildAllCards() {
    const globalSongOrder = new Map<string, number>();
    let globalIndex = 1;
    this.pages.forEach((page) => {
      page.songs.forEach((song) => {
        globalSongOrder.set(`${song.title}|${song.artist}`, globalIndex++);
      });
    });

    const Draggabilly = (window as any).Draggabilly;
    this.pages.forEach((page) => {
      const songsBackup = [...page.songs];
      page.draggies.forEach((d) => d.draggie.destroy());
      page.draggies = [];
      page.songs = [];
      const cards = page.grid.querySelectorAll('.sb2-song-card');
      cards.forEach((card) => page.packery.remove(card));

      songsBackup.forEach((song) => {
        const card = this.createSongCard(song, page, globalSongOrder.get(`${song.title}|${song.artist}`) ?? null);
        page.grid.appendChild(card);
        page.songs.push(song);
        page.packery.appended(card);
        const draggie = new Draggabilly(card);
        page.draggies.push({ element: card, draggie });
        page.packery.bindDraggabillyEvents(draggie);
        this.setupCardDragHandlers(card, draggie, page);
      });
      page.packery.layout();
    });
  }

  checkAndHandleOverflow(page: PageState) {
    page.packery.layout();
    const cards = Array.from(page.grid.querySelectorAll('.sb2-song-card')) as HTMLDivElement[];
    const overflowCards: HTMLDivElement[] = [];

    for (const card of cards) {
      const item = page.packery.getItem(card);
      if (!item) continue;
      if (item.position.y + card.offsetHeight > PAGE_CONTENT_HEIGHT) overflowCards.push(card);
    }

    for (const card of overflowCards) {
      const title = card.dataset.title!;
      const songData = page.songs.find((s) => s.title === title);
      if (!songData) continue;

      const de = page.draggies.find((d) => d.element === card);
      if (de) { de.draggie.destroy(); page.draggies = page.draggies.filter((d) => d.element !== card); }
      page.songs = page.songs.filter((s) => s.title !== title);
      page.packery.remove(card);

      const pageIndex = this.pages.indexOf(page);
      let nextPage = this.pages[pageIndex + 1];
      if (!nextPage) nextPage = this.addNewPage();
      nextPage.songs.push(songData);
      this.rebuildPage(nextPage);
    }

    if (overflowCards.length > 0) {
      page.packery.layout();
      const pageIndex = this.pages.indexOf(page);
      for (let i = pageIndex + 1; i < this.pages.length; i++) {
        this.checkAndHandleOverflow(this.pages[i]);
      }
    }
  }

  checkPageOverflow(page: PageState) {
    page.packery.layout();
    const cards = Array.from(page.grid.querySelectorAll('.sb2-song-card')) as HTMLDivElement[];
    const overflowCards: HTMLDivElement[] = [];
    cards.forEach((card) => {
      const item = page.packery.getItem(card);
      if (item && item.position.y + card.offsetHeight > PAGE_CONTENT_HEIGHT) overflowCards.push(card);
    });
    overflowCards.reverse().forEach((card) => {
      const title = card.dataset.title!;
      const songData = page.songs.find((s) => s.title === title);
      if (!songData) return;
      const de = page.draggies.find((d) => d.element === card);
      if (de) {
        this.removeCardFromPage(card, de.draggie, page, songData);
        const pageIndex = this.pages.indexOf(page);
        let nextPage = this.pages[pageIndex + 1];
        if (!nextPage) nextPage = this.addNewPage();
        this.addCardToPage(songData, nextPage);
        this.checkPageOverflow(nextPage);
      }
    });
  }

  consolidatePages() {
    for (let i = 1; i < this.pages.length; i++) {
      const currentPage = this.pages[i];
      const prevPage = this.pages[i - 1];
      const songsToTry = [...currentPage.songs];

      for (const songData of songsToTry) {
        const card = currentPage.grid.querySelector(`[data-title="${CSS.escape(songData.title)}"]`) as HTMLDivElement;
        if (!card) continue;
        const de = currentPage.draggies.find((d) => d.element === card);
        if (!de) continue;

        const testResult = this.addCardToPage(songData, prevPage);
        const item = prevPage.packery.getItem(testResult.card);
        const cardBottom = item ? item.position.y + testResult.card.offsetHeight : 0;

        if (cardBottom <= PAGE_CONTENT_HEIGHT) {
          this.removeCardFromPage(card, de.draggie, currentPage, songData);
        } else {
          this.removeCardFromPage(testResult.card, testResult.draggie, prevPage, songData);
        }
      }
    }

    for (let i = this.pages.length - 1; i > 0; i--) {
      if (this.pages[i].songs.length === 0) {
        this.pages[i].wrapper.remove();
        this.pages.splice(i, 1);
      }
    }
    this.pages.forEach((page, index) => {
      page.footer.textContent = this.showPageNumbers ? `${index + 1}` : '';
    });
  }

  // ─── Auto-Scale & Line-Break Enforcement ─────────────────────

  autoScale() {
    if (!this.autoFit) return;
    let totalLines = 0;
    let totalSongs = 0;
    this.pages.forEach((page) => {
      page.songs.forEach((song) => {
        totalLines += (song.lyrics ? song.lyrics.split('\n').length : 0) + 2;
        totalSongs++;
      });
    });
    if (totalSongs === 0) return;

    let bestConfig = CONFIGS[CONFIGS.length - 1];
    for (const config of CONFIGS) {
      const lineHeight = config.fontSize * 1.35;
      const paddingPerSong = 16 + 8;
      const totalContentHeight = totalLines * lineHeight + totalSongs * paddingPerSong;
      if (totalContentHeight / config.cols <= PAGE_CONTENT_HEIGHT) { bestConfig = config; break; }
    }

    this.columns = bestConfig.cols;
    this.fontSize = bestConfig.fontSize;
    this.pages.forEach((page) => {
      page.grid.classList.remove('two-columns', 'three-columns');
      if (this.columns === 2) page.grid.classList.add('two-columns');
      if (this.columns === 3) page.grid.classList.add('three-columns');
    });
  }

  checkAndEnforceLineBreaks(): boolean {
    for (let i = 0; i < FONT_SIZES.length; i++) {
      this.fontSize = FONT_SIZES[i];
      this.rebuildAllCards();
      this.pages.forEach((page) => page.packery.layout());
      let anyTruncated = false;
      for (const page of this.pages) {
        for (const el of Array.from(page.grid.querySelectorAll('.sb2-song-card-lyrics'))) {
          if ((el as HTMLElement).scrollWidth > (el as HTMLElement).clientWidth) { anyTruncated = true; break; }
        }
        if (anyTruncated) break;
      }
      if (!anyTruncated) return true;
    }
    return false;
  }

  // ─── Controls ────────────────────────────────────────────────

  setColumnsManual(cols: number) {
    this.columns = cols;
    this.autoFit = false;
    this.pages.forEach((page) => {
      page.grid.classList.remove('two-columns', 'three-columns');
      if (cols === 2) page.grid.classList.add('two-columns');
      if (cols === 3) page.grid.classList.add('three-columns');
    });
    let lastPageCount = this.pages.length;
    let iterations = 0;
    do {
      lastPageCount = this.pages.length;
      this.rebuildAllCards();
      this.checkAndEnforceLineBreaks();
      this.pages.forEach((page) => this.checkAndHandleOverflow(page));
      this.consolidatePages();
      iterations++;
    } while (this.pages.length !== lastPageCount && iterations < 10);
  }

  setAutoColumns() {
    this.autoFit = true;
    let lastPageCount = this.pages.length;
    let iterations = 0;
    do {
      lastPageCount = this.pages.length;
      this.autoScale();
      this.rebuildAllCards();
      this.checkAndEnforceLineBreaks();
      this.pages.forEach((page) => this.checkAndHandleOverflow(page));
      this.consolidatePages();
      iterations++;
    } while (this.pages.length !== lastPageCount && iterations < 10);
  }

  toggleTitles() {
    this.showTitles = !this.showTitles;
    if (this.autoFit) this.autoScale();
    this.rebuildAllCards();
    this.checkAndEnforceLineBreaks();
    this.pages.forEach((page) => this.checkAndHandleOverflow(page));
    this.consolidatePages();
  }

  togglePageNumbers() {
    this.showPageNumbers = !this.showPageNumbers;
    this.pages.forEach((page, index) => {
      page.footer.textContent = this.showPageNumbers ? `${index + 1}` : '';
    });
  }

  toggleOrderNumbers() {
    this.showOrderNumbers = !this.showOrderNumbers;
    this.rebuildAllCards();
  }

  clearAll() {
    while (this.pages.length > 1) {
      const page = this.pages.pop()!;
      page.draggies.forEach((d) => d.draggie.destroy());
      page.wrapper.remove();
    }
    const firstPage = this.pages[0];
    if (firstPage) {
      firstPage.songs = [];
      firstPage.draggies.forEach((d) => d.draggie.destroy());
      firstPage.draggies = [];
      firstPage.grid.querySelectorAll('.sb2-song-card').forEach((card) => firstPage.packery.remove(card));
      firstPage.packery.layout();
    }
    localStorage.removeItem(STORAGE_KEY);
    this.onSongsChange();
    this.updateStatus('Sheet cleared');
  }

  loadSavedSongs(allApiSongs: Song[]) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      parsed.forEach((s: SongData) => {
        const apiSong = allApiSongs.find((a) => a.title === s.title && a.artist === s.artist);
        this.addSongToSheet({ title: s.title, artist: s.artist, lyrics: apiSong?.lyrics ?? s.lyrics });
      });
    } catch { /* ignore */ }
  }

  destroy() {
    this.pages.forEach((page) => {
      page.draggies.forEach((d) => d.draggie.destroy());
      page.packery.destroy();
      page.wrapper.remove();
    });
    this.pages = [];
  }
}

// ─── React Component ─────────────────────────────────────────────

export default function SheetBuilderApp() {
  const { isPhone, width } = useDevice();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Drag songs to the sheet');
  const [showTitles, setShowTitles] = useState(true);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [showOrderNumbers, setShowOrderNumbers] = useState(false);
  const [autoFit, setAutoFit] = useState(true);
  const [manualColumns, setManualColumns] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [usedSongKeys, setUsedSongKeys] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SheetBuilderEngine | null>(null);

  useEffect(() => { if (!isPhone) setSidebarOpen(false); }, [isPhone]);

  // Load songs from API
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/songs');
        if (!res.ok) throw new Error('Failed');
        setAllSongs(await res.json());
      } catch {
        setAllSongs([
          { title: '\u05D0\u05D3\u05D9\u05E8 \u05D4\u05D5\u05D0', artist: 'Traditional', lyrics: '\u05D0\u05D3\u05D9\u05E8 \u05D4\u05D5\u05D0\n\u05D9\u05D1\u05E0\u05D4 \u05D1\u05D9\u05EA\u05D5 \u05D1\u05E7\u05E8\u05D5\u05D1\n\u05D1\u05DE\u05D4\u05E8\u05D4 \u05D1\u05D9\u05DE\u05D9\u05E0\u05D5 \u05D1\u05E7\u05E8\u05D5\u05D1' },
          { title: '\u05E2\u05D5\u05D3 \u05D9\u05E9\u05DE\u05E2', artist: 'Traditional', lyrics: '\u05E2\u05D5\u05D3 \u05D9\u05E9\u05DE\u05E2 \u05D1\u05E2\u05E8\u05D9 \u05D9\u05D4\u05D5\u05D3\u05D4\n\u05D5\u05D1\u05D7\u05D5\u05E6\u05D5\u05EA \u05D9\u05E8\u05D5\u05E9\u05DC\u05D9\u05DD' },
          { title: '\u05D5\u05E9\u05DE\u05D7\u05EA', artist: 'Traditional', lyrics: '\u05D5\u05E9\u05DE\u05D7\u05EA \u05D1\u05D7\u05D2\u05DA\n\u05D5\u05D4\u05D9\u05D9\u05EA \u05D0\u05DA \u05E9\u05DE\u05D7' },
        ]);
      }
    }
    load();
  }, []);

  // Initialize engine
  useEffect(() => {
    if (allSongs.length === 0 || !containerRef.current) return;
    let engine: SheetBuilderEngine | null = null;

    loadPackeryScripts().then(() => {
      if (!containerRef.current) return;
      engine = new SheetBuilderEngine();
      engine.containerEl = containerRef.current;
      engine.setCallbacks(
        (msg) => setStatus(msg),
        () => {
          if (!engine) return;
          const keys = new Set<string>();
          engine.pages.forEach((p) => p.songs.forEach((s) => keys.add(`${s.title}|${s.artist}`)));
          setUsedSongKeys(keys);
        },
      );
      engine.addNewPage();
      engine.loadSavedSongs(allSongs);
      engine.onSongsChange();
      engineRef.current = engine;
      setLoaded(true);
    });

    return () => { if (engine) { engine.destroy(); engineRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSongs]);

  const filteredSongs = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return allSongs;
    return allSongs.filter((s) => s.title.toLowerCase().includes(q) || (s.artist || '').toLowerCase().includes(q));
  }, [allSongs, search]);

  const handleAddSong = useCallback((song: Song) => {
    engineRef.current?.addSongToSheet(song);
    if (isPhone) setSidebarOpen(false);
  }, [isPhone]);

  const handleClearAll = useCallback(() => {
    if (!confirm('Clear all songs from the sheet?')) return;
    engineRef.current?.clearAll();
  }, []);

  const handleToggleTitles = useCallback(() => {
    const e = engineRef.current; if (!e) return;
    e.toggleTitles(); setShowTitles(e.showTitles);
  }, []);

  const handleTogglePageNumbers = useCallback(() => {
    const e = engineRef.current; if (!e) return;
    e.togglePageNumbers(); setShowPageNumbers(e.showPageNumbers);
  }, []);

  const handleToggleOrderNumbers = useCallback(() => {
    const e = engineRef.current; if (!e) return;
    e.toggleOrderNumbers(); setShowOrderNumbers(e.showOrderNumbers);
  }, []);

  const handleSetColumns = useCallback((cols: number) => {
    const e = engineRef.current; if (!e) return;
    e.setColumnsManual(cols); setAutoFit(false); setManualColumns(cols);
  }, []);

  const handleSetAuto = useCallback(() => {
    const e = engineRef.current; if (!e) return;
    e.setAutoColumns(); setAutoFit(true);
  }, []);

  const handlePrint = useCallback(() => window.print(), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); handlePrint(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handlePrint]);

  const columns = autoFit ? (engineRef.current?.columns ?? 1) : manualColumns;
  const mobileSheetScale = isPhone ? Math.min((width - 16) / 612, 0.95) : 1;

  return (
    <div
      className="sb2-root"
      style={isPhone ? { '--mobile-sheet-scale': mobileSheetScale } as React.CSSProperties : undefined}
    >
      <div className="sb2-header-wrap"><Header /></div>

      <div className="sb2-main-layout">
        <div className={`sb2-sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

        <div className={`sb2-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sb2-sidebar-header">
            <h2>Song Library</h2>
            <input type="text" className="sb2-search-box" placeholder="Search songs..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="sb2-sidebar-hint"><strong>Tip:</strong> Drag songs to the sheet or double-click to add them. Drag cards on the sheet to reorder.</div>
          <div className="sb2-songs-list">
            {filteredSongs.map((song) => {
              const key = `${song.title}|${song.artist}`;
              const isUsed = usedSongKeys.has(key);
              return (
                <div key={key} className={`sb2-song-item ${isUsed ? 'used' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData('application/json', JSON.stringify({ title: song.title, artist: song.artist, lyrics: song.lyrics }));
                  }}
                  onDoubleClick={() => { if (!isUsed) handleAddSong(song); }}
                >
                  <div className="sb2-song-item-title">{song.title}</div>
                  <div className="sb2-song-item-artist">{song.artist || 'Unknown'}</div>
                </div>
              );
            })}
            {allSongs.length === 0 && <div className="sb2-loading">Loading songs...</div>}
          </div>
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

          <div className="sb2-page-container" ref={containerRef} />
        </div>
      </div>

      <button className="sb2-sidebar-toggle" onClick={() => setSidebarOpen((v) => !v)} aria-label={sidebarOpen ? 'Close song library' : 'Open song library'}>
        {sidebarOpen ? 'Close' : 'Songs'}
      </button>
    </div>
  );
}
"""

with open(TARGET, 'w', encoding='utf-8') as f:
    f.write(CONTENT.lstrip('\n'))

print(f"Written {os.path.getsize(TARGET)} bytes to {TARGET}")
