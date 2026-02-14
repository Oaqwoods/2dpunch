import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const demoUserId = uuid();
const demoCreatorId = uuid();
const seriesId = uuid();
const fullVideoId = uuid();

const clips = [
  {
    id: uuid(),
    creatorId: demoCreatorId,
    title: 'Street workout teaser',
    caption: 'Full 14-min routine in one tap.',
    durationSeconds: 35,
    fullVideoId,
    tags: ['fitness', 'workout'],
    likes: 44,
    createdAt: new Date().toISOString()
  },
  {
    id: uuid(),
    creatorId: demoCreatorId,
    title: 'Budget meal prep teaser',
    caption: 'Five lunches under $20, full video linked.',
    durationSeconds: 28,
    fullVideoId,
    tags: ['food', 'budget'],
    likes: 32,
    createdAt: new Date().toISOString()
  }
];

const fullVideos = [
  {
    id: fullVideoId,
    creatorId: demoCreatorId,
    seriesId,
    title: '14-Min Full-Body Street Workout',
    description: 'No equipment routine for strength and endurance.',
    durationMinutes: 14,
    playCount: 221,
    createdAt: new Date().toISOString()
  }
];

const series = [
  {
    id: seriesId,
    creatorId: demoCreatorId,
    title: 'Home Fitness Basics',
    description: 'Beginner-friendly sessions to build consistency.',
    followerCount: 98,
    createdAt: new Date().toISOString()
  }
];

const users = [
  {
    id: demoUserId,
    email: 'demo@pathstream.app',
    username: 'demo_user',
    passwordHash: bcrypt.hashSync('password123', 10),
    followingCreatorIds: [demoCreatorId],
    likedClipIds: [clips[0].id],
    watchlistVideoIds: [fullVideoId],
    createdAt: new Date().toISOString()
  },
  {
    id: demoCreatorId,
    email: 'creator@pathstream.app',
    username: 'path_creator',
    passwordHash: bcrypt.hashSync('password123', 10),
    followingCreatorIds: [],
    likedClipIds: [],
    watchlistVideoIds: [],
    createdAt: new Date().toISOString()
  }
];

const commentsByClipId = {
  [clips[0].id]: [
    {
      id: uuid(),
      clipId: clips[0].id,
      userId: demoUserId,
      text: 'This format is great. Watched full right away.',
      createdAt: new Date().toISOString()
    }
  ]
};

const sessions = [];

const watchProgress = [
  {
    userId: demoUserId,
    fullVideoId,
    progressPercent: 42,
    updatedAt: new Date().toISOString()
  }
];

const activity = [
  {
    id: uuid(),
    userId: demoUserId,
    type: 'like',
    text: 'path_creator posted a new clip teaser',
    createdAt: new Date().toISOString()
  },
  {
    id: uuid(),
    userId: demoUserId,
    type: 'follow',
    text: 'You are following @path_creator',
    createdAt: new Date().toISOString()
  }
];

export const store = {
  users,
  clips,
  fullVideos,
  series,
  commentsByClipId,
  sessions,
  watchProgress,
  activity
};