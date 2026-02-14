# Mobile Store Readiness (Phase 3)

This checklist is for the Expo app in `apps/mobile` before TestFlight and Google Play internal testing.

## Product and UX

- [ ] Core flows verified on device: sign in, feed, watchroom, create, inbox, profile
- [ ] Loading states visible for all network actions
- [ ] User-facing error and success messaging verified
- [ ] Empty states exist for feed, inbox, analytics, and search

## App configuration

- [ ] Confirm app identifiers in `apps/mobile/app.json`
  - iOS bundle id
  - Android package name
- [ ] Increment `expo.version`, iOS `buildNumber`, and Android `versionCode`
- [ ] Set final app name and slug
- [ ] Replace icon, splash, adaptive icon, and favicon assets

## Backend and environment

- [ ] API deployed to stable HTTPS URL (not LAN IP)
- [ ] Set `EXPO_PUBLIC_API_BASE_URL` to production/staging endpoint
- [ ] Validate CORS and auth/session behavior with mobile clients
- [ ] Run API integration tests before each mobile release candidate

## Compliance and policy

- [ ] Publish Privacy Policy URL
- [ ] Publish Terms of Service URL
- [ ] Complete App Store privacy questionnaire
- [ ] Complete Google Play Data Safety form
- [ ] Remove placeholder content and test-only accounts from production

## EAS build and distribution

1. Install and authenticate:

```bash
npm i -g eas-cli
cd apps/mobile
eas login
```

2. Configure project (first run):

```bash
eas init
```

3. Build internal preview:

```bash
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

4. Submit production build:

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production

eas build --platform android --profile production
eas submit --platform android --profile production
```

## Release quality gate

- [ ] `npm --workspace @2dpunch/api run test` passes
- [ ] `npm run build` passes
- [ ] Device smoke test completed on at least one iOS and one Android device
