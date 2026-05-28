import {
  BENCHER_LOGO_RECT,
  BENCHER_PAGES,
  BENCHER_SONG_DROP_RECT,
  getBencherPageBackground,
  rectToCss,
  skipEveryOtherLineBreak,
  skipEveryOtherLineBreakWithinWidth,
} from '@/app/bencher/bencher-layout';

describe('bencher layout', () => {
  it('forces exactly two bencher pages', () => {
    expect(BENCHER_PAGES).toHaveLength(2);
    expect(BENCHER_PAGES.map((page) => page.pageNumber)).toEqual([1, 2]);
    expect(getBencherPageBackground(1)).toBe('/assets/bencher/Bencher-p1.jpg');
    expect(getBencherPageBackground(2)).toBe('/assets/bencher/Bencher-p2.jpg');
  });

  it('places a rectangular logo target in the top-right area of page one', () => {
    expect(BENCHER_LOGO_RECT.top).toBeLessThan(12);
    expect(BENCHER_LOGO_RECT.left).toBeGreaterThan(60);
    expect(BENCHER_LOGO_RECT.width).toBeGreaterThan(BENCHER_LOGO_RECT.height);
    expect(BENCHER_LOGO_RECT.left + BENCHER_LOGO_RECT.width).toBeLessThanOrEqual(94);
  });

  it('places the song drop target in the left third of page two', () => {
    expect(BENCHER_SONG_DROP_RECT.left).toBeLessThan(8);
    expect(BENCHER_SONG_DROP_RECT.width).toBeGreaterThan(28);
    expect(BENCHER_SONG_DROP_RECT.width).toBeLessThan(34);
    expect(BENCHER_SONG_DROP_RECT.left + BENCHER_SONG_DROP_RECT.width).toBeLessThanOrEqual(36);
    expect(BENCHER_SONG_DROP_RECT.height).toBeGreaterThan(85);
  });

  it('converts percentage rectangles to inline CSS', () => {
    expect(rectToCss(BENCHER_LOGO_RECT)).toMatchObject({
      top: '5.6%',
      left: '69.4%',
      width: '21.6%',
      height: '9.4%',
    });
  });

  it('skips every other line break for songs dragged into the bencher', () => {
    expect(skipEveryOtherLineBreak(['line 1', 'line 2', 'line 3', 'line 4', 'line 5'].join('\n'))).toBe(
      ['line 1 line 2', 'line 3 line 4', 'line 5'].join('\n'),
    );
  });

  it('keeps the original line break when the joined line would cross the boundary', () => {
    expect(
      skipEveryOtherLineBreakWithinWidth(
        ['short', 'line', 'very long first line', 'very long second line'].join('\n'),
        12,
        (line) => line.length,
      ),
    ).toBe(['short line', 'very long first line', 'very long second line'].join('\n'));
  });
});