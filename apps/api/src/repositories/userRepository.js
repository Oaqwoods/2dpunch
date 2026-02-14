import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { store } from '../dataStore.js';

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

export const userRepository = {
  createUser: async ({ email, username, password }) => {
    const existing = store.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('Email already in use');
    }

    const user = {
      id: uuid(),
      email,
      username,
      passwordHash: await bcrypt.hash(password, 10),
      followingCreatorIds: [],
      likedClipIds: [],
      watchlistVideoIds: [],
      createdAt: new Date().toISOString()
    };

    store.users.push(user);
    return sanitizeUser(user);
  },

  findUserByEmail: async (email) => store.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null,

  findUserById: async (id) => {
    const user = store.users.find((entry) => entry.id === id);
    return user ? sanitizeUser(user) : null;
  },

  verifyPassword: async ({ email, password }) => {
    const user = await userRepository.findUserByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    return sanitizeUser(user);
  },

  createSession: async (userId) => {
    const session = {
      token: uuid(),
      userId,
      createdAt: new Date().toISOString()
    };
    store.sessions.push(session);
    return session;
  },

  getSession: async (token) => store.sessions.find((session) => session.token === token) ?? null,

  deleteSession: async (token) => {
    const index = store.sessions.findIndex((session) => session.token === token);
    if (index >= 0) {
      store.sessions.splice(index, 1);
    }
  },

  deleteAllUserSessions: async (userId) => {
    for (let index = store.sessions.length - 1; index >= 0; index -= 1) {
      if (store.sessions[index].userId === userId) {
        store.sessions.splice(index, 1);
      }
    }
  },

  toggleFollowCreator: async ({ userId, creatorId }) => {
    const user = store.users.find((entry) => entry.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    const alreadyFollowing = user.followingCreatorIds.includes(creatorId);
    user.followingCreatorIds = alreadyFollowing
      ? user.followingCreatorIds.filter((id) => id !== creatorId)
      : [...user.followingCreatorIds, creatorId];

    return {
      following: !alreadyFollowing,
      followingCreatorIds: user.followingCreatorIds
    };
  },

  toggleLikeClip: async ({ userId, clipId }) => {
    const user = store.users.find((entry) => entry.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    const clip = store.clips.find((entry) => entry.id === clipId);
    if (!clip) {
      throw new Error('Clip not found');
    }

    const liked = user.likedClipIds.includes(clipId);
    user.likedClipIds = liked ? user.likedClipIds.filter((id) => id !== clipId) : [...user.likedClipIds, clipId];
    clip.likes = liked ? Math.max(0, clip.likes - 1) : clip.likes + 1;
    return { liked: !liked, likedClipIds: user.likedClipIds };
  },

  toggleWatchlistVideo: async ({ userId, fullVideoId }) => {
    const user = store.users.find((entry) => entry.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    const saved = user.watchlistVideoIds.includes(fullVideoId);
    user.watchlistVideoIds = saved
      ? user.watchlistVideoIds.filter((id) => id !== fullVideoId)
      : [...user.watchlistVideoIds, fullVideoId];

    return { saved: !saved, watchlistVideoIds: user.watchlistVideoIds };
  }
};