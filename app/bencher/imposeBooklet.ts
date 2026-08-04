'use client';

import { jsPDF } from 'jspdf';

export interface ImposeOptions {
  logoSrc?: string | null;
  coverText?: string;
  coverFont?: string;
  ornamentPng?: string | null;
  ornamentPngFlipped?: string | null;
  songs?: Array<{ title: string; artist: string; lyrics: string }>;
  rtl?: boolean;
}

// ── Font ──
async function ensureFont(pdf: jsPDF) {
  try {
    // Always add to this instance; VFS is global but addFont is per-instance
    if (!pdf.getFontList()['FrankRuhlLibre']) {
      const res = await fetch('/assets/fonts/FrankRuhlLibre-400.ttf');
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let bin = '';
        for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
        pdf.addFileToVFS('FrankRuhlLibre-Regular.ttf', btoa(bin));
        pdf.addFont('FrankRuhlLibre-Regular.ttf', 'FrankRuhlLibre', 'normal');
      }
    }
  } catch (e) { console.warn('Font load failed:', e); }
}

// ── PDF page → image (high-res) ──
const PDFJS_URL = 'https://unpkg.com/pdfjs-dist@5.4.296/legacy/build/pdf.min.mjs';
const WORKER_URL = 'https://unpkg.com/pdfjs-dist@5.4.296/legacy/build/pdf.worker.min.mjs';

async function renderPages(pdfBytes: ArrayBuffer, count: number, targetW: number): Promise<Array<string | null>> {
  const out: Array<string | null> = [];
  try {
    const pdfjs = await import(/* webpackIgnore: true */ PDFJS_URL);
    pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;
    const doc = await pdfjs.getDocument({ data: pdfBytes }).promise;
    console.log(`PDF has ${doc.numPages} pages, rendering ${count} at ${targetW}px wide`);
    for (let i = 0; i < count && i < doc.numPages; i++) {
      try {
        const page = await doc.getPage(i + 1);
        const vp = page.getViewport({ scale: 1 });
        const s = targetW / vp.width;
        const svp = page.getViewport({ scale: s });
        const c = document.createElement('canvas');
        c.width = svp.width; c.height = svp.height;
        await page.render({ canvasContext: c.getContext('2d')!, viewport: svp }).promise;
        out.push(c.toDataURL('image/png'));
      } catch (e) {
        console.warn(`Page ${i + 1} render failed:`, e);
        out.push(null);
      }
    }
  } catch (e) { console.warn('PDF render failed:', e); }
  return out;
}

// ── Booklet pairs ──
export function calculateBookletPairs(pageCount: number): Array<[number, number]> {
  const pad = Math.ceil(pageCount / 4) * 4;
  const sheets = pad / 4;
  const pairs: Array<[number, number]> = [];
  for (let s = 0; s < sheets; s++) {
    pairs.push([pad - 2 * s, 2 * s + 1]);
    pairs.push([2 * s + 2, pad - 2 * s - 1]);
  }
  return pairs.map(([a, b]) => [a <= pageCount ? a : 0, b <= pageCount ? b : 0]);
}

// ── Ornament helper ──
function orn(pdf: jsPDF, img: string | null | undefined, cx: number, cy: number, w: number, h: number) {
  if (!img) return;
  try { pdf.addImage(img, 'PNG', cx - w / 2, cy - h / 2, w, h); } catch { /* skip */ }
}

// ── Cover overlay ──
function cover(pdf: jsPDF, x: number, y: number, w: number, h: number, opts: ImposeOptions) {
  const OH = 22;
  const F = 'FrankRuhlLibre';

  if (opts.logoSrc) {
    const img = new Image(); img.src = opts.logoSrc;
    if (img.complete) {
      const m = w * 0.08, maxW = w - m * 2;
      const maxH = opts.coverText ? h * 0.35 : h * 0.5;
      const s = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
      const lw = img.naturalWidth * s, lh = img.naturalHeight * s;
      const ly = y + (opts.coverText ? h * 0.12 + (maxH - lh) / 2 : (h - lh) / 2);
      pdf.addImage(img, 'PNG', x + (w - lw) / 2, ly, lw, lh);
      const ow = w * 0.72;
      orn(pdf, opts.ornamentPng, x + w / 2, y + 50, ow, OH);
      orn(pdf, opts.ornamentPngFlipped, x + w / 2, y + h - 50, ow, OH);
    }
  }

  if (opts.coverText) {
    const hasLogo = !!opts.logoSrc;
    const ty = y + (hasLogo ? h * 0.55 : h * 0.30);
    const fs = hasLogo ? 14 : 18, lh = fs * 1.4;
    const lines = opts.coverText.split('\n');
    if (!hasLogo) {
      const tb = ty + (lines.length - 1) * lh, ow = w * 0.72;
      orn(pdf, opts.ornamentPng, x + w / 2, ty - OH - 8, ow, OH);
      orn(pdf, opts.ornamentPngFlipped, x + w / 2, tb + lh + 4, ow, OH);
    }
    pdf.setFont(F, 'normal'); pdf.setFontSize(fs); pdf.setTextColor(0, 0, 0);
    lines.forEach((line, i) => { pdf.text(line, x + (w - pdf.getTextWidth(line)) / 2, ty + i * lh); });
  }
}

// ── Imposed booklet PDF ──
export async function imposeBooklet(sourcePdfBytes: ArrayBuffer, options: ImposeOptions = {}): Promise<Uint8Array> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  await ensureFont(pdf);
  const pageW = 792, pageH = 612, halfW = pageW / 2;
  const images = await renderPages(sourcePdfBytes, 8, halfW * 4);
  const actualPageCount = images.filter(i => i !== null).length;
  const pairs = calculateBookletPairs(Math.max(actualPageCount, 8));
  const ordered = options.rtl ? pairs.map(([l, r]) => [r, l] as [number, number]) : pairs;

  for (let idx = 0; idx < ordered.length; idx++) {
    if (idx > 0) pdf.addPage([pageW, pageH]);
    const [l, r] = ordered[idx];
    if (l > 0 && images[l - 1]) pdf.addImage(images[l - 1]!, 'PNG', 0, 0, halfW, pageH, undefined, 'FAST');
    if (r > 0 && images[r - 1]) pdf.addImage(images[r - 1]!, 'PNG', halfW, 0, halfW, pageH, undefined, 'FAST');
    if (l === 1) cover(pdf, 0, 0, halfW, pageH, options);
    else if (r === 1) cover(pdf, halfW, 0, halfW, pageH, options);
  }
  return pdf.output('arraybuffer');
}

// ── 2-page straight PDF ──
export async function generateTwoPagePdf(sourcePdfBytes: ArrayBuffer, options: ImposeOptions): Promise<Uint8Array> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  await ensureFont(pdf);
  const pageW = 612, pageH = 792;
  const images = await renderPages(sourcePdfBytes, 2, pageW * 4);

  for (let i = 0; i < 2; i++) {
    if (i > 0) pdf.addPage([pageW, pageH]);
    if (images[i]) pdf.addImage(images[i]!, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST');
    if (i === 0) {
      cover(pdf, 0, 0, pageW, pageH, options);
    } else if (options.songs?.length) {
      const F = 'FrankRuhlLibre', m = 48, sFs = 10, tFs = 11, lH = sFs * 1.35;
      let py = m;
      for (const song of options.songs) {
        const lines = (song.lyrics || '').split('\n').filter(l => l.trim());
        if (song.title) {
          const tt = song.artist ? `${song.title} \u2014 ${song.artist}` : song.title;
          pdf.setFont(F, 'bold'); pdf.setFontSize(tFs); pdf.setTextColor(0, 0, 0);
          pdf.text(tt, (pageW - pdf.getTextWidth(tt)) / 2, py + tFs);
          py += tFs * 1.6;
        }
        pdf.setFont(F, 'normal'); pdf.setFontSize(sFs);
        for (const line of lines) {
          if (py > pageH - m) break;
          pdf.text(line, (pageW - pdf.getTextWidth(line)) / 2, py + sFs);
          py += lH;
        }
        py += sFs * 0.8;
        if (py > pageH - m) break;
      }
    }
  }
  return pdf.output('arraybuffer');
}

// ── Bare straight copy ──
export async function makeStraightPdf(sourcePdfBytes: ArrayBuffer): Promise<Uint8Array> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageW = 612, pageH = 792;
  const images = await renderPages(sourcePdfBytes, 8, pageW * 4);
  for (let i = 0; i < images.length; i++) {
    if (i > 0) pdf.addPage([pageW, pageH]);
    if (images[i]) pdf.addImage(images[i]!, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST');
  }
  return pdf.output('arraybuffer');
}

// ── Download ──
export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
