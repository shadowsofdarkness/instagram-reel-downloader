import express from 'express';
import { fetchReelVideoUrl } from './instagram';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';

const app = express();
const PORT = process.env.PORT || 3000;

let redisClient: Redis | null = null;
if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL);
}

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.RATE_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

app.get('/', (_req, res) => {
  res.send('Instagram Reel Downloader is running. Use GET /api/video?url={instagram_url}');
});

app.get('/api/video', async (req, res) => {
  const url = String(req.query.url || '');
  if (!url) {
    return res.status(400).json({ error: 'missing url parameter' });
  }

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('instagram.com')) {
      return res.status(400).json({ error: 'invalid instagram url' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'invalid url' });
  }

  try {
    const cacheKey = `videoUrl:${url}`;
    if (redisClient) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json({ videoUrl: cached, cached: true });
      }
    }

    const videoUrl = await fetchReelVideoUrl(url);
    if (!videoUrl) {
      return res.status(404).json({ error: 'video not found or not public' });
    }

    if (redisClient) {
      await redisClient.set(cacheKey, videoUrl, 'EX', Number(process.env.CACHE_TTL) || 3600);
    }

    return res.json({ videoUrl });
  } catch (err) {
    console.error('Error extracting video url', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});