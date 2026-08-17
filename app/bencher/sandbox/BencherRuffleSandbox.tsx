'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import './bencher-sandbox.css';

type RuffleDirection = 'forward' | 'backward';

const STEP_MS = 140;
const SETTLE_MS = 420;

export default function BencherRuffleSandbox() {
  const [activePage, setActivePage] = useState(1);
  const [ruffleDirection, setRuffleDirection] = useState<RuffleDirection>('forward');
  const [isRuffling, setIsRuffling] = useState(false);
  const [intensity, setIntensity] = useState(1);

  const timeoutRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const triggerRuffle = useCallback((direction: RuffleDirection) => {
    clearTimer();
    setRuffleDirection(direction);
    setIsRuffling(false);

    requestAnimationFrame(() => {
      setIsRuffling(true);
    });

    timeoutRef.current = window.setTimeout(() => {
      setIsRuffling(false);
      timeoutRef.current = null;
    }, STEP_MS * 3 + SETTLE_MS);
  }, [clearTimer]);

  const runSkipDemo = useCallback((targetPage: number) => {
    if (targetPage === activePage) {
      return;
    }

    const direction: RuffleDirection = targetPage > activePage ? 'forward' : 'backward';
    const step = direction === 'forward' ? 1 : -1;
    const steps = Math.abs(targetPage - activePage);

    triggerRuffle(direction);

    for (let index = 0; index < steps; index += 1) {
      const timeoutId = window.setTimeout(() => {
        setActivePage(activePage + step * (index + 1));
      }, index * STEP_MS);

      if (index === steps - 1) {
        timeoutRef.current = timeoutId;
      }
    }
  }, [activePage, triggerRuffle]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return (
    <main className="bencher-ruffle-sandbox">
      <section className="sandbox-controls">
        <h1>Bencher Ruffle Sandbox</h1>
        <p>Use this page to tune skip-turn ruffle feel before moving styles into the live route.</p>

        <div className="sandbox-buttons">
          <button type="button" onClick={() => triggerRuffle('forward')}>Ruffle Forward</button>
          <button type="button" onClick={() => triggerRuffle('backward')}>Ruffle Backward</button>
          <button type="button" onClick={() => runSkipDemo(4)}>Demo Skip 1 to 4</button>
          <button type="button" onClick={() => runSkipDemo(1)}>Demo Skip 4 to 1</button>
        </div>

        <label htmlFor="ruffle-intensity" className="sandbox-range-label">
          Intensity {intensity.toFixed(2)}x
        </label>
        <input
          id="ruffle-intensity"
          type="range"
          min="0.6"
          max="1.8"
          step="0.05"
          value={intensity}
          onChange={(event) => setIntensity(Number(event.target.value))}
        />
      </section>

      <section
        className={`sandbox-preview ${isRuffling ? `is-ruffling is-ruffling-${ruffleDirection}` : ''}`}
        style={{ '--ruffle-intensity': intensity } as React.CSSProperties}
      >
        <div className="sandbox-flutter-overlay" aria-hidden>
          <span className="sandbox-flutter-sheet sandbox-flutter-sheet-1" />
          <span className="sandbox-flutter-sheet sandbox-flutter-sheet-2" />
          <span className="sandbox-flutter-sheet sandbox-flutter-sheet-3" />
          <span className="sandbox-flutter-sheet sandbox-flutter-sheet-4" />
          <span className="sandbox-flutter-sheet sandbox-flutter-sheet-5" />
        </div>

        <div className="sandbox-page" data-testid="bencher-sandbox-page">
          <img src="/assets/bencher/Bencher-4pg-p1.svg" alt="" aria-hidden="true" />
        </div>

        <div className="sandbox-page-indicator">Page {activePage}</div>
      </section>
    </main>
  );
}
