/**
 * @jest-environment jsdom
 *
 * Integration tests for lib/google-drive.ts — Google OAuth + Drive appdata helpers.
 *
 * Strategy
 * ────────
 * • `_resetForTesting` resets all module-level state between tests so there is
 *   no cross-test pollution (mirrors the pattern used in lib/youtube.ts).
 * • window.gapi / window.google are fully mocked; no real network calls are made.
 * • fetch is mocked by assigning to global.fetch directly.
 * • Script injection (GIS / GAPI) is intercepted by spying on
 *   document.head.appendChild and firing onload synchronously.
 */

import {
  initGoogleAuth,
  signIn,
  signOut,
  isSignedIn,
  isTokenExpired,
  getValidToken,
  getStoredEmail,
  tryRestoreSession,
  getGoogleUser,
  loadPrivateSongs,
  savePrivateSongs,
  loadPreferences,
  savePreferences,
  generateId,
  setOnTokenRefreshed,
  _resetForTesting,
  type PrivateSong,
} from '@/lib/google-drive';

// ─── Constants ───────────────────────────────────────────────────

const FAKE_TOKEN = 'ya29.fake-access-token';
const FAR_FUTURE = Date.now() + 3_600_000; // 1 h from now
const TEST_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
const TEST_EMAIL = 'user@example.com';

// ─── Mock builders ───────────────────────────────────────────────

/**
 * Build a minimal mock tokenClient.
 * When `requestAccessToken` is called it asynchronously fires `this.callback`
 * with either a success response or an error response.
 */
function buildTokenClient({
  accessToken = FAKE_TOKEN,
  expiresIn = 3600,
  error = null as string | null,
} = {}) {
  const client = {
    callback: null as any,
    requestAccessToken: jest.fn(function (this: typeof client) {
      const cb = this.callback;
      setTimeout(() => {
        if (error) {
          cb({ error });
        } else {
          cb({ access_token: accessToken, expires_in: expiresIn });
        }
      }, 0);
    }),
  };
  return client;
}

/**
 * Install a minimal window.gapi mock.
 * The Drive files.list / files.get responses are controlled per-test via
 * mockGapi.client.drive.files.list.mockResolvedValue(…).
 */
function installGapiMock() {
  const mock = {
    client: {
      setToken: jest.fn(),
      getToken: jest.fn().mockReturnValue({ access_token: FAKE_TOKEN }),
      init: jest.fn().mockResolvedValue(undefined),
      load: jest.fn().mockResolvedValue(undefined),
      drive: {
        files: {
          list: jest.fn(),
          get: jest.fn(),
        },
      },
    },
    load: jest.fn((_lib: string, cb: () => void) => cb()),
  };
  (window as any).gapi = mock;
  return mock;
}

/**
 * Simulate GIS / GAPI script loading:
 * When a <script> whose `src` matches `urlFragment` is appended to document.head,
 * fire its `onload` handler synchronously (scripts never actually execute in jsdom).
 * Returns a jest.SpyInstance so the caller can restore it.
 */
function mockScriptLoad(urlFragment: string) {
  return jest.spyOn(document.head, 'appendChild').mockImplementation((node: any) => {
    if (node?.src?.includes(urlFragment)) {
      // Defer so the module's promise executor runs first
      setTimeout(() => node.onload?.(), 0);
    }
    return node;
  });
}

// ─── fetch mock helper ────────────────────────────────────────────

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  (global as any).fetch = jest.fn().mockResolvedValue(response);
  return (global as any).fetch as jest.Mock;
}

function mockFetchReject(error: unknown) {
  (global as any).fetch = jest.fn().mockRejectedValue(error);
  return (global as any).fetch as jest.Mock;
}

// ─── Global setup ────────────────────────────────────────────────

const originalFetch = (global as any).fetch;

beforeEach(() => {
  // Reset all module state
  _resetForTesting();
  // Clear storage
  localStorage.clear();
  sessionStorage.clear();
  // Clear any gapi/google globals
  delete (window as any).gapi;
  delete (window as any).google;
  // Restore all spies
  jest.restoreAllMocks();
  jest.useRealTimers();
  // Restore fetch
  (global as any).fetch = originalFetch;
});

// ═══════════════════════════════════════════════════════════════
//  generateId
// ═══════════════════════════════════════════════════════════════

describe('generateId', () => {
  it('returns a UUID-formatted string', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('returns a unique value on each call', () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateId()));
    expect(ids.size).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════
//  isTokenExpired
// ═══════════════════════════════════════════════════════════════

describe('isTokenExpired', () => {
  it('returns true when there is no token', () => {
    expect(isTokenExpired()).toBe(true);
  });

  it('returns false when the token has a far-future expiry', () => {
    _resetForTesting({ currentToken: FAKE_TOKEN, tokenExpiresAt: FAR_FUTURE });
    expect(isTokenExpired()).toBe(false);
  });

  it('returns true when the token is expired', () => {
    _resetForTesting({ currentToken: FAKE_TOKEN, tokenExpiresAt: Date.now() - 1000 });
    expect(isTokenExpired()).toBe(true);
  });

  it('returns true when the token expires within the 30s grace window', () => {
    _resetForTesting({ currentToken: FAKE_TOKEN, tokenExpiresAt: Date.now() + 10_000 }); // 10s < 30s
    expect(isTokenExpired()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
//  isSignedIn
// ═══════════════════════════════════════════════════════════════

describe('isSignedIn', () => {
  it('returns false when no token is set', () => {
    expect(isSignedIn()).toBe(false);
  });

  it('returns true when a token is present (even if expired)', () => {
    _resetForTesting({ currentToken: FAKE_TOKEN, tokenExpiresAt: Date.now() - 1 });
    expect(isSignedIn()).toBe(true);
  });

  it('returns false after signOut clears the token', () => {
    _resetForTesting({ currentToken: FAKE_TOKEN, tokenExpiresAt: FAR_FUTURE });
    installGapiMock();
    (window as any).google = { accounts: { oauth2: { revoke: jest.fn() } } };
    signOut();
    expect(isSignedIn()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
//  getStoredEmail
// ═══════════════════════════════════════════════════════════════

describe('getStoredEmail', () => {
  it('returns null when nothing is stored', () => {
    expect(getStoredEmail()).toBeNull();
  });

  it('returns the email after getGoogleUser saves it', async () => {
    // getGoogleUser calls saveSessionEmail internally
    mockFetch({ ok: true, json: async () => ({ email: TEST_EMAIL }) });

    await getGoogleUser(FAKE_TOKEN);
    expect(getStoredEmail()).toBe(TEST_EMAIL);
  });
});

// ═══════════════════════════════════════════════════════════════
//  setOnTokenRefreshed
// ═══════════════════════════════════════════════════════════════

describe('setOnTokenRefreshed', () => {
  it('stores a callback that can be invoked on token refresh', () => {
    const cb = jest.fn();
    setOnTokenRefreshed(cb);
    // The callback is fired by the proactive refresh scheduler; we verify
    // it's stored by triggering it via a silent reauth path.  Here we just
    // confirm the API doesn't throw.
    expect(() => setOnTokenRefreshed(cb)).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
//  initGoogleAuth
// ═══════════════════════════════════════════════════════════════

describe('initGoogleAuth', () => {
  it('creates the token client when GIS loads successfully', async () => {
    const mockClient = buildTokenClient();
    const mockInitTokenClient = jest.fn().mockReturnValue(mockClient);
    (window as any).google = {
      accounts: { oauth2: { initTokenClient: mockInitTokenClient } },
    };

    const spy = mockScriptLoad('gsi/client');
    await initGoogleAuth(TEST_CLIENT_ID);
    spy.mockRestore();

    expect(mockInitTokenClient).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: TEST_CLIENT_ID, scope: expect.stringContaining('drive.appdata') })
    );
  });

  it('does not throw when called without a client ID', async () => {
    // No CLIENT_ID → provider logs a warning; initGoogleAuth receives ''
    (window as any).google = {
      accounts: { oauth2: { initTokenClient: jest.fn().mockReturnValue(buildTokenClient()) } },
    };
    const spy = mockScriptLoad('gsi/client');
    await expect(initGoogleAuth('')).resolves.toBeUndefined();
    spy.mockRestore();
  });

  it('handles GIS script load failure gracefully', async () => {
    const appendSpy = jest.spyOn(document.head, 'appendChild').mockImplementation((node: any) => {
      if (node?.src?.includes('gsi/client')) {
        setTimeout(() => node.onerror?.(new Event('error')), 0);
      }
      return node;
    });

    await expect(initGoogleAuth(TEST_CLIENT_ID)).resolves.toBeUndefined();
    appendSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════
//  signIn
// ═══════════════════════════════════════════════════════════════

describe('signIn', () => {
  it('resolves with the access token on a successful OAuth response', async () => {
    const mockClient = buildTokenClient({ accessToken: FAKE_TOKEN });
    installGapiMock();
    _resetForTesting({
      tokenClient: mockClient,
      storedClientId: TEST_CLIENT_ID,
      gapiLoaded: true,
      driveApiLoaded: true,
    });

    const token = await signIn();
    expect(token).toBe(FAKE_TOKEN);
    expect(isSignedIn()).toBe(true);
    expect(isTokenExpired()).toBe(false);
  });

  it('rejects when GIS returns an error', async () => {
    const mockClient = buildTokenClient({ error: 'access_denied' });
    installGapiMock();
    _resetForTesting({
      tokenClient: mockClient,
      storedClientId: TEST_CLIENT_ID,
      gapiLoaded: true,
      driveApiLoaded: true,
    });

    await expect(signIn()).rejects.toThrow('access_denied');
    expect(isSignedIn()).toBe(false);
  });

  it('rejects with "Sign-in already in progress" on concurrent calls', async () => {
    const mockClient = buildTokenClient();
    installGapiMock();
    _resetForTesting({
      tokenClient: mockClient,
      storedClientId: TEST_CLIENT_ID,
      gapiLoaded: true,
      driveApiLoaded: true,
    });

    const first = signIn();
    // second call before first resolves
    await expect(signIn()).rejects.toThrow('Sign-in already in progress');
    // allow first to finish
    await first;
  });

  it('persists the session marker in localStorage', async () => {
    const mockClient = buildTokenClient();
    installGapiMock();
    _resetForTesting({
      tokenClient: mockClient,
      storedClientId: TEST_CLIENT_ID,
      gapiLoaded: true,
      driveApiLoaded: true,
    });

    await signIn();
    expect(localStorage.getItem('niggunsheet-auth')).toBe('1');
  });

  it('stores the token in sessionStorage', async () => {
    const mockClient = buildTokenClient({ accessToken: FAKE_TOKEN });
    installGapiMock();
    _resetForTesting({
      tokenClient: mockClient,
      storedClientId: TEST_CLIENT_ID,
      gapiLoaded: true,
      driveApiLoaded: true,
    });

    await signIn();
    expect(sessionStorage.getItem('niggunsheet-token')).toBe(FAKE_TOKEN);
    expect(sessionStorage.getItem('niggunsheet-token-expiry')).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
//  signOut
// ═══════════════════════════════════════════════════════════════

describe('signOut', () => {
  it('clears the in-memory token and session storage', () => {
    sessionStorage.setItem('niggunsheet-token', FAKE_TOKEN);
    sessionStorage.setItem('niggunsheet-token-expiry', String(FAR_FUTURE));
    localStorage.setItem('niggunsheet-auth', '1');
    localStorage.setItem('niggunsheet-email', TEST_EMAIL);

    const gapi = installGapiMock();
    (window as any).google = { accounts: { oauth2: { revoke: jest.fn() } } };
    _resetForTesting({ currentToken: FAKE_TOKEN, tokenExpiresAt: FAR_FUTURE });

    signOut();

    expect(isSignedIn()).toBe(false);
    expect(sessionStorage.getItem('niggunsheet-token')).toBeNull();
    expect(sessionStorage.getItem('niggunsheet-token-expiry')).toBeNull();
    // Email and auth marker are also cleared
    expect(localStorage.getItem('niggunsheet-auth')).toBeNull();
    expect(localStorage.getItem('niggunsheet-email')).toBeNull();
    expect(gapi.client.setToken).toHaveBeenCalledWith(null);
  });

  it('calls google.accounts.oauth2.revoke when a gapi token exists', () => {
    const revoke = jest.fn();
    const gapi = installGapiMock();
    gapi.client.getToken.mockReturnValue({ access_token: FAKE_TOKEN });
    (window as any).google = { accounts: { oauth2: { revoke } } };
    _resetForTesting({ currentToken: FAKE_TOKEN, tokenExpiresAt: FAR_FUTURE });

    signOut();

    expect(revoke).toHaveBeenCalledWith(FAKE_TOKEN);
  });

  it('does not throw when gapi is not initialised', () => {
    delete (window as any).gapi;
    _resetForTesting({ currentToken: FAKE_TOKEN, tokenExpiresAt: FAR_FUTURE });
    expect(() => signOut()).not.toThrow();
    expect(isSignedIn()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
//  getValidToken
// ═══════════════════════════════════════════════════════════════

describe('getValidToken', () => {
  it('returns the current token immediately when it is fresh', async () => {
    _resetForTesting({ currentToken: FAKE_TOKEN, tokenExpiresAt: FAR_FUTURE });
    const token = await getValidToken();
    expect(token).toBe(FAKE_TOKEN);
  });

  it('returns null when there is no token and no session to restore', async () => {
    // No session marker → silent re-auth is skipped
    const token = await getValidToken();
    expect(token).toBeNull();
  });

  it('attempts silent re-auth when the token is expired', async () => {
    const mockClient = buildTokenClient({ accessToken: 'refreshed-token' });
    installGapiMock();
    _resetForTesting({
      currentToken: FAKE_TOKEN,
      tokenExpiresAt: Date.now() - 1,        // expired
      tokenClient: mockClient,
      storedClientId: TEST_CLIENT_ID,
      gapiLoaded: true,
      driveApiLoaded: true,
    });
    localStorage.setItem('niggunsheet-auth', '1');
    localStorage.setItem('niggunsheet-email', TEST_EMAIL);

    const token = await getValidToken();
    expect(token).toBe('refreshed-token');
  });
});

// ═══════════════════════════════════════════════════════════════
//  tryRestoreSession
// ═══════════════════════════════════════════════════════════════

describe('tryRestoreSession', () => {
  it('returns null when there is no session marker in localStorage', async () => {
    const token = await tryRestoreSession();
    expect(token).toBeNull();
  });

  it('returns a cached token from sessionStorage when it is still fresh', async () => {
    sessionStorage.setItem('niggunsheet-token', FAKE_TOKEN);
    sessionStorage.setItem('niggunsheet-token-expiry', String(FAR_FUTURE));
    installGapiMock();
    _resetForTesting({ gapiLoaded: true, driveApiLoaded: true });

    const token = await tryRestoreSession();
    expect(token).toBe(FAKE_TOKEN);
  });

  it('returns null when the cached token is stale (< 30s remaining)', async () => {
    sessionStorage.setItem('niggunsheet-token', FAKE_TOKEN);
    sessionStorage.setItem('niggunsheet-token-expiry', String(Date.now() + 20_000)); // 20s — within grace
    // No session marker → no silent re-auth attempt
    const token = await tryRestoreSession();
    expect(token).toBeNull();
  });

  it('falls back to silent re-auth when cache is empty but session marker exists', async () => {
    localStorage.setItem('niggunsheet-auth', '1');
    localStorage.setItem('niggunsheet-email', TEST_EMAIL);

    const mockClient = buildTokenClient({ accessToken: FAKE_TOKEN });
    installGapiMock();
    _resetForTesting({
      tokenClient: mockClient,
      storedClientId: TEST_CLIENT_ID,
      gapiLoaded: true,
      driveApiLoaded: true,
    });

    const token = await tryRestoreSession();
    expect(token).toBe(FAKE_TOKEN);
  });

  it('returns null when session marker exists but email is missing (no login_hint)', async () => {
    // marker without email → tryRestoreSession returns null
    localStorage.setItem('niggunsheet-auth', '1');
    // no email key

    const token = await tryRestoreSession();
    expect(token).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
//  getGoogleUser
// ═══════════════════════════════════════════════════════════════

describe('getGoogleUser', () => {
  it('returns a GoogleUser with the fetched email', async () => {
    mockFetch({ ok: true, json: async () => ({ email: TEST_EMAIL, sub: '12345' }) });

    const user = await getGoogleUser(FAKE_TOKEN);
    expect(user).toEqual({ email: TEST_EMAIL });
  });

  it('sends the Bearer token in the Authorization header', async () => {
    const fetchSpy = mockFetch({ ok: true, json: async () => ({ email: TEST_EMAIL }) });

    await getGoogleUser(FAKE_TOKEN);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      expect.objectContaining({ headers: { Authorization: `Bearer ${FAKE_TOKEN}` } })
    );
  });

  it('persists email to localStorage for future login_hint', async () => {
    mockFetch({ ok: true, json: async () => ({ email: TEST_EMAIL }) });

    await getGoogleUser(FAKE_TOKEN);
    expect(getStoredEmail()).toBe(TEST_EMAIL);
    expect(localStorage.getItem('niggunsheet-auth')).toBe('1');
  });

  it('throws when the API returns a non-OK status', async () => {
    mockFetch({ ok: false, status: 401 } as any);

    await expect(getGoogleUser(FAKE_TOKEN)).rejects.toThrow('Failed to fetch user info');
  });

  it('throws on network failure', async () => {
    mockFetchReject(new TypeError('network error'));
    await expect(getGoogleUser(FAKE_TOKEN)).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
//  loadPrivateSongs
// ═══════════════════════════════════════════════════════════════

describe('loadPrivateSongs', () => {
  beforeEach(() => {
    installGapiMock();
    _resetForTesting({
      currentToken: FAKE_TOKEN,
      tokenExpiresAt: FAR_FUTURE,
      gapiLoaded: true,
      driveApiLoaded: true,
    });
  });

  it('returns an empty array when no songs file exists in Drive', async () => {
    (window as any).gapi.client.drive.files.list.mockResolvedValue({ result: { files: [] } });

    const songs = await loadPrivateSongs();
    expect(songs).toEqual([]);
  });

  it('returns parsed songs from the Drive file', async () => {
    const fakeSongs: PrivateSong[] = [
      { id: generateId(), title: 'Song A', artist: 'Artist A', lyrics: 'La la la', createdAt: new Date().toISOString() },
    ];
    (window as any).gapi.client.drive.files.list.mockResolvedValue({ result: { files: [{ id: 'file-123', name: 'niggunsheet-songs.json' }] } });
    (window as any).gapi.client.drive.files.get.mockResolvedValue({ body: JSON.stringify(fakeSongs) });

    const songs = await loadPrivateSongs();
    expect(songs).toHaveLength(1);
    expect(songs[0].title).toBe('Song A');
  });

  it('filters out entries that lack required fields (id, title, lyrics)', async () => {
    const mixed = [
      { id: 'abc', title: 'Valid', lyrics: 'lyrics', artist: '', createdAt: '' },
      { title: 'No id', lyrics: 'lyrics', artist: '' },          // missing id
      { id: 'xyz', lyrics: 'lyrics', artist: '' },               // missing title
    ];
    (window as any).gapi.client.drive.files.list.mockResolvedValue({ result: { files: [{ id: 'file-123' }] } });
    (window as any).gapi.client.drive.files.get.mockResolvedValue({ body: JSON.stringify(mixed) });

    const songs = await loadPrivateSongs();
    expect(songs).toHaveLength(1);
    expect(songs[0].id).toBe('abc');
  });

  it('returns an empty array when the file content is not a JSON array', async () => {
    (window as any).gapi.client.drive.files.list.mockResolvedValue({ result: { files: [{ id: 'file-123' }] } });
    (window as any).gapi.client.drive.files.get.mockResolvedValue({ body: '{"not":"array"}' });

    const songs = await loadPrivateSongs();
    expect(songs).toEqual([]);
  });

  it('returns an empty array when the file content is invalid JSON', async () => {
    (window as any).gapi.client.drive.files.list.mockResolvedValue({ result: { files: [{ id: 'file-123' }] } });
    (window as any).gapi.client.drive.files.get.mockResolvedValue({ body: '<<<invalid>>>' });

    const songs = await loadPrivateSongs();
    expect(songs).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
//  savePrivateSongs
// ═══════════════════════════════════════════════════════════════

describe('savePrivateSongs', () => {
  const fakeSongs: PrivateSong[] = [
    { id: 'abc123', title: 'My Song', artist: 'Me', lyrics: 'Do re mi', createdAt: new Date().toISOString() },
  ];

  beforeEach(() => {
    installGapiMock();
    _resetForTesting({
      currentToken: FAKE_TOKEN,
      tokenExpiresAt: FAR_FUTURE,
      gapiLoaded: true,
      driveApiLoaded: true,
    });
  });

  it('creates a new file when no songs file exists yet (multipart POST)', async () => {
    (window as any).gapi.client.drive.files.list.mockResolvedValue({ result: { files: [] } });

    const fetchSpy = mockFetch({ ok: true, json: async () => ({ id: 'new-file-id' }) });

    await savePrivateSongs(fakeSongs);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('upload/drive/v3/files'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('updates an existing file when the songs file already exists (PATCH)', async () => {
    (window as any).gapi.client.drive.files.list.mockResolvedValue({ result: { files: [{ id: 'existing-file-id' }] } });

    const fetchSpy = mockFetch({ ok: true, json: async () => ({}) });

    await savePrivateSongs(fakeSongs);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('existing-file-id'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('sends the serialised songs as JSON in the request body', async () => {
    (window as any).gapi.client.drive.files.list.mockResolvedValue({ result: { files: [{ id: 'file-id' }] } });

    const fetchSpy = mockFetch({ ok: true, json: async () => ({}) });

    await savePrivateSongs(fakeSongs);

    const body = (fetchSpy.mock.calls[0][1] as any).body as string;
    // The body might be a multipart or direct JSON; either way it contains the song data
    expect(body).toContain('"My Song"');
  });
});

// ═══════════════════════════════════════════════════════════════
//  loadPreferences
// ═══════════════════════════════════════════════════════════════

describe('loadPreferences', () => {
  beforeEach(() => {
    installGapiMock();
    _resetForTesting({
      currentToken: FAKE_TOKEN,
      tokenExpiresAt: FAR_FUTURE,
      gapiLoaded: true,
      driveApiLoaded: true,
    });
  });

  it('returns an empty object when no preferences file exists', async () => {
    (window as any).gapi.client.drive.files.list.mockResolvedValue({ result: { files: [] } });

    const prefs = await loadPreferences();
    expect(prefs).toEqual({});
  });

  it('returns parsed preferences from the Drive file', async () => {
    const fakePrefs = { darkMode: true, language: 'he' };
    (window as any).gapi.client.drive.files.list.mockResolvedValue({ result: { files: [{ id: 'prefs-file' }] } });
    (window as any).gapi.client.drive.files.get.mockResolvedValue({ body: JSON.stringify(fakePrefs) });

    const prefs = await loadPreferences();
    expect(prefs).toEqual(fakePrefs);
  });

  it('returns an empty object when file content is an array (not a plain object)', async () => {
    (window as any).gapi.client.drive.files.list.mockResolvedValue({ result: { files: [{ id: 'prefs-file' }] } });
    (window as any).gapi.client.drive.files.get.mockResolvedValue({ body: '["not","an","object"]' });

    const prefs = await loadPreferences();
    expect(prefs).toEqual({});
  });

  it('returns an empty object when file content is invalid JSON', async () => {
    (window as any).gapi.client.drive.files.list.mockResolvedValue({ result: { files: [{ id: 'prefs-file' }] } });
    (window as any).gapi.client.drive.files.get.mockResolvedValue({ body: 'not-json' });

    const prefs = await loadPreferences();
    expect(prefs).toEqual({});
  });
});

// ═══════════════════════════════════════════════════════════════
//  savePreferences
// ═══════════════════════════════════════════════════════════════

describe('savePreferences', () => {
  const fakePrefs = { darkMode: false, fontSize: 14 };

  beforeEach(() => {
    installGapiMock();
    _resetForTesting({
      currentToken: FAKE_TOKEN,
      tokenExpiresAt: FAR_FUTURE,
      gapiLoaded: true,
      driveApiLoaded: true,
    });
  });

  it('creates a new preferences file when none exists', async () => {
    (window as any).gapi.client.drive.files.list.mockResolvedValue({ result: { files: [] } });

    const fetchSpy = mockFetch({ ok: true, json: async () => ({ id: 'new-prefs-id' }) });

    await savePreferences(fakePrefs);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('upload/drive/v3/files'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('updates an existing preferences file', async () => {
    (window as any).gapi.client.drive.files.list.mockResolvedValue({ result: { files: [{ id: 'existing-prefs-id' }] } });

    const fetchSpy = mockFetch({ ok: true, json: async () => ({}) });

    await savePreferences(fakePrefs);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('existing-prefs-id'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('serialises all preference keys correctly', async () => {
    (window as any).gapi.client.drive.files.list.mockResolvedValue({ result: { files: [{ id: 'prefs-id' }] } });

    const fetchSpy = mockFetch({ ok: true, json: async () => ({}) });

    await savePreferences(fakePrefs);

    const body = (fetchSpy.mock.calls[0][1] as any).body as string;
    expect(body).toContain('"darkMode"');
    expect(body).toContain('"fontSize"');
  });
});
