'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

/**
 * Hybrid Songs Page Component
 * This component loads the existing songs.html JavaScript while providing a React wrapper
 * TODO: Incrementally convert functionality to React components
 * - Search functionality → Use SearchBox component
 * - YouTube player → Create useYouTubePlayer hook
 * - LocalStorage management → Create useLocalStorage hook
 * - Song list rendering → Create SongList component
 */
export default function SongsPage() {
  const containerRef = useRef(null);
  const scriptsLoadedRef = useRef(false);

  useEffect(() => {
    if (scriptsLoadedRef.current) return;
    scriptsLoadedRef.current = true;

    // Load the HTML content from the static file
    fetch('/songs.html')
      .then(response => response.text())
      .then(html => {
        if (!containerRef.current) return;

        // Parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract the body content (excluding header/footer which we handle separately)
        const bodyContent = doc.body.innerHTML;
        
        // Inject into container
        containerRef.current.innerHTML = bodyContent;

        // Execute any inline scripts
        const scripts = containerRef.current.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
          });
          newScript.textContent = oldScript.textContent;
          oldScript.parentNode.replaceChild(newScript, oldScript);
        });

        // Load external styles if needed
        const styles = doc.querySelectorAll('style');
        styles.forEach(style => {
          const newStyle = document.createElement('style');
          newStyle.textContent = style.textContent;
          document.head.appendChild(newStyle);
        });
      })
      .catch(error => {
        console.error('Error loading songs page:', error);
        if (containerRef.current) {
          containerRef.current.innerHTML = '<div style="color: white; padding: 2rem;">Error loading page. Please refresh.</div>';
        }
      });

    // Cleanup function
    return () => {
      // Clean up any event listeners or timers if needed
    };
  }, []);

  return (
    <>
      {/* Load YouTube IFrame API */}
      <Script
        src="https://www.youtube.com/iframe_api"
        strategy="afterInteractive"
      />

      {/* Container for the hybrid content */}
      <div ref={containerRef} id="songs-container">
        {/* Loading state */}
        <div style={{ 
          color: 'white', 
          padding: '2rem', 
          textAlign: 'center',
          minHeight: '100vh',
          backgroundColor: '#1a1a1a'
        }}>
          Loading songs...
        </div>
      </div>
    </>
  );
}
