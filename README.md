# 2dpunch

Hybrid short-form + long-form social video MVP (TikTok + Tubi style) with full frontend and backend scaffolding.

## What is implemented

- Authentication: sign up, sign in, current session, logout, logout-all
- Shorts feed with likes, comments, and `Watch Full` linkage
- Watchroom long-form sections (continue watching, trending, from liked clips)
- Creator upload stubs for full videos and teaser clips
- Profile, follow creators, watchlist toggles, inbox placeholder
- In-memory repositories designed to be replaced by your DB layer
- Repository provider mode: in-memory (default) or Supabase

## Stack

- `apps/api`: Node.js + Express
- `apps/web`: React + Vite
- Root workspace: npm workspaces

## Run

```bash
npm install
npm run dev
```

Apps:

- Web: http://localhost:5173
- API: http://localhost:4000

## Data provider mode

Default local mode (in-memory):

```bash
npm --workspace @2dpunch/api run dev
```

Supabase mode:

```bash
cp apps/api/.env.example apps/api/.env
# fill SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
DATA_PROVIDER=supabase npm --workspace @2dpunch/api run dev
```

Supabase schema:

- `docs/supabase-schema.sql`

## Expo mobile (Phase 1)

The repo now includes an Expo client in `apps/mobile` with:

- Sign in
- For You feed
- Watchroom (open full video, search, save progress)
- Create (full video + teaser clip)
- Inbox activity
- Profile analytics + logout + logout-all
- React Navigation tab structure
- Action-level loading and success/error banners

Run:

```bash
npm --workspace mobile run start
```

Set the API URL for Expo:

```bash
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:4000 npm --workspace mobile run start
```

URL tips:

- Android emulator: `http://10.0.2.2:4000`
- iOS simulator: `http://localhost:4000`
- Physical device: `http://<your-computer-lan-ip>:4000`

Store prep checklist:

- See `docs/mobile-store-readiness.md`

## Demo account

- Email: `demo@pathstream.app`
- Password: `password123`

## Pre-Supabase completion checklist

- See `docs/feature-checklist.md`

## Phase 4 release docs

- Store readiness checklist: `docs/mobile-store-readiness.md`
- End-to-end release runbook: `docs/phase4-release-runbook.md`

## Swap in your DB

The backend data layer is centralized in:

- `apps/api/src/repositories/userRepository.js`
- `apps/api/src/repositories/contentRepository.js`

Replace those repository implementations with DB-backed logic while keeping route contracts unchanged.
