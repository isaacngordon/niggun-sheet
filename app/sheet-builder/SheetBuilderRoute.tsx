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
      <SheetBuilderApp />
    </AuthBoundary>
  );
}