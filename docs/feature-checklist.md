# Feature-Complete Checklist (Pre-Supabase)

This checklist defines what “build everything first” means for the current product scope before DB/Auth migration.

## Scope lock

- In scope: auth, short feed, following feed, watchroom, full-video focus, comments, likes, follows, watchlist, create/upload stubs, inbox activity, search, profile/logout, creator basic analytics.
- Out of scope for this phase: real media uploads/transcoding, push notifications, live streaming, production moderation, payments, ad serving, full DM system.

## Product checklist

### Auth and account

- [ ] Sign up with email/username/password
- [ ] Sign in and persist session token
- [ ] Fetch current account (`/auth/me`)
- [ ] Logout current session
- [ ] Logout all sessions

### Feed and engagement

- [ ] For You feed loads linked clips
- [ ] Following feed only includes followed creators
- [ ] Like/unlike clip
- [ ] Follow/unfollow creator
- [ ] View/add comments on a clip

### Long-form and watchroom

- [ ] Watchroom sections load (continue/trending/from-liked)
- [ ] Open full-video details from clip CTA
- [ ] Add/remove from watchlist
- [ ] Update full-video progress and reflect in continue-watching

### Creator flows

- [ ] Create full video
- [ ] Create clip linked to a full video
- [ ] New clip appears in feed
- [ ] New full video appears in watchroom

### Discovery and activity

- [ ] Search clips/full videos/creators by keyword
- [ ] Inbox activity endpoint available and rendered
- [ ] Basic creator analytics endpoint available and rendered

## Manual test matrix

1. Sign in with `demo@pathstream.app` / `password123`.
2. Switch between For You and Following feeds.
3. Like a clip and verify watchroom “From Shorts You Liked” updates.
4. Add a clip comment and verify it appears immediately.
5. Open full video from clip and update progress.
6. Add/remove watchlist from watchroom cards.
7. Create a full video, then create a teaser clip linked to it.
8. Search for title text from your new content.
9. Open Inbox and verify activity items load.
10. Open Profile and verify analytics loads.
11. Test logout and logout-all.

## Automated checks

- API integration tests (`npm --workspace @2dpunch/api run test`)
- Workspace build (`npm run build`)