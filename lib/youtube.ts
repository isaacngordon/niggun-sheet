/**
 * Shared YouTube IFrame API utilities.
 * Single source of truth for API loading, URL parsing, playback coordination.
 */

/* ── URL helpers ── */

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([^&?#\s]+)/);
  return match?.[1] && match[1].length === 11 ? match[1] : null;
}

export function extractAllYouTubeUrls(field: string): string[] {
  if (!field) return [];
  // Split concatenated URLs (no space between them) by inserting a space before http
  const normalized = field.replace(/(?<=\S)(https?:\/\/)/g, ' $1');
  const urls = normalized.match(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s]*/g);
  if (!urls) return [];
  return urls.filter((u) => extractYouTubeId(u) !== null);
}

/* ── Time formatting ── */

export function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function fmtPrecise(s: number): string {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1);
  return `${m}:${sec.padStart(4, '0')}`;
}

/* ── Playback bus — enforces one player at a time ── */

export const playbackBus = typeof window !== 'undefined' ? new EventTarget() : null;

/* ── YouTube IFrame API loader with preload, timeout & retry ── */

const LOAD_TIMEOUT = 10_000; // 10s
const MAX_RETRIES = 2;

let ytApiPromise: Promise<void> | null = null;
let loadAttempt = 0;

function loadApi(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Already available (e.g. after hot reload)
    if ((window as any).YT?.Player) { resolve(); return; }

    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (poll) clearInterval(poll);
      fn();
    };

    const timer = setTimeout(() => {
      settle(() => reject(new Error('YouTube API load timeout')));
    }, LOAD_TIMEOUT);

    // Poll for YT.Player — covers both "script already in DOM" and
    // "callback fires but YT.Player isn't ready yet" edge cases
    const poll = setInterval(() => {
      if ((window as any).YT?.Player) {
        settle(() => resolve());
      }
    }, 100);

    // If script tag isn't in the DOM yet, inject it
    if (!document.getElementById('yt-iframe-api')) {
      const prev = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        prev?.();
        // The callback fires when YT is defined, but YT.Player may
        // take another tick — the poll above will catch it
      };
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = () => {
        settle(() => reject(new Error('YouTube API script failed to load')));
      };
      document.head.appendChild(tag);
    }
  });
}

/**
 * Ensures the YouTube IFrame API is loaded and ready.
 * Retries up to MAX_RETRIES times on failure.
 * Safe to call from multiple components — deduplicates via shared promise.
 */
export function ensureYTApi(): Promise<void> {
  if ((window as any).YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = (async () => {
    let lastErr: Error | undefined;
    for (let i = 0; i <= MAX_RETRIES; i++) {
      try {
        loadAttempt = i;
        await loadApi();
        return; // success
      } catch (err) {
        lastErr = err as Error;
        console.warn(`[YouTube] API load attempt ${i + 1} failed:`, lastErr.message);
        // Remove broken script tag so retry can inject fresh one
        document.getElementById('yt-iframe-api')?.remove();
        ytApiPromise = null; // allow retry
        if (i < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 500 * (i + 1))); // backoff
        }
      }
    }
    ytApiPromise = null; // allow future attempts
    throw lastErr;
  })();

  return ytApiPromise;
}

/**
 * Preload the YouTube IFrame API immediately (non-blocking).
 * Call this early (e.g. in a top-level Provider) so the API is likely
 * already loaded by the time the user clicks play.
 */
export function preloadYTApi(): void {
  if (typeof window === 'undefined') return;
  // If already loaded or loading, skip
  if ((window as any).YT?.Player || ytApiPromise) return;
  // Fire and forget — errors handled in ensureYTApi retries
  ensureYTApi().catch(() => {});
}

/** @internal Reset module state — only for tests */
export function _resetForTesting(): void {
  ytApiPromise = null;
  loadAttempt = 0;
}
