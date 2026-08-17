import fs from 'fs';
import path from 'path';

// Builds transparent HTML documents for the vector overlay renderer
// (renderOverlay.ts): Hebrew text + ornament flourishes, laid out to match
// the positioning previously computed for the PNG-based overlay so the
// visual result is unchanged — only the rendering mechanism (vector vs.
// raster) is different.

const assetsRoot = path.join(process.cwd(), 'public', 'assets');

let _fontFaceCss: string | null = null;
function getFontFaceCss(): string {
  if (_fontFaceCss) return _fontFaceCss;
  const fontPath = path.join(assetsRoot, 'fonts', 'FrankRuhlLibre-400.ttf');
  const b64 = fs.readFileSync(fontPath).toString('base64');
  _fontFaceCss = `@font-face {
    font-family: 'BH';
    src: url(data:font/truetype;charset=utf-8;base64,${b64}) format('truetype');
  }`;
  return _fontFaceCss;
}

let _ornamentSvgInner: string | null = null;
function getOrnamentSvgInner(): string {
  if (_ornamentSvgInner) return _ornamentSvgInner;
  const svgPath = path.join(assetsRoot, 'Andy-heading-flourish.svg');
  const raw = fs.readFileSync(svgPath, 'utf8');
  const match = raw.match(/<svg[\s\S]*<\/svg\s*>/);
  if (!match) throw new Error('Could not parse Andy-heading-flourish.svg');
  _ornamentSvgInner = match[0];
  return _ornamentSvgInner;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function ornamentHtml(widthPt: number, flipped: boolean): string {
  const svg = getOrnamentSvgInner().replace('<svg', `<svg style="width:100%;height:100%;display:block;fill:#000"`);
  const flip = flipped ? 'scaleX(-1)' : 'none';
  return `<div style="width:${widthPt}pt;height:${(widthPt * 30.455) / 388.44}pt;transform:${flip}">${svg}</div>`;
}

function textLinesHtml(lines: string[], fontSizePt: number): string {
  return lines
    .map((line) => `<div dir="rtl" style="white-space:nowrap;">${escapeHtml(line) || '&nbsp;'}</div>`)
    .join('');
}

/** Matches the height formula used by the original SVG text rasterizer, so overlay boxes are sized identically. */
export function textBoxHeightPt(lineCount: number, fontSizePt: number): number {
  const lineH = fontSizePt * 1.5;
  const padding = fontSizePt * 0.3;
  return Math.ceil(lineH * lineCount + padding * 2);
}

function baseHtml(widthPt: number, heightPt: number, body: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; padding: 0; }
  body { width: ${widthPt}pt; height: ${heightPt}pt; position: relative; overflow: hidden; }
  ${getFontFaceCss()}
  .text { font-family: 'BH', serif; text-align: center; }
</style></head>
<body>${body}</body></html>`;
}

interface CoverOverlayOpts {
  cw: number;
  ch: number;
  hasLogo: boolean;
  hasText: boolean;
  textLines: string[];
  fontSizePt: number;
  ornamentWidthFrac: number;
}

/** Overlay for a single cover box (booklet cover-half or 2-page cover page), local coords 0..cw, 0..ch. */
export function buildCoverOverlayHtml(opts: CoverOverlayOpts): { html: string; widthPt: number; heightPt: number } {
  const { cw, ch, hasLogo, hasText, textLines, fontSizePt, ornamentWidthFrac } = opts;
  const ow = cw * ornamentWidthFrac;
  const parts: string[] = [];

  if (hasLogo) {
    parts.push(`<div style="position:absolute;left:${cw / 2}pt;top:50pt;transform:translateX(-50%);">${ornamentHtml(ow, false)}</div>`);
    parts.push(`<div style="position:absolute;left:${cw / 2}pt;bottom:50pt;transform:translateX(-50%);">${ornamentHtml(ow, true)}</div>`);
  }

  if (hasText) {
    const ty = hasLogo ? ch * 0.28 : ch * 0.65;
    const cssTop = ch - ty;
    const groupChildren: string[] = [];
    if (!hasLogo) groupChildren.push(`<div style="margin-bottom:8pt;">${ornamentHtml(ow, false)}</div>`);
    groupChildren.push(`<div class="text" style="font-size:${fontSizePt}pt;">${textLinesHtml(textLines, fontSizePt)}</div>`);
    if (!hasLogo) groupChildren.push(`<div style="margin-top:4pt;">${ornamentHtml(ow, true)}</div>`);
    parts.push(
      `<div style="position:absolute;left:50%;top:${cssTop}pt;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;">${groupChildren.join('')}</div>`,
    );
  }

  return { html: baseHtml(cw, ch, parts.join('')), widthPt: cw, heightPt: ch };
}

interface SongsOverlayOpts {
  widthPt: number;
  lines: string[];
  fontSizePt: number;
}

/** Overlay for the 2-page mode songs block; height is derived the same way the original rasterizer derived it. */
export function buildSongsOverlayHtml(opts: SongsOverlayOpts): { html: string; widthPt: number; heightPt: number } {
  const { widthPt, lines, fontSizePt } = opts;
  const heightPt = textBoxHeightPt(lines.length, fontSizePt);
  const body = `<div class="text" style="font-size:${fontSizePt}pt;">${textLinesHtml(lines, fontSizePt)}</div>`;
  return { html: baseHtml(widthPt, heightPt, body), widthPt, heightPt };
}
