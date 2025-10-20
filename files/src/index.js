const express = require('express');
const { fetchReelVideoUrl } = require('./instagram');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => {
  res.send('Instagram Reel Downloader is running. Use GET /api/video?url={instagram_url}');
});

app.get('/api/video', async (req, res) => {
  const { url } = req.query;
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
    const videoUrl = await fetchReelVideoUrl(url);
    if (!videoUrl) {
      return res.status(404).json({ error: 'video not found or not public' });
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