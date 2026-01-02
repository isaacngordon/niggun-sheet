'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookiePage() {
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    // Check if cookie consent was already given
    const cookiesAccepted = getCookie('cookies_accepted');
    if (cookiesAccepted) {
      setShowBanner(false);
    }
  }, []);

  const setCookie = (name, value, days) => {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
  };

  const getCookie = (name) => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  const handleAccept = () => {
    setCookie('cookies_accepted', 'true', 365);
    setShowBanner(false);
  };

  return (
    <>
      <style jsx>{`
        #cookie-banner {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          background-color: #333;
          color: white;
          padding: 10px;
          text-align: center;
        }
        
        #cookie-banner p {
          margin: 0;
        }
        
        #cookie-banner button {
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 10px 20px;
          text-align: center;
          text-decoration: none;
          display: inline-block;
          font-size: 16px;
          margin: 4px 2px;
          cursor: pointer;
        }

        #cookie-banner a {
          color: #4CAF50;
          text-decoration: underline;
        }
      `}</style>

      {showBanner && (
        <div id="cookie-banner">
          <p>
            This website uses cookies to ensure you get the best experience on our website.{' '}
            <Link href="/privacy-policy" target="_blank">Learn more</Link>
          </p>
          <button id="accept-cookies" onClick={handleAccept}>Accept</button>
        </div>
      )}
    </>
  );
}
