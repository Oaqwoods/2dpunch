# Phase 4 Release Runbook

This runbook covers final pre-release and distribution for iOS and Android.

## 1) Backend release mode

- Keep local development on in-memory mode:
  - `DATA_PROVIDER=memory`
- Switch to Supabase mode for staging/production:
  - `DATA_PROVIDER=supabase`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

Use schema file before first Supabase run:

- `docs/supabase-schema.sql`

## 2) Validation gate

Run before every candidate build:

```bash
npm install
npm --workspace @2dpunch/api run test
npm run build
```

## 3) Mobile preflight

- Confirm `apps/mobile/app.json` identifiers and version values
- Confirm `EXPO_PUBLIC_API_BASE_URL` points to deployed HTTPS backend
- Verify smoke test on one iOS and one Android device

## 4) Internal testing builds

From repo root:

```bash
npm run mobile:build:preview:ios
npm run mobile:build:preview:android
```

## 5) Production builds

From repo root:

```bash
npm run mobile:build:prod:ios
npm run mobile:build:prod:android
```

Then submit with EAS as needed:

```bash
cd apps/mobile
npx eas submit --platform ios --profile production
npx eas submit --platform android --profile production
```

## 6) Rollback strategy

- Keep previous stable backend deployment available
- Do not migrate DB schema destructively during rollout
- Roll back mobile by pausing rollout in App Store Connect / Play Console
