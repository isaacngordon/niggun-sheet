'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import { BENCHER_MODE_CONFIGS } from './bencher-layout';
import './bencher.css';

const ROUTES = {
  '2-page': '/bencher/two-sided',
  '8-page': '/bencher/booklet',
} as const;

export default function BencherAppPicker() {
  return (
    <div className="bencher-app">
      <Header />
      <main className="bencher-mode-picker">
        <div className="bencher-mode-picker-inner">
          <h1 className="bencher-mode-picker-heading">Choose Your Bencher App</h1>
          <p className="bencher-mode-picker-sub">Each bencher has its own dedicated builder.</p>
          <div className="bencher-mode-picker-cards">
            {BENCHER_MODE_CONFIGS.map((config) => (
              <Link
                key={config.mode}
                href={ROUTES[config.mode]}
                className="bencher-mode-picker-card"
                aria-label={`Open the ${config.label} bencher app`}
              >
                <div className={`bencher-mode-picker-visual bencher-mode-picker-visual-${config.mode}`}>
                  {config.mode === '2-page' ? (
                    <div className="bencher-mode-visual-spread">
                      <div className="bencher-mode-visual-page bencher-mode-visual-left" />
                      <div className="bencher-mode-visual-page bencher-mode-visual-right" />
                    </div>
                  ) : (
                    <div className="bencher-mode-visual-booklet">
                      <div className="bencher-mode-visual-sheet" />
                      <div className="bencher-mode-visual-sheet" />
                      <div className="bencher-mode-visual-sheet" />
                      <div className="bencher-mode-visual-sheet" />
                    </div>
                  )}
                </div>
                <div className="bencher-mode-picker-card-label">{config.label}</div>
                <div className="bencher-mode-picker-card-desc">
                  {config.mode === '2-page'
                    ? 'One folded sheet with a dedicated song builder.'
                    : 'An eight-page booklet with a dedicated cover builder.'}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
