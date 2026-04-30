'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ANALYTICS_PREFERENCE_EVENT,
  ANALYTICS_MODE_KEY,
  ANALYTICS_PREF_VERSION_KEY,
  GA_MEASUREMENT_ID,
  type AnalyticsMode,
  applyAnalyticsPreference,
  getAnalyticsMode,
} from '@/lib/analytics';

export default function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AnalyticsMode>('cookie');
  const [trackingReady, setTrackingReady] = useState(false);
  const [gaConfigured, setGaConfigured] = useState(false);

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
    if (!trackingReady || !gaConfigured || typeof window.gtag !== 'function') {
      return;
    }

    window.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: pagePath,
      debug_mode: process.env.NODE_ENV !== 'production' || window.location.hostname === 'localhost',
    });
  }, [gaConfigured, mode, pagePath, trackingReady]);

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
        onReady={() => setGaConfigured(true)}
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;

            var mode = 'cookie';
            try {
              var prefVersion = window.localStorage.getItem('${ANALYTICS_PREF_VERSION_KEY}');
              if (prefVersion !== '2') {
                window.localStorage.setItem('${ANALYTICS_MODE_KEY}', 'cookie');
                window.localStorage.setItem('${ANALYTICS_PREF_VERSION_KEY}', '2');
              }
              var storedMode = window.localStorage.getItem('${ANALYTICS_MODE_KEY}');
              if (storedMode === 'cookie' || storedMode === 'fallback') {
                mode = storedMode;
              }
            } catch (err) {
              mode = 'cookie';
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
              anonymize_ip: true,
              debug_mode: ${process.env.NODE_ENV !== 'production' ? 'true' : 'window.location.hostname === "localhost"'}
            });
          `,
        }}
      />
    </>
  );
}