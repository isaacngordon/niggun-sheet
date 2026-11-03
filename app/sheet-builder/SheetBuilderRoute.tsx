'use client';

import dynamic from 'next/dynamic';
import AuthBoundary from '@/components/AuthBoundary';

const SheetBuilderApp = dynamic(() => import('../sheet-builder-v2/SheetBuilderApp'), {
  ssr: false,
  loading: () => <div className="sb2-root">Loading sheet builder...</div>,
});

export default function SheetBuilderRoute() {
  return (
    <AuthBoundary>
      <main id="main-content" tabIndex={-1}>
        <h1 className="sr-only">Sheet Builder</h1>
        <SheetBuilderApp />
      </main>
    </AuthBoundary>
  );
}