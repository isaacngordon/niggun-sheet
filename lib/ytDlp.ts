import fs from 'fs/promises';
import { spawn } from 'child_process';
import path from 'path';

export interface YtDlpDownloadResult {
  filePath: string;
  title: string | null;
}

interface YtDlpAttempt {
  label: string;
  args: string[];
}

interface CommandResult {
  stdout: string;
  stderr: string;
}

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

function runCommand(command: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr.trim() || stdout.trim() || `${command} exited with code ${code}`));
    });
  });
}

export function parseYtDlpOutput(stdout: string): YtDlpDownloadResult | null {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  const filePath = lines[lines.length - 1];
  const title = lines.length >= 2 ? lines[0] : null;
  return {
    filePath,
    title,
  };
}

export function getYoutubeAudioCacheDir(): string {
  return path.resolve(process.env.YT_DLP_CACHE_DIR?.trim() || path.join(process.cwd(), '.cache', 'youtube-audio'));
}

export function extractYoutubeVideoId(url: string): string | null {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) return null;

  try {
    const parsedUrl = new URL(normalizedUrl);
    const host = parsedUrl.hostname.toLowerCase();
    if (!YOUTUBE_HOSTS.has(host)) return null;

    if (host.endsWith('youtu.be')) {
      const shortId = parsedUrl.pathname.split('/').filter(Boolean)[0];
      return shortId && /^[A-Za-z0-9_-]{6,}$/.test(shortId) ? shortId : null;
    }

    const queryId = parsedUrl.searchParams.get('v');
    if (queryId && /^[A-Za-z0-9_-]{6,}$/.test(queryId)) {
      return queryId;
    }

    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    const embeddedId = pathParts.length >= 2 && ['embed', 'shorts', 'live'].includes(pathParts[0])
      ? pathParts[1]
      : null;

    return embeddedId && /^[A-Za-z0-9_-]{6,}$/.test(embeddedId) ? embeddedId : null;
  } catch {
    return null;
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function inferTitleFromPath(filePath: string, videoId: string): string | null {
  const extension = path.extname(filePath);
  const baseName = path.basename(filePath, extension);
  const suffix = ` [${videoId}]`;

  return baseName.endsWith(suffix)
    ? baseName.slice(0, -suffix.length).trim() || null
    : null;
}

export async function findCachedYoutubeAudio(videoId: string, outputDir: string): Promise<YtDlpDownloadResult | null> {
  const entries = await fs.readdir(outputDir, { withFileTypes: true }).catch(() => []);
  const videoIdPattern = new RegExp(`\\[${escapeRegex(videoId)}\\]\\.[^./]+$`);

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!videoIdPattern.test(entry.name)) continue;

    const filePath = path.resolve(outputDir, entry.name);
    return {
      filePath,
      title: inferTitleFromPath(filePath, videoId),
    };
  }

  return null;
}

function buildBaseArgs(outputDir: string, normalizedUrl: string): string[] {
  return [
    '--no-playlist',
    '--no-warnings',
    '--print', '%(title)s',
    '--print', 'after_move:filepath',
    '--paths', outputDir,
    '--output', '%(title).160B [%(id)s].%(ext)s',
    '-f', 'bestaudio/best',
    normalizedUrl,
  ];
}

function buildDownloadAttempts(outputDir: string, normalizedUrl: string): YtDlpAttempt[] {
  const baseArgs = buildBaseArgs(outputDir, normalizedUrl);
  const attempts: YtDlpAttempt[] = [
    { label: 'direct', args: baseArgs },
  ];

  const cookiesFile = process.env.YT_DLP_COOKIES_FILE?.trim();
  if (cookiesFile) {
    attempts.push({
      label: `cookies-file:${cookiesFile}`,
      args: ['--cookies', cookiesFile, ...baseArgs],
    });
  }

  const configuredBrowser = process.env.YT_DLP_COOKIES_FROM_BROWSER?.trim();
  const browserCandidates = configuredBrowser
    ? [configuredBrowser]
    : ['firefox', 'chrome', 'safari', 'brave', 'chromium'];

  for (const browser of browserCandidates) {
    attempts.push({
      label: `cookies-from-browser:${browser}`,
      args: ['--cookies-from-browser', browser, ...baseArgs],
    });
  }

  return attempts.filter((attempt, index, allAttempts) => (
    allAttempts.findIndex((candidate) => candidate.label === attempt.label) === index
  ));
}

export async function downloadYoutubeAudio(url: string, outputDir: string): Promise<YtDlpDownloadResult> {
  const binaryPath = process.env.YT_DLP_BIN || 'yt-dlp';
  const normalizedUrl = url.trim();

  if (!normalizedUrl) {
    throw new Error('youtubeUrl is required when no local file is uploaded.');
  }

  await fs.mkdir(outputDir, { recursive: true });

  const videoId = extractYoutubeVideoId(normalizedUrl);
  if (videoId) {
    const cachedDownload = await findCachedYoutubeAudio(videoId, outputDir);
    if (cachedDownload) {
      return cachedDownload;
    }
  }

  const attempts = buildDownloadAttempts(outputDir, normalizedUrl);
  let lastError: Error | null = null;

  for (const attempt of attempts) {
    try {
      const { stdout } = await runCommand(binaryPath, attempt.args);

      const parsed = parseYtDlpOutput(stdout);
      if (!parsed?.filePath) {
        throw new Error(`yt-dlp did not report a downloaded file path for ${attempt.label}.`);
      }

      const resolvedPath = path.resolve(parsed.filePath);
      await fs.access(resolvedPath);

      return {
        filePath: resolvedPath,
        title: parsed.title,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw new Error(lastError?.message || 'yt-dlp could not download the requested YouTube source.');
}