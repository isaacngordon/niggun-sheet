'use client';

import { useEffect, useRef, useState } from 'react';
import { SHEET_GEOMETRY, type SheetLayout } from '@/lib/sheetLayout';

interface SheetPagesPreviewProps {
  layout: SheetLayout;
}

/**
 * Stylised preview of the generated sheet, built from DOM instead of the PDF.
 *
 * Mobile browsers cannot display a PDF inside an <iframe> (iOS Safari renders a blank
 * first page, Android Chrome often renders nothing), so phones get this instead.
 *
 * Pagination comes from the same layout engine the PDF writer uses (which songs land in
 * which column of which page), but each column is laid out as real DOM text so the
 * browser wraps the lyrics itself. Re-using jsPDF's pre-wrapped lines here would spill
 * text across columns, because browser glyph advances differ from jsPDF's measurements.
 */
export default function SheetPagesPreview({ layout }: SheetPagesPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; scrollLeft: number; scrollTop: number; moved: boolean; canPan: boolean } | null>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    const measure = () => setPageWidth(node.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // While zoomed the page is larger than the viewport, so dragging pans it. Touch drags
  // are left to the browser's native scrolling (smoother and momentum-scrolling);
  // mouse/pen drags would otherwise just start a text selection.
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: panel.scrollLeft,
      scrollTop: panel.scrollTop,
      moved: false,
      canPan: zoomed && event.pointerType !== 'touch',
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const panel = panelRef.current;
    if (!drag || !panel || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      drag.moved = true;
      if (!drag.canPan) return;
      setDragging(true);
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* ignore */ }
    }

    if (!drag.canPan) return;
    event.preventDefault();
    panel.scrollLeft = drag.scrollLeft - dx;
    panel.scrollTop = drag.scrollTop - dy;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch { /* ignore */ }
    if (!drag.moved) setZoomed((value) => !value);
  };

  const {
    pageW,
    pageH,
    padTop,
    padSide,
    padBottom,
    colW,
    colGap,
    numCols,
    songMargin,
    titleScale,
    artistScale,
    titleColor,
    artistColor,
    lyricColor,
  } = SHEET_GEOMETRY;

  const { fontSize, measured, pages, setList } = layout;
  const scale = pageWidth > 0 ? pageWidth / pageW : 0;
  const contentH = pageH - padTop - padBottom;

  return (
    <div
      ref={panelRef}
      className={[
        'ns-sheet-preview',
        zoomed ? 'ns-sheet-preview-zoomed' : '',
        dragging ? 'ns-sheet-preview-dragging' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="ns-sheet-preview-pages">
        {pages.map((pageCols, pageIndex) => (
          <figure className="ns-sheet-page" key={pageIndex}>
            <div
              ref={pageIndex === 0 ? hostRef : undefined}
              className="ns-sheet-page-inner"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{ aspectRatio: `${pageW} / ${pageH}`, backgroundImage: 'url(/assets/sheetskin.png)' }}
            >
              {scale > 0
                ? pageCols.map((colEntries, colIndex) => {
                  const colRight = padSide + colIndex * (colW + colGap);
                  return (
                    <div
                      key={`col-${colIndex}`}
                      className="ns-sheet-col"
                      style={{
                        top: padTop * scale,
                        height: contentH * scale,
                        right: colRight * scale,
                        width: colW * scale,
                        paddingRight: setList ? 0 : 3 * scale,
                        fontSize: fontSize * scale,
                        lineHeight: 1.25,
                      }}
                    >
                      {colEntries.map((entry, entryIndex) => {
                        const song = measured[entry.songIdx];
                        return (
                          <div
                            key={`song-${entryIndex}`}
                            style={{ marginBottom: (setList ? songMargin * 0.6 : songMargin) * scale }}
                          >
                            {song.titleLines.length > 0 ? (
                              <div
                                className="ns-sheet-title"
                                style={{
                                  fontSize: fontSize * titleScale * scale,
                                  fontWeight: setList ? 400 : 700,
                                  color: `rgb(${titleColor.join(',')})`,
                                }}
                              >
                                {song.titleLines.join(' ')}
                              </div>
                            ) : null}
                            {song.artistLines.length > 0 ? (
                              <div
                                className="ns-sheet-artist"
                                style={{
                                  fontSize: fontSize * artistScale * scale,
                                  color: `rgb(${artistColor.join(',')})`,
                                }}
                              >
                                {song.artistLines.join(' ')}
                              </div>
                            ) : null}
                            {song.lyricLines.length > 0 ? (
                              <div
                                dir="rtl"
                                style={{ color: `rgb(${lyricColor.join(',')})`, whiteSpace: 'pre-wrap' }}
                              >
                                {song.lyricLines.join('\n')}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
                : null}

              {setList
                ? Array.from({ length: numCols - 1 }, (_, index) => {
                  const column = index + 1;
                  const lineX = pageW - padSide - column * colW - (column - 0.5) * colGap;
                  return (
                    <span
                      key={`rule-${column}`}
                      className="ns-sheet-rule"
                      style={{
                        top: padTop * scale,
                        height: contentH * scale,
                        right: lineX * scale,
                      }}
                    />
                  );
                })
                : null}
            </div>
            <figcaption className="ns-sheet-page-number">
              Page {pageIndex + 1} of {pages.length}
            </figcaption>
          </figure>
        ))}
        <p className="ns-sheet-hint">
          {zoomed ? 'Drag to pan · tap a page to fit it to the screen' : 'Tap a page to zoom in'}
        </p>
      </div>
    </div>
  );
}
