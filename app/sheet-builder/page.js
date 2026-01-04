'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

/**
 * Hybrid Sheet Builder Page Component
 * This component loads the existing sheet-builder.html JavaScript while providing a React wrapper
 * TODO: Incrementally convert functionality to React components
 * - Search functionality → Use SearchBox component
 * - Drag-and-drop → Create useDragDrop hook with Packery/Draggabilly
 * - LocalStorage management → Create useSheetStorage hook
 * - Print functionality → Create PrintSheet component
 * - Column controls → Create ColumnControls component
 */
export default function SheetBuilderPage() {
  const containerRef = useRef(null);
  const scriptsLoadedRef = useRef(false);

  useEffect(() => {
    if (scriptsLoadedRef.current) return;
    scriptsLoadedRef.current = true;

    // Load the HTML content from the static file
    fetch('/sheet-builder.html')
      .then(response => response.text())
      .then(html => {
        if (!containerRef.current) return;

        // Parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract the body content
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

        // Load external styles
        const styles = doc.querySelectorAll('style');
        styles.forEach(style => {
          const newStyle = document.createElement('style');
          newStyle.textContent = style.textContent;
          document.head.appendChild(newStyle);
        });
      })
      .catch(error => {
        console.error('Error loading sheet builder page:', error);
        if (containerRef.current) {
          containerRef.current.innerHTML = '<div style="color: white; padding: 2rem;">Error loading page. Please refresh.</div>';
        }
      });

    // Cleanup function
    return () => {
      // Clean up any Packery/Draggabilly instances if needed
    };
  }, []);

  return (
    <>
      {/* Load Packery for masonry layout */}
      <Script
        src="https://unpkg.com/packery@3/dist/packery.pkgd.min.js"
        strategy="beforeInteractive"
      />

      {/* Load Draggabilly for drag-and-drop */}
      <Script
        src="https://unpkg.com/draggabilly@3/dist/draggabilly.pkgd.min.js"
        strategy="beforeInteractive"
      />

      {/* Container for the hybrid content */}
      <div ref={containerRef} id="sheet-builder-container">
        {/* Loading state */}
        <div style={{ 
          color: 'white', 
          padding: '2rem', 
          textAlign: 'center',
          minHeight: '100vh',
          backgroundColor: '#1a1a1a'
        }}>
          Loading sheet builder...
        </div>
      </div>
    </>
  );
}
