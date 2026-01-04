'use client';

import { useState } from 'react';

/**
 * Reusable SearchBox component for filtering songs
 * @param {Function} onSearch - Callback function when search is performed
 * @param {Function} onClear - Optional callback function when search is cleared
 * @param {string} placeholder - Placeholder text for the search input
 * @param {boolean} showClearButton - Whether to show a clear button
 */
export default function SearchBox({ 
  onSearch, 
  onClear, 
  placeholder = "Search...", 
  showClearButton = true 
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    if (onClear) {
      onClear();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    // For real-time search, call onSearch immediately
    if (onSearch) {
      onSearch(value);
    }
  };

  return (
    <div className="search-box-container">
      <style jsx>{`
        .search-box-container {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .search-input {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          background-color: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 1rem;
          outline: none;
          transition: all 0.3s ease;
        }

        .search-input:focus {
          border-color: #FFD700;
          background-color: rgba(255, 255, 255, 0.1);
        }

        .search-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .search-button, .clear-button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .search-button {
          background-color: #FFD700;
          color: #000;
        }

        .search-button:hover {
          background-color: #e6c200;
        }

        .clear-button {
          background-color: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .clear-button:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }

        @media (max-width: 768px) {
          .search-box-container {
            flex-direction: column;
            width: 100%;
          }

          .search-input, .search-button, .clear-button {
            width: 100%;
          }
        }
      `}</style>

      <input
        type="search"
        className="search-input"
        placeholder={placeholder}
        value={searchQuery}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      
      {showClearButton && (
        <button className="clear-button" onClick={handleClear}>
          Clear
        </button>
      )}
    </div>
  );
}
