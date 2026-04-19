import { cleanText, parseCSV } from '@/app/api/songs/data';

describe('cleanText', () => {
  it('returns empty string for falsy input', () => {
    expect(cleanText('')).toBe('');
  });

  it('trims whitespace', () => {
    expect(cleanText('  hello  ')).toBe('hello');
  });

  it('strips replacement characters (U+FFFD)', () => {
    expect(cleanText('hello\uFFFDworld')).toBe('helloworld');
  });

  it('strips control characters', () => {
    expect(cleanText('hello\x01\x02world')).toBe('helloworld');
  });

  it('preserves normal Hebrew text', () => {
    expect(cleanText('שלום עולם')).toBe('שלום עולם');
  });

  it('preserves newlines (\\n)', () => {
    expect(cleanText('line1\nline2')).toBe('line1\nline2');
  });
});

describe('parseCSV', () => {
  const header = 'Search title,Title,lyrics,artist,google drive,youtube link';

  it('returns empty array for header-only CSV', () => {
    expect(parseCSV(header)).toEqual([]);
  });

  it('parses a simple row', () => {
    const csv = `${header}\nsearchA,Title A,lyrics here,artist A,driveA,youtubeA`;
    const songs = parseCSV(csv);
    expect(songs).toHaveLength(1);
    expect(songs[0]).toEqual({
      search_title: 'searchA',
      title: 'Title A',
      lyrics: 'lyrics here',
      artist: 'artist A',
      drive: 'driveA',
      youtube: 'youtubeA',
    });
  });

  it('handles quoted fields containing commas', () => {
    const csv = `${header}\nsearchB,"Title, with comma","line1, line2",artist B,,`;
    const songs = parseCSV(csv);
    expect(songs).toHaveLength(1);
    expect(songs[0].title).toBe('Title, with comma');
    expect(songs[0].lyrics).toBe('line1, line2');
  });

  it('skips empty lines', () => {
    const csv = `${header}\n\nsearchC,Title C,lyrics C,artist C,,\n\n`;
    const songs = parseCSV(csv);
    expect(songs).toHaveLength(1);
  });

  it('handles rows with missing optional fields', () => {
    const csv = `${header}\nsearchD,Title D,lyrics D,artist D`;
    const songs = parseCSV(csv);
    expect(songs).toHaveLength(1);
    expect(songs[0].drive).toBe('');
    expect(songs[0].youtube).toBe('');
  });

  it('parses multiple rows', () => {
    const csv = [
      header,
      'a,A,lyricsA,artistA,,',
      'b,B,lyricsB,artistB,,',
      'c,C,lyricsC,artistC,,',
    ].join('\n');
    const songs = parseCSV(csv);
    expect(songs).toHaveLength(3);
    expect(songs.map((s) => s.title)).toEqual(['A', 'B', 'C']);
  });

  it('strips quotes from field values', () => {
    const csv = `${header}\n"searchE","Title E","lyrics E","artist E","driveE","youtubeE"`;
    const songs = parseCSV(csv);
    expect(songs[0].search_title).toBe('searchE');
  });
});
