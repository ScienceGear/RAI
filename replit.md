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
Expo (React Native) mobile app. Full-featured AI productivity coach.

**Tech:**
- Expo SDK 53, expo-router v6 (file-based routing)
- AsyncStorage for persistence (no external DB required)
- Firebase optional (gracefully disabled if env vars absent)
- Anthropic Claude AI via API server proxy (`/api/ai/chat`)
- Dark-first UI: `#0A0A0F` background, indigo/violet accent (`#6366F1` / `#8B5CF6`)

**Screens (18+):**
- `app/index.tsx` — Animated splash screen
- `app/onboarding/index.tsx` — 8-step onboarding flow
- `app/onboarding/permissions.tsx` — Permission requests
- `app/(tabs)/home.tsx` — Dashboard: Focus Score, streak, Today's Schedule, AI insight
- `app/(tabs)/tasks.tsx` — Task list with search, filter, add/edit via TaskSheet
- `app/(tabs)/calendar.tsx` — Day/Week/Month calendar with danger zones
- `app/(tabs)/squad.tsx` — Social leaderboard, activity feed, squad management
- `app/(tabs)/analytics.tsx` — RAI Score, breakdown, stats
- `app/focus/index.tsx` — Pomodoro/focus timer (25m/50m/90m)
- `app/diary/index.tsx` — AI-powered chat diary
- `app/achievements.tsx` — XP levels, milestones, progress tracking
- `app/goals/index.tsx` — Goal creation and milestone tracking
- `app/confidence.tsx` — Confidence score, 7-day trend, AI affirmations
- `app/settings/index.tsx` — Theme toggle (Dark/Light/AMOLED/System), notifications, preferences
- `app/profile/index.tsx` — User stats, achievements, goals, quick actions
- `app/anti-quit.tsx` — Anti-quit intervention screen

**Key Libraries (`artifacts/rai`):**
- `contexts/AppContext.tsx` — Global state (profile, tasks, goals, diary, focus sessions, achievements)
- `hooks/useColors.ts` — Theme-aware color hook (reads profile.theme from AppContext)
- `lib/ai.ts` — AI call helpers (chat, insight, scheduling, affirmations)
- `lib/scheduler.ts` — Smart task scheduling based on energy profile
- `lib/xp.ts` — XP/level system, RAI score, achievements
- `lib/categorizer.ts` — Local task categorization
- `constants/colors.ts` — Light + dark palettes, radius
- `constants/categories.ts` — Task categories, RAI score tiers

### API Server (`artifacts/api-server`)
Express 5 server. Proxies Anthropic Claude AI requests from the mobile app.

**Routes:**
- `GET /api/healthz` — Health check
- `POST /api/ai/chat` — Anthropic Claude proxy (uses `AI_INTEGRATIONS_ANTHROPIC_*` env vars)

**Env vars needed:**
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` — Set automatically via Replit AI integration
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — Set automatically via Replit AI integration

**Optional Firebase env vars (for `artifacts/rai`):**
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
