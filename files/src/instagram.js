const fetch = require('node-fetch');
const cheerio = require('cheerio');

/**
 * Fetches an Instagram URL (reel/post) page and attempts to extract a direct video URL.
 * Returns a string video URL on success, or null if not found.
 */
async function fetchReelVideoUrl(instagramUrl) {
  if (!instagramUrl || typeof instagramUrl !== 'string') return null;

  try {
    const u = new URL(instagramUrl);
    if (!u.hostname.includes('instagram.com')) return null;
  } catch (e) {
    return null;
  }

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  };

  let html;
  try {
    const res = await fetch(instagramUrl, { headers, redirect: 'follow' });
    if (!res.ok) {
      return null;
    }
    html = await res.text();
  } catch (err) {
    return null;
  }

  const $ = cheerio.load(html);

  // 1. Try og:video or og:video:secure_url meta tag
  const ogVideo =
    $('meta[property="og:video"]').attr('content') ||
    $('meta[property="og:video:secure_url"]').attr('content');
  if (ogVideo) return ogVideo;

  // 2. twitter:player:stream
  const twitterStream = $('meta[name="twitter:player:stream"]').attr('content');
  if (twitterStream) return twitterStream;

  // 3. JSON-LD script with video property
  const ldJson = $('script[type="application/ld+json"]').map((i, el) => $(el).html()).get();
  for (const s of ldJson) {
    try {
      const data = JSON.parse(s);
      if (Array.isArray(data)) {
        for (const item of data) {
          const v = extractVideoFromLd(item);
          if (v) return v;
        }
      } else {
        const v = extractVideoFromLd(data);
        if (v) return v;
      }
    } catch (e) {
      // ignore
    }
  }

  // 4. Heuristic JSON search for "video_url"
  const videoUrlMatch = html.match(/"video_url":"([^"]+)"/) || html.match(/"video_url":\\s*"([^"]+)"/);
  if (videoUrlMatch) {
    try {
      const decoded = JSON.parse('"' + videoUrlMatch[1].replace(/"/g, '\\"') + '"');
      return decoded;
    } catch (e) {
      return videoUrlMatch[1].replace(/\\u0026/g, '&');
    }
  }

  return null;
}

function extractVideoFromLd(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (obj.video) {
    if (typeof obj.video === 'string') return obj.video;
    if (obj.video.contentUrl) return obj.video.contentUrl;
    if (Array.isArray(obj.video) && obj.video[0] && obj.video[0].contentUrl) return obj.video[0].contentUrl;
  }
  if (obj.contentUrl) return obj.contentUrl;
  if (obj.url && typeof obj.url === 'string' && obj['@type'] === 'VideoObject') return obj.url;
  return null;
}

module.exports = { fetchReelVideoUrl };