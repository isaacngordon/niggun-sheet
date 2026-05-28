'use client';

// Dev-only tool: draw a rect on screen, get % coords relative to the nearest
// [data-measure-root] element (or viewport if none found).
// Toggle with the [dbg] button in the site header.
// Hidden in production via NODE_ENV check.

import { useCallback, useEffect, useRef, useState } from 'react';

interface DrawState {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  rootRect: DOMRect | null;
  rootLabel: string;
}

interface Result {
  top: number;
  left: number;
  width: number;
  height: number;
  label: string;
}

function findMeasureRoot(x: number, y: number): { rect: DOMRect; label: string } | null {
  const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-measure-root]'));
  let bestRect: DOMRect | null = null;
  let bestLabel = '';
  let bestArea = Infinity;
  for (const el of elements) {
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      const area = r.width * r.height;
      if (area < bestArea) {
        bestRect = r;
        bestLabel = el.dataset.measureRoot || el.tagName;
        bestArea = area;
      }
    }
  }
  return bestRect ? { rect: bestRect, label: bestLabel } : null;
}

export default function DebugRectTool() {
  const [active, setActive] = useState(false);
  const [draw, setDraw] = useState<DrawState | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const handler = () => setActive((v) => !v);
    window.addEventListener('debug-rect:toggle', handler);
    return () => window.removeEventListener('debug-rect:toggle', handler);
  }, []);

  useEffect(() => {
    if (!active) {
      setDraw(null);
      setResult(null);
    }
  }, [active]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const root = findMeasureRoot(e.clientX, e.clientY);
    drawing.current = true;
    setResult(null);
    setDraw({
      startX: e.clientX,
      startY: e.clientY,
      endX: e.clientX,
      endY: e.clientY,
      rootRect: root?.rect ?? null,
      rootLabel: root?.label ?? 'viewport',
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing.current) return;
    setDraw((d) => (d ? { ...d, endX: e.clientX, endY: e.clientY } : d));
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!drawing.current || !draw) return;
    drawing.current = false;
    const base = draw.rootRect ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    const r = (n: number) => Math.round(n * 10) / 10;
    setResult({
      top: r(((Math.min(draw.startY, draw.endY) - base.top) / base.height) * 100),
      left: r(((Math.min(draw.startX, draw.endX) - base.left) / base.width) * 100),
      width: r((Math.abs(draw.endX - draw.startX) / base.width) * 100),
      height: r((Math.abs(draw.endY - draw.startY) / base.height) * 100),
      label: draw.rootLabel,
    });
  }, [draw]);

  if (!active) return null;

  const boxLeft = draw ? Math.min(draw.startX, draw.endX) : 0;
  const boxTop = draw ? Math.min(draw.startY, draw.endY) : 0;
  const boxWidth = draw ? Math.abs(draw.endX - draw.startX) : 0;
  const boxHeight = draw ? Math.abs(draw.endY - draw.startY) : 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        cursor: 'crosshair',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {draw && (
        <div
          style={{
            position: 'fixed',
            left: boxLeft,
            top: boxTop,
            width: boxWidth,
            height: boxHeight,
            border: '2px solid red',
            background: 'rgba(255,0,0,0.12)',
            pointerEvents: 'none',
          }}
        />
      )}
      {result && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.9)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: 7,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 11,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            pointerEvents: 'all',
          }}
        >
          <span style={{ color: '#88aaff', fontSize: 10 }}>{result.label}</span>
          <code style={{ color: '#ffee88' }}>
            {`top:${result.top} left:${result.left} w:${result.width} h:${result.height}`}
          </code>
          <button
            style={{ padding: '2px 8px', fontSize: 10, borderRadius: 4, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() =>
              navigator.clipboard.writeText(
                `top: ${result.top},\n  left: ${result.left},\n  width: ${result.width},\n  height: ${result.height},`,
              )
            }
          >
            Copy
          </button>
          <button
            style={{ padding: '2px 6px', fontSize: 12, borderRadius: 4, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', lineHeight: 1 }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setResult(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
