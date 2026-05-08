import {
  buildMediaTimingSources,
  resolveBoundsFromTimingEntry,
  resolveStoredTimingData,
  upsertTimingSourceEntry,
  type TimingEntry,
} from '@/lib/timings';

describe('timing source storage', () => {
  it('treats legacy timing data as belonging only to the fallback source', () => {
    const entry: TimingEntry = {
      version: 2,
      clips: [{ verseIndex: 0, start: 12.34 }],
      inPoint: null,
      outPoint: null,
      useClipEdgeBounds: true,
    };

    expect(resolveStoredTimingData(entry, 'youtube:first', 'youtube:first')).toEqual({
      clips: [{ verseIndex: 0, start: 12.34 }],
      inPoint: null,
      outPoint: null,
      sourceLabels: {},
      useClipEdgeBounds: true,
    });
    expect(resolveStoredTimingData(entry, 'youtube:second', 'youtube:first')).toBeNull();
  });

  it('migrates legacy timing data into separate source buckets', () => {
    const existing: TimingEntry = {
      version: 2,
      clips: [{ verseIndex: 0, start: 10 }],
      inPoint: null,
      outPoint: null,
      useClipEdgeBounds: true,
    };

    const updated = upsertTimingSourceEntry(existing, 'youtube:second', 'youtube:first', {
      version: 3,
      clips: [{ verseIndex: 1, start: 22 }],
      inPoint: 22,
      outPoint: 48,
      useClipEdgeBounds: true,
    });

    expect(updated).toEqual({
      version: 4,
      defaultSource: 'youtube:first',
      sourceLabels: {},
      sources: {
        'youtube:first': {
          version: 2,
          clips: [{ verseIndex: 0, start: 10 }],
          inPoint: null,
          outPoint: null,
          useClipEdgeBounds: true,
        },
        'youtube:second': {
          version: 3,
          clips: [{ verseIndex: 1, start: 22 }],
          inPoint: 22,
          outPoint: 48,
          useClipEdgeBounds: true,
        },
      },
    });
  });

  it('resolves bounds for the requested source', () => {
    const entry: TimingEntry = {
      version: 4,
      defaultSource: 'youtube:first',
      sources: {
        'youtube:first': {
          version: 3,
          clips: [{ verseIndex: 0, start: 8 }],
          inPoint: 8,
          outPoint: 18,
          useClipEdgeBounds: true,
        },
        'youtube:second': {
          version: 3,
          clips: [{ verseIndex: 0, start: 30 }],
          inPoint: 30,
          outPoint: 50,
          useClipEdgeBounds: true,
        },
      },
    };

    expect(resolveBoundsFromTimingEntry(entry, 'youtube:second', 'youtube:first')).toEqual({
      inPoint: 30,
      outPoint: 50,
    });
  });

  it('builds distinct timing sources for multiple YouTube links', () => {
    expect(buildMediaTimingSources(null, [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=9bZkp7q19f0',
    ])).toEqual([
      {
        key: 'youtube:dQw4w9WgXcQ',
        label: 'Link 1',
        audioUrl: null,
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
      {
        key: 'youtube:9bZkp7q19f0',
        label: 'Link 2',
        audioUrl: null,
        youtubeUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
      },
    ]);
  });

  it('applies saved custom source labels when building media sources', () => {
    expect(buildMediaTimingSources(
      null,
      [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=9bZkp7q19f0',
      ],
      {
        'youtube:dQw4w9WgXcQ': 'Main Take',
        'youtube:9bZkp7q19f0': 'Slow Version',
      },
    )).toEqual([
      {
        key: 'youtube:dQw4w9WgXcQ',
        label: 'Main Take',
        audioUrl: null,
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
      {
        key: 'youtube:9bZkp7q19f0',
        label: 'Slow Version',
        audioUrl: null,
        youtubeUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
      },
    ]);
  });

  it('preserves a label for a source without saved timing clips', () => {
    const updated = upsertTimingSourceEntry(
      {
        version: 4,
        defaultSource: 'youtube:first',
        sources: {
          'youtube:first': {
            version: 3,
            clips: [{ verseIndex: 0, start: 10 }],
            inPoint: null,
            outPoint: 25,
            useClipEdgeBounds: true,
          },
        },
        sourceLabels: {
          'youtube:first': 'Main',
        },
      },
      'youtube:second',
      'youtube:first',
      null,
      {
        'youtube:first': 'Main',
        'youtube:second': 'Harmony',
      },
    );

    expect(updated).toEqual({
      version: 4,
      defaultSource: 'youtube:first',
      sources: {
        'youtube:first': {
          version: 3,
          clips: [{ verseIndex: 0, start: 10 }],
          inPoint: null,
          outPoint: 25,
          useClipEdgeBounds: true,
        },
      },
      sourceLabels: {
        'youtube:first': 'Main',
        'youtube:second': 'Harmony',
      },
    });

    expect(resolveStoredTimingData(updated, 'youtube:second', 'youtube:first')).toEqual({
      clips: [],
      inPoint: null,
      outPoint: null,
      useClipEdgeBounds: true,
      sourceLabels: {
        'youtube:first': 'Main',
        'youtube:second': 'Harmony',
      },
    });
  });
});