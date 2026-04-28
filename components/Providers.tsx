'use client';

import AnalyticsPreferences from '@/components/AnalyticsPreferences';
import { NiggunSheetDownloadProvider } from '@/components/NiggunSheetDownload';
import { GoogleAuthProvider } from '@/components/GoogleAuthProvider';
import { preloadYTApi } from '@/lib/youtube';

// Start loading YouTube IFrame API immediately so it's ready when user clicks play
if (typeof window !== 'undefined') {
  preloadYTApi();
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NiggunSheetDownloadProvider>
      <GoogleAuthProvider>
        {children}
        <AnalyticsPreferences />
      </GoogleAuthProvider>
    </NiggunSheetDownloadProvider>
  );
}
