'use client';

import AnalyticsPreferences from '@/components/AnalyticsPreferences';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AnalyticsPreferences />
    </>
  );
}
