'use client';

import { useEffect, useState } from 'react';
import {
  ANALYTICS_PREFERENCE_EVENT,
  type AnalyticsMode,
  getAnalyticsMode,
  setAnalyticsMode,
} from '@/lib/analytics';

export default function AnalyticsPreferences() {
  const [analyticsMode, setAnalyticsModeState] = useState<AnalyticsMode | null>(null);

  useEffect(() => {
    setAnalyticsModeState(getAnalyticsMode());

    const syncPreference = () => {
      setAnalyticsModeState(getAnalyticsMode());
    };

    window.addEventListener(ANALYTICS_PREFERENCE_EVENT, syncPreference as EventListener);
    return () => {
      window.removeEventListener(ANALYTICS_PREFERENCE_EVENT, syncPreference as EventListener);
    };
  }, []);

  if (analyticsMode === null) {
    return null;
  }

  const isCookieMode = analyticsMode === 'cookie';

  return (
    <div className="analytics-pref-widget" aria-label="Analytics preference controls">
      <div className="analytics-pref-copy">
        <span className={`analytics-pref-status ${isCookieMode ? 'enabled' : 'disabled'}`}>
          Analytics {isCookieMode ? 'Cookie-based' : 'Fallback'}
        </span>
        <a href="/tracking-disclosure.html" className="analytics-pref-link">
          Privacy
        </a>
      </div>
      <button
        type="button"
        className="analytics-pref-button"
        onClick={() => setAnalyticsMode(isCookieMode ? 'fallback' : 'cookie')}
      >
        {isCookieMode ? 'Use fallback' : 'Use cookies'}
      </button>
    </div>
  );
}