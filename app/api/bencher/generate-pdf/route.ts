import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

// ── helpers ──

function base64ToBytes(b64: string): Uint8Array {
  const raw = b64.includes(',') ? b64.split(',')[1] : b64;
  return Uint8Array.from(Buffer.from(raw, 'base64'));
}

interface GenerateRequest {
  mode: '2-page' | '8-page';
  logoSrc?: string | null;
  /** Pre-rendered cover text as a base64 PNG data URL */
  textPng?: string | null;
  textW?: number;
  textH?: number;
  /** Pre-rendered songs as a base64 PNG data URL (for 2-page mode page 2) */
  songsPng?: string | null;
  songsW?: number;
  songsH?: number;
}

// ── POST ──

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const { mode, logoSrc, textPng, textW = 0, textH = 0, songsPng, songsW = 0, songsH = 0 } = body;

    const assetsRoot = path.join(process.cwd(), 'public', 'assets');

    // Load source PDF
    const srcName = mode === '8-page' ? 'PDF1_SVG8.pdf' : 'PDF1_2pg.pdf';
    const srcPath = path.join(assetsRoot, 'bencher', srcName);
    const srcBytes = fs.readFileSync(srcPath);

    const srcDoc = await PDFDocument.load(srcBytes);
    const outDoc = await PDFDocument.create();

    // Embed logo (from client base64)
    let logo: any = null;
    if (logoSrc) {
      try {
        const bytes = base64ToBytes(logoSrc);
        logo = logoSrc.startsWith('data:image/png') || logoSrc.startsWith('data:image/png;')
          ? await outDoc.embedPng(bytes)
          : await outDoc.embedJpg(bytes);
      } catch { /* skip */ }
    }

    // Embed cover text PNG (pre-rendered by client)
    let textImg: any = null;
    if (textPng && textW > 0 && textH > 0) {
      try {
        textImg = await outDoc.embedPng(base64ToBytes(textPng));
      } catch { /* skip */ }
    }

    // Embed songs PNG (pre-rendered by client)
    let songsImg: any = null;
    if (songsPng && songsW > 0 && songsH > 0) {
      try {
        songsImg = await outDoc.embedPng(base64ToBytes(songsPng));
      } catch { /* skip */ }
    }

    // Embed ornaments from filesystem
    let ornImg: any = null, ornImgF: any = null;
    try {
      const ornPath = path.join(assetsRoot, 'ornament.png');
      const ornFPath = path.join(assetsRoot, 'ornament-flipped.png');
      ornImg = await outDoc.embedPng(fs.readFileSync(ornPath));
      ornImgF = await outDoc.embedPng(fs.readFileSync(ornFPath));
    } catch { /* skip */ }

    function drawOrn(page: any, img: any, cx: number, cy: number, w: number, h: number) {
      if (!img) return;
      page.drawImage(img, { x: cx - w / 2, y: cy - h / 2, width: w, height: h });
    }

    const ORN_H = 22;
    const hasText = !!(textImg && textW > 0);

    if (mode === '8-page') {
      // ── Booklet mode (RTL page ordering for Hebrew) ──
      const srcPageCount = srcDoc.getPageCount();
      const padded = Math.ceil(srcPageCount / 4) * 4;
      const totalSheets = padded / 4;
      const pairs: Array<[number, number]> = [];
      for (let sheet = 0; sheet < totalSheets; sheet++) {
        pairs.push([padded - 2 * sheet, 2 * sheet + 1]);
        pairs.push([2 * sheet + 2, padded - 2 * sheet - 1]);
      }
      // RTL: reverse left/right so page 1 is on the left half
      const ordered = pairs.map(([l, r]) => {
        const left = r <= srcPageCount ? r : 0;
        const right = l <= srcPageCount ? l : 0;
        return [left, right] as [number, number];
      });

      const W = 792, H = 612, HW = W / 2;

      for (const [leftPage, rightPage] of ordered) {
        const sheet = outDoc.addPage([W, H]);
        if (leftPage > 0) {
          sheet.drawPage(await outDoc.embedPage(srcDoc.getPage(leftPage - 1)), { x: 0, y: 0, width: HW, height: H });
        }
        if (rightPage > 0) {
          sheet.drawPage(await outDoc.embedPage(srcDoc.getPage(rightPage - 1)), { x: HW, y: 0, width: HW, height: H });
        }

        // Cover is on page 1 (now on the LEFT half due to RTL)
        const coverLeft = leftPage === 1;
        const coverRight = rightPage === 1;
        if (!coverLeft && !coverRight) continue;

        const cx = coverLeft ? 0 : HW;
        const cw = HW, ch = H;

        if (logo) {
          const m = cw * 0.10, maxImgW = cw - m * 2;
          const maxH = hasText ? ch * 0.50 : ch * 0.55;
          const s = Math.min(maxImgW / logo.width, maxH / logo.height);
          const lw = logo.width * s, lh = logo.height * s;
          const ly = hasText ? ch * 0.42 + (maxH - lh) / 2 : (ch - lh) / 2;
          sheet.drawImage(logo, { x: cx + (cw - lw) / 2, y: ly, width: lw, height: lh });
          const ow = cw * 0.72;
          drawOrn(sheet, ornImg, cx + cw / 2, ch - 50, ow, ORN_H);
          drawOrn(sheet, ornImgF, cx + cw / 2, 50, ow, ORN_H);
        }

        if (hasText) {
          const hasLogo = !!logo;
          const ty = hasLogo ? ch * 0.28 : ch * 0.65;
          const tx = cx + (cw - textW) / 2;

          if (!hasLogo) {
            const ow = cw * 0.72;
            drawOrn(sheet, ornImg, cx + cw / 2, ty + textH / 2 + ORN_H + 8, ow, ORN_H);
            drawOrn(sheet, ornImgF, cx + cw / 2, ty - textH / 2 - ORN_H - 4, ow, ORN_H);
          }
          sheet.drawImage(textImg, { x: tx, y: ty - textH / 2, width: textW, height: textH });
        }
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
          if (logo) {
            const m = pw * 0.12, maxImgW = pw - m * 2;
            const maxH = hasText ? ph * 0.50 : ph * 0.55;
            const s = Math.min(maxImgW / logo.width, maxH / logo.height);
            const lw = logo.width * s, lh = logo.height * s;
            const ly = hasText ? ph * 0.40 + (maxH - lh) / 2 : (ph - lh) / 2;
            page.drawImage(logo, { x: (pw - lw) / 2, y: ly, width: lw, height: lh });
            const ow = pw * 0.3;
            drawOrn(page, ornImg, pw / 2, ph - 50, ow, ORN_H);
            drawOrn(page, ornImgF, pw / 2, 50, ow, ORN_H);
          }
          if (hasText) {
            const hasLogo = !!logo;
            const ty = hasLogo ? ph * 0.26 : ph * 0.60;
            const tx = (pw - textW) / 2;

            if (!hasLogo) {
              const ow = pw * 0.3;
              drawOrn(page, ornImg, pw / 2, ty + textH / 2 + ORN_H + 8, ow, ORN_H);
              drawOrn(page, ornImgF, pw / 2, ty - textH / 2 - ORN_H - 4, ow, ORN_H);
            }
            page.drawImage(textImg, { x: tx, y: ty - textH / 2, width: textW, height: textH });
          }
        }

        // Page 2: songs
        if (i === 1 && songsImg && songsW > 0) {
          page.drawImage(songsImg, { x: (pw - songsW) / 2, y: 40, width: songsW, height: songsH });
        }
      }
    }

    const pdfBytes = await outDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bencher-${mode}.pdf"`,
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
