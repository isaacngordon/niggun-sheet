'use client';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// ---------------------------------------------------------------------------
// Booklet imposition adapted from bookbinder-js (MPL-2.0)
// https://github.com/momijizukamori/bookbinder-js
// ---------------------------------------------------------------------------

export interface ImposeOptions {
  logoSrc?: string | null;
  coverText?: string;
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
  const font = await outDoc.embedFont(StandardFonts.TimesRoman);

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

    // Logo + cover text on the half that contains page 1
    const coverIsOnLeft = leftPage === 1;
    const coverIsOnRight = rightPage === 1;
    if ((coverIsOnLeft || coverIsOnRight) && (logo || options.coverText)) {
      const cx = coverIsOnLeft ? 0 : HW;
      const cw = HW;
      const ch = H;
      if (logo) {
        const lh = ch * 0.25;
        const lw = cw * 0.7;
        sheet.drawImage(logo, {
          x: cx + (cw - lw) / 2,
          y: ch * 0.78 - lh,
          width: lw,
          height: lh,
        });
      }
      if (options.coverText) {
        const ty = ch * 0.5;
        const fs = 14;
        const lh = fs * 1.4;
        options.coverText.split('\n').forEach((line, i) => {
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
