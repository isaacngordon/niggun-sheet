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

  it('normalizes carriage returns into newlines', () => {
    expect(cleanText('line1\rline2')).toBe('line1\nline2');
  });
});

describe('parseCSV', () => {
  const header = 'Search title,Title,lyrics,artist,google drive,youtube link,audio url';

  it('returns empty array for header-only CSV', () => {
    expect(parseCSV(header)).toEqual([]);
  });

  it('parses a simple row', () => {
    const csv = `${header}\nsearchA,Title A,lyrics here,artist A,driveA,youtubeA,audioA.mp3`;
    const songs = parseCSV(csv);
    expect(songs).toHaveLength(1);
    expect(songs[0]).toEqual({
      search_title: 'searchA',
      title: 'Title A',
      lyrics: 'lyrics here',
      artist: 'artist A',
      drive: 'driveA',
      youtube: 'youtubeA',
      audio: 'audioA.mp3',
    });
  });

  it('handles quoted fields containing commas', () => {
    const csv = `${header}\nsearchB,"Title, with comma","line1, line2",artist B,,`;
    const songs = parseCSV(csv);
    expect(songs).toHaveLength(1);
    expect(songs[0].title).toBe('Title, with comma');
    expect(songs[0].lyrics).toBe('line1, line2');
  });

  it('handles escaped double quotes inside quoted fields', () => {
    const csv = `${header}\nsearchQuote,"Title ""Quoted""","lyrics ""here""",artist Q,,`;
    const songs = parseCSV(csv);

    expect(songs).toHaveLength(1);
    expect(songs[0].title).toBe('Title "Quoted"');
    expect(songs[0].lyrics).toBe('lyrics "here"');
  });

  it('handles CRLF line endings', () => {
    const csv = `${header}\r\nsearchCRLF,Title CRLF,lyrics CRLF,artist CRLF,,`;
    const songs = parseCSV(csv);

    expect(songs).toHaveLength(1);
    expect(songs[0].title).toBe('Title CRLF');
  });

  it('keeps multiline lyrics and later columns on the same row', () => {
    const csv = [
      header,
      'searchMulti,Title Multi,"line 1',
      'line 2',
      'line 3",artist Multi,driveMulti,youtubeMulti,audioMulti.mp3',
      'searchNext,Title Next,lyrics next,artist Next,driveNext,youtubeNext,audioNext.mp3',
    ].join('\n');

    const songs = parseCSV(csv);

    expect(songs).toHaveLength(2);
    expect(songs[0]).toEqual({
      search_title: 'searchMulti',
      title: 'Title Multi',
      lyrics: 'line 1\nline 2\nline 3',
      artist: 'artist Multi',
      drive: 'driveMulti',
      youtube: 'youtubeMulti',
      audio: 'audioMulti.mp3',
    });
    expect(songs[1].youtube).toBe('youtubeNext');
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
    expect(songs[0].audio).toBe('');
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
    const csv = `${header}\n"searchE","Title E","lyrics E","artist E","driveE","youtubeE","audioE.mp3"`;
    const songs = parseCSV(csv);
    expect(songs[0].search_title).toBe('searchE');
    expect(songs[0].audio).toBe('audioE.mp3');
  });
});
