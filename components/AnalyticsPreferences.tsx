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
  const [isOpen, setIsOpen] = useState(false);

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
  const chooseMode = (mode: AnalyticsMode) => {
    setAnalyticsMode(mode);
  };

  return (
    <div className="analytics-pref-shell" aria-label="Privacy settings">
      {!isOpen ? (
        <button
          type="button"
          className="analytics-pref-trigger"
          onClick={() => setIsOpen(true)}
          aria-expanded="false"
          aria-controls="analytics-pref-panel"
        >
          Cookies
        </button>
      ) : (
        <div id="analytics-pref-panel" className="analytics-pref-widget">
          <div className="analytics-pref-copy">
            <div className="analytics-pref-topline">
              <span className="analytics-pref-label">Cookie settings</span>
              <button
                type="button"
                className="analytics-pref-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close privacy settings"
              >
                ×
              </button>
            </div>
            <span className={`analytics-pref-status ${isCookieMode ? 'enabled' : 'disabled'}`}>
              {isCookieMode ? 'Cookies are on' : 'Cookies are off'}
            </span>
            <span className="analytics-pref-caption">
              {isCookieMode ? 'We only use them to count visits. We do not collect or share personal info.' : 'Visit-count cookies are off.'}
            </span>
            <a href="/tracking-disclosure" className="analytics-pref-link">
              Read more
            </a>
          </div>
          <button
            type="button"
            className="analytics-pref-button"
            onClick={() => chooseMode(isCookieMode ? 'fallback' : 'cookie')}
          >
            {isCookieMode ? 'Turn cookies off' : 'Turn cookies on'}
          </button>
        </div>
      )}
    </div>
  );
}