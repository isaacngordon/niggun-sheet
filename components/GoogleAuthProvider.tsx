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
  loadSavedBencherLayouts,
  saveSavedBencherLayouts,
  generateId,
  setOnTokenRefreshed,
  getStoredEmail,
  type GoogleUser,
  type PrivateSong,
  type SavedSheet,
  type SavedBencherLayout,
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
  authError: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
  addSong: (song: Omit<PrivateSong, 'id' | 'createdAt'>) => Promise<void>;
  addSongs: (songs: Omit<PrivateSong, 'id' | 'createdAt'>[]) => Promise<void>;
  removeSong: (id: string) => Promise<void>;
  editSong: (id: string, updates: Partial<Pick<PrivateSong, 'title' | 'artist' | 'lyrics'>>) => Promise<void>;
  saveSheet: (sheet: Omit<SavedSheet, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<SavedSheet>;
  bencherLayouts: SavedBencherLayout[];
  saveBencherLayout: (layout: Omit<SavedBencherLayout, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<SavedBencherLayout>;
  deleteBencherLayout: (id: string) => Promise<void>;
  clearPrivateSongs: () => Promise<void>;
  clearSavedSheets: () => Promise<void>;
  clearBencherLayouts: () => Promise<void>;
  clearPreferences: () => Promise<void>;
  clearAllStoredData: () => Promise<void>;
  downloadTransferXml: () => void;
  readTransferXmlFile: (file: File) => Promise<TransferFilePreview>;
  importTransferXmlFile: (file: File, options?: TransferImportOptions) => Promise<TransferImportSummary>;
  setPref: (key: string, value: unknown) => void;
}

export interface TransferImportOptions {
  privateSongs?: boolean;
  savedSheets?: boolean;
  bencherLayouts?: boolean;
  preferences?: boolean;
  privateSongIds?: string[];
  savedSheetIds?: string[];
  bencherLayoutIds?: string[];
}

export interface TransferPreviewItem {
  id: string;
  title: string;
  subtitle: string;
}

export interface TransferFilePreview {
  sourceEmail: string | null;
  exportedAt: string;
  privateSongs: TransferPreviewItem[];
  savedSheets: TransferPreviewItem[];
  bencherLayouts: TransferPreviewItem[];
  preferencesCount: number;
}

export interface TransferImportSummary {
  sourceEmail: string | null;
  exportedAt: string;
  privateSongsCount: number;
  savedSheetsCount: number;
  bencherLayoutsCount: number;
  preferencesCount: number;
}

const GoogleAuthContext = createContext<GoogleAuthState | null>(null);

const DEFAULT_CLIENT_ID = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || '').trim();
const BETA_CLIENT_ID = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_BETA || '').trim();
const MAX_SAVED_SHEETS = 3;
const TRANSFER_SCHEMA_VERSION = 1;

interface TransferPayload {
  schemaVersion: number;
  exportedAt: string;
  sourceEmail: string | null;
  privateSongs: PrivateSong[];
  preferences: UserPreferences;
  savedSheets: SavedSheet[];
  bencherLayouts: SavedBencherLayout[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSavedSheetSong(value: unknown): value is SavedSheet['songs'][number] {
  if (!isRecord(value)) return false;
  return typeof value.title === 'string' && typeof value.artist === 'string' && typeof value.lyrics === 'string';
}

function isPrivateSong(value: unknown): value is PrivateSong {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.artist !== 'string' ||
    typeof value.lyrics !== 'string' ||
    typeof value.createdAt !== 'string'
  ) {
    return false;
  }
  if (value.audioUrl !== undefined && typeof value.audioUrl !== 'string') return false;
  if (value.driveLink !== undefined && typeof value.driveLink !== 'string') return false;
  if (
    value.youtubeLinks !== undefined &&
    (!Array.isArray(value.youtubeLinks) || value.youtubeLinks.some((entry) => typeof entry !== 'string'))
  ) {
    return false;
  }
  return true;
}

function isSavedSheet(value: unknown): value is SavedSheet {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    !Array.isArray(value.songs) ||
    value.songs.some((song) => !isSavedSheetSong(song)) ||
    typeof value.showTitles !== 'boolean' ||
    typeof value.showPageNumbers !== 'boolean' ||
    typeof value.showOrderNumbers !== 'boolean' ||
    typeof value.autoFit !== 'boolean' ||
    typeof value.manualColumns !== 'number' ||
    typeof value.manualFontSize !== 'number' ||
    !Array.isArray(value.manualLocks) ||
    value.manualLocks.some(
      (lockRow) => !Array.isArray(lockRow) || lockRow.some((lockIndex) => typeof lockIndex !== 'number'),
    ) ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string'
  ) {
    return false;
  }
  return true;
}

function isSavedBencherLayout(value: unknown): value is SavedBencherLayout {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    !Array.isArray(value.songs) ||
    value.songs.some((song) => !isSavedSheetSong(song)) ||
    (value.logoSrc !== null && value.logoSrc !== undefined && typeof value.logoSrc !== 'string') ||
    typeof value.showTitles !== 'boolean' ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string'
  ) {
    return false;
  }
  return true;
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function utf8ToBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToUtf8(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function createTransferXml(payload: TransferPayload) {
  const serialized = JSON.stringify(payload);
  const encoded = utf8ToBase64(serialized);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<niggunSheetTransfer schemaVersion="${TRANSFER_SCHEMA_VERSION}">`,
    `  <meta exportedAt="${escapeXml(payload.exportedAt)}" sourceEmail="${escapeXml(payload.sourceEmail ?? '')}" />`,
    `  <payload encoding="base64">${encoded}</payload>`,
    '</niggunSheetTransfer>',
  ].join('\n');
}

function parseTransferXml(xmlText: string): TransferPayload {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(xmlText, 'application/xml');
  const parserError = documentNode.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid XML file.');
  }

  const root = documentNode.querySelector('niggunSheetTransfer');
  if (!root) {
    throw new Error('Transfer file missing niggunSheetTransfer root node.');
  }

  const payloadNode = root.querySelector('payload');
  if (!payloadNode) {
    throw new Error('Transfer file missing payload node.');
  }

  const encoding = payloadNode.getAttribute('encoding');
  if (encoding !== 'base64') {
    throw new Error('Transfer payload encoding is unsupported.');
  }

  const rawPayload = payloadNode.textContent?.trim() ?? '';
  if (!rawPayload) {
    throw new Error('Transfer payload is empty.');
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(base64ToUtf8(rawPayload));
  } catch {
    throw new Error('Transfer payload could not be decoded.');
  }

  if (!isRecord(parsedPayload)) {
    throw new Error('Transfer payload is malformed.');
  }

  const schemaVersion = Number(parsedPayload.schemaVersion);
  if (schemaVersion !== TRANSFER_SCHEMA_VERSION) {
    throw new Error('Transfer file schema version is not supported.');
  }

  const privateSongs = Array.isArray(parsedPayload.privateSongs) ? parsedPayload.privateSongs.filter(isPrivateSong) : [];
  const savedSheets = Array.isArray(parsedPayload.savedSheets) ? parsedPayload.savedSheets.filter(isSavedSheet) : [];
  const bencherLayouts = Array.isArray(parsedPayload.bencherLayouts)
    ? parsedPayload.bencherLayouts.filter(isSavedBencherLayout)
    : [];
  const preferences = isRecord(parsedPayload.preferences) ? parsedPayload.preferences : {};

  return {
    schemaVersion,
    exportedAt: typeof parsedPayload.exportedAt === 'string' ? parsedPayload.exportedAt : new Date().toISOString(),
    sourceEmail: typeof parsedPayload.sourceEmail === 'string' ? parsedPayload.sourceEmail : null,
    privateSongs,
    preferences,
    savedSheets,
    bencherLayouts,
  };
}

function createTransferPreview(payload: TransferPayload): TransferFilePreview {
  return {
    sourceEmail: payload.sourceEmail,
    exportedAt: payload.exportedAt,
    privateSongs: payload.privateSongs.map((song) => ({
      id: song.id,
      title: song.title,
      subtitle: song.artist || 'Unknown artist',
    })),
    savedSheets: payload.savedSheets.map((sheet) => ({
      id: sheet.id,
      title: sheet.title,
      subtitle: `${sheet.songs.length} song${sheet.songs.length === 1 ? '' : 's'}`,
    })),
    bencherLayouts: payload.bencherLayouts.map((layout) => ({
      id: layout.id,
      title: layout.title,
      subtitle: `${layout.songs.length} song${layout.songs.length === 1 ? '' : 's'}`,
    })),
    preferencesCount: Object.keys(payload.preferences).length,
  };
}

function filterTransferItems<T extends { id: string }>(items: T[], selectedIds?: string[]) {
  if (!selectedIds) return items;
  const selected = new Set(selectedIds);
  return items.filter((item) => selected.has(item.id));
}

function mergeTransferItems<T extends { id: string }>(currentItems: T[], incomingItems: T[]) {
  const merged = [...currentItems];
  incomingItems.forEach((incomingItem) => {
    const existingIndex = merged.findIndex((currentItem) => currentItem.id === incomingItem.id);
    if (existingIndex >= 0) {
      merged[existingIndex] = incomingItem;
      return;
    }
    merged.push(incomingItem);
  });
  return merged;
}

function resolveClientIdForCurrentHost(): string {
  if (typeof window !== 'undefined' && window.location.hostname === 'beta.niggunsheet.com') {
    return (BETA_CLIENT_ID || DEFAULT_CLIENT_ID).trim();
  }
  return DEFAULT_CLIENT_ID;
}

function formatAuthError(error: unknown): string {
  const message = error instanceof Error ? (error.name || error.message) : String(error || '');

  if (!message) {
    return 'Google sign-in failed. Please try again.';
  }
  if (message.includes('origin_mismatch')) {
    return 'Google sign-in is blocked for this site. Ask the site owner to add this domain in Google OAuth origins.';
  }
  if (message.includes('invalid_client')) {
    return 'Google sign-in client is invalid. Verify NEXT_PUBLIC_GOOGLE_CLIENT_ID in production env vars.';
  }
  if (message.includes('access_denied')) {
    return 'Google sign-in was denied for this app configuration.';
  }
  if (message.includes('unauthorized_client')) {
    return 'Google sign-in client is not authorized for this domain. Update authorized JavaScript origins in Google Cloud.';
  }
  if (message.includes('popup_failed_to_open')) {
    return 'Google sign-in popup was blocked. Allow popups for this site and try again.';
  }
  if (message.includes('idpiframe_initialization_failed')) {
    return 'Google sign-in could not initialize in this browser.';
  }
  if (message.includes('No client ID')) {
    return 'Google sign-in is not configured for this deployment.';
  }

  return 'Google sign-in failed. Please try again.';
}

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const clientId = resolveClientIdForCurrentHost();
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [privateSongs, setPrivateSongs] = useState<PrivateSong[]>([]);
  const [savedSheets, setSavedSheets] = useState<SavedSheet[]>([]);
  const [bencherLayouts, setBencherLayouts] = useState<SavedBencherLayout[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const prefsRef = useRef<UserPreferences>({});
  const prefsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reloadDriveData = useCallback(async () => {
    const [songs, prefs, sheets, bLayouts] = await Promise.all([loadPrivateSongs(), loadPreferences(), loadSavedSheets(), loadSavedBencherLayouts()]);
    setPrivateSongs(songs);
    prefsRef.current = prefs;
    setPreferences(prefs);
    setSavedSheets(sheets);
    setBencherLayouts(bLayouts);
  }, []);

  // Init GIS on mount + try restoring previous session
  useEffect(() => {
    if (!clientId) {
      console.warn('[GoogleAuth] No NEXT_PUBLIC_GOOGLE_CLIENT_ID set');
      setAuthError('Google sign-in is not configured for this deployment.');
      setReady(true);
      return;
    }
    setAuthError(null);
    console.log('[GoogleAuth] Initializing with client ID:', clientId.slice(0, 10) + '...');
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

    initGoogleAuth(clientId)
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
          setAuthError('Google sign-in failed to initialize on this page.');
          setReady(true);
          setUser(null);
          setRestoring(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const signIn = useCallback(async () => {
    if (!clientId) {
      console.warn('[GoogleAuth] No client ID');
      setAuthError('Google sign-in is not configured for this deployment.');
      return;
    }
    if (loading || restoring) return; // prevent overlapping restore + sign-in
    console.log('[GoogleAuth] Sign-in clicked, ready:', ready);
    setAuthError(null);
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
        setAuthError(formatAuthError(err));
      }
    } finally {
      setLoading(false);
    }
  }, [clientId, loading, ready, restoring]);

  const signOut = useCallback(() => {
    gSignOut();
    setAuthError(null);
    setUser(null);
    setPrivateSongs([]);
    setSavedSheets([]);
    setBencherLayouts([]);
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

  const saveBencherLayout = useCallback(async (layout: Omit<SavedBencherLayout, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const now = new Date().toISOString();
    const existing = layout.id ? bencherLayouts.find((entry) => entry.id === layout.id) : null;

    if (!existing && bencherLayouts.length >= MAX_SAVED_SHEETS) {
      throw new Error(`Saved bencher layout limit reached (${MAX_SAVED_SHEETS} max)`);
    }

    const nextLayout: SavedBencherLayout = {
      ...layout,
      id: existing?.id ?? generateId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const nextLayouts = existing
      ? bencherLayouts.map((entry) => (entry.id === nextLayout.id ? nextLayout : entry))
      : [...bencherLayouts, nextLayout];

    setBencherLayouts(nextLayouts);
    await saveSavedBencherLayouts(nextLayouts);
    return nextLayout;
  }, [bencherLayouts]);

  const deleteBencherLayout = useCallback(async (id: string) => {
    const nextLayouts = bencherLayouts.filter((entry) => entry.id !== id);
    setBencherLayouts(nextLayouts);
    await saveSavedBencherLayouts(nextLayouts);
  }, [bencherLayouts]);

  const clearPrivateSongs = useCallback(async () => {
    setPrivateSongs([]);
    await savePrivateSongs([]);
  }, []);

  const clearSavedSheets = useCallback(async () => {
    setSavedSheets([]);
    await saveSavedSheets([]);
  }, []);

  const clearBencherLayouts = useCallback(async () => {
    setBencherLayouts([]);
    await saveSavedBencherLayouts([]);
  }, []);

  const clearPreferences = useCallback(async () => {
    prefsRef.current = {};
    setPreferences({});
    if (prefsSaveTimer.current) {
      clearTimeout(prefsSaveTimer.current);
      prefsSaveTimer.current = null;
    }
    await savePreferences({});
  }, []);

  const clearAllStoredData = useCallback(async () => {
    prefsRef.current = {};
    setPrivateSongs([]);
    setSavedSheets([]);
    setBencherLayouts([]);
    setPreferences({});
    if (prefsSaveTimer.current) {
      clearTimeout(prefsSaveTimer.current);
      prefsSaveTimer.current = null;
    }
    await Promise.all([
      savePrivateSongs([]),
      saveSavedSheets([]),
      saveSavedBencherLayouts([]),
      savePreferences({}),
    ]);
  }, []);

  const downloadTransferXml = useCallback(() => {
    if (!user) {
      throw new Error('Sign in before downloading transfer data.');
    }

    const transferPayload: TransferPayload = {
      schemaVersion: TRANSFER_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      sourceEmail: user.email,
      privateSongs,
      preferences,
      savedSheets,
      bencherLayouts,
    };
    const xml = createTransferXml(transferPayload);

    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);

    anchor.href = url;
    anchor.download = `niggunsheet-transfer-${dateStamp}.niggun`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [bencherLayouts, preferences, privateSongs, savedSheets, user]);

  const readTransferXmlFile = useCallback(async (file: File) => {
    const fileText = await file.text();
    return createTransferPreview(parseTransferXml(fileText));
  }, []);

  const importTransferXmlFile = useCallback(async (file: File, options: TransferImportOptions = {}) => {
    if (!user) {
      throw new Error('Sign in before importing transfer data.');
    }

    const importOptions = {
      privateSongs: options.privateSongs ?? true,
      savedSheets: options.savedSheets ?? true,
      bencherLayouts: options.bencherLayouts ?? true,
      preferences: options.preferences ?? true,
    };

    if (!importOptions.privateSongs && !importOptions.savedSheets && !importOptions.bencherLayouts && !importOptions.preferences) {
      throw new Error('Choose at least one thing to import.');
    }

    const fileText = await file.text();
    const transferPayload = parseTransferXml(fileText);
    const selectedPrivateSongs = importOptions.privateSongs ? filterTransferItems(transferPayload.privateSongs, options.privateSongIds) : [];
    const selectedSavedSheets = importOptions.savedSheets ? filterTransferItems(transferPayload.savedSheets, options.savedSheetIds) : [];
    const selectedBencherLayouts = importOptions.bencherLayouts ? filterTransferItems(transferPayload.bencherLayouts, options.bencherLayoutIds) : [];
    const nextPrivateSongs = importOptions.privateSongs ? mergeTransferItems(privateSongs, selectedPrivateSongs) : privateSongs;
    const nextSavedSheets = importOptions.savedSheets ? mergeTransferItems(savedSheets, selectedSavedSheets) : savedSheets;
    const nextBencherLayouts = importOptions.bencherLayouts ? mergeTransferItems(bencherLayouts, selectedBencherLayouts) : bencherLayouts;

    if (importOptions.savedSheets && nextSavedSheets.length > MAX_SAVED_SHEETS) {
      throw new Error(`Import would leave this account with ${nextSavedSheets.length} sheets, but the limit is ${MAX_SAVED_SHEETS}. Uncheck a sheet first.`);
    }
    if (importOptions.bencherLayouts && nextBencherLayouts.length > MAX_SAVED_SHEETS) {
      throw new Error(`Import would leave this account with ${nextBencherLayouts.length} benchers, but the limit is ${MAX_SAVED_SHEETS}. Uncheck a bencher first.`);
    }

    const saveTasks: Promise<unknown>[] = [];

    if (importOptions.privateSongs) saveTasks.push(savePrivateSongs(nextPrivateSongs));
    if (importOptions.preferences) saveTasks.push(savePreferences(transferPayload.preferences));
    if (importOptions.savedSheets) saveTasks.push(saveSavedSheets(nextSavedSheets));
    if (importOptions.bencherLayouts) saveTasks.push(saveSavedBencherLayouts(nextBencherLayouts));

    await Promise.all(saveTasks);

    if (importOptions.privateSongs) setPrivateSongs(nextPrivateSongs);
    if (importOptions.preferences) {
      if (prefsSaveTimer.current) {
        clearTimeout(prefsSaveTimer.current);
        prefsSaveTimer.current = null;
      }
      prefsRef.current = transferPayload.preferences;
      setPreferences(transferPayload.preferences);
    }
    if (importOptions.savedSheets) setSavedSheets(nextSavedSheets);
    if (importOptions.bencherLayouts) setBencherLayouts(nextBencherLayouts);

    return {
      sourceEmail: transferPayload.sourceEmail,
      exportedAt: transferPayload.exportedAt,
      privateSongsCount: selectedPrivateSongs.length,
      savedSheetsCount: selectedSavedSheets.length,
      bencherLayoutsCount: selectedBencherLayouts.length,
      preferencesCount: importOptions.preferences ? Object.keys(transferPayload.preferences).length : 0,
    };
  }, [bencherLayouts, privateSongs, savedSheets, user]);

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
    <GoogleAuthContext.Provider value={{ user, privateSongs, savedSheets, preferences, loading, restoring, ready, authError, signIn, signOut, addSong, addSongs, removeSong, editSong, saveSheet, bencherLayouts, saveBencherLayout, deleteBencherLayout, clearPrivateSongs, clearSavedSheets, clearBencherLayouts, clearPreferences, clearAllStoredData, downloadTransferXml, readTransferXmlFile, importTransferXmlFile, setPref }}>
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
