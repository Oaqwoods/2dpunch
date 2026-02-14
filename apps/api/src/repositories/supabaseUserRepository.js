import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getSupabaseClient } from '../lib/supabaseClient.js';

function sanitizeUser(user) {
  const { password_hash: _passwordHash, ...safe } = user;
  return {
    id: safe.id,
    email: safe.email,
    username: safe.username,
    followingCreatorIds: safe.following_creator_ids ?? [],
    likedClipIds: safe.liked_clip_ids ?? [],
    watchlistVideoIds: safe.watchlist_video_ids ?? [],
    createdAt: safe.created_at
  };
}

async function fetchRawUserById(id) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

export const supabaseUserRepository = {
  createUser: async ({ email, username, password }) => {
    const supabase = getSupabaseClient();

    const existing = await supabaseUserRepository.findUserByEmail(email);
    if (existing) {
      throw new Error('Email already in use');
    }

    const row = {
      id: uuid(),
      email,
      username,
      password_hash: await bcrypt.hash(password, 10),
      following_creator_ids: [],
      liked_clip_ids: [],
      watchlist_video_ids: []
    };

    const { data, error } = await supabase.from('users').insert(row).select('*').single();
    if (error) {
      throw error;
    }

    return sanitizeUser(data);
  },

  findUserByEmail: async (email) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('users').select('*').ilike('email', email).maybeSingle();
    if (error) {
      throw error;
    }
    return data;
  },

  findUserById: async (id) => {
    const user = await fetchRawUserById(id);
    return user ? sanitizeUser(user) : null;
  },

  verifyPassword: async ({ email, password }) => {
    const user = await supabaseUserRepository.findUserByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    return sanitizeUser(user);
  },

  createSession: async (userId) => {
    const supabase = getSupabaseClient();
    const row = {
      token: uuid(),
      user_id: userId,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('sessions').insert(row).select('*').single();
    if (error) {
      throw error;
    }

    return {
      token: data.token,
      userId: data.user_id,
      createdAt: data.created_at
    };
  },

  getSession: async (token) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('sessions').select('*').eq('token', token).maybeSingle();
    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }

    return {
      token: data.token,
      userId: data.user_id,
      createdAt: data.created_at
    };
  },

  deleteSession: async (token) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('sessions').delete().eq('token', token);
    if (error) {
      throw error;
    }
  },

  deleteAllUserSessions: async (userId) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('sessions').delete().eq('user_id', userId);
    if (error) {
      throw error;
    }
  },

  toggleFollowCreator: async ({ userId, creatorId }) => {
    const supabase = getSupabaseClient();
    const user = await fetchRawUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const followingCreatorIds = user.following_creator_ids ?? [];
    const alreadyFollowing = followingCreatorIds.includes(creatorId);
    const nextFollowing = alreadyFollowing
      ? followingCreatorIds.filter((id) => id !== creatorId)
      : [...followingCreatorIds, creatorId];

    const { error } = await supabase.from('users').update({ following_creator_ids: nextFollowing }).eq('id', userId);
    if (error) {
      throw error;
    }

    return {
      following: !alreadyFollowing,
      followingCreatorIds: nextFollowing
    };
  },

  toggleLikeClip: async ({ userId, clipId }) => {
    const supabase = getSupabaseClient();
    const user = await fetchRawUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const { data: clip, error: clipError } = await supabase.from('clips').select('*').eq('id', clipId).maybeSingle();
    if (clipError) {
      throw clipError;
    }
    if (!clip) {
      throw new Error('Clip not found');
    }

    const likedClipIds = user.liked_clip_ids ?? [];
    const liked = likedClipIds.includes(clipId);
    const nextLiked = liked ? likedClipIds.filter((id) => id !== clipId) : [...likedClipIds, clipId];
    const nextLikes = liked ? Math.max(0, (clip.likes ?? 0) - 1) : (clip.likes ?? 0) + 1;

    const { error: userError } = await supabase.from('users').update({ liked_clip_ids: nextLiked }).eq('id', userId);
    if (userError) {
      throw userError;
    }

    const { error: likesError } = await supabase.from('clips').update({ likes: nextLikes }).eq('id', clipId);
    if (likesError) {
      throw likesError;
    }

    return {
      liked: !liked,
      likedClipIds: nextLiked
    };
  },

  toggleWatchlistVideo: async ({ userId, fullVideoId }) => {
    const supabase = getSupabaseClient();
    const user = await fetchRawUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const watchlistVideoIds = user.watchlist_video_ids ?? [];
    const saved = watchlistVideoIds.includes(fullVideoId);
    const nextWatchlist = saved
      ? watchlistVideoIds.filter((id) => id !== fullVideoId)
      : [...watchlistVideoIds, fullVideoId];

    const { error } = await supabase.from('users').update({ watchlist_video_ids: nextWatchlist }).eq('id', userId);
    if (error) {
      throw error;
    }

    return {
      saved: !saved,
      watchlistVideoIds: nextWatchlist
    };
  }
};