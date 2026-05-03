# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (API server); AsyncStorage (mobile)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### RAI — AI Productivity Coach (`artifacts/rai`)
Expo SDK 54 (React Native) Android-only AI productivity coach app.

**Package:** `tech.sciencegear.rai`  
**EAS Project:** `@sciencegear/rai` (ID: `ccb66738-75ca-4a3f-a21f-cb7c4b56586e`)  
**EAS Account:** `sciencegear` (token stored as `EXPO_TOKEN` secret)

**Tech:**
- Expo SDK 54, expo-router v6 (file-based routing)
- Firebase v12 (Firestore + Auth, no Storage — avatars stored as base64 in Firestore)
- Anthropic Claude AI via API server proxy (`/api/ai/chat`)
- Dark-first UI: `#0A0A0F` background, `#6366F1` primary, `#8B5CF6` accent
- AsyncStorage local cache + Firestore real-time sync
- Reanimated v4, Gesture Handler v2

**Native Modules (Android custom):**
- `modules/usage-stats/` — PACKAGE_USAGE_STATS permission, reads device screen time
- `modules/app-blocker/` — Accessibility Service, blocks distraction apps

**EAS Build:**
- `preview` profile → APK (sideload/distribute internally)
- `production` profile → AAB (Play Store)
- Build command: `cd artifacts/rai && EXPO_TOKEN=$EXPO_TOKEN eas build --platform android --profile preview --non-interactive`
- Monitor builds: https://expo.dev/accounts/sciencegear/projects/rai/builds

**Screens:**
- `app/index.tsx` — Animated splash screen with auth routing
- `app/auth/index.tsx` — Sign in / sign up
- `app/onboarding/index.tsx` — 8-step onboarding flow
- `app/onboarding/permissions.tsx` — Notifications, usage access, microphone
- `app/(tabs)/home.tsx` — Dashboard: Focus Score, streak, Today's Schedule, AI insight
- `app/(tabs)/tasks.tsx` — Task list with search, filter, add/edit via TaskSheet
- `app/(tabs)/calendar.tsx` — Day/Week/Month calendar with danger zones
- `app/(tabs)/squad.tsx` — Social leaderboard, activity feed, squad management
- `app/(tabs)/analytics.tsx` — RAI Score, screen time, productivity
- `app/focus/index.tsx` — Pomodoro/focus timer
- `app/diary/index.tsx` — AI-powered chat diary with date strip
- `app/achievements.tsx` — XP levels, milestones
- `app/goals/index.tsx` — Goal creation and milestone tracking
- `app/confidence.tsx` — Confidence score, AI affirmations
- `app/settings/index.tsx` — Theme, notifications, sleep schedule, focus duration
- `app/settings/app-blocker.tsx` — App blocking management
- `app/profile/index.tsx` — User stats, quick actions, logout

**Key Libraries:**
- `contexts/AppContext.tsx` — Global state (profile, tasks, goals, diary, focus sessions, achievements, squad)
- `lib/firebase.ts` — Firestore CRUD, auth, squad ops, base64 photo encoding
- `lib/auth.ts` — Firebase Auth (signIn, signUp, signOut, listenToAuthState)
- `lib/notifications.ts` — expo-notifications: daily briefing, danger zone alerts, task reminders
- `lib/ai.ts` — AI call helpers (chat, insight, scheduling, affirmations)
- `lib/scheduler.ts` — Smart task scheduling based on energy profile
- `lib/xp.ts` — XP/level system, RAI score, achievements
- `hooks/useColors.ts` — Theme-aware color hook
- `constants/categories.ts` — Task categories, RAI score tiers

### API Server (`artifacts/api-server`)
Express 5 server. Proxies Anthropic Claude AI requests from the mobile app.

**Routes:**
- `GET /api/healthz` — Health check
- `POST /api/ai/chat` — Anthropic Claude proxy

**Env vars needed:**
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY`

**Firebase env vars (for `artifacts/rai`):**
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
