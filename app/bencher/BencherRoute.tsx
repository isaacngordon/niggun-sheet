'use client';

import dynamic from 'next/dynamic';
import AuthBoundary from '@/components/AuthBoundary';
import type { BencherMode } from './bencher-layout';
import '../sheet-builder-v2/sheet-builder.css';
import './bencher.css';

const BencherApp = dynamic(() => import('./BencherApp'), {
  ssr: false,
  loading: () => <div>Loading bencher builder...</div>,
});

export default function BencherRoute({ mode }: { mode: BencherMode }) {
  return (
    <AuthBoundary>
      <BencherApp mode={mode} />
    </AuthBoundary>
  );
}
