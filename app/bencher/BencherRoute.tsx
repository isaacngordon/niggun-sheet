'use client';

import dynamic from 'next/dynamic';
import AuthBoundary from '@/components/AuthBoundary';

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
