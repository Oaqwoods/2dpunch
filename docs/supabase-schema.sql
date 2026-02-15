-- Run this in Supabase SQL Editor
create extension if not exists "pgcrypto";

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy if not exists "authenticated users can read posts"
on public.posts
for select
to authenticated
using (true);

create policy if not exists "authenticated users can insert own posts"
on public.posts
for insert
to authenticated
with check (auth.uid() = user_id);

create policy if not exists "users can delete own posts"
on public.posts
for delete
to authenticated
using (auth.uid() = user_id);
