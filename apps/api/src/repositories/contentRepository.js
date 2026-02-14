import { v4 as uuid } from 'uuid';
import { store } from '../dataStore.js';

function withCreator(entity) {
  const creator = store.users.find((user) => user.id === entity.creatorId);
  return {
    ...entity,
    creator: creator
      ? {
          id: creator.id,
          username: creator.username
        }
      : null
  };
}

export const contentRepository = {
  getShortFeed: async ({ userId }) => {
    const user = store.users.find((entry) => entry.id === userId);

    return store.clips.map((clip) => ({
      ...withCreator(clip),
      fullVideo: store.fullVideos.find((video) => video.id === clip.fullVideoId) ?? null,
      likedByMe: user ? user.likedClipIds.includes(clip.id) : false,
      commentsCount: store.commentsByClipId[clip.id]?.length ?? 0
    }));
  },

  getFollowingFeed: async ({ userId }) => {
    const user = store.users.find((entry) => entry.id === userId);
    const following = user?.followingCreatorIds ?? [];

    return store.clips
      .filter((clip) => following.includes(clip.creatorId))
      .map((clip) => ({
        ...withCreator(clip),
        fullVideo: store.fullVideos.find((video) => video.id === clip.fullVideoId) ?? null,
        likedByMe: user ? user.likedClipIds.includes(clip.id) : false,
        commentsCount: store.commentsByClipId[clip.id]?.length ?? 0
      }));
  },

  getWatchroom: async ({ userId }) => {
    const user = store.users.find((entry) => entry.id === userId);
    const continueItems = store.watchProgress
      .filter((entry) => entry.userId === userId)
      .map((entry) => {
        const fullVideo = store.fullVideos.find((video) => video.id === entry.fullVideoId);
        return fullVideo
          ? {
              ...withCreator(fullVideo),
              progressPercent: entry.progressPercent
            }
          : null;
      })
      .filter(Boolean);

    const trending = store.fullVideos
      .slice()
      .sort((a, b) => b.playCount - a.playCount)
      .map((video) => ({
        ...withCreator(video),
        inWatchlist: user ? user.watchlistVideoIds.includes(video.id) : false
      }));

    const fromLiked = user
      ? store.clips
          .filter((clip) => user.likedClipIds.includes(clip.id))
          .map((clip) => store.fullVideos.find((video) => video.id === clip.fullVideoId))
          .filter(Boolean)
      : [];

    return {
      continueWatching: continueItems,
      trending,
      fromLikedClips: fromLiked.map((video) => ({
        ...withCreator(video),
        inWatchlist: user ? user.watchlistVideoIds.includes(video.id) : false
      }))
    };
  },

  getSeriesById: async (seriesId) => {
    const selectedSeries = store.series.find((entry) => entry.id === seriesId);
    if (!selectedSeries) {
      return null;
    }

    const episodes = store.fullVideos
      .filter((video) => video.seriesId === seriesId)
      .map((video) => withCreator(video));

    return {
      ...withCreator(selectedSeries),
      episodes
    };
  },

  getFullVideoById: async (fullVideoId) => {
    const fullVideo = store.fullVideos.find((video) => video.id === fullVideoId);
    return fullVideo ? withCreator(fullVideo) : null;
  },

  updateWatchProgress: async ({ userId, fullVideoId, progressPercent }) => {
    const normalized = Math.max(0, Math.min(100, Number(progressPercent) || 0));
    const existing = store.watchProgress.find((entry) => entry.userId === userId && entry.fullVideoId === fullVideoId);

    if (existing) {
      existing.progressPercent = normalized;
      existing.updatedAt = new Date().toISOString();
      return existing;
    }

    const next = {
      userId,
      fullVideoId,
      progressPercent: normalized,
      updatedAt: new Date().toISOString()
    };
    store.watchProgress.push(next);
    return next;
  },

  addClipComment: async ({ clipId, userId, text }) => {
    const comment = {
      id: uuid(),
      clipId,
      userId,
      text,
      createdAt: new Date().toISOString()
    };

    store.commentsByClipId[clipId] = store.commentsByClipId[clipId] ?? [];
    store.commentsByClipId[clipId].push(comment);

    const user = store.users.find((entry) => entry.id === userId);
    return {
      ...comment,
      user: user ? { id: user.id, username: user.username } : null
    };
  },

  getClipComments: async (clipId) => {
    const comments = store.commentsByClipId[clipId] ?? [];
    return comments.map((comment) => {
      const user = store.users.find((entry) => entry.id === comment.userId);
      return {
        ...comment,
        user: user ? { id: user.id, username: user.username } : null
      };
    });
  },

  search: async ({ query }) => {
    const text = query.toLowerCase();

    const clips = store.clips
      .filter(
        (clip) =>
          clip.title.toLowerCase().includes(text) ||
          clip.caption.toLowerCase().includes(text) ||
          clip.tags.some((tag) => tag.toLowerCase().includes(text))
      )
      .map((clip) => withCreator(clip));

    const fullVideos = store.fullVideos
      .filter(
        (video) => video.title.toLowerCase().includes(text) || video.description.toLowerCase().includes(text)
      )
      .map((video) => withCreator(video));

    const creators = store.users
      .filter((user) => user.username.toLowerCase().includes(text) || user.email.toLowerCase().includes(text))
      .map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email
      }));

    return { clips, fullVideos, creators };
  },

  getInboxActivity: async ({ userId }) => {
    return store.activity
      .filter((entry) => entry.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getCreatorAnalytics: async ({ creatorId }) => {
    const creatorClips = store.clips.filter((clip) => clip.creatorId === creatorId);
    const creatorVideos = store.fullVideos.filter((video) => video.creatorId === creatorId);

    const clipLikes = creatorClips.reduce((sum, clip) => sum + clip.likes, 0);
    const clipComments = creatorClips.reduce((sum, clip) => sum + (store.commentsByClipId[clip.id]?.length ?? 0), 0);
    const fullVideoPlays = creatorVideos.reduce((sum, video) => sum + video.playCount, 0);

    return {
      clipsCount: creatorClips.length,
      fullVideosCount: creatorVideos.length,
      totalClipLikes: clipLikes,
      totalClipComments: clipComments,
      totalFullVideoPlays: fullVideoPlays
    };
  },

  createFullVideo: async ({ creatorId, title, description, durationMinutes, seriesId }) => {
    const fullVideo = {
      id: uuid(),
      creatorId,
      title,
      description,
      durationMinutes,
      seriesId: seriesId || null,
      playCount: 0,
      createdAt: new Date().toISOString()
    };

    store.fullVideos.unshift(fullVideo);
    return withCreator(fullVideo);
  },

  createClip: async ({ creatorId, title, caption, durationSeconds, fullVideoId, tags }) => {
    const clip = {
      id: uuid(),
      creatorId,
      title,
      caption,
      durationSeconds,
      fullVideoId,
      tags,
      likes: 0,
      createdAt: new Date().toISOString()
    };

    store.clips.unshift(clip);
    return withCreator(clip);
  }
};