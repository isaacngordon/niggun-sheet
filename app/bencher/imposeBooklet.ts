'use client';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// ---------------------------------------------------------------------------
// Booklet imposition adapted from bookbinder-js (MPL-2.0)
// https://github.com/momijizukamori/bookbinder-js
// ---------------------------------------------------------------------------

export interface ImposeOptions {
  logoSrc?: string | null;
  coverText?: string;
  /** Font family key for the cover text. */
  coverFont?: string;
  /** PNG data URL for the ornamental flourish (top). */
  ornamentPng?: string | null;
  /** PNG data URL for the flipped ornamental flourish (bottom). */
  ornamentPngFlipped?: string | null;
  /** Songs to render on the back page (2-page mode only). */
  songs?: Array<{ title: string; artist: string; lyrics: string }>;
  /** When true, pages are imposed for RTL (right-to-left) reading — spine on the right. */
  rtl?: boolean;
}

// ---------------------------------------------------------------------------
// Booklet page-pair calculation  (algorithm from bookbinder-js Signatures.booklet)
// ---------------------------------------------------------------------------

/**
 * Calculate saddle-stitch booklet page pairs for a given page count.
 * Uses the standard formula: for n pages (multiple of 4), sheet i has:
 *   front: [n−2i, 2i+1]   back: [2i+2, n−2i−1]
 * Returns `[leftPage, rightPage]` for every half-sheet, in print order
 * (all fronts outermost→innermost, then all backs outermost→innermost).
 * Page numbers are 1-based; `0` means a blank placeholder.
 */
export function calculateBookletPairs(pageCount: number): Array<[number, number]> {
  const padded = Math.ceil(pageCount / 4) * 4;
  const totalSheets = padded / 4;
  const pairs: Array<[number, number]> = [];

  for (let sheet = 0; sheet < totalSheets; sheet++) {
    const leftOuter = padded - 2 * sheet;
    const rightOuter = 2 * sheet + 1;
    const leftInner = 2 * sheet + 2;
    const rightInner = padded - 2 * sheet - 1;

    // Front side
    pairs.push([
      leftOuter <= pageCount ? leftOuter : 0,
      rightOuter <= pageCount ? rightOuter : 0,
    ]);
    // Back side
    pairs.push([
      leftInner <= pageCount ? leftInner : 0,
      rightInner <= pageCount ? rightInner : 0,
    ]);
  }

  return pairs;
}

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------

/**
 * Build an imposed (booklet-ready) PDF: landscape letter sheets, two
 * half-letter pages per side, ordered for saddle-stitch binding.
 */
export async function imposeBooklet(
  sourcePdfBytes: ArrayBuffer,
  options: ImposeOptions = {},
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(sourcePdfBytes);
  const srcPageCount = srcDoc.getPageCount();

  const pairs = calculateBookletPairs(srcPageCount);
  // For RTL: swap left/right in each pair so the spine sits on the right.
  const orderedPairs: Array<[number, number]> = options.rtl
    ? pairs.map(([l, r]) => [r, l] as [number, number])
    : pairs;
  const outDoc = await PDFDocument.create();
  // Pick a PDF built-in font based on the cover font choice.
  // Sans-serif keys ('arial') map to Helvetica; everything else maps to TimesRoman.
  const fontKey =
    options.coverFont === 'arial' ? StandardFonts.Helvetica : StandardFonts.TimesRoman;
  const font = await outDoc.embedFont(fontKey);

  // Landscape letter: 11″ × 8.5″  at 72 dpi
  const W = 792;
  const H = 612;
  const HW = W / 2; // half-width for one imposed page

  // Embed logo if provided
  let logo: Awaited<ReturnType<typeof outDoc.embedPng>> | null = null;
  if (options.logoSrc) {
    try {
      const b64 = options.logoSrc.split(',')[1] || options.logoSrc;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      logo = options.logoSrc.startsWith('data:image/png')
        ? await outDoc.embedPng(bytes)
        : await outDoc.embedJpg(bytes);
    } catch {
      /* skip */
    }
  }

  // Embed ornaments if provided
  let ornamentImg: Awaited<ReturnType<typeof outDoc.embedPng>> | null = null;
  let ornamentImgFlipped: Awaited<ReturnType<typeof outDoc.embedPng>> | null = null;
  if (options.ornamentPng) {
    try {
      const b64 = options.ornamentPng.split(',')[1] || options.ornamentPng;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      ornamentImg = await outDoc.embedPng(bytes);
    } catch {
      /* skip */
    }
  }
  if (options.ornamentPngFlipped) {
    try {
      const b64 = options.ornamentPngFlipped.split(',')[1] || options.ornamentPngFlipped;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      ornamentImgFlipped = await outDoc.embedPng(bytes);
    } catch {
      /* skip */
    }
  }

  for (const [leftPage, rightPage] of orderedPairs) {
    const sheet = outDoc.addPage([W, H]);

    // Left half
    if (leftPage > 0 && leftPage <= srcPageCount) {
      sheet.drawPage(await outDoc.embedPage(srcDoc.getPage(leftPage - 1)), {
        x: 0,
        y: 0,
        width: HW,
        height: H,
      });
    }

    // Right half
    if (rightPage > 0 && rightPage <= srcPageCount) {
      sheet.drawPage(await outDoc.embedPage(srcDoc.getPage(rightPage - 1)), {
        x: HW,
        y: 0,
        width: HW,
        height: H,
      });
    }

    // Logo + cover text + ornament on the half that contains page 1
    const coverIsOnLeft = leftPage === 1;
    const coverIsOnRight = rightPage === 1;
    if ((coverIsOnLeft || coverIsOnRight) && (logo || options.coverText)) {
      const cx = coverIsOnLeft ? 0 : HW;
      const cw = HW;
      const ch = H;

      /** Draw a pre-rendered ornament PNG at the given y (center-line). */
      const drawOrnamentImg = (img: typeof ornamentImg, cy: number, oheight: number) => {
        if (!img) return;
        const ow = cw * 0.72;
        const oh = oheight;
        const ox = cx + (cw - ow) / 2;
        sheet.drawImage(img, {
          x: ox,
          y: cy - oh / 2,
          width: ow,
          height: oh,
        });
      };

      const ORN_HEIGHT = 22;

      if (logo) {
        const imgW = logo.width;
        const imgH = logo.height;
        const margin = cw * 0.08;
        const maxW = cw - margin * 2;
        const maxH = options.coverText ? ch * 0.48 : ch * 0.6;
        const scale = Math.min(maxW / imgW, maxH / imgH);
        const lw = imgW * scale;
        const lh = imgH * scale;
        const logoY = options.coverText
          ? ch * 0.45 + (maxH - lh) / 2
          : (ch - lh) / 2;

        // Draw the logo first (behind ornaments)
        sheet.drawImage(logo, {
          x: cx + (cw - lw) / 2,
          y: logoY,
          width: lw,
          height: lh,
        });

        // Ornaments drawn on top of the logo
        drawOrnamentImg(ornamentImg, ch - 50, ORN_HEIGHT);
        drawOrnamentImg(ornamentImgFlipped, 50, ORN_HEIGHT);
      }

      if (options.coverText) {
        const hasLogo = !!logo;
        const ty = hasLogo ? ch * 0.42 : ch * 0.60;
        const fs = hasLogo ? 14 : 18;
        const lh = fs * 1.4;
        const lines = options.coverText.split('\n');

        // Draw ornaments above and below text (when no logo)
        if (!hasLogo) {
          const textTop = ty;
          const textBottom = ty - (lines.length - 1) * lh;
          drawOrnamentImg(ornamentImg, textTop + lh + ORN_HEIGHT + 8, ORN_HEIGHT);
          drawOrnamentImg(ornamentImgFlipped, textBottom - lh - ORN_HEIGHT - 4, ORN_HEIGHT);
        }

        lines.forEach((line, i) => {
          sheet.drawText(line, {
            x: cx + (cw - font.widthOfTextAtSize(line, fs)) / 2,
            y: ty - i * lh,
            size: fs,
            font,
            color: rgb(0, 0, 0),
          });
        });
      }
    }
  }

  return outDoc.save();
}

/**
 * Create a straight (non-imposed) copy of the source PDF — pages in original
 * order, same page size.  Useful as a digital / reference copy.
 */
export async function makeStraightPdf(sourcePdfBytes: ArrayBuffer): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(sourcePdfBytes);
  const outDoc = await PDFDocument.create();

  const pages = await outDoc.copyPages(srcDoc, srcDoc.getPageIndices());
  pages.forEach((p) => outDoc.addPage(p));

  return outDoc.save();
}

/**
 * Generate a 2-page (Double Sided) PDF — two letter-size pages with cover
 * overlays on page 1 and songs on page 2.  No imposition needed.
 */
export async function generateTwoPagePdf(
  sourcePdfBytes: ArrayBuffer,
  options: ImposeOptions,
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(sourcePdfBytes);
  const outDoc = await PDFDocument.create();

  // Pick the right font based on user's coverFont selection
  const isHebrewFont = options.coverFont === 'frank-ruhl-libre' || options.coverFont === 'noto-serif-hebrew';
  const isSans = options.coverFont === 'arial';
  let textFont = isSans
    ? await outDoc.embedFont(StandardFonts.Helvetica)
    : await outDoc.embedFont(StandardFonts.TimesRoman);

  // Load Frank Ruhl Libre for Hebrew font selections (or as a richer serif)
  if (isHebrewFont) {
    try {
      const fontRes = await fetch('/assets/fonts/FrankRuhlLibre-400.ttf');
      if (fontRes.ok) {
        textFont = await outDoc.embedFont(await fontRes.arrayBuffer());
      }
    } catch { /* keep built-in fallback */ }
  }

  // Embed logo
  let logo: Awaited<ReturnType<typeof outDoc.embedPng>> | null = null;
  if (options.logoSrc) {
    try {
      const b64 = options.logoSrc.split(',')[1] || options.logoSrc;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      logo = options.logoSrc.startsWith('data:image/png')
        ? await outDoc.embedPng(bytes)
        : await outDoc.embedJpg(bytes);
    } catch { /* skip */ }
  }

  // Embed ornaments
  let ornamentImg: Awaited<ReturnType<typeof outDoc.embedPng>> | null = null;
  let ornamentImgFlipped: Awaited<ReturnType<typeof outDoc.embedPng>> | null = null;
  if (options.ornamentPng) {
    try {
      const b64 = options.ornamentPng.split(',')[1] || options.ornamentPng;
      ornamentImg = await outDoc.embedPng(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
    } catch { /* skip */ }
  }
  if (options.ornamentPngFlipped) {
    try {
      const b64 = options.ornamentPngFlipped.split(',')[1] || options.ornamentPngFlipped;
      ornamentImgFlipped = await outDoc.embedPng(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
    } catch { /* skip */ }
  }

  const pages = await outDoc.copyPages(srcDoc, srcDoc.getPageIndices());
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width: pw, height: ph } = page.getSize();
    outDoc.addPage(page);

    // Overlays only on page 1 (cover)
    if (i !== 0) {
      // Page 2: render songs
      if (options.songs && options.songs.length > 0) {
        const margin = 48;
        const contentW = pw - margin * 2;
        const songFontSize = 10;
        const titleFontSize = 11;
        const lineH = songFontSize * 1.35;
        let y = ph - margin;

        for (const song of options.songs) {
          const lyricsLines = (song.lyrics || '').split('\n').filter(l => l.trim());

          // Title
          if (song.title) {
            const titleText = song.artist ? `${song.title} — ${song.artist}` : song.title;
            const titleWidth = textFont.widthOfTextAtSize(titleText, titleFontSize);
            page.drawText(titleText, {
              x: (pw - titleWidth) / 2,
              y,
              size: titleFontSize,
              font: textFont,
              color: rgb(0, 0, 0),
            });
            y -= titleFontSize * 1.6;
          }

          // Lyrics
          for (const line of lyricsLines) {
            if (y < margin) break; // stop if we run out of room
            const lineWidth = textFont.widthOfTextAtSize(line, songFontSize);
            page.drawText(line, {
              x: (pw - lineWidth) / 2,
              y,
              size: songFontSize,
              font: textFont,
              color: rgb(0, 0, 0),
            });
            y -= lineH;
          }

          // Gap between songs
          y -= songFontSize * 0.8;
          if (y < margin) break;
        }
      }
      continue;
    }
    if (!logo && !options.coverText) continue;

    const drawOrnamentImg = (img: typeof ornamentImg, cy: number, oheight: number) => {
      if (!img) return;
      const ow = pw * 0.3;
      const oh = oheight;
      const ox = (pw - ow) / 2;
      page.drawImage(img, { x: ox, y: cy - oh / 2, width: ow, height: oh });
    };

    const ORN_HEIGHT = 22;

    if (logo) {
      const imgW = logo.width;
      const imgH = logo.height;
      const margin = pw * 0.12;
      const maxW = pw - margin * 2;
      const maxH = options.coverText ? ph * 0.35 : ph * 0.5;
      const scale = Math.min(maxW / imgW, maxH / imgH);
      const lw = imgW * scale;
      const lh = imgH * scale;
      const logoY = options.coverText
        ? ph * 0.48 + (maxH - lh) / 2
        : (ph - lh) / 2;

      // Logo behind, ornaments on top
      page.drawImage(logo, { x: (pw - lw) / 2, y: logoY, width: lw, height: lh });
      drawOrnamentImg(ornamentImg, ph - 50, ORN_HEIGHT);
      drawOrnamentImg(ornamentImgFlipped, 50, ORN_HEIGHT);
    }

    if (options.coverText) {
      const hasLogo = !!logo;
      const ty = hasLogo ? ph * 0.40 : ph * 0.58;
      const fs = hasLogo ? 14 : 20;
      const lh = fs * 1.4;
      const lines = options.coverText.split('\n');

      if (!hasLogo) {
        const textBottom = ty - (lines.length - 1) * lh;
        drawOrnamentImg(ornamentImg, ty + lh + ORN_HEIGHT + 8, ORN_HEIGHT);
        drawOrnamentImg(ornamentImgFlipped, textBottom - lh - ORN_HEIGHT - 4, ORN_HEIGHT);
      }

      lines.forEach((line, idx) => {
        page.drawText(line, {
          x: (pw - textFont.widthOfTextAtSize(line, fs)) / 2,
          y: ty - idx * lh,
          size: fs,
          font: textFont,
          color: rgb(0, 0, 0),
        });
      });
    }
  }

  return outDoc.save();
}

// ---------------------------------------------------------------------------
// Browser download helper
// ---------------------------------------------------------------------------

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
