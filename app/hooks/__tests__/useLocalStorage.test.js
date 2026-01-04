import { renderHook, act } from '@testing-library/react';
import { useLocalStorage, useSelectedSongs, useSmartboardMode } from '../useLocalStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key) => {
      delete store[key];
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useLocalStorage Hook', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));
    expect(result.current[0]).toBe('initialValue');
  });

  it('returns stored value from localStorage', () => {
    window.localStorage.setItem('testKey', JSON.stringify('storedValue'));
    const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));
    expect(result.current[0]).toBe('storedValue');
  });

  it('updates localStorage when value is set', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'initial'));

    act(() => {
      result.current[1]('newValue');
    });

    expect(result.current[0]).toBe('newValue');
    expect(JSON.parse(window.localStorage.getItem('testKey'))).toBe('newValue');
  });

  it('handles complex objects', () => {
    const initialObj = { name: 'test', count: 0 };
    const { result } = renderHook(() => useLocalStorage('testKey', initialObj));

    const newObj = { name: 'updated', count: 5 };
    act(() => {
      result.current[1](newObj);
    });

    expect(result.current[0]).toEqual(newObj);
    expect(JSON.parse(window.localStorage.getItem('testKey'))).toEqual(newObj);
  });

  it('handles functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 0));

    act(() => {
      result.current[1](prev => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });
});

describe('useSelectedSongs Hook', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('initializes with empty array', () => {
    const { result } = renderHook(() => useSelectedSongs());
    expect(result.current[0]).toEqual([]);
  });

  it('adds a song', () => {
    const { result } = renderHook(() => useSelectedSongs());
    const song = { title: 'Test Song', artist: 'Test Artist' };

    act(() => {
      result.current[1](song); // addSong
    });

    expect(result.current[0]).toHaveLength(1);
    expect(result.current[0][0]).toEqual(song);
  });

  it('does not add duplicate songs', () => {
    const { result } = renderHook(() => useSelectedSongs());
    const song = { title: 'Test Song', artist: 'Test Artist' };

    act(() => {
      result.current[1](song); // addSong
      result.current[1](song); // addSong again
    });

    expect(result.current[0]).toHaveLength(1);
  });

  it('removes a song by title', () => {
    const { result } = renderHook(() => useSelectedSongs());
    const song1 = { title: 'Song 1', artist: 'Artist 1' };
    const song2 = { title: 'Song 2', artist: 'Artist 2' };

    act(() => {
      result.current[1](song1); // addSong
    });

    act(() => {
      result.current[1](song2); // addSong
    });

    expect(result.current[0]).toHaveLength(2);

    act(() => {
      result.current[2]('Song 1'); // removeSong
    });

    expect(result.current[0]).toHaveLength(1);
    expect(result.current[0][0].title).toBe('Song 2');
  });

  it('clears all songs', () => {
    const { result } = renderHook(() => useSelectedSongs());
    const song1 = { title: 'Song 1', artist: 'Artist 1' };
    const song2 = { title: 'Song 2', artist: 'Artist 2' };

    act(() => {
      result.current[1](song1); // addSong
    });

    act(() => {
      result.current[1](song2); // addSong
    });

    expect(result.current[0]).toHaveLength(2);

    act(() => {
      result.current[3](); // clearSongs
    });

    expect(result.current[0]).toEqual([]);
  });

  it('persists songs to localStorage', () => {
    const { result } = renderHook(() => useSelectedSongs());
    const song = { title: 'Test Song', artist: 'Test Artist' };

    act(() => {
      result.current[1](song); // addSong
    });

    const stored = JSON.parse(window.localStorage.getItem('selectedSongs'));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toEqual(song);
  });
});

describe('useSmartboardMode Hook', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('initializes with false', () => {
    const { result } = renderHook(() => useSmartboardMode());
    expect(result.current[0]).toBe(false);
  });

  it('toggles smartboard mode', () => {
    const { result } = renderHook(() => useSmartboardMode());

    act(() => {
      result.current[1](); // toggleSmartboardMode
    });

    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[1](); // toggleSmartboardMode
    });

    expect(result.current[0]).toBe(false);
  });

  it('persists state to localStorage', () => {
    const { result } = renderHook(() => useSmartboardMode());

    act(() => {
      result.current[1](); // toggleSmartboardMode
    });

    const stored = JSON.parse(window.localStorage.getItem('smartboardMode'));
    expect(stored).toBe(true);
  });
});
