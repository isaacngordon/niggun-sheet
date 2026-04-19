'use client';

import { useState, useCallback, useRef } from 'react';
import type { PrivateSong } from '@/lib/google-drive';

type NewSong = Omit<PrivateSong, 'id' | 'createdAt'>;

interface AddSongModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (song: NewSong) => Promise<void>;
  onSaveBulk?: (songs: NewSong[]) => Promise<void>;
}

const CSV_TEMPLATE = 'title,artist,lyrics,youtube_links,drive_link\n"Example Song","Artist Name","Line 1\\nLine 2\\nLine 3","https://youtube.com/watch?v=abc",""';

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  while (i < text.length) {
    const row: string[] = [];
    while (i < text.length) {
      if (text[i] === '"') {
        // Quoted field
        i++;
        let field = '';
        while (i < text.length) {
          if (text[i] === '"') {
            if (i + 1 < text.length && text[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++; // closing quote
              break;
            }
          } else {
            field += text[i];
            i++;
          }
        }
        row.push(field);
        if (i < text.length && text[i] === ',') i++;
        else if (i < text.length && (text[i] === '\n' || text[i] === '\r')) {
          if (text[i] === '\r' && i + 1 < text.length && text[i + 1] === '\n') i += 2;
          else i++;
          break;
        }
      } else {
        // Unquoted field
        let field = '';
        while (i < text.length && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
          field += text[i];
          i++;
        }
        row.push(field);
        if (i < text.length && text[i] === ',') i++;
        else if (i < text.length && (text[i] === '\n' || text[i] === '\r')) {
          if (text[i] === '\r' && i + 1 < text.length && text[i + 1] === '\n') i += 2;
          else i++;
          break;
        }
      }
    }
    if (i >= text.length && row.length === 0) break;
    rows.push(row);
    if (i >= text.length) break;
  }
  return rows;
}

function csvToSongs(text: string): { songs: NewSong[]; errors: string[] } {
  const rows = parseCSV(text);
  if (rows.length < 2) return { songs: [], errors: ['CSV must have a header row and at least one data row.'] };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const titleIdx = header.indexOf('title');
  const artistIdx = header.indexOf('artist');
  const lyricsIdx = header.indexOf('lyrics');
  const ytIdx = header.findIndex((h) => h.includes('youtube'));
  const driveIdx = header.findIndex((h) => h.includes('drive'));

  if (titleIdx === -1) return { songs: [], errors: ['CSV must have a "title" column.'] };

  const songs: NewSong[] = [];
  const errors: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const title = (row[titleIdx] || '').trim();
    if (!title) { errors.push(`Row ${r + 1}: missing title, skipped.`); continue; }
    const lyrics = lyricsIdx >= 0 ? (row[lyricsIdx] || '').trim().replace(/\\n/g, '\n') : '';
    const artist = artistIdx >= 0 ? (row[artistIdx] || '').trim() : '';
    const ytRaw = ytIdx >= 0 ? (row[ytIdx] || '').trim() : '';
    const ytLinks = ytRaw ? ytRaw.split(/\s+/).filter(Boolean) : undefined;
    const driveLink = driveIdx >= 0 ? (row[driveIdx] || '').trim() || undefined : undefined;
    songs.push({ title, artist, lyrics, youtubeLinks: ytLinks, driveLink });
  }

  return { songs, errors };
}

export default function AddSongModal({ open, onClose, onSave, onSaveBulk }: AddSongModalProps) {
  const [tab, setTab] = useState<'single' | 'csv'>('single');

  // Single song state
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [youtubeLinks, setYoutubeLinks] = useState<string[]>(['']);
  const [driveLink, setDriveLink] = useState('');
  const [saving, setSaving] = useState(false);

  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<NewSong[] | null>(null);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvSaving, setCsvSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setTitle(''); setArtist(''); setLyrics('');
    setYoutubeLinks(['']); setDriveLink('');
    setCsvFile(null); setCsvPreview(null); setCsvErrors([]);
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim() || !lyrics.trim()) return;
    setSaving(true);
    try {
      const ytLinks = youtubeLinks.map((l) => l.trim()).filter(Boolean);
      await onSave({
        title: title.trim(),
        artist: artist.trim(),
        lyrics: lyrics.trim(),
        youtubeLinks: ytLinks.length > 0 ? ytLinks : undefined,
        driveLink: driveLink.trim() || undefined,
      });
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  }, [title, artist, lyrics, youtubeLinks, driveLink, onSave, onClose, reset]);

  const handleCsvSelect = useCallback((file: File) => {
    setCsvFile(file);
    setCsvPreview(null);
    setCsvErrors([]);
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const { songs, errors } = csvToSongs(text);
      setCsvPreview(songs);
      setCsvErrors(errors);
    };
    reader.readAsText(file);
  }, []);

  const handleCsvUpload = useCallback(async () => {
    if (!csvPreview || csvPreview.length === 0) return;
    setCsvSaving(true);
    try {
      if (onSaveBulk) {
        await onSaveBulk(csvPreview);
      } else {
        for (const song of csvPreview) {
          await onSave(song);
        }
      }
      reset();
      onClose();
    } finally {
      setCsvSaving(false);
    }
  }, [csvPreview, onSave, onSaveBulk, onClose, reset]);

  const downloadTemplate = useCallback(() => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'niggunsheet-songs-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="add-song-modal-backdrop" onClick={handleBackdrop}>
      <div className="add-song-modal">
        <div className="add-song-modal-header">
          <h2>Add Songs</h2>
          <button className="add-song-modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Tabs */}
        <div className="add-song-tabs">
          <button className={`add-song-tab ${tab === 'single' ? 'active' : ''}`} onClick={() => setTab('single')}>Single Song</button>
          <button className={`add-song-tab ${tab === 'csv' ? 'active' : ''}`} onClick={() => setTab('csv')}>Import CSV</button>
        </div>

        {tab === 'single' ? (
          <>
            <div className="add-song-modal-body">
              <input type="text" placeholder="Song title *" value={title} onChange={(e) => setTitle(e.target.value)} className="add-song-input" />
              <input type="text" placeholder="Artist" value={artist} onChange={(e) => setArtist(e.target.value)} className="add-song-input" />
              <textarea placeholder="Lyrics *" value={lyrics} onChange={(e) => setLyrics(e.target.value)} className="add-song-textarea" rows={6} />
              <div className="add-song-links-group">
                <label>YouTube Links</label>
                {youtubeLinks.map((link, i) => (
                  <div key={i} className="add-song-link-row">
                    <input type="url" placeholder="https://youtube.com/watch?v=..." value={link} onChange={(e) => { const a = [...youtubeLinks]; a[i] = e.target.value; setYoutubeLinks(a); }} className="add-song-input" />
                    {youtubeLinks.length > 1 && <button type="button" className="add-song-link-remove" onClick={() => setYoutubeLinks(youtubeLinks.filter((_, j) => j !== i))}>×</button>}
                  </div>
                ))}
                <button type="button" className="add-song-link-add" onClick={() => setYoutubeLinks([...youtubeLinks, ''])}>+ Add another link</button>
              </div>
              <div className="add-song-links-group">
                <label>Google Drive Link</label>
                <input type="url" placeholder="https://drive.google.com/..." value={driveLink} onChange={(e) => setDriveLink(e.target.value)} className="add-song-input" />
              </div>
            </div>
            <div className="add-song-modal-footer">
              <button className="add-song-cancel-btn" onClick={onClose}>Cancel</button>
              <button className="add-song-save-btn" onClick={handleSave} disabled={saving || !title.trim() || !lyrics.trim()}>
                {saving ? 'Saving...' : 'Save to My Drive'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="add-song-modal-body">
              <div className="csv-instructions">
                <p>Import multiple songs at once from a CSV file.</p>
                <button className="csv-template-btn" onClick={downloadTemplate}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download Template
                </button>
              </div>

              <div
                className="csv-drop-zone"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('dragover');
                  const file = e.dataTransfer.files[0];
                  if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) handleCsvSelect(file);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCsvSelect(file);
                    e.target.value = '';
                  }}
                />
                {csvFile ? (
                  <div className="csv-file-info">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f2cb05" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span>{csvFile.name}</span>
                  </div>
                ) : (
                  <div className="csv-drop-prompt">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span>Drop a CSV file here or click to browse</span>
                  </div>
                )}
              </div>

              {csvErrors.length > 0 && (
                <div className="csv-errors">
                  {csvErrors.map((err, i) => <div key={i} className="csv-error-line">{err}</div>)}
                </div>
              )}

              {csvPreview && csvPreview.length > 0 && (
                <div className="csv-preview">
                  <div className="csv-preview-header">{csvPreview.length} song{csvPreview.length !== 1 ? 's' : ''} found</div>
                  <div className="csv-preview-list">
                    {csvPreview.map((s, i) => (
                      <div key={i} className="csv-preview-row">
                        <strong>{s.title}</strong>
                        {s.artist && <span> — {s.artist}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="add-song-modal-footer">
              <button className="add-song-cancel-btn" onClick={onClose}>Cancel</button>
              <button className="add-song-save-btn" onClick={handleCsvUpload} disabled={csvSaving || !csvPreview || csvPreview.length === 0}>
                {csvSaving ? 'Saving...' : `Import ${csvPreview?.length || 0} Song${(csvPreview?.length || 0) !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
