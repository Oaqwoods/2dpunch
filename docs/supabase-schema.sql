-- 2dpunch Supabase schema (provider mode)
-- Run in Supabase SQL editor before setting DATA_PROVIDER=supabase

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key,
  email text unique not null,
  username text not null,
  password_hash text not null,
  following_creator_ids uuid[] not null default '{}',
  liked_clip_ids uuid[] not null default '{}',
  watchlist_video_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists series (
  id uuid primary key,
  creator_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null,
  follower_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists full_videos (
  id uuid primary key,
  creator_id uuid not null references users(id) on delete cascade,
  series_id uuid references series(id) on delete set null,
  title text not null,
  description text not null,
  duration_minutes integer not null,
  play_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists clips (
  id uuid primary key,
  creator_id uuid not null references users(id) on delete cascade,
  title text not null,
  caption text not null,
  duration_seconds integer not null,
  full_video_id uuid not null references full_videos(id) on delete cascade,
  tags text[] not null default '{}',
  likes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists comments (
  id uuid primary key,
  clip_id uuid not null references clips(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists watch_progress (
  user_id uuid not null references users(id) on delete cascade,
  full_video_id uuid not null references full_videos(id) on delete cascade,
  progress_percent integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, full_video_id)
);

create table if not exists activity (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_clips_creator on clips (creator_id);
create index if not exists idx_clips_full_video on clips (full_video_id);
create index if not exists idx_full_videos_creator on full_videos (creator_id);
create index if not exists idx_watch_progress_user on watch_progress (user_id);
create index if not exists idx_comments_clip on comments (clip_id);
create index if not exists idx_activity_user on activity (user_id);
