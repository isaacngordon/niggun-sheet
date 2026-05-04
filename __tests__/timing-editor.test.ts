import {
  deriveClipEdgeBounds,
  moveClipToTime,
  resolveClipStartLowerBound,
  type EditorTimingClip,
  type TimingBounds,
} from '@/app/songs/[slug]/timingEditorUtils';

describe('moveClipToTime', () => {
  const bounds: TimingBounds = { inPoint: 0, outPoint: 140 };

  it('moves a clip to 20 seconds when dragged there', () => {
    const clips: EditorTimingClip[] = [
      { id: 'clip-a', verseIndex: 0, start: 43.59 },
      { id: 'clip-b', verseIndex: 1, start: 56.56 },
      { id: 'clip-c', verseIndex: 2, start: 63.91 },
    ];

    const moved = moveClipToTime(clips, 'clip-a', 20, bounds, 137.09, 0.01);

    expect(moved).toEqual([
      expect.objectContaining({ id: 'clip-a', start: 20 }),
      expect.objectContaining({ id: 'clip-b', start: 56.56 }),
      expect.objectContaining({ id: 'clip-c', start: 63.91 }),
    ]);
  });

  it('reorders clips after moving one earlier in time', () => {
    const clips: EditorTimingClip[] = [
      { id: 'clip-a', verseIndex: 0, start: 43.59 },
      { id: 'clip-b', verseIndex: 1, start: 18 },
      { id: 'clip-c', verseIndex: 2, start: 63.91 },
    ];

    const moved = moveClipToTime(clips, 'clip-c', 20, bounds, 137.09, 0.01);

    expect(moved.map((clip) => clip.id)).toEqual(['clip-b', 'clip-c', 'clip-a']);
    expect(moved[1].start).toBe(20);
  });
});

describe('clip edge bounds', () => {
  it('preserves an explicitly extended out-point for the last clip', () => {
    const bounds = deriveClipEdgeBounds([
      { verseIndex: 0, start: 57.2 },
      { verseIndex: 1, start: 63.9 },
    ], 77.2, 6);

    expect(bounds).toEqual({
      inPoint: 57.2,
      outPoint: 77.2,
    });
  });

  it('allows the first clip to drag earlier when clip edges define the bounds', () => {
    const minStart = resolveClipStartLowerBound(
      null,
      { inPoint: 57.2, outPoint: 77.2 },
      true,
      0.01,
    );

    expect(minStart).toBe(0);
  });

  it('moves the first clip earlier than the in-point when clip-edge bounds are enabled', () => {
    const moved = moveClipToTime(
      [
        { id: 'clip-a', verseIndex: 0, start: 57.2 },
        { id: 'clip-b', verseIndex: 1, start: 63.9 },
      ],
      'clip-a',
      20,
      { inPoint: 57.2, outPoint: 77.2 },
      77.2,
      0.01,
      true,
    );

    expect(moved).toEqual([
      expect.objectContaining({ id: 'clip-a', start: 20 }),
      expect.objectContaining({ id: 'clip-b', start: 63.9 }),
    ]);
  });
});