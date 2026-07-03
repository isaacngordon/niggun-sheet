'use client';

import dynamic from 'next/dynamic';
import AuthBoundary from '@/components/AuthBoundary';
import '../sheet-builder-v2/sheet-builder.css';
import './bencher.css';

const BencherApp = dynamic(() => import('./BencherApp'), {
  ssr: false,
  loading: () => <div>Loading bencher builder...</div>,
});

export default function BencherRoute() {
  return (
    <AuthBoundary>
      <BencherApp />
    </AuthBoundary>
  );
}
