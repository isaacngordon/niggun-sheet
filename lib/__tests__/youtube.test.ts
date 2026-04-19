/**
 * @jest-environment jsdom
 */
import {
  extractYouTubeId,
  extractAllYouTubeUrls,
  fmt,
  fmtPrecise,
  ensureYTApi,
  preloadYTApi,
  playbackBus,
  _resetForTesting,
} from '@/lib/youtube';

// ─── Reset module-level state between tests ────────────────────
beforeEach(() => {
  // Clear any injected script tags
  document.getElementById('yt-iframe-api')?.remove();
  // Clear YT global
  delete (window as any).YT;
  // Clear callback
  delete (window as any).onYouTubeIframeAPIReady;
  // Reset module-level promise/attempt state
  _resetForTesting();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════
//  extractYouTubeId
// ═══════════════════════════════════════════════════════════════

describe('extractYouTubeId', () => {
  it('extracts ID from standard watch URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from short URL', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from embed URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID with extra query params', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID without www prefix', () => {
    expect(extractYouTubeId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for empty string', () => {
    expect(extractYouTubeId('')).toBeNull();
  });

  it('returns null for non-youtube URL', () => {
    expect(extractYouTubeId('https://vimeo.com/123456')).toBeNull();
  });

  it('returns null for malformed youtube URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=short')).toBeNull();
  });

  it('returns null for URL with invalid ID length', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=abc')).toBeNull();
  });

  it('handles URL with hash fragment', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=30')).toBe('dQw4w9WgXcQ');
  });
});

// ═══════════════════════════════════════════════════════════════
//  extractAllYouTubeUrls
// ═══════════════════════════════════════════════════════════════

describe('extractAllYouTubeUrls', () => {
  it('extracts single URL from text', () => {
    const urls = extractAllYouTubeUrls('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(urls).toEqual(['https://www.youtube.com/watch?v=dQw4w9WgXcQ']);
  });

  it('extracts multiple URLs separated by spaces', () => {
    const text = 'https://youtu.be/dQw4w9WgXcQ https://www.youtube.com/watch?v=9bZkp7q19f0';
    const urls = extractAllYouTubeUrls(text);
    expect(urls).toHaveLength(2);
    expect(extractYouTubeId(urls[0])).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId(urls[1])).toBe('9bZkp7q19f0');
  });

  it('filters out non-youtube URLs mixed in', () => {
    const text = 'https://youtu.be/dQw4w9WgXcQ https://vimeo.com/123';
    const urls = extractAllYouTubeUrls(text);
    expect(urls).toHaveLength(1);
  });

  it('filters out youtube URLs with invalid IDs', () => {
    const text = 'https://www.youtube.com/watch?v=bad https://youtu.be/dQw4w9WgXcQ';
    const urls = extractAllYouTubeUrls(text);
    expect(urls).toHaveLength(1);
    expect(extractYouTubeId(urls[0])).toBe('dQw4w9WgXcQ');
  });

  it('returns empty array for empty string', () => {
    expect(extractAllYouTubeUrls('')).toEqual([]);
  });

  it('returns empty array for text with no URLs', () => {
    expect(extractAllYouTubeUrls('no urls here')).toEqual([]);
  });

  it('handles URLs with no space between them (concatenated)', () => {
    const text = 'https://youtu.be/dQw4w9WgXcQhttps://youtu.be/9bZkp7q19f0';
    const urls = extractAllYouTubeUrls(text);
    expect(urls).toHaveLength(2);
    expect(extractYouTubeId(urls[0])).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId(urls[1])).toBe('9bZkp7q19f0');
  });
});

// ═══════════════════════════════════════════════════════════════
//  fmt / fmtPrecise
// ═══════════════════════════════════════════════════════════════

describe('fmt', () => {
  it('formats 0 seconds', () => {
    expect(fmt(0)).toBe('0:00');
  });

  it('formats seconds only', () => {
    expect(fmt(5)).toBe('0:05');
  });

  it('formats minutes and seconds', () => {
    expect(fmt(65)).toBe('1:05');
  });

  it('formats large values', () => {
    expect(fmt(3661)).toBe('61:01');
  });

  it('truncates fractional seconds', () => {
    expect(fmt(5.9)).toBe('0:05');
  });
});

describe('fmtPrecise', () => {
  it('formats with decimal precision', () => {
    expect(fmtPrecise(5.5)).toBe('0:05.5');
  });

  it('formats 0', () => {
    expect(fmtPrecise(0)).toBe('0:00.0');
  });

  it('formats minutes and fractional seconds', () => {
    expect(fmtPrecise(65.7)).toBe('1:05.7');
  });
});

// ═══════════════════════════════════════════════════════════════
//  playbackBus
// ═══════════════════════════════════════════════════════════════

describe('playbackBus', () => {
  it('is an EventTarget in browser environment', () => {
    expect(playbackBus).toBeInstanceOf(EventTarget);
  });

  it('dispatches and receives custom events', () => {
    const handler = jest.fn();
    playbackBus!.addEventListener('play', handler);
    playbackBus!.dispatchEvent(new CustomEvent('play', { detail: 'player-1' }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toBe('player-1');
    playbackBus!.removeEventListener('play', handler);
  });
});

// ═══════════════════════════════════════════════════════════════
//  ensureYTApi — API loading with retry & timeout
// ═══════════════════════════════════════════════════════════════

describe('ensureYTApi', () => {
  it('resolves immediately if YT.Player already exists', async () => {
    (window as any).YT = { Player: jest.fn() };
    await expect(ensureYTApi()).resolves.toBeUndefined();
  });

  it('injects script tag and resolves when onYouTubeIframeAPIReady fires', async () => {
    const promise = ensureYTApi();

    // Script should now be in DOM
    const script = document.getElementById('yt-iframe-api') as HTMLScriptElement;
    expect(script).not.toBeNull();
    expect(script.src).toContain('youtube.com/iframe_api');

    // Simulate API ready
    (window as any).YT = { Player: jest.fn() };
    (window as any).onYouTubeIframeAPIReady();

    await expect(promise).resolves.toBeUndefined();
  });

  it('polls when script tag exists but API not ready yet', async () => {
    // Pre-inject script tag (simulates preload scenario)
    const tag = document.createElement('script');
    tag.id = 'yt-iframe-api';
    document.head.appendChild(tag);

    const promise = ensureYTApi();

    // Simulate API becoming ready after a delay
    setTimeout(() => {
      (window as any).YT = { Player: jest.fn() };
    }, 100);

    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects on script onerror and retries', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const promise = ensureYTApi();

    // Wait a tick for the script to be injected
    await new Promise((r) => setTimeout(r, 0));

    // Trigger onerror on first attempt
    const script1 = document.getElementById('yt-iframe-api') as HTMLScriptElement;
    expect(script1).not.toBeNull();
    script1.onerror?.(new Event('error'));

    // Wait for backoff (500ms) + a tick for retry script injection
    await new Promise((r) => setTimeout(r, 700));

    // Second attempt — simulate success
    const script2 = document.getElementById('yt-iframe-api') as HTMLScriptElement;
    if (script2) {
      (window as any).YT = { Player: jest.fn() };
      (window as any).onYouTubeIframeAPIReady?.();
    }

    await expect(promise).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[YouTube] API load attempt 1 failed:'),
      expect.any(String)
    );
    warnSpy.mockRestore();
  });

  it('gives up after MAX_RETRIES and throws', async () => {
    jest.spyOn(console, 'warn').mockImplementation();

    const promise = ensureYTApi();

    // Fail all 3 attempts (initial + 2 retries)
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, i === 0 ? 10 : 600 * i));
      const script = document.getElementById('yt-iframe-api') as HTMLScriptElement;
      if (script) {
        script.onerror?.(new Event('error'));
      }
    }

    await expect(promise).rejects.toThrow('YouTube API script failed to load');
    jest.restoreAllMocks();
  });

  it('deduplicates concurrent calls', async () => {
    const p1 = ensureYTApi();
    const p2 = ensureYTApi();

    // Wait a tick for script injection
    await new Promise((r) => setTimeout(r, 0));

    // Only one script tag should be injected
    const scripts = document.querySelectorAll('#yt-iframe-api');
    expect(scripts.length).toBe(1);

    // Resolve
    (window as any).YT = { Player: jest.fn() };
    (window as any).onYouTubeIframeAPIReady();

    await Promise.all([p1, p2]);
  });
});

// ═══════════════════════════════════════════════════════════════
//  preloadYTApi
// ═══════════════════════════════════════════════════════════════

describe('preloadYTApi', () => {
  it('injects script tag when called', async () => {
    preloadYTApi();
    // Wait a tick for async script injection
    await new Promise((r) => setTimeout(r, 0));
    const script = document.getElementById('yt-iframe-api');
    expect(script).not.toBeNull();
  });

  it('does not throw on failure (fire-and-forget)', () => {
    expect(() => preloadYTApi()).not.toThrow();
    // Trigger error — should not propagate
    const script = document.getElementById('yt-iframe-api') as HTMLScriptElement;
    script?.onerror?.(new Event('error'));
  });

  it('is idempotent — does not inject multiple scripts', () => {
    (window as any).YT = { Player: jest.fn() };
    preloadYTApi();
    preloadYTApi();
    const scripts = document.querySelectorAll('#yt-iframe-api');
    expect(scripts.length).toBe(0); // Already loaded, no script needed
  });
});
