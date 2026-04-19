// Google Identity Services + Drive appdata helper
// All private song data lives in the user's own Google Drive (hidden app folder)

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata email';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const PRIVATE_SONGS_FILE = 'niggunsheet-songs.json';
const PREFERENCES_FILE = 'niggunsheet-prefs.json';

const SILENT_REAUTH_TIMEOUT = 8000; // ms — abort silent reauth if Google is slow
const FETCH_TIMEOUT = 15000;        // ms — abort any single fetch
const TOKEN_REFRESH_MARGIN = 120;   // seconds before expiry to trigger proactive refresh
const SESSION_EMAIL_KEY = 'niggunsheet-email'; // persisted for login_hint on reload

export type UserPreferences = Record<string, unknown>;

export interface PrivateSong {
  id: string;               // uuid
  title: string;
  artist: string;
  lyrics: string;
  youtubeLinks?: string[];  // multiple YouTube URLs
  driveLink?: string;       // Google Drive link
  createdAt: string;        // ISO date
}

export interface GoogleUser {
  email: string;
}

// ─── Fetch with Timeout ─────────────────────────────────────────

function fetchWithTimeout(url: string, opts: RequestInit = {}, timeout = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ─── GIS Script Loader ─────────────────────────────────────────

let gisLoaded = false;
let gisPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (gisLoaded) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => { gisLoaded = true; resolve(); };
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(s);
  });
  return gisPromise;
}

let gapiLoaded = false;
let gapiPromise: Promise<void> | null = null;

function loadGapiScript(): Promise<void> {
  if (gapiLoaded) return Promise.resolve();
  if (gapiPromise) return gapiPromise;
  gapiPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://apis.google.com/js/api.js';
    s.onload = () => {
      (window as any).gapi.load('client', async () => {
        try {
          await (window as any).gapi.client.init({});
          gapiLoaded = true;
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    };
    s.onerror = () => reject(new Error('Failed to load GAPI'));
    document.head.appendChild(s);
  });
  return gapiPromise;
}

let driveApiLoaded = false;
async function ensureDriveApi(): Promise<void> {
  if (driveApiLoaded) return;
  await loadGapiScript();
  await (window as any).gapi.client.load(DISCOVERY_DOC);
  driveApiLoaded = true;
}

// ─── Token Client (OAuth 2.0 Implicit via GIS) ─────────────────

let tokenClient: any = null;
let currentToken: string | null = null;
let storedClientId: string | null = null;
let tokenExpiresAt = 0;         // epoch ms when current token expires
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let onTokenRefreshed: (() => void) | null = null; // callback for provider to reload data

export function setOnTokenRefreshed(cb: () => void) { onTokenRefreshed = cb; }

export async function initGoogleAuth(clientId: string): Promise<void> {
  storedClientId = clientId;
  try {
    await loadGisScript();
    const google = (window as any).google;
    if (!google?.accounts?.oauth2?.initTokenClient) {
      console.error('[GoogleAuth] GIS loaded but google.accounts.oauth2 not available');
      return;
    }
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: () => {},
    });
    console.log('[GoogleAuth] tokenClient created');
  } catch (err) {
    console.error('[GoogleAuth] initGoogleAuth error:', err);
  }
}

async function ensureTokenClient(): Promise<void> {
  if (tokenClient) return;
  if (!storedClientId) throw new Error('No client ID');
  await initGoogleAuth(storedClientId);
  if (!tokenClient) throw new Error('Auth init failed');
}

function scheduleTokenRefresh(expiresIn: number): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  const refreshMs = Math.max(0, (expiresIn - TOKEN_REFRESH_MARGIN) * 1000);
  refreshTimer = setTimeout(async () => {
    console.log('[GoogleAuth] Proactive token refresh');
    const token = await trysilentReauth();
    if (token) onTokenRefreshed?.();
  }, refreshMs);
}

function setToken(accessToken: string, expiresIn: number): void {
  currentToken = accessToken;
  tokenExpiresAt = Date.now() + expiresIn * 1000;
  scheduleTokenRefresh(expiresIn);
}

/** Check if the current token is expired or about to expire */
export function isTokenExpired(): boolean {
  return !currentToken || Date.now() >= tokenExpiresAt - 30_000; // 30s grace
}

/** Get a valid token, refreshing silently if needed */
export async function getValidToken(): Promise<string | null> {
  if (currentToken && !isTokenExpired()) return currentToken;
  return trysilentReauth();
}

const SESSION_KEY = 'niggunsheet-auth';

function clearSession(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ok */ }
  try { localStorage.removeItem(SESSION_EMAIL_KEY); } catch { /* ok */ }
}

/** Save just the email so we can pass login_hint on reload */
function saveSessionEmail(email: string): void {
  try { localStorage.setItem(SESSION_EMAIL_KEY, email); } catch { /* ok */ }
}

/** Get stored email for login_hint */
export function getStoredEmail(): string | null {
  try { return localStorage.getItem(SESSION_EMAIL_KEY); } catch { return null; }
}

/** Try to restore an existing session via silent re-auth. */
export async function tryRestoreSession(): Promise<string | null> {
  // Only attempt if user was previously signed in
  const email = getStoredEmail();
  if (!email) return null;
  return trysilentReauth(email);
}

let silentReauthPromise: Promise<string | null> | null = null;

function trysilentReauth(loginHint?: string): Promise<string | null> {
  // Deduplicate: if a silent re-auth is already in-flight, return the same promise
  if (silentReauthPromise) return silentReauthPromise;

  silentReauthPromise = new Promise<string | null>(async (resolve) => {
    try {
      await ensureTokenClient();
    } catch { resolve(null); return; }

    // Timeout — don't let a stalled Google endpoint hang the app
    const timeout = setTimeout(() => {
      console.warn('[GoogleAuth] Silent reauth timed out');
      resolve(null);
    }, SILENT_REAUTH_TIMEOUT);

    tokenClient.callback = async (resp: any) => {
      clearTimeout(timeout);
      if (resp.error) { resolve(null); return; }
      const expiresIn = resp.expires_in ?? 3600;
      setToken(resp.access_token, expiresIn);
      try {
        await ensureDriveApi();
        (window as any).gapi.client.setToken({ access_token: resp.access_token });
        resolve(resp.access_token);
      } catch { resolve(null); }
    };
    // Pass login_hint if we know the user's email — this makes silent reauth
    // much more reliable because Google knows which account to use
    const opts: any = { prompt: '' };
    if (loginHint) opts.login_hint = loginHint;
    tokenClient.requestAccessToken(opts);
  }).finally(() => { silentReauthPromise = null; });

  return silentReauthPromise;
}

let signInInProgress = false;

export function signIn(): Promise<string> {
  // Debounce — prevent double sign-in from rapid clicks
  if (signInInProgress) return Promise.reject(new Error('Sign-in already in progress'));
  signInInProgress = true;

  return new Promise<string>(async (resolve, reject) => {
    try {
      await ensureTokenClient();
    } catch (err) {
      reject(err); return;
    }
    tokenClient.callback = async (resp: any) => {
      if (resp.error) { reject(new Error(resp.error)); return; }
      const expiresIn = resp.expires_in ?? 3600;
      setToken(resp.access_token, expiresIn);
      try {
        await ensureDriveApi();
        (window as any).gapi.client.setToken({ access_token: resp.access_token });
        resolve(resp.access_token);
      } catch (err) {
        reject(err);
      }
    };
    tokenClient.requestAccessToken({ prompt: '' });
  }).finally(() => { signInInProgress = false; });
}

export function signOut(): void {
  const token = (window as any).gapi?.client?.getToken?.();
  if (token) {
    (window as any).google.accounts.oauth2.revoke(token.access_token);
    (window as any).gapi.client.setToken(null);
  }
  currentToken = null;
  tokenExpiresAt = 0;
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
  clearSession();
}

export function isSignedIn(): boolean {
  return currentToken !== null;
}

export async function getGoogleUser(accessToken: string): Promise<GoogleUser> {
  const res = await fetchWithTimeout('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user info');
  const data = await res.json();
  // Persist email for login_hint on next reload
  if (data.email) saveSessionEmail(data.email);
  return { email: data.email };
}

// ─── Drive App Data Helpers ─────────────────────────────────────

/** Retry a Drive operation up to `retries` times with exponential backoff */
async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      // Ensure token is fresh before each attempt
      if (isTokenExpired()) {
        const token = await getValidToken();
        if (token) (window as any).gapi.client.setToken({ access_token: token });
      }
      return await fn();
    } catch (err) {
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
}

async function findAppFile(fileName: string): Promise<string | null> {
  const resp = await (window as any).gapi.client.drive.files.list({
    spaces: 'appDataFolder',
    q: `name='${fileName}'`,
    fields: 'files(id, name)',
    pageSize: 1,
  });
  const files = resp.result.files;
  return files && files.length > 0 ? files[0].id : null;
}

async function readFileContent(fileId: string): Promise<string> {
  const resp = await (window as any).gapi.client.drive.files.get({
    fileId,
    alt: 'media',
  });
  return typeof resp.body === 'string' ? resp.body : JSON.stringify(resp.result);
}

async function createAppFile(fileName: string, content: string): Promise<string> {
  const metadata = {
    name: fileName,
    parents: ['appDataFolder'],
    mimeType: 'application/json',
  };

  // multipart upload via fetch (gapi.client doesn't support media upload well)
  const boundary = '---niggunsheet' + Date.now();
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    content +
    `\r\n--${boundary}--`;

  const token = (window as any).gapi.client.getToken().access_token;
  const resp = await fetchWithTimeout('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  const data = await resp.json();
  return data.id;
}

async function updateFileContent(fileId: string, content: string): Promise<void> {
  const token = (window as any).gapi.client.getToken().access_token;
  await fetchWithTimeout(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: content,
  });
}

// ─── Public API ─────────────────────────────────────────────────

export async function loadPrivateSongs(): Promise<PrivateSong[]> {
  return withRetry(async () => {
    const fileId = await findAppFile(PRIVATE_SONGS_FILE);
    if (!fileId) return [];
    const raw = await readFileContent(fileId);
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter(
            (item: unknown) =>
              item &&
              typeof item === 'object' &&
              typeof (item as any).id === 'string' &&
              typeof (item as any).title === 'string' &&
              typeof (item as any).lyrics === 'string'
          )
        : [];
    } catch {
      return [];
    }
  });
}

export async function savePrivateSongs(songs: PrivateSong[]): Promise<void> {
  return withRetry(async () => {
    const content = JSON.stringify(songs, null, 2);
    const fileId = await findAppFile(PRIVATE_SONGS_FILE);
    if (fileId) {
      await updateFileContent(fileId, content);
    } else {
      await createAppFile(PRIVATE_SONGS_FILE, content);
    }
  });
}

// ─── Preferences ────────────────────────────────────────────────

export async function loadPreferences(): Promise<UserPreferences> {
  return withRetry(async () => {
    const fileId = await findAppFile(PREFERENCES_FILE);
    if (!fileId) return {};
    const raw = await readFileContent(fileId);
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  });
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  return withRetry(async () => {
    const content = JSON.stringify(prefs, null, 2);
    const fileId = await findAppFile(PREFERENCES_FILE);
    if (fileId) {
      await updateFileContent(fileId, content);
    } else {
      await createAppFile(PREFERENCES_FILE, content);
    }
  });
}

export function generateId(): string {
  return crypto.randomUUID();
}
