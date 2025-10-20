import { fetchReelVideoUrl } from '../src/instagram';
import fetch from 'node-fetch';

jest.mock('node-fetch');
const { Response } = jest.requireActual('node-fetch');

describe('fetchReelVideoUrl', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns null for invalid url', async () => {
    // @ts-ignore
    expect(await fetchReelVideoUrl('not-a-url')).toBeNull();
  });

  it('extracts og:video meta tag', async () => {
    const html = '<meta property="og:video" content="https://video.example/video.mp4" />';
    // @ts-ignore
    fetch.mockResolvedValue(new Response(html, { status: 200 }));
    const url = await fetchReelVideoUrl('https://www.instagram.com/reel/ABC/');
    expect(url).toBe('https://video.example/video.mp4');
  });

  it('falls back to JSON embedded video_url', async () => {
    const html = '{"video_url":"https:\\/\\/video.example\\/v.mp4"}';
    // @ts-ignore
    fetch.mockResolvedValue(new Response(html, { status: 200 }));
    const url = await fetchReelVideoUrl('https://www.instagram.com/reel/ABC/');
    expect(url).toBe('https://video.example/v.mp4');
  });
});