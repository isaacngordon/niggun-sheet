'use client';

import { computeBookletSheets } from './imposition';
import {
  getBencherLogoPlacement,
  getBencherPageBackground,
  getBencherSongDropPlacement,
  bencherPrintContentWidth,
  formatBencherLyrics,
  BENCHER_SONG_FONT_SIZE,
  BENCHER_DESIGN_PAGE_WIDTH,
  type BencherMode,
} from './bencher-layout';

// Vector, client-side print rendering: SVG page backgrounds + real HTML text
// + an inline SVG ornament, printed via the browser's own window.print().
// Unlike a generated PDF, none of this touches the browser's isolated
// native-PDF-viewer surface, so it doesn't hit the blank-page/cross-origin
// issues that approach ran into — this is just a normal page being printed.
// Cover positioning mirrors app/api/bencher/generate-pdf/route.ts's drawLogo /
// embedCoverOverlay and app/api/bencher/overlayHtml.ts's buildCoverOverlayHtml
// (same formulas, expressed as CSS instead of pdf-lib draw calls); the song
// column mirrors the on-screen drop zone (same rect + same sb2-song-card
// classes) so print matches what's shown in the editor.

interface PrintSong {
  title: string;
  artist: string;
  lyrics: string;
}

export interface BencherPrintViewProps {
  mode: BencherMode;
  logoSrc: string | null;
  coverText: string;
  songs: PrintSong[];
  showTitles: boolean;
}

const ORNAMENT_SRC = '/assets/Andy-heading-flourish.svg';

function Ornament({ widthPt, flipped }: { widthPt: number; flipped?: boolean }) {
  return (
    <img
      src={ORNAMENT_SRC}
      alt=""
      aria-hidden="true"
      style={{ width: `${widthPt}pt`, height: 'auto', display: 'block', transform: flipped ? 'scaleX(-1)' : undefined }}
    />
  );
}

/** Mirrors route.ts's drawLogo: fit-contain within a box, box itself centered per the same formulas. */
function LogoOverlay({ cw, ch, hasText, logoSrc }: { cw: number; ch: number; hasText: boolean; logoSrc: string }) {
  const maxImgW = cw * 0.8; // cw - 2 * (cw * 0.10)
  const maxH = hasText ? ch * 0.50 : ch * 0.55;
  const centerYFromBottom = hasText ? ch * 0.42 + maxH / 2 : ch / 2;
  const topPt = ch - centerYFromBottom - maxH / 2;
  return (
    <div style={{ position: 'absolute', left: `${(cw - maxImgW) / 2}pt`, top: `${topPt}pt`, width: `${maxImgW}pt`, height: `${maxH}pt` }}>
      <img src={logoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  );
}

/** Mirrors overlayHtml.ts's buildCoverOverlayHtml. */
function CoverOverlay({ cw, ch, hasLogo, hasText, textLines, fontSizePt, ornamentWidthFrac }: {
  cw: number;
  ch: number;
  hasLogo: boolean;
  hasText: boolean;
  textLines: string[];
  fontSizePt: number;
  ornamentWidthFrac: number;
}) {
  const ow = cw * ornamentWidthFrac;
  const ty = hasLogo ? ch * 0.28 : ch * 0.65;
  const cssTopPt = ch - ty;

  return (
    <>
      {hasLogo && (
        <>
          <div style={{ position: 'absolute', left: '50%', top: '50pt', transform: 'translateX(-50%)' }}>
            <Ornament widthPt={ow} />
          </div>
          <div style={{ position: 'absolute', left: '50%', bottom: '50pt', transform: 'translateX(-50%)' }}>
            <Ornament widthPt={ow} flipped />
          </div>
        </>
      )}
      {hasText && (
        <div style={{ position: 'absolute', left: '50%', top: `${cssTopPt}pt`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {!hasLogo && <div style={{ marginBottom: 8 }}><Ornament widthPt={ow} /></div>}
          <div className="bencher-print-hebrew" style={{ fontSize: `${fontSizePt}pt` }}>
            {textLines.map((line, i) => <div key={i} dir="rtl">{line || ' '}</div>)}
          </div>
          {!hasLogo && <div style={{ marginTop: 4 }}><Ornament widthPt={ow} flipped /></div>}
        </div>
      )}
    </>
  );
}

function CoverBox({ cw, ch, pageNumber, mode, hasLogo, hasText, textLines, fontSizePt, ornamentWidthFrac, logoSrc }: {
  cw: number;
  ch: number;
  pageNumber: number;
  mode: BencherMode;
  hasLogo: boolean;
  hasText: boolean;
  textLines: string[];
  fontSizePt: number;
  ornamentWidthFrac: number;
  logoSrc: string | null;
}) {
  const bg = pageNumber > 0 ? getBencherPageBackground(mode, pageNumber) : '';
  const isCover = pageNumber === 1;
  return (
    <div className="bencher-print-page" style={{ width: `${cw}pt`, height: `${ch}pt` }}>
      {bg && <img src={bg} alt="" className="bencher-print-bg" />}
      {isCover && hasLogo && logoSrc && <LogoOverlay cw={cw} ch={ch} hasText={hasText} logoSrc={logoSrc} />}
      {isCover && (
        <CoverOverlay cw={cw} ch={ch} hasLogo={hasLogo} hasText={hasText} textLines={textLines} fontSizePt={fontSizePt} ornamentWidthFrac={ornamentWidthFrac} />
      )}
    </div>
  );
}

export default function BencherPrintView({ mode, logoSrc, coverText, songs, showTitles }: BencherPrintViewProps) {
  const hasLogo = !!logoSrc;
  const hasText = !!(coverText && coverText.trim());
  const coverTextLines = hasText ? coverText.split('\n') : [];
  const coverFontSizePt = hasLogo ? 24 : 32;

  if (mode === '2-page') {
    const cw = 612, ch = 792;
    // 2-page mode puts the logo in the small top-right box on page 1 (the
    // artwork leaves a gap there) rather than the booklet's full-cover
    // treatment — same rect the on-screen upload target uses.
    const logoRect = getBencherLogoPlacement('2-page').rect;
    // Songs go in the left-hand column on page 2, matching the on-screen drop
    // zone rect; font size is the design-space px value converted into the
    // print page's own point scale.
    const songRect = getBencherSongDropPlacement('2-page').rect;
    const songFontSizePt = (BENCHER_SONG_FONT_SIZE * (cw / BENCHER_DESIGN_PAGE_WIDTH)).toFixed(2);
    // Reflow lyrics against the same content width the on-screen cards use
    // when printing, so line breaks match the editor preview.
    const lyricWidth = bencherPrintContentWidth(songRect.width);

    return (
      <div className="bencher-print-root">
        <div className="bencher-print-page" style={{ width: `${cw}pt`, height: `${ch}pt` }}>
          <img src={getBencherPageBackground('2-page', 1)} alt="" className="bencher-print-bg" />
          {logoSrc && (
            <img
              src={logoSrc}
              alt=""
              style={{
                position: 'absolute',
                top: `${logoRect.top}%`,
                left: `${logoRect.left}%`,
                width: `${logoRect.width}%`,
                height: `${logoRect.height}%`,
                objectFit: 'contain',
              }}
            />
          )}
        </div>
        <div className="bencher-print-page" style={{ width: `${cw}pt`, height: `${ch}pt` }}>
          <img src={getBencherPageBackground('2-page', 2)} alt="" className="bencher-print-bg" />
          {songs.length > 0 && (
            <div
              className="bencher-sheet-builder-grid bencher-print-songs"
              style={{
                top: `${songRect.top}%`,
                left: `${songRect.left}%`,
                width: `${songRect.width}%`,
                height: `${songRect.height}%`,
              }}
            >
              {songs.map((song, i) => (
                <div key={i} className="bencher-print-song">
                  {showTitles && song.title && (
                    <div className="sb2-song-card-title" style={{ fontSize: `${songFontSizePt}pt` }}>{song.title}</div>
                  )}
                  <div className="sb2-song-card-lyrics" style={{ fontSize: `${songFontSizePt}pt` }}>
                    {formatBencherLyrics(song.lyrics || '', lyricWidth, BENCHER_SONG_FONT_SIZE).trim()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const HW = 396, H = 612;
  const sheets = computeBookletSheets(8);
  return (
    <div className="bencher-print-root">
      <style>{'@media print { @page { size: letter landscape; margin: 0; } }'}</style>
      {sheets.map(({ left, right }, i) => (
        <div key={i} className="bencher-print-sheet">
          <CoverBox cw={HW} ch={H} pageNumber={left} mode={mode} hasLogo={hasLogo} hasText={hasText} textLines={coverTextLines} fontSizePt={coverFontSizePt} ornamentWidthFrac={0.72} logoSrc={logoSrc} />
          <CoverBox cw={HW} ch={H} pageNumber={right} mode={mode} hasLogo={hasLogo} hasText={hasText} textLines={coverTextLines} fontSizePt={coverFontSizePt} ornamentWidthFrac={0.72} logoSrc={logoSrc} />
        </div>
      ))}
    </div>
  );
}
