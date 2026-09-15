import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { renderOverlayPdf } from '../renderOverlay';
import { buildCoverOverlayHtml, buildSongsOverlayHtml, coverFontFamilyCss } from '../overlayHtml';
import { computeBookletSheets } from '@/app/bencher/imposition';
import {
  BENCHER_DESIGN_PAGE_WIDTH,
  BENCHER_SONG_FONT_SIZE,
  getBencherSongDropPlacement,
} from '@/app/bencher/bencher-layout';

// ── helpers ──

// Rendering the vector overlays launches headless Chromium, which needs more
// than the default serverless time budget.
export const maxDuration = 60;

function base64ToBytes(b64: string): Uint8Array {
  const raw = b64.includes(',') ? b64.split(',')[1] : b64;
  return Uint8Array.from(Buffer.from(raw, 'base64'));
}

interface SongInput {
  title: string;
  artist: string;
  lyrics: string;
}

interface GenerateRequest {
  mode: '2-page' | '8-page';
  logoSrc?: string | null;
  /** Raw cover caption text (newline-separated lines); rendered to vector via headless Chromium */
  coverText?: string | null;
  /** Songs list for the 2-page mode songs page; rendered to vector via headless Chromium */
  songs?: SongInput[] | null;
  /** Whether song titles render above their lyrics (matches the editor's Titles toggle). */
  showTitles?: boolean | null;
  /** Cover caption font key (matches the editor's font options). */
  coverFont?: string | null;
  /** Booklet mode only: emit the individual pages in reading order instead of imposed sheets. */
  straight?: boolean | null;
}

function songsToLines(songs: SongInput[], showTitles: boolean): string[] {
  const lines: string[] = [];
  for (const song of songs) {
    if (showTitles && song.title) lines.push(song.title);
    for (const line of (song.lyrics || '').split('\n').filter((l) => l.trim())) lines.push(line);
    lines.push('');
  }
  return lines;
}

// ── POST ──

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const { mode, logoSrc, coverText, songs, showTitles: showTitlesRequested, coverFont, straight } = body;
    const showTitles = showTitlesRequested !== false;
    const songDropPageNumber = getBencherSongDropPlacement(mode).pageNumber;

    const assetsRoot = path.join(process.cwd(), 'public', 'assets');

    // Load source PDF
    const srcName = mode === '8-page' ? 'PDF1_SVG8.pdf' : 'PDF1_2pg.pdf';
    const srcPath = path.join(assetsRoot, 'bencher', srcName);
    const srcBytes = fs.readFileSync(srcPath);

    const srcDoc = await PDFDocument.load(srcBytes);
    const outDoc = await PDFDocument.create();

    // Embed logo (from client base64) — user-uploaded raster art, stays a raster embed
    let logo: any = null;
    if (logoSrc) {
      try {
        const bytes = base64ToBytes(logoSrc);
        logo = logoSrc.startsWith('data:image/png') || logoSrc.startsWith('data:image/png;')
          ? await outDoc.embedPng(bytes)
          : await outDoc.embedJpg(bytes);
      } catch { /* skip */ }
    }

    const hasLogo = !!logo;
    const hasText = !!(coverText && coverText.trim());
    const coverTextLines = hasText ? coverText!.split('\n') : [];
    const coverFontSizePt = hasLogo ? 24 : 32;

    // ── Cover overlay renderer (Hebrew text + ornaments, vector) ──
    async function embedCoverOverlay(page: any, x: number, cw: number, ch: number, ornamentWidthFrac: number) {
      if (!hasLogo && !hasText) return;
      const { html, widthPt, heightPt } = buildCoverOverlayHtml({
        cw, ch, hasLogo, hasText,
        textLines: coverTextLines,
        fontSizePt: coverFontSizePt,
        ornamentWidthFrac,
        fontFamily: coverFontFamilyCss(coverFont),
      });
      const overlayBytes = await renderOverlayPdf(html, widthPt, heightPt);
      const overlayDoc = await PDFDocument.load(overlayBytes);
      const embedded = await outDoc.embedPage(overlayDoc.getPage(0));
      page.drawPage(embedded, { x, y: 0, width: cw, height: ch });
    }

    // Logo drawing stays raster (unchanged) — only positions differ slightly per mode below.
    function drawLogo(page: any, cx: number, cw: number, ch: number) {
      if (!logo) return;
      const m = cw * 0.10, maxImgW = cw - m * 2;
      const maxH = hasText ? ch * 0.50 : ch * 0.55;
      const s = Math.min(maxImgW / logo.width, maxH / logo.height);
      const lw = logo.width * s, lh = logo.height * s;
      const ly = hasText ? ch * 0.42 + (maxH - lh) / 2 : (ch - lh) / 2;
      page.drawImage(logo, { x: cx + (cw - lw) / 2, y: ly, width: lw, height: lh });
    }

    // ── Songs overlay renderer ──
    // Draws the song column into a page box (`boxWidth`/`boxHeight` are the box's
    // own size in points) using the same drop-zone rect and font scale as the
    // on-screen editor, so printed output matches the preview.
    async function embedSongsOverlay(page: any, boxX: number, boxWidth: number, boxHeight: number, pageSongs: SongInput[]) {
      const rect = getBencherSongDropPlacement(mode).rect;
      const lines = songsToLines(pageSongs, showTitles);
      if (!lines.some((line) => line.trim())) return;

      const fontSizePt = BENCHER_SONG_FONT_SIZE * (boxWidth / BENCHER_DESIGN_PAGE_WIDTH);
      const overlayWidthPt = boxWidth * (rect.width / 100);
      const { html, widthPt: renderedWidth, heightPt: renderedHeight } = buildSongsOverlayHtml({
        widthPt: overlayWidthPt,
        lines,
        fontSizePt,
      });
      const overlayBytes = await renderOverlayPdf(html, renderedWidth, renderedHeight);
      const overlayDoc = await PDFDocument.load(overlayBytes);
      const embedded = await outDoc.embedPage(overlayDoc.getPage(0));
      const x = boxX + boxWidth * (rect.left / 100);
      const y = boxHeight - boxHeight * (rect.top / 100) - renderedHeight;
      page.drawPage(embedded, { x, y, width: renderedWidth, height: renderedHeight });
    }

    const hasSongs = !!(songs && songs.length);

    if (mode === '8-page' && straight) {
      // ── Straight booklet: the individual pages in reading order, no imposition ──
      const pages = await outDoc.copyPages(srcDoc, srcDoc.getPageIndices());

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width: pw, height: ph } = page.getSize();
        outDoc.addPage(page);

        if (i === 0 && (logo || hasText)) {
          drawLogo(page, 0, pw, ph);
          await embedCoverOverlay(page, 0, pw, ph, 0.72);
        }

        if (hasSongs && i + 1 === songDropPageNumber) {
          await embedSongsOverlay(page, 0, pw, ph, songs!);
        }
      }
    } else if (mode === '8-page') {
      // ── Booklet mode (RTL page ordering for Hebrew) ──
      const srcPageCount = srcDoc.getPageCount();
      const ordered = computeBookletSheets(srcPageCount).map(({ left, right }) => [left, right] as [number, number]);

      const W = 792, H = 612, HW = W / 2;

      for (const [leftPage, rightPage] of ordered) {
        const sheet = outDoc.addPage([W, H]);
        if (leftPage > 0) {
          sheet.drawPage(await outDoc.embedPage(srcDoc.getPage(leftPage - 1)), { x: 0, y: 0, width: HW, height: H });
        }
        if (rightPage > 0) {
          sheet.drawPage(await outDoc.embedPage(srcDoc.getPage(rightPage - 1)), { x: HW, y: 0, width: HW, height: H });
        }

        // The songs page keeps its song column inside whichever half it lands on.
        if (hasSongs) {
          if (leftPage === songDropPageNumber) await embedSongsOverlay(sheet, 0, HW, H, songs!);
          if (rightPage === songDropPageNumber) await embedSongsOverlay(sheet, HW, HW, H, songs!);
        }

        // Cover is on page 1 (now on the LEFT half due to RTL)
        const coverLeft = leftPage === 1;
        const coverRight = rightPage === 1;
        if (!coverLeft && !coverRight) continue;

        const cx = coverLeft ? 0 : HW;

        drawLogo(sheet, cx, HW, H);
        await embedCoverOverlay(sheet, cx, HW, H, 0.72);
      }
    } else {
      // ── 2-page mode ──
      const pages = await outDoc.copyPages(srcDoc, srcDoc.getPageIndices());

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width: pw, height: ph } = page.getSize();
        outDoc.addPage(page);

        // Page 1: cover
        if (i === 0 && (logo || hasText)) {
          drawLogo(page, 0, pw, ph);
          await embedCoverOverlay(page, 0, pw, ph, 0.3);
        }

        // Songs page — same drop-zone rect and font scale as the editor preview.
        if (hasSongs && i + 1 === songDropPageNumber) {
          await embedSongsOverlay(page, 0, pw, ph, songs!);
        }
      }
    }

    const pdfBytes = await outDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bencher-${mode}${straight ? '-straight' : ''}.pdf"`,
      },
    });
  } catch (err) {
    console.error('PDF generation error:', err);
    return NextResponse.json(
      { error: 'PDF generation failed', message: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}
