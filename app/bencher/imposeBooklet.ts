'use client';

// ── Text rasterizer (SVG-based) ──
// Renders Hebrew text via SVG with embedded base64 font, then converts to PNG.
// SVG text rendering is handled by the browser's layout engine, which is far
// more reliable for complex scripts than canvas font loading.

let _fontBase64: string | null = null;

async function getFontBase64(): Promise<string> {
  if (_fontBase64) return _fontBase64;
  const res = await fetch('/assets/fonts/FrankRuhlLibre-400.ttf');
  if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  _fontBase64 = btoa(binary);
  return _fontBase64;
}

function svgTextToPng(
  lines: string[],
  fontSize: number,
  maxW: number,
  color: string,
  scale: number = 3,
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise(async (resolve, reject) => {
    try {
      const fontB64 = await getFontBase64();
      const lineH = fontSize * 1.5;
      const padding = fontSize * 0.3;
      const svgW = maxW;
      const svgH = Math.ceil(lineH * lines.length + padding * 2);

      // Build SVG with embedded font
      const textSpans = lines
        .map((line, i) => `<tspan x="${svgW / 2}" dy="${i === 0 ? 0 : lineH}">${escapeXml(line)}</tspan>`)
        .join('');

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}">
  <defs>
    <style>
      @font-face {
        font-family: 'BH';
        src: url(data:font/truetype;charset=utf-8;base64,${fontB64}) format('truetype');
      }
    </style>
  </defs>
  <text font-family="BH" font-size="${fontSize}" fill="${color}"
        text-anchor="middle" x="${svgW / 2}" y="${padding + fontSize * 0.8}">
    ${textSpans}
  </text>
</svg>`;

      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = Math.round(svgW * scale);
        c.height = Math.round(svgH * scale);
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve({
          dataUrl: c.toDataURL('image/png'),
          width: svgW,
          height: svgH,
        });
      };
      img.onerror = () => reject(new Error('SVG image failed to load'));
      img.src = 'data:image/svg+xml,' + encodeURIComponent(svg);
    } catch (e) {
      reject(e);
    }
  });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Public API for client to pre-render text ──

export async function renderCoverTextPng(coverText: string, logoPresent: boolean, pageW: number): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (!coverText) return null;
  const lines = coverText.split('\n');
  const fontSize = logoPresent ? 24 : 32;
  const maxW = Math.round(pageW * 0.8);
  return svgTextToPng(lines, fontSize, maxW, '#000000');
}

export async function renderSongsPng(songs: Array<{ title: string; artist: string; lyrics: string }>, pageW: number): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (!songs?.length) return null;
  const lines: string[] = [];
  for (const song of songs) {
    if (song.title) lines.push(song.artist ? `${song.title} — ${song.artist}` : song.title);
    for (const line of (song.lyrics || '').split('\n').filter(l => l.trim())) lines.push(line);
    lines.push('');
  }
  const maxW = Math.round(pageW * 0.85);
  return svgTextToPng(lines, 10, maxW, '#000000');
}

// ── Download ──
export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
