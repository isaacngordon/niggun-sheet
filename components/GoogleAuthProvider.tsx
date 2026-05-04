'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  initGoogleAuth,
  signIn as gSignIn,
  signOut as gSignOut,
  getGoogleUser,
  tryRestoreSession,
  loadPrivateSongs,
  savePrivateSongs,
  loadPreferences,
  savePreferences,
  loadSavedSheets,
  saveSavedSheets,
  generateId,
  setOnTokenRefreshed,
  getStoredEmail,
  type GoogleUser,
  type PrivateSong,
  type SavedSheet,
  type UserPreferences,
} from '@/lib/google-drive';

interface GoogleAuthState {
  user: GoogleUser | null;
  privateSongs: PrivateSong[];
  savedSheets: SavedSheet[];
  preferences: UserPreferences;
  loading: boolean;
  restoring: boolean;
  ready: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
  addSong: (song: Omit<PrivateSong, 'id' | 'createdAt'>) => Promise<void>;
  addSongs: (songs: Omit<PrivateSong, 'id' | 'createdAt'>[]) => Promise<void>;
  removeSong: (id: string) => Promise<void>;
  editSong: (id: string, updates: Partial<Pick<PrivateSong, 'title' | 'artist' | 'lyrics'>>) => Promise<void>;
  saveSheet: (sheet: Omit<SavedSheet, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<SavedSheet>;
  setPref: (key: string, value: unknown) => void;
}

const GoogleAuthContext = createContext<GoogleAuthState | null>(null);

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const MAX_SAVED_SHEETS = 3;

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [privateSongs, setPrivateSongs] = useState<PrivateSong[]>([]);
  const [savedSheets, setSavedSheets] = useState<SavedSheet[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [ready, setReady] = useState(false);
  const prefsRef = useRef<UserPreferences>({});
  const prefsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reloadDriveData = useCallback(async () => {
    const [songs, prefs, sheets] = await Promise.all([loadPrivateSongs(), loadPreferences(), loadSavedSheets()]);
    setPrivateSongs(songs);
    prefsRef.current = prefs;
    setPreferences(prefs);
    setSavedSheets(sheets);
  }, []);

  // Init GIS on mount + try restoring previous session
  useEffect(() => {
    if (!CLIENT_ID) {
      console.warn('[GoogleAuth] No NEXT_PUBLIC_GOOGLE_CLIENT_ID set');
      setReady(true);
      return;
    }
    console.log('[GoogleAuth] Initializing with client ID:', CLIENT_ID.slice(0, 10) + '...');
    let cancelled = false;

    // Show stored email immediately so UI doesn't flash "Sign In"
    const storedEmail = getStoredEmail();
    if (storedEmail) {
      setUser({ email: storedEmail });
      setRestoring(true);
    }

    // Register proactive token refresh handler
    setOnTokenRefreshed(() => {
      console.log('[GoogleAuth] Token refreshed proactively');
      reloadDriveData().catch((err) => console.error('[GoogleAuth] Failed to reload Drive data:', err));
    });

    initGoogleAuth(CLIENT_ID)
      .then(async () => {
        console.log('[GoogleAuth] Ready');
        if (cancelled) return;
        setReady(true);
        const token = await tryRestoreSession();
        if (cancelled) return;
        if (!token) {
          // Restore failed — clear optimistic user
          setUser(null);
          setRestoring(false);
          return;
        }
        try {
          const u = await getGoogleUser(token);
          if (cancelled) return;
          setUser(u);
          await reloadDriveData();
          if (cancelled) return;
        } catch (err) {
          console.warn('[GoogleAuth] Session restore failed:', err);
          setUser(null);
        } finally {
          if (!cancelled) setRestoring(false);
        }
      })
      .catch((err) => {
        console.error('[GoogleAuth] Init failed:', err);
        if (!cancelled) {
          setReady(true);
          setUser(null);
          setRestoring(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const signIn = useCallback(async () => {
    if (!CLIENT_ID) { console.warn('[GoogleAuth] No client ID'); return; }
    if (loading || restoring) return; // prevent overlapping restore + sign-in
    console.log('[GoogleAuth] Sign-in clicked, ready:', ready);
    setLoading(true);
    try {
      const token = await gSignIn();
      const u = await getGoogleUser(token);
      setUser(u);
      await reloadDriveData();
    } catch (err: any) {
      // Ignore expected user/debounce cancellations.
      if (err?.message !== 'Sign-in already in progress' && err?.name !== 'popup_closed') {
        console.error('[GoogleAuth] Sign-in error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, ready, restoring]);

  const signOut = useCallback(() => {
    gSignOut();
    setUser(null);
    setPrivateSongs([]);
    setSavedSheets([]);
    prefsRef.current = {};
    setPreferences({});
  }, []);

  const addSong = useCallback(async (song: Omit<PrivateSong, 'id' | 'createdAt'>) => {
    const newSong: PrivateSong = {
      ...song,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...privateSongs, newSong];
    setPrivateSongs(updated);
    await savePrivateSongs(updated);
  }, [privateSongs]);

  const addSongs = useCallback(async (songs: Omit<PrivateSong, 'id' | 'createdAt'>[]) => {
    const now = new Date().toISOString();
    const newSongs: PrivateSong[] = songs.map((s) => ({ ...s, id: generateId(), createdAt: now }));
    const updated = [...privateSongs, ...newSongs];
    setPrivateSongs(updated);
    await savePrivateSongs(updated);
  }, [privateSongs]);

  const removeSong = useCallback(async (id: string) => {
    const updated = privateSongs.filter((s) => s.id !== id);
    setPrivateSongs(updated);
    await savePrivateSongs(updated);
  }, [privateSongs]);

  const editSong = useCallback(async (id: string, updates: Partial<Pick<PrivateSong, 'title' | 'artist' | 'lyrics'>>) => {
    const updated = privateSongs.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setPrivateSongs(updated);
    await savePrivateSongs(updated);
  }, [privateSongs]);

  const saveSheet = useCallback(async (sheet: Omit<SavedSheet, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const now = new Date().toISOString();
    const existing = sheet.id ? savedSheets.find((entry) => entry.id === sheet.id) : null;

    if (!existing && savedSheets.length >= MAX_SAVED_SHEETS) {
      throw new Error(`Saved sheet limit reached (${MAX_SAVED_SHEETS} max)`);
    }

    const nextSheet: SavedSheet = {
      ...sheet,
      id: existing?.id ?? generateId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const nextSavedSheets = existing
      ? savedSheets.map((entry) => (entry.id === nextSheet.id ? nextSheet : entry))
      : [...savedSheets, nextSheet];

    setSavedSheets(nextSavedSheets);
    await saveSavedSheets(nextSavedSheets);
    return nextSheet;
  }, [savedSheets]);

  // Debounced preference setter — updates state immediately, saves to Drive after 500ms idle
  const setPref = useCallback((key: string, value: unknown) => {
    prefsRef.current = { ...prefsRef.current, [key]: value };
    setPreferences({ ...prefsRef.current });
    if (prefsSaveTimer.current) clearTimeout(prefsSaveTimer.current);
    prefsSaveTimer.current = setTimeout(() => {
      savePreferences(prefsRef.current).catch((err) => console.error('[GoogleAuth] Failed to save prefs:', err));
    }, 500);
  }, []);

  return (
    <GoogleAuthContext.Provider value={{ user, privateSongs, savedSheets, preferences, loading, restoring, ready, signIn, signOut, addSong, addSongs, removeSong, editSong, saveSheet, setPref }}>
      {children}
    </GoogleAuthContext.Provider>
  );
}

export function useGoogleAuth(): GoogleAuthState {
  const ctx = useContext(GoogleAuthContext);
  if (!ctx) throw new Error('useGoogleAuth must be used within GoogleAuthProvider');
  return ctx;
}

export function useOptionalGoogleAuth(): GoogleAuthState | null {
  return useContext(GoogleAuthContext);
}
