import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const projectRoot = process.cwd();
const songsCsvPath = path.join(projectRoot, 'data', 'songs.csv');
const waveformsPath = path.join(projectRoot, 'data', 'waveforms.json');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseCSVRows(csvText) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      row.push(cell.trim());
      cell = '';
      if (row.some((field) => field !== '')) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((field) => field !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function buildWaveformSamples(seedText, sampleCount = 320) {
  const random = seededRandom(hashString(seedText));
  const peaks = [];
  const peakCount = 8 + Math.floor(random() * 8);
  for (let i = 0; i < peakCount; i += 1) {
    peaks.push({
      center: random(),
      width: 0.04 + random() * 0.2,
      gain: 0.18 + random() * 0.7,
    });
  }

  const samples = [];
  let smooth = 0.2 + random() * 0.15;
  const phaseA = random() * Math.PI * 2;
  const phaseB = random() * Math.PI * 2;

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / Math.max(1, sampleCount - 1);

    let envelope = 0.04;
    for (const peak of peaks) {
      const dist = (t - peak.center) / peak.width;
      envelope += peak.gain * Math.exp(-(dist * dist));
    }

    const harmonicA = Math.sin(t * Math.PI * (6 + random() * 2) + phaseA) * 0.08;
    const harmonicB = Math.sin(t * Math.PI * (16 + random() * 3) + phaseB) * 0.045;
    const grit = (random() - 0.5) * 0.1;

    const target = Math.min(1, Math.max(0.02, envelope * 0.42 + harmonicA + harmonicB + grit + 0.08));
    smooth = smooth * 0.75 + target * 0.25;
    samples.push(Number(Math.min(1, Math.max(0.02, smooth)).toFixed(4)));
  }

  return samples;
}

function decodeFloat32LE(buffer) {
  const values = new Float32Array(Math.floor(buffer.length / 4));
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  for (let i = 0; i < values.length; i += 1) {
    values[i] = view.getFloat32(i * 4, true);
  }
  return values;
}

function resampleRms(samples, sampleCount = 320) {
  if (!samples.length) return [];

  const buckets = new Array(sampleCount).fill(0);
  const counts = new Array(sampleCount).fill(0);
  for (let i = 0; i < samples.length; i += 1) {
    const bucket = Math.min(sampleCount - 1, Math.floor((i / samples.length) * sampleCount));
    const value = samples[i];
    buckets[bucket] += value * value;
    counts[bucket] += 1;
  }

  const rms = buckets.map((sum, idx) => (counts[idx] > 0 ? Math.sqrt(sum / counts[idx]) : 0));
  const sorted = [...rms].sort((a, b) => a - b);
  const p95 = sorted[Math.max(0, Math.floor(sorted.length * 0.95) - 1)] || 1;

  return rms.map((value) => {
    const normalized = Math.min(1, value / p95);
    return Number(Math.max(0.02, normalized).toFixed(4));
  });
}

function ffmpegAvailable() {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version']);
    proc.on('error', () => resolve(false));
    proc.on('exit', (code) => resolve(code === 0));
  });
}

function extractWaveformFromAudioUrl(audioUrl, sampleCount = 320) {
  return new Promise((resolve) => {
    const args = [
      '-v', 'error',
      '-nostdin',
      '-t', '90',
      '-i', audioUrl,
      '-ac', '1',
      '-ar', '22050',
      '-f', 'f32le',
      '-',
    ];

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'ignore'] });
    const chunks = [];
    let totalBytes = 0;
    const maxBytes = 24 * 1024 * 1024;

    proc.stdout.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes <= maxBytes) {
        chunks.push(chunk);
      }
    });

    proc.on('error', () => resolve(null));
    proc.on('exit', (code) => {
      if (code !== 0 || chunks.length === 0) {
        resolve(null);
        return;
      }

      const floats = decodeFloat32LE(Buffer.concat(chunks));
      const waveform = resampleRms(floats, sampleCount);
      resolve(waveform.length ? waveform : null);
    });
  });
}

async function run() {
  if (!fs.existsSync(songsCsvPath)) {
    throw new Error(`Missing songs CSV at ${songsCsvPath}`);
  }

  const csvText = fs.readFileSync(songsCsvPath, 'utf8');
  const rows = parseCSVRows(csvText);
  const waveforms = {};
  const cachedByAudioUrl = new Map();
  const canUseFfmpeg = await ffmpegAvailable();
  let realCount = 0;
  let fallbackCount = 0;

  for (let index = 1; index < rows.length; index += 1) {
    const [searchTitle = '', title = '', lyrics = '', artist = '', _drive = '', _youtube = '', audio = ''] = rows[index] || [];
    if (!title) continue;

    const slug = slugify(title);
    if (!slug) continue;

    const seed = `${title}|${artist}|${lyrics.slice(0, 240)}|${searchTitle}`;
    let waveform = null;

    if (canUseFfmpeg && audio && /^https?:\/\//i.test(audio.trim())) {
      const audioUrl = audio.trim();
      if (cachedByAudioUrl.has(audioUrl)) {
        waveform = cachedByAudioUrl.get(audioUrl);
      } else {
        waveform = await extractWaveformFromAudioUrl(audioUrl);
        cachedByAudioUrl.set(audioUrl, waveform);
      }
    }

    if (!waveform) {
      waveform = buildWaveformSamples(seed);
      fallbackCount += 1;
    } else {
      realCount += 1;
    }

    waveforms[slug] = waveform;

    const searchSlug = slugify(searchTitle);
    if (searchSlug && !waveforms[searchSlug]) {
      waveforms[searchSlug] = waveforms[slug];
    }
  }

  fs.writeFileSync(waveformsPath, JSON.stringify(waveforms, null, 2));
  console.log(`Generated ${Object.keys(waveforms).length} waveforms -> ${waveformsPath}`);
  console.log(`Real audio-derived: ${realCount} | Fallback: ${fallbackCount} | ffmpeg: ${canUseFfmpeg ? 'available' : 'missing'}`);
}

run().catch((err) => {
  console.error('Waveform generation failed:', err.message);
  process.exitCode = 1;
});