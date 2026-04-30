/**
 * Tests for the /api/songs route handler.
 *
 * We mock next/server because Request/Response globals don't exist in jsdom.
 */

// Mock NextResponse before importing the route
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/app/api/songs/data', () => ({
  getSongs: jest.fn(),
}));

import { GET } from '@/app/api/songs/route';
import { getSongs } from '@/app/api/songs/data';
const mockGetSongs = getSongs as jest.MockedFunction<typeof getSongs>;

describe('GET /api/songs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns songs as JSON with 200 status', async () => {
    const fakeSongs = [
      { search_title: 'a', title: 'A', lyrics: 'lyr', artist: 'art', drive: '', youtube: '' },
    ];
    mockGetSongs.mockResolvedValue(fakeSongs);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual(fakeSongs);
  });

  it('returns 500 when getSongs throws', async () => {
    mockGetSongs.mockRejectedValue(new Error('fail'));

    const res = await GET();
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body).toHaveProperty('error', 'Internal Server Error');
    expect(body).toHaveProperty('message', 'Unable to load songs from any source');
  });
});
