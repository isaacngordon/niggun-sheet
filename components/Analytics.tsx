'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ANALYTICS_PREFERENCE_EVENT,
  ANALYTICS_MODE_KEY,
  GA_MEASUREMENT_ID,
  type AnalyticsMode,
  applyAnalyticsPreference,
  getAnalyticsMode,
} from '@/lib/analytics';

export default function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AnalyticsMode>('fallback');
  const [trackingReady, setTrackingReady] = useState(false);

  const pagePath = useMemo(() => {
    const query = searchParams?.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    setMode(applyAnalyticsPreference());

    const handlePreferenceChange = () => {
      setMode(getAnalyticsMode());
    };

    window.addEventListener(ANALYTICS_PREFERENCE_EVENT, handlePreferenceChange as EventListener);
    return () => {
      window.removeEventListener(ANALYTICS_PREFERENCE_EVENT, handlePreferenceChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!trackingReady || typeof window.gtag !== 'function') {
      return;
    }

    window.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: pagePath,
    });
  }, [mode, pagePath, trackingReady]);

  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  return (
    <>
      <Script
        id="ga-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
        onReady={() => setTrackingReady(true)}
      />
      <Script
        id="ga-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;

            var mode = 'fallback';
            try {
              var storedMode = window.localStorage.getItem('${ANALYTICS_MODE_KEY}');
              if (storedMode === 'cookie' || storedMode === 'fallback') {
                mode = storedMode;
              }
            } catch (err) {
              mode = 'fallback';
            }

            gtag('consent', 'default', {
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              analytics_storage: mode === 'cookie' ? 'granted' : 'denied'
            });

            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              send_page_view: false,
              anonymize_ip: true
            });
          `,
        }}
      />
    </>
  );
}