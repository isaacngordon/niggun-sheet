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
          Privacy
        </button>
      ) : (
        <div id="analytics-pref-panel" className="analytics-pref-widget">
          <div className="analytics-pref-copy">
            <div className="analytics-pref-topline">
              <span className="analytics-pref-label">Privacy settings</span>
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
              {isCookieMode ? 'Cookies enabled' : 'Cookie opt-out active'}
            </span>
            <span className="analytics-pref-caption">
              {isCookieMode ? 'Used only to count visits — no personal data is collected or shared.' : 'Analytics cookies are turned off.'}
            </span>
            <a href="/tracking-disclosure.html" className="analytics-pref-link">
              Cookie policy
            </a>
          </div>
          <button
            type="button"
            className="analytics-pref-button"
            onClick={() => chooseMode(isCookieMode ? 'fallback' : 'cookie')}
          >
            {isCookieMode ? 'Turn off cookies' : 'Enable cookies'}
          </button>
        </div>
      )}
    </div>
  );
}