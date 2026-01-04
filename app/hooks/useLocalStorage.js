'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook for managing localStorage with React state
 * @param {string} key - The localStorage key
 * @param {any} initialValue - The initial value if key doesn't exist
 * @returns {[any, Function]} - [storedValue, setValue] tuple
 */
export function useLocalStorage(key, initialValue) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

/**
 * Hook for managing selected songs in localStorage
 * @returns {[Array, Function, Function, Function]} - [selectedSongs, addSong, removeSong, clearSongs]
 */
export function useSelectedSongs() {
  const [selectedSongs, setSelectedSongs] = useLocalStorage('selectedSongs', []);

  const addSong = (song) => {
    setSelectedSongs(prev => {
      // Check if song already exists
      const exists = prev.some(s => s.title === song.title && s.artist === song.artist);
      if (exists) return prev;
      return [...prev, song];
    });
  };

  const removeSong = (songTitle) => {
    setSelectedSongs(prev => prev.filter(s => s.title !== songTitle));
  };

  const clearSongs = () => {
    setSelectedSongs([]);
  };

  return [selectedSongs, addSong, removeSong, clearSongs];
}

/**
 * Hook for managing smartboard mode preference
 * @returns {[boolean, Function]} - [isSmartboardMode, toggleSmartboardMode]
 */
export function useSmartboardMode() {
  const [isSmartboardMode, setIsSmartboardMode] = useLocalStorage('smartboardMode', false);

  const toggleSmartboardMode = () => {
    setIsSmartboardMode(prev => !prev);
  };

  return [isSmartboardMode, toggleSmartboardMode];
}
