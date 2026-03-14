-- 2dpunch full schema — run in Supabase SQL Editor
-- Drop old tables if rebuilding
drop table if exists public.notifications cascade;
drop table if exists public.likes cascade;
drop table if exists public.challenge_sources cascade;
drop table if exists public.challenges cascade;
drop table if exists public.sources cascade;
drop table if exists public.takes cascade;
drop table if exists public.profiles cascade;
drop table if exists public.posts cascade;

create extension if not exists "pgcrypto";

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 2 and 30),
  bio text not null default '' check (char_length(bio) <= 200),
  avg_trust_score numeric(5,2) not null default 0,
  takes_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "users can insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id);

-- Auto-create profile on sign up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── TAKES ───────────────────────────────────────────────────────────────────
create table public.takes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('politics', 'sports')),
  tags text[] not null default '{}',
  body text not null check (char_length(body) between 1 and 500),
  trust_score numeric(5,2) not null default 0,
  likes_count integer not null default 0,
  challenges_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.takes enable row level security;

create policy "takes readable by authenticated users"
  on public.takes for select to authenticated using (true);

create policy "users can insert own takes"
  on public.takes for insert to authenticated
  with check (
    auth.uid() = user_id
    -- Rate limit: max 10 takes per hour per user
    and (
      select count(*) from public.takes
      where user_id = auth.uid()
      and created_at > now() - interval '1 hour'
    ) < 10
  );

create policy "users can delete own takes"
  on public.takes for delete to authenticated using (auth.uid() = user_id);

create index idx_takes_user on public.takes (user_id);
create index idx_takes_category on public.takes (category);
create index idx_takes_created on public.takes (created_at desc);

-- ─── SOURCES (receipts attached to takes) ────────────────────────────────────
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  take_id uuid not null references public.takes(id) on delete cascade,
  url text not null check (char_length(url) between 10 and 2000),
  domain text not null,
  trust_tier text not null check (trust_tier in ('high', 'mid', 'low')),
  score integer not null check (score between 0 and 100),
  created_at timestamptz not null default now()
);

alter table public.sources enable row level security;

create policy "sources readable by authenticated users"
  on public.sources for select to authenticated using (true);

create policy "users can insert sources on own takes"
  on public.sources for insert to authenticated
  with check (
    exists (select 1 from public.takes where id = take_id and user_id = auth.uid())
    -- Rate limit: max 5 sources per take
    and (select count(*) from public.sources where take_id = sources.take_id) < 5
  );

create index idx_sources_take on public.sources (take_id);

-- ─── CHALLENGES ──────────────────────────────────────────────────────────────
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  take_id uuid not null references public.takes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  trust_score numeric(5,2) not null default 0,
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (take_id, user_id) -- one challenge per user per take
);

alter table public.challenges enable row level security;

create policy "challenges readable by authenticated users"
  on public.challenges for select to authenticated using (true);

create policy "users can insert own challenges"
  on public.challenges for insert to authenticated
  with check (
    auth.uid() = user_id
    -- Can't challenge your own take
    and not exists (select 1 from public.takes where id = take_id and user_id = auth.uid())
    -- Rate limit: max 20 challenges per hour
    and (
      select count(*) from public.challenges
      where user_id = auth.uid()
      and created_at > now() - interval '1 hour'
    ) < 20
  );

create policy "users can delete own challenges"
  on public.challenges for delete to authenticated using (auth.uid() = user_id);

create index idx_challenges_take on public.challenges (take_id);

-- ─── CHALLENGE SOURCES ───────────────────────────────────────────────────────
create table public.challenge_sources (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  url text not null check (char_length(url) between 10 and 2000),
  domain text not null,
  trust_tier text not null check (trust_tier in ('high', 'mid', 'low')),
  score integer not null check (score between 0 and 100),
  created_at timestamptz not null default now()
);

alter table public.challenge_sources enable row level security;

create policy "challenge sources readable by authenticated users"
  on public.challenge_sources for select to authenticated using (true);

create policy "users can insert sources on own challenges"
  on public.challenge_sources for insert to authenticated
  with check (
    exists (select 1 from public.challenges where id = challenge_id and user_id = auth.uid())
  );

-- ─── LIKES ───────────────────────────────────────────────────────────────────
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  take_id uuid references public.takes(id) on delete cascade,
  challenge_id uuid references public.challenges(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (take_id is not null and challenge_id is null) or
    (take_id is null and challenge_id is not null)
  ),
  unique (user_id, take_id),
  unique (user_id, challenge_id)
);

alter table public.likes enable row level security;

create policy "likes readable by authenticated users"
  on public.likes for select to authenticated using (true);

create policy "users can insert own likes"
  on public.likes for insert to authenticated with check (auth.uid() = user_id);

create policy "users can delete own likes"
  on public.likes for delete to authenticated using (auth.uid() = user_id);

create index idx_likes_take on public.likes (take_id);
create index idx_likes_user on public.likes (user_id);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('challenge', 'like')),
  take_id uuid references public.takes(id) on delete cascade,
  challenge_id uuid references public.challenges(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "users can read own notifications"
  on public.notifications for select to authenticated using (auth.uid() = user_id);

create policy "users can update own notifications"
  on public.notifications for update to authenticated using (auth.uid() = user_id);

create index idx_notifications_user on public.notifications (user_id, read, created_at desc);

-- ─── FUNCTIONS: update trust score on take after sources change ───────────────
create or replace function public.refresh_take_trust_score(p_take_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.takes
  set trust_score = coalesce((
    select avg(score) from public.sources where take_id = p_take_id
  ), 0)
  where id = p_take_id;
end;
$$;

create or replace function public.refresh_challenge_trust_score(p_challenge_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.challenges
  set trust_score = coalesce((
    select avg(score) from public.challenge_sources where challenge_id = p_challenge_id
  ), 0)
  where id = p_challenge_id;
end;
$$;

-- ─── TRIGGER: notify take owner when challenged ───────────────────────────────
create or replace function public.notify_on_challenge()
returns trigger language plpgsql security definer as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.takes where id = new.take_id;
  if v_owner <> new.user_id then
    insert into public.notifications (user_id, type, take_id, challenge_id, actor_id)
    values (v_owner, 'challenge', new.take_id, new.id, new.user_id);
  end if;
  -- increment challenges_count
  update public.takes set challenges_count = challenges_count + 1 where id = new.take_id;
  return new;
end;
$$;

create or replace trigger on_challenge_created
  after insert on public.challenges
  for each row execute function public.notify_on_challenge();

-- ─── TRIGGER: notify on like ──────────────────────────────────────────────────
create or replace function public.notify_on_like()
returns trigger language plpgsql security definer as $$
declare
  v_owner uuid;
begin
  if new.take_id is not null then
    select user_id into v_owner from public.takes where id = new.take_id;
    if v_owner <> new.user_id then
      insert into public.notifications (user_id, type, take_id, actor_id)
      values (v_owner, 'like', new.take_id, new.user_id);
    end if;
    update public.takes set likes_count = likes_count + 1 where id = new.take_id;
  end if;
  return new;
end;
$$;

create or replace trigger on_like_created
  after insert on public.likes
  for each row execute function public.notify_on_like();

create or replace function public.decrement_likes()
returns trigger language plpgsql security definer as $$
begin
  if old.take_id is not null then
    update public.takes set likes_count = greatest(likes_count - 1, 0) where id = old.take_id;
  end if;
  return old;
end;
$$;

create or replace trigger on_like_deleted
  after delete on public.likes
  for each row execute function public.decrement_likes();

-- Migration: add title column to sources and challenge_sources (safe, nullable)
alter table public.sources add column if not exists title text;
alter table public.challenge_sources add column if not exists title text;

-- Migration: re-point user_id FKs to public.profiles so PostgREST can resolve
-- embedded joins like profiles(id, username) in takes/challenges/likes/notifications.
-- Cascade chain is preserved: auth.users → profiles (cascade) → takes (cascade).
alter table public.takes drop constraint if exists takes_user_id_fkey;
alter table public.takes add constraint takes_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.challenges drop constraint if exists challenges_user_id_fkey;
alter table public.challenges add constraint challenges_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.likes drop constraint if exists likes_user_id_fkey;
alter table public.likes add constraint likes_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_user_id_fkey;
alter table public.notifications add constraint notifications_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_actor_id_fkey;
alter table public.notifications add constraint notifications_actor_id_fkey foreign key (actor_id) references public.profiles(id) on delete cascade;

notify pgrst, 'reload schema';

-- ─── HATE SPEECH / SLUR FILTER ──────────────────────────────────────────────
-- Blocks known slurs and hate terms before insert on takes and challenges.
-- Extend the regex alternation to add new terms as needed.
create or replace function public.check_hate_speech()
returns trigger language plpgsql security definer as $$
begin
  -- Case-insensitive whole-word match against a blocklist of hate terms.
  -- \m = start-of-word, \M = end-of-word in PostgreSQL POSIX regex.
  if new.body ~* '\m(nigger|nigga|chink|spic|kike|gook|raghead|wetback|tranny|faggot|dyke|cracker|coon|towelhead|beaner|zipperhead|redskin|squaw|half-breed|sand\s*nigger)\M' then
    raise exception 'Your post was blocked because it contains language that violates community guidelines.';
  end if;
  return new;
end;
$$;

create or replace trigger check_take_hate_speech
  before insert on public.takes
  for each row execute function public.check_hate_speech();

create or replace trigger check_challenge_hate_speech
  before insert on public.challenges
  for each row execute function public.check_hate_speech();

-- ─── MIGRATION: Source suggestions + community voting ────────────────────────
-- Run this block once in a new Supabase SQL Editor query tab.

create table if not exists public.source_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  domain text not null,
  url_example text,
  reason text not null check (char_length(reason) between 10 and 500),
  votes integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (domain)
);

alter table public.source_suggestions enable row level security;

create policy "suggestions readable by authenticated users"
  on public.source_suggestions for select to authenticated using (true);

create policy "users can insert suggestions"
  on public.source_suggestions for insert to authenticated
  with check (
    auth.uid() = user_id
    -- One suggestion per domain across all users (unique constraint handles this)
    -- Rate limit: max 5 suggestions per day
    and (
      select count(*) from public.source_suggestions
      where user_id = auth.uid()
      and created_at > now() - interval '1 day'
    ) < 5
  );

create index if not exists idx_source_suggestions_votes on public.source_suggestions (votes desc);

create table if not exists public.suggestion_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  suggestion_id uuid not null references public.source_suggestions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, suggestion_id)
);

alter table public.suggestion_votes enable row level security;

create policy "votes readable by authenticated users"
  on public.suggestion_votes for select to authenticated using (true);

create policy "users can insert own votes"
  on public.suggestion_votes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "users can delete own votes"
  on public.suggestion_votes for delete to authenticated using (auth.uid() = user_id);

-- Increment vote count on upvote
create or replace function public.increment_suggestion_votes()
returns trigger language plpgsql security definer as $$
begin
  update public.source_suggestions set votes = votes + 1 where id = new.suggestion_id;
  return new;
end;
$$;

create or replace trigger on_suggestion_vote
  after insert on public.suggestion_votes
  for each row execute function public.increment_suggestion_votes();

-- Decrement vote count on un-vote
create or replace function public.decrement_suggestion_votes()
returns trigger language plpgsql security definer as $$
begin
  update public.source_suggestions set votes = greatest(votes - 1, 0) where id = old.suggestion_id;
  return old;
end;
$$;

create or replace trigger on_suggestion_unvote
  after delete on public.suggestion_votes
  for each row execute function public.decrement_suggestion_votes();

-- ─────────────────────────────────────────────
-- MIGRATION 3: follows table + profile follower counts
-- ─────────────────────────────────────────────

create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id)
);

alter table public.profiles
  add column if not exists followers_count integer not null default 0,
  add column if not exists following_count integer not null default 0;

alter table public.follows enable row level security;

create policy "follows readable by anyone"
  on public.follows for select using (true);

create policy "users can follow"
  on public.follows for insert to authenticated
  with check (auth.uid() = follower_id);

create policy "users can unfollow"
  on public.follows for delete to authenticated
  using (auth.uid() = follower_id);

create or replace function public.trg_follows_stats()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
  elsif TG_OP = 'DELETE' then
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
    update public.profiles set followers_count = greatest(followers_count - 1, 0) where id = old.following_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_follows_stats on public.follows;
create trigger on_follows_stats
  after insert or delete on public.follows
  for each row execute function public.trg_follows_stats();


-- ─────────────────────────────────────────────
-- MIGRATION 4: profile stats auto-update on takes insert/delete
-- ─────────────────────────────────────────────

create or replace function public.refresh_profile_stats(p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set
    takes_count     = (select count(*) from public.takes where user_id = p_user_id),
    avg_trust_score = coalesce(
      (select avg(trust_score) from public.takes where user_id = p_user_id),
      0
    )
  where id = p_user_id;
end;
$$;

create or replace function public.trg_take_stats()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    perform public.refresh_profile_stats(new.user_id);
  elsif TG_OP = 'DELETE' then
    perform public.refresh_profile_stats(old.user_id);
  end if;
  return null;
end;
$$;

drop trigger if exists on_take_stats on public.takes;
create trigger on_take_stats
  after insert or delete on public.takes
  for each row execute function public.trg_take_stats();


-- ─────────────────────────────────────────────
-- MIGRATION 5: fix decrement_likes to handle challenge unlikes
-- ─────────────────────────────────────────────

create or replace function public.decrement_likes()
returns trigger language plpgsql security definer as $$
begin
  if old.take_id is not null then
    update public.takes set likes_count = greatest(likes_count - 1, 0) where id = old.take_id;
  end if;
  if old.challenge_id is not null then
    update public.challenges set likes_count = greatest(likes_count - 1, 0) where id = old.challenge_id;
  end if;
  return old;
end;
$$;


-- ─────────────────────────────────────────────
-- MIGRATION 6: avatar_url on profiles + avatars storage bucket
-- ─────────────────────────────────────────────

-- 1. Add nullable avatar_url column
alter table public.profiles
  add column if not exists avatar_url text;

-- 2. Create the storage bucket (public so avatars are readable without auth)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3. Storage RLS: anyone can read
create policy "avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- 4. Storage RLS: authenticated users can upload to their own folder (user_id/*)
create policy "users can upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Storage RLS: authenticated users can update/replace their own avatar
create policy "users can update own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

