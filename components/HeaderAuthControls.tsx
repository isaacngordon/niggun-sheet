'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GoogleAuthProvider, useGoogleAuth, useOptionalGoogleAuth } from '@/components/GoogleAuthProvider';
import type { TransferFilePreview } from '@/components/GoogleAuthProvider';

interface HeaderAuthControlsProps {
  mobile?: boolean;
  onDone?: () => void;
}

function truncatePreview(value: string, limit = 180) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1)}…`;
}

function toVisualLines(lines: string[], max = 4) {
  return lines.slice(0, max).map((line) => truncatePreview(line || ' ', 42));
}

function distributeSongsByHeight<T extends { lyrics: string }>(songs: T[], columnCount: number) {
  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  const heights = Array.from({ length: columnCount }, () => 0);

  songs.forEach((song) => {
    const estimatedHeight = Math.max(1, song.lyrics.split('\n').filter(Boolean).length) + 2;
    let targetColumn = 0;
    for (let index = 1; index < heights.length; index += 1) {
      if (heights[index] < heights[targetColumn]) {
        targetColumn = index;
      }
    }
    columns[targetColumn].push(song);
    heights[targetColumn] += estimatedHeight;
  });

  return columns;
}

const MANAGER_PAGE_CONTENT_HEIGHT = 636;
const MANAGER_CARD_VERTICAL_GAP = 8;
const MANAGER_CONFIGS = [
  { cols: 1, fontSize: 14 },
  { cols: 2, fontSize: 14 },
  { cols: 2, fontSize: 13 },
  { cols: 2, fontSize: 12 },
  { cols: 3, fontSize: 14 },
  { cols: 3, fontSize: 13 },
  { cols: 3, fontSize: 12 },
  { cols: 2, fontSize: 11 },
  { cols: 3, fontSize: 11 },
  { cols: 2, fontSize: 10 },
  { cols: 3, fontSize: 10 },
  { cols: 2, fontSize: 9 },
  { cols: 3, fontSize: 9 },
  { cols: 2, fontSize: 8 },
  { cols: 3, fontSize: 8 },
];

interface PreviewSongItem {
  title: string;
  artist: string;
  lyrics: string;
  order: number;
}

function estimateManagerSongHeight(song: PreviewSongItem, fontSize: number, showTitles: boolean) {
  const lyricLines = Math.max(1, (song.lyrics || '').split('\n').length);
  const titleHeight = showTitles ? fontSize * 1.4 + 4 : 0;
  const lyricHeight = lyricLines * fontSize * 1.35;
  return Math.ceil(titleHeight + lyricHeight + 8);
}

function buildPreviewPages(
  songs: PreviewSongItem[],
  columnCount: number,
  showTitles: boolean,
  fontSize: number,
) {
  const pages: PreviewSongItem[][][] = [];
  let columns: PreviewSongItem[][] = Array.from({ length: columnCount }, () => []);
  let columnHeights = Array.from({ length: columnCount }, () => 0);
  let currentColumn = 0;

  for (const song of songs) {
    const songHeight = estimateManagerSongHeight(song, fontSize, showTitles);
    const nextHeight = columns[currentColumn].length === 0
      ? songHeight
      : columnHeights[currentColumn] + MANAGER_CARD_VERTICAL_GAP + songHeight;

    if (nextHeight > MANAGER_PAGE_CONTENT_HEIGHT && columns[currentColumn].length > 0) {
      currentColumn += 1;
      if (currentColumn >= columnCount) {
        pages.push(columns);
        columns = Array.from({ length: columnCount }, () => []);
        columnHeights = Array.from({ length: columnCount }, () => 0);
        currentColumn = 0;
      }
    }

    columns[currentColumn].push(song);
    columnHeights[currentColumn] = columns[currentColumn].length === 1
      ? songHeight
      : columnHeights[currentColumn] + MANAGER_CARD_VERTICAL_GAP + songHeight;
  }

  const hasContent = columns.some((column) => column.length > 0);
  if (hasContent || pages.length === 0) {
    pages.push(columns);
  }

  return pages;
}

function chooseManagerPreviewConfig(songs: PreviewSongItem[], savedColumnCount: number, autoFit: boolean, showTitles: boolean) {
  if (!autoFit) {
    return { cols: savedColumnCount, fontSize: 10 };
  }

  return MANAGER_CONFIGS.find((config) => buildPreviewPages(songs, config.cols, showTitles, config.fontSize).length <= 1) ?? MANAGER_CONFIGS[MANAGER_CONFIGS.length - 1];
}

function HeaderAuthControlsView({ mobile = false, onDone }: HeaderAuthControlsProps) {
  const {
    user,
    privateSongs,
    savedSheets,
    bencherLayouts,
    signIn,
    signOut,
    loading: authLoading,
    restoring,
    ready: authReady,
    authError,
    downloadTransferXml,
    readTransferXmlFile,
    importTransferXmlFile,
  } = useGoogleAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageSection, setManageSection] = useState<'transfer' | 'songs' | 'sheets' | 'benchers'>('songs');
  const [managePreviewId, setManagePreviewId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [importChoices, setImportChoices] = useState({
    privateSongs: true,
    savedSheets: true,
    bencherLayouts: true,
    preferences: true,
    privateSongIds: [] as string[],
    savedSheetIds: [] as string[],
    bencherLayoutIds: [] as string[],
  });
  const [transferPreview, setTransferPreview] = useState<TransferFilePreview | null>(null);
  const [transferPreviewLoading, setTransferPreviewLoading] = useState(false);
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferMessage, setTransferMessage] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handlePointerDown);
    }

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [menuOpen]);

  const handleDownloadTransfer = useCallback(() => {
    setTransferError(null);
    setTransferMessage(null);
    try {
      downloadTransferXml();
      setTransferMessage('Your .niggun file is ready. Send it to the other person or keep it as a backup.');
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : 'We could not download your .niggun file.');
    }
  }, [downloadTransferXml]);

  const handleTransferFileSelect = useCallback(async (file: File | null) => {
    setUploadFile(file);
    setTransferPreview(null);
    setTransferError(null);
    setTransferMessage(null);

    if (!file) {
      return;
    }

    setTransferPreviewLoading(true);
    try {
      const preview = await readTransferXmlFile(file);
      setTransferPreview(preview);
      setImportChoices({
        privateSongs: preview.privateSongs.length > 0,
        savedSheets: preview.savedSheets.length > 0,
        bencherLayouts: preview.bencherLayouts.length > 0,
        preferences: preview.preferencesCount > 0,
        privateSongIds: preview.privateSongs.map((item) => item.id),
        savedSheetIds: preview.savedSheets.map((item) => item.id),
        bencherLayoutIds: preview.bencherLayouts.map((item) => item.id),
      });
    } catch (error) {
      setUploadFile(null);
      setTransferError(error instanceof Error ? error.message : 'We could not read that .niggun file.');
    } finally {
      setTransferPreviewLoading(false);
    }
  }, [readTransferXmlFile]);

  const handleUploadTransfer = useCallback(async () => {
    if (!uploadFile) {
      setTransferError('Pick a .niggun file first.');
      return;
    }

    const hasSelectedImport =
      (importChoices.privateSongs && importChoices.privateSongIds.length > 0) ||
      (importChoices.savedSheets && importChoices.savedSheetIds.length > 0) ||
      (importChoices.bencherLayouts && importChoices.bencherLayoutIds.length > 0) ||
      importChoices.preferences;

    if (!hasSelectedImport) {
      setTransferError('Pick at least one thing to bring in first.');
      return;
    }

    setTransferBusy(true);
    setTransferError(null);
    setTransferMessage(null);

    try {
      const summary = await importTransferXmlFile(uploadFile, importChoices);
      const importedParts = [
        importChoices.privateSongs ? `${summary.privateSongsCount} song${summary.privateSongsCount === 1 ? '' : 's'}` : null,
        importChoices.savedSheets ? `${summary.savedSheetsCount} sheet${summary.savedSheetsCount === 1 ? '' : 's'}` : null,
        importChoices.bencherLayouts ? `${summary.bencherLayoutsCount} bencher${summary.bencherLayoutsCount === 1 ? '' : 's'}` : null,
        importChoices.preferences ? 'preferences' : null,
      ].filter(Boolean).join(', ');
      setTransferMessage(`Done. Added ${importedParts}. Anything you left unchecked stayed the same.`);
      setUploadFile(null);
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : 'We could not bring in that .niggun file.');
    } finally {
      setTransferBusy(false);
    }
  }, [importChoices, importTransferXmlFile, uploadFile]);

  const setImportCategoryChoice = useCallback((key: 'privateSongs' | 'savedSheets' | 'bencherLayouts' | 'preferences', value: boolean) => {
    setImportChoices((current) => {
      if (key === 'privateSongs') {
        return { ...current, privateSongs: value, privateSongIds: value ? transferPreview?.privateSongs.map((item) => item.id) ?? [] : [] };
      }
      if (key === 'savedSheets') {
        return { ...current, savedSheets: value, savedSheetIds: value ? transferPreview?.savedSheets.map((item) => item.id) ?? [] : [] };
      }
      if (key === 'bencherLayouts') {
        return { ...current, bencherLayouts: value, bencherLayoutIds: value ? transferPreview?.bencherLayouts.map((item) => item.id) ?? [] : [] };
      }
      return { ...current, preferences: value };
    });
  }, [transferPreview]);

  const setImportItemChoice = useCallback((key: 'privateSongIds' | 'savedSheetIds' | 'bencherLayoutIds', itemId: string, value: boolean) => {
    setImportChoices((current) => {
      const currentIds = current[key];
      const nextIds = value ? Array.from(new Set([...currentIds, itemId])) : currentIds.filter((id) => id !== itemId);
      if (key === 'privateSongIds') return { ...current, privateSongIds: nextIds, privateSongs: nextIds.length > 0 };
      if (key === 'savedSheetIds') return { ...current, savedSheetIds: nextIds, savedSheets: nextIds.length > 0 };
      return { ...current, bencherLayoutIds: nextIds, bencherLayouts: nextIds.length > 0 };
    });
  }, []);

  const closeModals = useCallback(() => {
    if (transferBusy) {
      return;
    }
    setShowManageModal(false);
  }, [transferBusy]);

  useEffect(() => {
    if (!showManageModal) return;
    if (manageSection === 'transfer') {
      setManagePreviewId(null);
      return;
    }
    if (manageSection === 'songs') {
      setManagePreviewId(privateSongs[0]?.id ?? null);
      return;
    }
    if (manageSection === 'sheets') {
      setManagePreviewId(savedSheets[0]?.id ?? null);
      return;
    }
    setManagePreviewId(bencherLayouts[0]?.id ?? null);
  }, [showManageModal, manageSection, privateSongs, savedSheets, bencherLayouts]);

  const modalRoot = mounted ? document.body : null;

  if (mobile) {
    if (user) {
      return (
        <>
          <span className="mobile-nav-user" style={restoring ? { opacity: 0.6 } : undefined}>{user.email}</span>
          {!restoring && (
            <button
              className="mobile-nav-signout"
              onClick={() => {
                setMenuOpen(false);
                setManageSection('transfer');
                setShowManageModal(true);
              }}
            >
              My Data
            </button>
          )}
          {!restoring && (
            <button
              onClick={() => {
                signOut();
                onDone?.();
              }}
              className="mobile-nav-signout"
            >
              Sign Out
            </button>
          )}
          {transferError && <p className="header-auth-error mobile">{transferError}</p>}
          {transferMessage && <p className="header-auth-success mobile">{transferMessage}</p>}
        </>
      );
    }

    return (
      <div className="header-auth-control-group mobile">
        <button
          onClick={() => {
            void signIn().finally(() => onDone?.());
          }}
          disabled={authLoading || !authReady}
          className={`mobile-nav-signin ${authError ? 'auth-error' : ''}`}
          title={authError || undefined}
        >
          {authLoading ? 'Signing in...' : 'Sign in with Google'}
        </button>
        {authError && <p className="header-auth-error mobile">{authError}</p>}
      </div>
    );
  }

  if (user) {
    return (
      <div className="header-user-menu">
        <div className="header-account-menu" ref={menuRef}>
          <button
            type="button"
            className="header-signed-in header-account-trigger"
            title={user.email}
            style={restoring ? { opacity: 0.6 } : undefined}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            {user.email.split('@')[0]}
            <span className="header-account-caret" aria-hidden="true">▾</span>
          </button>
          {menuOpen && !restoring ? (
            <div className="header-account-dropdown" role="menu" aria-label="My data">
              <button
                type="button"
                className="header-account-item"
                onClick={() => {
                  setMenuOpen(false);
                  setManageSection('transfer');
                  setShowManageModal(true);
                }}
              >
                My Data
              </button>
              <button
                type="button"
                className="header-account-item danger"
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
              >
                Sign Out
              </button>
            </div>
          ) : null}
        </div>
        {transferError && <p className="header-auth-error">{transferError}</p>}
        {transferMessage && <p className="header-auth-success">{transferMessage}</p>}

        {modalRoot && showManageModal ? createPortal(
          <div className="header-manager-modal-backdrop" onClick={closeModals}>
            <div className="header-manager-modal header-manager-modal-wide" onClick={(event) => event.stopPropagation()}>
              <h3>My Data</h3>
              <p>Move your saved stuff, or look at what this account already has.</p>
              <input
                ref={uploadInputRef}
                type="file"
                accept=".niggun,.xml,text/xml,application/xml"
                style={{ display: 'none' }}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void handleTransferFileSelect(file);
                  event.target.value = '';
                }}
              />
              <div className="header-manager-section-tabs">
                <button
                  type="button"
                  className={`header-manager-section-tab ${manageSection === 'transfer' ? 'active' : ''}`}
                  onClick={() => {
                    setManageSection('transfer');
                    setManagePreviewId(null);
                  }}
                >
                  Transfer
                </button>
                <button
                  type="button"
                  className={`header-manager-section-tab ${manageSection === 'songs' ? 'active' : ''}`}
                  onClick={() => {
                    setManageSection('songs');
                    setManagePreviewId(privateSongs[0]?.id ?? null);
                  }}
                >
                  Songs ({privateSongs.length})
                </button>
                <button
                  type="button"
                  className={`header-manager-section-tab ${manageSection === 'sheets' ? 'active' : ''}`}
                  onClick={() => {
                    setManageSection('sheets');
                    setManagePreviewId(savedSheets[0]?.id ?? null);
                  }}
                >
                  Sheets ({savedSheets.length})
                </button>
                <button
                  type="button"
                  className={`header-manager-section-tab ${manageSection === 'benchers' ? 'active' : ''}`}
                  onClick={() => {
                    setManageSection('benchers');
                    setManagePreviewId(bencherLayouts[0]?.id ?? null);
                  }}
                >
                  Benchers ({bencherLayouts.length})
                </button>
              </div>
              {manageSection === 'transfer' ? (
                <div className="header-manager-transfer-panel">
                  <div className="header-manager-transfer-card">
                    <h4>Download your data</h4>
                    <p>Use this if you want to move your saved songs, sheets, and benchers to another Google account.</p>
                    <ol>
                      <li>Press Download.</li>
                      <li>A .niggun file will save to your computer.</li>
                      <li>Send that file to someone else, or keep it as a backup.</li>
                    </ol>
                    <button type="button" className="header-signout-btn" onClick={handleDownloadTransfer} disabled={transferBusy}>Download .niggun File</button>
                  </div>
                  <div className="header-manager-transfer-card">
                    <h4>Upload into this account</h4>
                    <p>Use this if someone gave you a .niggun file, or if you want to bring back your backup.</p>
                    <ol>
                      <li>Press Choose File.</li>
                      <li>Pick the .niggun file.</li>
                      <li>Press Upload.</li>
                    </ol>
                    <div className="header-manager-file-row">
                      <button type="button" className="header-signout-btn" onClick={() => uploadInputRef.current?.click()} disabled={transferBusy}>
                        Choose File
                      </button>
                      <span>{uploadFile?.name ?? 'No file picked yet'}</span>
                    </div>
                    {transferPreviewLoading && <p>Reading the file...</p>}
                    {transferPreview && (
                      <div className="header-manager-import-options">
                        <div className="header-manager-import-source">
                          From {transferPreview.sourceEmail || 'unknown account'} · {new Date(transferPreview.exportedAt).toLocaleDateString()}
                        </div>
                        <div className="header-manager-import-group">
                          <label className="header-manager-check-row">
                            <input
                              type="checkbox"
                              checked={importChoices.privateSongs}
                              disabled={transferPreview.privateSongs.length === 0 || transferBusy}
                              onChange={(event) => setImportCategoryChoice('privateSongs', event.target.checked)}
                            />
                            <span>Songs ({transferPreview.privateSongs.length})</span>
                          </label>
                          {importChoices.privateSongs && transferPreview.privateSongs.length > 0 && (
                            <div className="header-manager-import-items">
                              {transferPreview.privateSongs.map((item) => (
                                <label key={item.id} className="header-manager-check-row small">
                                  <input
                                    type="checkbox"
                                    checked={importChoices.privateSongIds.includes(item.id)}
                                    disabled={transferBusy}
                                    onChange={(event) => setImportItemChoice('privateSongIds', item.id, event.target.checked)}
                                  />
                                  <span>{item.title}<small>{item.subtitle}</small></span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="header-manager-import-group">
                          <label className="header-manager-check-row">
                            <input
                              type="checkbox"
                              checked={importChoices.savedSheets}
                              disabled={transferPreview.savedSheets.length === 0 || transferBusy}
                              onChange={(event) => setImportCategoryChoice('savedSheets', event.target.checked)}
                            />
                            <span>Sheets ({transferPreview.savedSheets.length})</span>
                          </label>
                          {importChoices.savedSheets && transferPreview.savedSheets.length > 0 && (
                            <div className="header-manager-import-items">
                              {transferPreview.savedSheets.map((item) => (
                                <label key={item.id} className="header-manager-check-row small">
                                  <input
                                    type="checkbox"
                                    checked={importChoices.savedSheetIds.includes(item.id)}
                                    disabled={transferBusy}
                                    onChange={(event) => setImportItemChoice('savedSheetIds', item.id, event.target.checked)}
                                  />
                                  <span>{item.title}<small>{item.subtitle}</small></span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="header-manager-import-group">
                          <label className="header-manager-check-row">
                            <input
                              type="checkbox"
                              checked={importChoices.bencherLayouts}
                              disabled={transferPreview.bencherLayouts.length === 0 || transferBusy}
                              onChange={(event) => setImportCategoryChoice('bencherLayouts', event.target.checked)}
                            />
                            <span>Benchers ({transferPreview.bencherLayouts.length})</span>
                          </label>
                          {importChoices.bencherLayouts && transferPreview.bencherLayouts.length > 0 && (
                            <div className="header-manager-import-items">
                              {transferPreview.bencherLayouts.map((item) => (
                                <label key={item.id} className="header-manager-check-row small">
                                  <input
                                    type="checkbox"
                                    checked={importChoices.bencherLayoutIds.includes(item.id)}
                                    disabled={transferBusy}
                                    onChange={(event) => setImportItemChoice('bencherLayoutIds', item.id, event.target.checked)}
                                  />
                                  <span>{item.title}<small>{item.subtitle}</small></span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                        <label className="header-manager-check-row">
                          <input
                            type="checkbox"
                            checked={importChoices.preferences}
                            disabled={transferPreview.preferencesCount === 0 || transferBusy}
                            onChange={(event) => setImportCategoryChoice('preferences', event.target.checked)}
                          />
                            <span>Settings ({transferPreview.preferencesCount})</span>
                        </label>
                      </div>
                    )}
                    <button type="button" className="header-signin-btn" onClick={() => { void handleUploadTransfer(); }} disabled={transferBusy || transferPreviewLoading || !transferPreview}>
                      {transferBusy ? 'Uploading...' : 'Upload .niggun File'}
                    </button>
                  </div>
                  {(transferError || transferMessage) && (
                    <div className={transferError ? 'header-manager-transfer-status error' : 'header-manager-transfer-status success'}>
                      {transferError ?? transferMessage}
                    </div>
                  )}
                </div>
              ) : (
              <div className="header-manager-browser">
                <div className="header-manager-browser-list">
                  {manageSection === 'songs' && (
                    privateSongs.length > 0 ? (
                      privateSongs.map((song) => (
                        <button
                          key={song.id}
                          type="button"
                          className={`header-manager-browser-item ${managePreviewId === song.id ? 'active' : ''}`}
                          onMouseEnter={() => setManagePreviewId(song.id)}
                          onFocus={() => setManagePreviewId(song.id)}
                        >
                          <span className="header-manager-browser-item-title">{song.title}</span>
                        </button>
                      ))
                    ) : (
                      <div className="header-manager-browser-empty">No songs saved here yet.</div>
                    )
                  )}
                  {manageSection === 'sheets' && (
                    savedSheets.length > 0 ? (
                      savedSheets.map((sheet) => (
                        <button
                          key={sheet.id}
                          type="button"
                          className={`header-manager-browser-item ${managePreviewId === sheet.id ? 'active' : ''}`}
                          onMouseEnter={() => setManagePreviewId(sheet.id)}
                          onFocus={() => setManagePreviewId(sheet.id)}
                        >
                          <span className="header-manager-browser-item-title">{sheet.title}</span>
                        </button>
                      ))
                    ) : (
                      <div className="header-manager-browser-empty">No saved sheets yet.</div>
                    )
                  )}
                  {manageSection === 'benchers' && (
                    bencherLayouts.length > 0 ? (
                      bencherLayouts.map((layout) => (
                        <button
                          key={layout.id}
                          type="button"
                          className={`header-manager-browser-item ${managePreviewId === layout.id ? 'active' : ''}`}
                          onMouseEnter={() => setManagePreviewId(layout.id)}
                          onFocus={() => setManagePreviewId(layout.id)}
                        >
                          <span className="header-manager-browser-item-title">{layout.title}</span>
                        </button>
                      ))
                    ) : (
                      <div className="header-manager-browser-empty">No benchers yet.</div>
                    )
                  )}
                </div>

                <div className="header-manager-browser-preview">
                  {manageSection === 'songs' && (() => {
                    const song = privateSongs.find((entry) => entry.id === managePreviewId) ?? privateSongs[0];
                    if (!song) return <div className="header-manager-browser-empty">Point to a song to preview it.</div>;

                    return (
                      <div className="header-manager-sheetskin-wrap">
                        <div className="header-manager-sheetskin-page">
                          <div className="header-manager-sheetskin-title">{song.title}</div>
                          <div className="header-manager-sheetskin-subtitle">{song.artist || 'No singer name'}</div>
                          <div className="header-manager-sheetskin-grid" style={{ '--manager-preview-columns': 1 } as React.CSSProperties}>
                            <div className="header-manager-sheetskin-card">
                              {toVisualLines((song.lyrics || '').split('\n').filter(Boolean), 6).join(' / ') || 'No words saved'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {manageSection === 'sheets' && (() => {
                    const sheet = savedSheets.find((entry) => entry.id === managePreviewId) ?? savedSheets[0];
                    if (!sheet) return <div className="header-manager-browser-empty">Point to a sheet to preview it.</div>;
                    const previewSongs = sheet.songs.map((song, index) => ({ ...song, order: index + 1 }));
                    const savedColumnCount = Math.max(1, Math.min(3, sheet.manualColumns || 2));
                    const previewConfig = chooseManagerPreviewConfig(previewSongs, savedColumnCount, sheet.autoFit, sheet.showTitles);
                    const previewPages = buildPreviewPages(previewSongs, previewConfig.cols, sheet.showTitles, previewConfig.fontSize);

                    return (
                      <div className="header-manager-preview-stack">
                        <div className="header-manager-preview-head">
                          <div>
                            <div className="header-manager-preview-title">{sheet.title}</div>
                            <div className="header-manager-preview-subtitle">Updated {new Date(sheet.updatedAt).toLocaleDateString()}</div>
                          </div>
                          <div className="header-manager-preview-meta">
                            <span>{sheet.songs.length} songs</span>
                            <span>{previewPages.length} page{previewPages.length === 1 ? '' : 's'}</span>
                            <span>{previewConfig.cols} col</span>
                          </div>
                        </div>

                        <div className={`header-manager-preview-scroll-hint ${previewPages.length > 1 ? 'visible' : 'hidden'}`}>
                          {previewPages.length > 1 ? 'Scroll to see every page' : ''}
                        </div>

                        {previewPages.map((pageColumns, pageIndex) => (
                          <div key={`${sheet.id}-page-${pageIndex}`} className="header-manager-preview-page-frame">
                            <div className="header-manager-sheetskin-wrap">
                              <div className="header-manager-sheetskin-page">
                                <div className="header-manager-sheetskin-grid" style={{ '--manager-preview-columns': previewConfig.cols } as React.CSSProperties}>
                                  {pageColumns.map((columnSongs, columnIndex) => (
                                    <div key={`${sheet.id}-page-${pageIndex}-column-${columnIndex}`} className="header-manager-sheetskin-column">
                                      {columnSongs.map((song) => (
                                        <div key={`${sheet.id}-page-${pageIndex}-${song.order}-${song.title}`} className="header-manager-sheetskin-card" style={{ fontSize: `${previewConfig.fontSize}px` }}>
                                          {sheet.showTitles && (
                                            <div className="header-manager-sheetskin-card-title">
                                              {sheet.showOrderNumbers ? `${song.order}. ` : ''}{song.title}
                                            </div>
                                          )}
                                          <div className="header-manager-sheetskin-card-lyrics">{song.lyrics || '(No lyrics)'}</div>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                                <div className="header-manager-sheetskin-page-number">{sheet.showPageNumbers ? `${pageIndex + 1}` : ''}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {manageSection === 'benchers' && (() => {
                    const bencher = bencherLayouts.find((entry) => entry.id === managePreviewId) ?? bencherLayouts[0];
                    if (!bencher) return <div className="header-manager-browser-empty">Point to a bencher to preview it.</div>;
                    const previewSongs = bencher.songs.map((song, index) => ({ ...song, order: index + 1 }));
                    const previewPages = buildPreviewPages(previewSongs, 1, bencher.showTitles, 10);

                    return (
                      <div className="header-manager-preview-stack">
                        <div className="header-manager-preview-head">
                          <div>
                            <div className="header-manager-preview-title">{bencher.title}</div>
                            <div className="header-manager-preview-subtitle">Updated {new Date(bencher.updatedAt).toLocaleDateString()}</div>
                          </div>
                          <div className="header-manager-preview-meta">
                            <span>{bencher.songs.length} songs</span>
                            <span>{previewPages.length} page{previewPages.length === 1 ? '' : 's'}</span>
                            <span>1 col</span>
                          </div>
                        </div>

                        <div className={`header-manager-preview-scroll-hint ${previewPages.length > 1 ? 'visible' : 'hidden'}`}>
                          {previewPages.length > 1 ? 'Scroll to see every page' : ''}
                        </div>

                        {previewPages.map((pageColumns, pageIndex) => (
                          <div key={`${bencher.id}-page-${pageIndex}`} className="header-manager-preview-page-frame">
                            <div className="header-manager-sheetskin-wrap">
                              <div className="header-manager-sheetskin-page">
                                <div className="header-manager-sheetskin-grid" style={{ '--manager-preview-columns': 1 } as React.CSSProperties}>
                                  {pageColumns.map((columnSongs, columnIndex) => (
                                    <div key={`${bencher.id}-page-${pageIndex}-column-${columnIndex}`} className="header-manager-sheetskin-column">
                                      {columnSongs.map((song) => (
                                        <div key={`${bencher.id}-page-${pageIndex}-${song.order}-${song.title}`} className="header-manager-sheetskin-card" style={{ fontSize: '10px' }}>
                                          {bencher.showTitles && (
                                            <div className="header-manager-sheetskin-card-title">
                                              {song.order}. {song.title}
                                            </div>
                                          )}
                                          <div className="header-manager-sheetskin-card-lyrics">{song.lyrics || '(No lyrics)'}</div>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                                <div className="header-manager-sheetskin-page-number">{pageIndex + 1}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              )}
              <div className="header-manager-modal-actions">
                <button type="button" className="header-signout-btn" onClick={closeModals}>Close</button>
              </div>
            </div>
          </div>,
          modalRoot,
        ) : null}
      </div>
    );
  }

  return (
    <div className="header-auth-control-group">
      <button
        onClick={() => {
          void signIn();
        }}
        disabled={authLoading || !authReady}
        className={`header-signin-btn ${authError ? 'auth-error' : ''}`}
        title={authError || undefined}
      >
        {authLoading ? 'Signing in...' : 'Sign in'}
      </button>
      {authError && <p className="header-auth-error">{authError}</p>}
    </div>
  );
}

export default function HeaderAuthControls(props: HeaderAuthControlsProps) {
  const auth = useOptionalGoogleAuth();

  if (auth) {
    return <HeaderAuthControlsView {...props} />;
  }

  return (
    <GoogleAuthProvider>
      <HeaderAuthControlsView {...props} />
    </GoogleAuthProvider>
  );
}