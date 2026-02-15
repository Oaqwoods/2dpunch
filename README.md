# 2dpunch (Expo + Supabase)

Fresh rebuild using React Native (Expo) and Supabase.

## Stack

- Expo + React Native + TypeScript
- Supabase Auth (email/password)
- Supabase Postgres (`posts` table)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure env vars:

```bash
cp .env.example .env
```

Set these values in `.env`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

3. Create DB schema in Supabase SQL Editor:

- Run [docs/supabase-schema.sql](docs/supabase-schema.sql)

4. (Optional) Create demo account in Supabase Auth:

- Email: `demo@pathstream.app`
- Password: `password123`

## Run

```bash
npm run start
```

Tunnel mode (recommended for Expo Go on phone):

```bash
npm run start:tunnel
```

## MVP features included

- Sign up / Sign in / Sign out
- Persistent session via AsyncStorage
- Create post (title + body)
- Feed list of recent posts

## Notes

- If login fails with "Network request failed", restart Expo with env vars loaded and `npm run start:tunnel`.
- If using Codespaces, ensure your Supabase project URL/key are valid and active.
