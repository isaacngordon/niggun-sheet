import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { extractYoutubeVideoId, findCachedYoutubeAudio, parseYtDlpOutput } from '@/lib/ytDlp';

describe('parseYtDlpOutput', () => {
  it('extracts title and downloaded path from yt-dlp stdout', () => {
    expect(parseYtDlpOutput([
      'Ein Aroch',
      '/tmp/Ein Aroch [abc123].m4a',
      '',
    ].join('\n'))).toEqual({
      title: 'Ein Aroch',
      filePath: '/tmp/Ein Aroch [abc123].m4a',
    });
  });

  it('returns null when no lines are present', () => {
    expect(parseYtDlpOutput(' \n\n ')).toBeNull();
  });

  it('ignores yt-dlp warning lines and still uses the last emitted path', () => {
    expect(parseYtDlpOutput([
      'Video title',
      'WARNING: some warning',
      '/tmp/Video title [abc123].m4a',
    ].join('\n'))).toEqual({
      title: 'Video title',
      filePath: '/tmp/Video title [abc123].m4a',
    });
  });

  it('extracts YouTube video ids from common URL formats', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=abc123_DEF')).toBe('abc123_DEF');
    expect(extractYoutubeVideoId('https://youtu.be/abc123_DEF?t=42')).toBe('abc123_DEF');
    expect(extractYoutubeVideoId('https://www.youtube.com/shorts/abc123_DEF')).toBe('abc123_DEF');
    expect(extractYoutubeVideoId('https://example.com/watch?v=abc123_DEF')).toBeNull();
  });

  it('reuses a cached downloaded file when the same video id already exists', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yt-dlp-cache-test-'));

    try {
      const cachedPath = path.join(tempDir, 'Al Tira [abc123_DEF].m4a');
      await fs.writeFile(cachedPath, 'audio');

      await expect(findCachedYoutubeAudio('abc123_DEF', tempDir)).resolves.toEqual({
        filePath: cachedPath,
        title: 'Al Tira',
      });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});