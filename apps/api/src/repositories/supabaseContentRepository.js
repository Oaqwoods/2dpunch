import { v4 as uuid } from 'uuid';
import { getSupabaseClient } from '../lib/supabaseClient.js';

function mapUser(user) {
  return user
    ? {
        id: user.id,
        username: user.username
      }
    : null;
}

async function getUsersMapByIds(ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) {
    return new Map();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('users').select('id, username').in('id', uniqueIds);
  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((user) => [user.id, user]));
}

function withCreator(entity, usersMap) {
  return {
    ...entity,
    creator: mapUser(usersMap.get(entity.creator_id || entity.creatorId))
  };
}

export const supabaseContentRepository = {
  getShortFeed: async ({ userId }) => {
    const supabase = getSupabaseClient();

    const [{ data: clips, error: clipsError }, { data: user, error: userError }] = await Promise.all([
      supabase.from('clips').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('liked_clip_ids').eq('id', userId).maybeSingle()
    ]);

    if (clipsError) {
      throw clipsError;
    }
    if (userError) {
      throw userError;
    }

    const creatorMap = await getUsersMapByIds((clips ?? []).map((clip) => clip.creator_id));
    const likedClipIds = user?.liked_clip_ids ?? [];

    const clipIds = (clips ?? []).map((clip) => clip.id);
    const { data: comments, error: commentsError } = clipIds.length
      ? await supabase.from('comments').select('clip_id').in('clip_id', clipIds)
      : { data: [], error: null };

    if (commentsError) {
      throw commentsError;
    }

    const commentsCountByClipId = (comments ?? []).reduce((accumulator, entry) => {
      accumulator[entry.clip_id] = (accumulator[entry.clip_id] ?? 0) + 1;
      return accumulator;
    }, {});

    return (clips ?? []).map((clip) => ({
      id: clip.id,
      creatorId: clip.creator_id,
      title: clip.title,
      caption: clip.caption,
      durationSeconds: clip.duration_seconds,
      fullVideoId: clip.full_video_id,
      tags: clip.tags ?? [],
      likes: clip.likes ?? 0,
      createdAt: clip.created_at,
      creator: mapUser(creatorMap.get(clip.creator_id)),
      likedByMe: likedClipIds.includes(clip.id),
      commentsCount: commentsCountByClipId[clip.id] ?? 0
    }));
  },

  getFollowingFeed: async ({ userId }) => {
    const supabase = getSupabaseClient();
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('following_creator_ids, liked_clip_ids')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      throw userError;
    }

    const following = user?.following_creator_ids ?? [];
    if (!following.length) {
      return [];
    }

    const { data: clips, error: clipsError } = await supabase
      .from('clips')
      .select('*')
      .in('creator_id', following)
      .order('created_at', { ascending: false });

    if (clipsError) {
      throw clipsError;
    }

    const creatorMap = await getUsersMapByIds((clips ?? []).map((clip) => clip.creator_id));
    const likedClipIds = user?.liked_clip_ids ?? [];

    return (clips ?? []).map((clip) => ({
      id: clip.id,
      creatorId: clip.creator_id,
      title: clip.title,
      caption: clip.caption,
      durationSeconds: clip.duration_seconds,
      fullVideoId: clip.full_video_id,
      tags: clip.tags ?? [],
      likes: clip.likes ?? 0,
      createdAt: clip.created_at,
      creator: mapUser(creatorMap.get(clip.creator_id)),
      likedByMe: likedClipIds.includes(clip.id),
      commentsCount: 0
    }));
  },

  getWatchroom: async ({ userId }) => {
    const supabase = getSupabaseClient();

    const [{ data: user, error: userError }, { data: fullVideos, error: videosError }, { data: progress, error: progressError }] =
      await Promise.all([
        supabase.from('users').select('watchlist_video_ids, liked_clip_ids').eq('id', userId).maybeSingle(),
        supabase.from('full_videos').select('*').order('play_count', { ascending: false }),
        supabase.from('watch_progress').select('*').eq('user_id', userId)
      ]);

    if (userError) {
      throw userError;
    }
    if (videosError) {
      throw videosError;
    }
    if (progressError) {
      throw progressError;
    }

    const creatorMap = await getUsersMapByIds((fullVideos ?? []).map((video) => video.creator_id));
    const watchlistVideoIds = user?.watchlist_video_ids ?? [];

    const progressByVideoId = new Map((progress ?? []).map((entry) => [entry.full_video_id, entry]));

    const trending = (fullVideos ?? []).map((video) => ({
      id: video.id,
      creatorId: video.creator_id,
      seriesId: video.series_id,
      title: video.title,
      description: video.description,
      durationMinutes: video.duration_minutes,
      playCount: video.play_count,
      createdAt: video.created_at,
      creator: mapUser(creatorMap.get(video.creator_id)),
      inWatchlist: watchlistVideoIds.includes(video.id)
    }));

    const continueWatching = trending
      .filter((video) => progressByVideoId.has(video.id))
      .map((video) => ({
        ...video,
        progressPercent: progressByVideoId.get(video.id)?.progress_percent ?? 0
      }));

    const likedClipIds = user?.liked_clip_ids ?? [];
    let fromLikedClips = [];

    if (likedClipIds.length) {
      const { data: likedClips, error: likedClipsError } = await supabase
        .from('clips')
        .select('full_video_id')
        .in('id', likedClipIds);

      if (likedClipsError) {
        throw likedClipsError;
      }

      const likedVideoIds = [...new Set((likedClips ?? []).map((clip) => clip.full_video_id))];
      fromLikedClips = trending.filter((video) => likedVideoIds.includes(video.id));
    }

    return {
      continueWatching,
      trending,
      fromLikedClips
    };
  },

  getSeriesById: async (seriesId) => {
    const supabase = getSupabaseClient();
    const [{ data: series, error: seriesError }, { data: episodes, error: episodesError }] = await Promise.all([
      supabase.from('series').select('*').eq('id', seriesId).maybeSingle(),
      supabase.from('full_videos').select('*').eq('series_id', seriesId).order('created_at', { ascending: true })
    ]);

    if (seriesError) {
      throw seriesError;
    }
    if (episodesError) {
      throw episodesError;
    }
    if (!series) {
      return null;
    }

    const usersMap = await getUsersMapByIds([series.creator_id, ...(episodes ?? []).map((video) => video.creator_id)]);

    return {
      id: series.id,
      creatorId: series.creator_id,
      title: series.title,
      description: series.description,
      followerCount: series.follower_count,
      createdAt: series.created_at,
      creator: mapUser(usersMap.get(series.creator_id)),
      episodes: (episodes ?? []).map((video) => ({
        id: video.id,
        creatorId: video.creator_id,
        seriesId: video.series_id,
        title: video.title,
        description: video.description,
        durationMinutes: video.duration_minutes,
        playCount: video.play_count,
        createdAt: video.created_at,
        creator: mapUser(usersMap.get(video.creator_id))
      }))
    };
  },

  getFullVideoById: async (fullVideoId) => {
    const supabase = getSupabaseClient();
    const { data: video, error } = await supabase.from('full_videos').select('*').eq('id', fullVideoId).maybeSingle();
    if (error) {
      throw error;
    }
    if (!video) {
      return null;
    }

    const usersMap = await getUsersMapByIds([video.creator_id]);
    return {
      id: video.id,
      creatorId: video.creator_id,
      seriesId: video.series_id,
      title: video.title,
      description: video.description,
      durationMinutes: video.duration_minutes,
      playCount: video.play_count,
      createdAt: video.created_at,
      creator: mapUser(usersMap.get(video.creator_id))
    };
  },

  updateWatchProgress: async ({ userId, fullVideoId, progressPercent }) => {
    const supabase = getSupabaseClient();
    const normalized = Math.max(0, Math.min(100, Number(progressPercent) || 0));

    const { data, error } = await supabase
      .from('watch_progress')
      .upsert(
        {
          user_id: userId,
          full_video_id: fullVideoId,
          progress_percent: normalized,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,full_video_id' }
      )
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return {
      userId: data.user_id,
      fullVideoId: data.full_video_id,
      progressPercent: data.progress_percent,
      updatedAt: data.updated_at
    };
  },

  addClipComment: async ({ clipId, userId, text }) => {
    const supabase = getSupabaseClient();
    const row = {
      id: uuid(),
      clip_id: clipId,
      user_id: userId,
      text,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('comments').insert(row).select('*').single();
    if (error) {
      throw error;
    }

    const usersMap = await getUsersMapByIds([userId]);
    return {
      id: data.id,
      clipId: data.clip_id,
      userId: data.user_id,
      text: data.text,
      createdAt: data.created_at,
      user: mapUser(usersMap.get(userId))
    };
  },

  getClipComments: async (clipId) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('clip_id', clipId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    const usersMap = await getUsersMapByIds((data ?? []).map((comment) => comment.user_id));
    return (data ?? []).map((comment) => ({
      id: comment.id,
      clipId: comment.clip_id,
      userId: comment.user_id,
      text: comment.text,
      createdAt: comment.created_at,
      user: mapUser(usersMap.get(comment.user_id))
    }));
  },

  search: async ({ query }) => {
    const supabase = getSupabaseClient();
    const text = query.trim();
    const ilike = `%${text}%`;

    const [{ data: clips, error: clipsError }, { data: fullVideos, error: videosError }, { data: creators, error: usersError }] =
      await Promise.all([
        supabase.from('clips').select('*').or(`title.ilike.${ilike},caption.ilike.${ilike}`),
        supabase.from('full_videos').select('*').or(`title.ilike.${ilike},description.ilike.${ilike}`),
        supabase.from('users').select('id, username, email').or(`username.ilike.${ilike},email.ilike.${ilike}`)
      ]);

    if (clipsError) {
      throw clipsError;
    }
    if (videosError) {
      throw videosError;
    }
    if (usersError) {
      throw usersError;
    }

    const creatorMap = await getUsersMapByIds([...(clips ?? []).map((clip) => clip.creator_id), ...(fullVideos ?? []).map((video) => video.creator_id)]);

    return {
      clips: (clips ?? []).map((clip) => ({
        id: clip.id,
        creatorId: clip.creator_id,
        title: clip.title,
        caption: clip.caption,
        durationSeconds: clip.duration_seconds,
        fullVideoId: clip.full_video_id,
        tags: clip.tags ?? [],
        likes: clip.likes ?? 0,
        createdAt: clip.created_at,
        creator: mapUser(creatorMap.get(clip.creator_id))
      })),
      fullVideos: (fullVideos ?? []).map((video) => ({
        id: video.id,
        creatorId: video.creator_id,
        seriesId: video.series_id,
        title: video.title,
        description: video.description,
        durationMinutes: video.duration_minutes,
        playCount: video.play_count,
        createdAt: video.created_at,
        creator: mapUser(creatorMap.get(video.creator_id))
      })),
      creators: creators ?? []
    };
  },

  getInboxActivity: async ({ userId }) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('activity')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map((entry) => ({
      id: entry.id,
      userId: entry.user_id,
      type: entry.type,
      text: entry.text,
      createdAt: entry.created_at
    }));
  },

  getCreatorAnalytics: async ({ creatorId }) => {
    const supabase = getSupabaseClient();
    const [{ data: clips, error: clipsError }, { data: fullVideos, error: videosError }] = await Promise.all([
      supabase.from('clips').select('id, likes').eq('creator_id', creatorId),
      supabase.from('full_videos').select('id, play_count').eq('creator_id', creatorId)
    ]);

    if (clipsError) {
      throw clipsError;
    }
    if (videosError) {
      throw videosError;
    }

    const clipIds = (clips ?? []).map((clip) => clip.id);
    const { data: comments, error: commentsError } = clipIds.length
      ? await supabase.from('comments').select('id').in('clip_id', clipIds)
      : { data: [], error: null };

    if (commentsError) {
      throw commentsError;
    }

    return {
      clipsCount: (clips ?? []).length,
      fullVideosCount: (fullVideos ?? []).length,
      totalClipLikes: (clips ?? []).reduce((sum, clip) => sum + (clip.likes ?? 0), 0),
      totalClipComments: (comments ?? []).length,
      totalFullVideoPlays: (fullVideos ?? []).reduce((sum, video) => sum + (video.play_count ?? 0), 0)
    };
  },

  createFullVideo: async ({ creatorId, title, description, durationMinutes, seriesId }) => {
    const supabase = getSupabaseClient();
    const row = {
      id: uuid(),
      creator_id: creatorId,
      title,
      description,
      duration_minutes: durationMinutes,
      series_id: seriesId || null,
      play_count: 0,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('full_videos').insert(row).select('*').single();
    if (error) {
      throw error;
    }

    const usersMap = await getUsersMapByIds([creatorId]);
    return {
      id: data.id,
      creatorId: data.creator_id,
      seriesId: data.series_id,
      title: data.title,
      description: data.description,
      durationMinutes: data.duration_minutes,
      playCount: data.play_count,
      createdAt: data.created_at,
      creator: mapUser(usersMap.get(creatorId))
    };
  },

  createClip: async ({ creatorId, title, caption, durationSeconds, fullVideoId, tags }) => {
    const supabase = getSupabaseClient();
    const row = {
      id: uuid(),
      creator_id: creatorId,
      title,
      caption,
      duration_seconds: durationSeconds,
      full_video_id: fullVideoId,
      tags: tags ?? [],
      likes: 0,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('clips').insert(row).select('*').single();
    if (error) {
      throw error;
    }

    const usersMap = await getUsersMapByIds([creatorId]);
    return {
      id: data.id,
      creatorId: data.creator_id,
      title: data.title,
      caption: data.caption,
      durationSeconds: data.duration_seconds,
      fullVideoId: data.full_video_id,
      tags: data.tags ?? [],
      likes: data.likes ?? 0,
      createdAt: data.created_at,
      creator: mapUser(usersMap.get(creatorId))
    };
  }
};