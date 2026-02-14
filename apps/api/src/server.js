import cors from 'cors';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { requireAuth } from './middleware/authMiddleware.js';
import { activeDataProvider, contentRepository, userRepository } from './repositories/index.js';

const PORT = process.env.PORT || 4000;

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: '2dpunch-api' });
  });

  app.post('/auth/signup', async (req, res) => {
    try {
      const { email, username, password } = req.body;
      if (!email || !username || !password) {
        return res.status(400).json({ error: 'email, username, and password are required' });
      }

      const user = await userRepository.createUser({ email, username, password });
      const session = await userRepository.createSession(user.id);
      return res.status(201).json({ user, token: session.token });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.post('/auth/signin', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await userRepository.verifyPassword({ email, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const session = await userRepository.createSession(user.id);
    return res.json({ user, token: session.token });
  });

  app.get('/auth/me', requireAuth, async (req, res) => {
    return res.json({ user: req.auth.user });
  });

  app.post('/auth/logout', requireAuth, async (req, res) => {
    await userRepository.deleteSession(req.auth.token);
    return res.status(204).send();
  });

  app.post('/auth/logout-all', requireAuth, async (req, res) => {
    await userRepository.deleteAllUserSessions(req.auth.user.id);
    return res.status(204).send();
  });

  app.get('/feed/shorts', requireAuth, async (req, res) => {
    const clips = await contentRepository.getShortFeed({ userId: req.auth.user.id });
    return res.json({ items: clips });
  });

  app.get('/feed/following', requireAuth, async (req, res) => {
    const clips = await contentRepository.getFollowingFeed({ userId: req.auth.user.id });
    return res.json({ items: clips });
  });

  app.get('/watchroom', requireAuth, async (req, res) => {
    const payload = await contentRepository.getWatchroom({ userId: req.auth.user.id });
    return res.json(payload);
  });

  app.get('/series/:seriesId', requireAuth, async (req, res) => {
    const payload = await contentRepository.getSeriesById(req.params.seriesId);
    if (!payload) {
      return res.status(404).json({ error: 'Series not found' });
    }

    return res.json(payload);
  });

  app.get('/videos/full/:fullVideoId', requireAuth, async (req, res) => {
    const payload = await contentRepository.getFullVideoById(req.params.fullVideoId);
    if (!payload) {
      return res.status(404).json({ error: 'Video not found' });
    }

    return res.json(payload);
  });

  app.post('/videos/full/:fullVideoId/progress', requireAuth, async (req, res) => {
    const progressPercent = Number(req.body.progressPercent);
    if (Number.isNaN(progressPercent)) {
      return res.status(400).json({ error: 'progressPercent must be a number' });
    }

    const result = await contentRepository.updateWatchProgress({
      userId: req.auth.user.id,
      fullVideoId: req.params.fullVideoId,
      progressPercent
    });

    return res.json(result);
  });

  app.post('/interactions/clips/:clipId/like', requireAuth, async (req, res) => {
    const result = await userRepository.toggleLikeClip({
      userId: req.auth.user.id,
      clipId: req.params.clipId
    });

    return res.json(result);
  });

  app.post('/interactions/videos/:fullVideoId/watchlist', requireAuth, async (req, res) => {
    const result = await userRepository.toggleWatchlistVideo({
      userId: req.auth.user.id,
      fullVideoId: req.params.fullVideoId
    });

    return res.json(result);
  });

  app.post('/interactions/creators/:creatorId/follow', requireAuth, async (req, res) => {
    const result = await userRepository.toggleFollowCreator({
      userId: req.auth.user.id,
      creatorId: req.params.creatorId
    });

    return res.json(result);
  });

  app.get('/comments/clips/:clipId', requireAuth, async (req, res) => {
    const comments = await contentRepository.getClipComments(req.params.clipId);
    return res.json({ items: comments });
  });

  app.get('/search', requireAuth, async (req, res) => {
    const query = String(req.query.q || '').trim();
    if (!query) {
      return res.json({ clips: [], fullVideos: [], creators: [] });
    }

    const result = await contentRepository.search({ query });
    return res.json(result);
  });

  app.get('/inbox/activity', requireAuth, async (req, res) => {
    const items = await contentRepository.getInboxActivity({ userId: req.auth.user.id });
    return res.json({ items });
  });

  app.get('/creator/me/analytics', requireAuth, async (req, res) => {
    const payload = await contentRepository.getCreatorAnalytics({ creatorId: req.auth.user.id });
    return res.json(payload);
  });

  app.post('/comments/clips/:clipId', requireAuth, async (req, res) => {
    const text = req.body.text?.trim();
    if (!text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const comment = await contentRepository.addClipComment({
      clipId: req.params.clipId,
      userId: req.auth.user.id,
      text
    });
    return res.status(201).json(comment);
  });

  app.post('/creator/full-videos', requireAuth, async (req, res) => {
    const { title, description, durationMinutes, seriesId } = req.body;
    if (!title || !description || !durationMinutes) {
      return res.status(400).json({ error: 'title, description, and durationMinutes are required' });
    }

    const video = await contentRepository.createFullVideo({
      creatorId: req.auth.user.id,
      title,
      description,
      durationMinutes: Number(durationMinutes),
      seriesId: seriesId || null
    });
    return res.status(201).json(video);
  });

  app.post('/creator/clips', requireAuth, async (req, res) => {
    const { title, caption, durationSeconds, fullVideoId, tags } = req.body;
    if (!title || !caption || !durationSeconds || !fullVideoId) {
      return res.status(400).json({ error: 'title, caption, durationSeconds, and fullVideoId are required' });
    }

    const clip = await contentRepository.createClip({
      creatorId: req.auth.user.id,
      title,
      caption,
      durationSeconds: Number(durationSeconds),
      fullVideoId,
      tags: Array.isArray(tags) ? tags : []
    });
    return res.status(201).json(clip);
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

const app = createApp();

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`2dpunch API running on http://localhost:${PORT} using ${activeDataProvider} provider`);
  });
}