'use client';

import { useEffect } from 'react';

export default function CornerBanner() {
  useEffect(() => {
    const banner = document.querySelector('.corner-banner');
    if (banner) {
      banner.addEventListener('click', function() {
        window.location.href = '/project-growth-page';
      });
      
      // Add link semantics for accessibility
      banner.setAttribute('role', 'link');
      banner.setAttribute('aria-label', 'Visit project growth page');
    }
  }, []);

  return (
    <>
      <div className="corner-banner">
        <span>Find out how you can help</span>
      </div>
      <style jsx>{`
        .corner-banner {
          position: fixed;
          top: 65.2px;
          right: -67.6px;
          width: 311.8px;
          transform: rotate(45deg);
          background-color: rgb(255, 218, 42);
          color: #0d0d0d;
          text-align: center;
          padding: 11px 0;
          font-size: 15.0px;
          font-weight: bold;
          z-index: 1000;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(0, 0, 0, 0.1);
        }
        
        .corner-banner span {
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .corner-banner:hover {
          background-color: rgb(255, 228, 92);
          cursor: pointer;
        }
        
        @media (max-width: 768px) {
          .corner-banner {
            width: 200px;
            right: -50px;
            font-size: 12px;
          }
        }
      `}</style>
    </>
  );
}
