# Contributing to RAI

Thank you for your interest in contributing to RAI! This document provides comprehensive guidelines for contributing to the project.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ with **pnpm** package manager
- **Expo CLI** (`npm install -g @expo/cli`)
- **Android Studio** (for Android development & emulator)
- **Xcode** (for iOS development, macOS only)
- **Git** with a GitHub account
- **Supabase** account and project

### Fork & Clone

1. **Fork the repository** on [GitHub](https://github.com/ScienceGear/RAI)
2. **Clone your fork:**
   ```bash
   git clone https://github.com/<your-username>/RAI.git
   cd RAI
   ```
3. **Install dependencies:**
   ```bash
   pnpm install
   ```

### Environment Setup

4. **Configure environment variables:**
   ```bash
   cd artifacts/rai
   cp .env.example .env
   ```
5. Edit `.env` with your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

6. **Start the development server:**
   ```bash
   pnpm dev
   ```
   Open Expo Go on your device and scan the QR code.

---

## 📂 Project Structure

The main application lives in `artifacts/rai/`:

| Directory | Purpose |
|-----------|---------|
| `app/` | Route files (Expo Router) — screens, layouts, not-found |
| `components/` | Reusable UI components |
| `constants/` | Theme colors, categories, static data |
| `contexts/` | React Context providers (AppContext) |
| `hooks/` | Custom React hooks |
| `lib/` | Core business logic (AI, auth, cloud, scheduling, etc.) |
| `modules/` | Native Expo modules (app-blocker, usage-stats) |
| `plugins/` | Expo config plugins |
| `src/services/` | Background services and engines |
| `src/supabase/` | Supabase client & auth functions |
| `supabase/` | SQL migration schemas |
| `types/` | Shared TypeScript interfaces |

---

## 📝 Coding Standards

### General Rules

- **Use TypeScript** — All code must be strictly typed. Avoid `any` types.
- **Use Expo Router** — File-based routing pattern. Route files start with `+` (e.g., `+not-found.tsx`).
- **Use Zustand** for client-side state management.
- **Use React Query** for server-side state management.
- **Use Tailwind CSS** via NativeWind for styling — follow the existing color theme (`#0A0A0F` bg, `#6366F1` primary, `#8B5CF6` accent).
- **Write JSDoc comments** for all exported functions, types, and interfaces.

### File Organization

- **Route files:** `app/[section]/[action].tsx` or `app/[section]/[action]/+page.tsx`
- **Layout files:** `app/[section]/+layout.tsx` or `app/[section]/_layout.tsx`
- **Components:** PascalCase filenames (e.g., `TaskCard.tsx`, `ProgressRing.tsx`)
- **Hooks:** `use` prefix (e.g., `useColors.ts`, `useStorage.ts`)
- **Libraries:** Lowercase descriptive names (e.g., `auth.ts`, `cloud.ts`, `scheduler.ts`)

### Code Style

```typescript
// ✅ Good — Descriptive names, proper typing
export async function createSquad(params: {
  squadName: string;
  creatorUid: string;
  creatorName: string;
}): Promise<SquadDoc> { ... }

// ❌ Avoid — Vague names, any types
export async function makeGroup(data: any) { ... }
```

- Use **async/await** for all asynchronous operations.
- Use **optional chaining** (`?.`) and **nullish coalescing** (`??`) for safe access.
- Use **const** by default, **let** only when reassignment is needed.
- Prefer **arrow functions** over traditional function expressions.
- Import types explicitly: `import type { Task } from "@/types"`.

---

## 🔧 Adding a New Feature

### Step-by-Step Guide

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Design the feature** — Consider how it fits into the existing architecture (routes, components, lib, services).

3. **Implement:**
   - Add route files in `app/` if UI is involved
   - Add components in `components/`
   - Add business logic in `lib/`
   - Add service workers in `src/services/` if needed
   - Update types in `types/index.ts`
   - Update context providers in `contexts/AppContext.tsx` if global state is needed

4. **Test:**
   ```bash
   pnpm typecheck      # Run TypeScript type checking
   pnpm android         # Test on Android
   ```

5. **Commit your changes:**
   ```bash
   git add -A
   git commit -m "feat: add [description of feature]"
   ```

---

## 🐛 Reporting Issues

When reporting bugs, include:

- **Device model** and **OS version**
- **Steps to reproduce** (detailed, reproducible steps)
- **Expected behavior** vs. **actual behavior**
- **Screenshots or screen recordings** if applicable
- **Console logs** if available
- **Crash logs** for native crashes (from `adb logcat` or Xcode Console)

---

## 📋 Pull Request Process

1. **Branch naming:** Use `feature/`, `fix/`, or `refactor/` prefixes.
2. **Commit messages:** Be descriptive and follow conventional commits:
   - `feat:` — New feature
   - `fix:` — Bug fix
   - `refactor:` — Code restructuring without behavior change
   - `chore:` — Maintenance tasks (deps, build, etc.)
   - `docs:` — Documentation changes
3. **PR description:** Include:
   - Summary of changes and rationale
   - Screenshots/GIFs for UI changes
   - Related issue numbers (if applicable)
   - Testing instructions
4. **Before merging:**
   - All checks must pass
   - TypeScript type checking must pass
   - No secrets or sensitive data in code
   - No breaking changes (unless explicitly noted)

---

## ⚠️ Important Guidelines

- **Never commit secrets** — API keys, tokens, certificates, or `.env` files are gitignored. Use `.env.example` for placeholder values.
- **Keep the Supabase config** — The `.env` file must contain `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- **Maintain workspace references** — The monorepo uses pnpm workspaces. Any new packages must be properly linked.
- **Android-only focus** — The native modules (`app-blocker`, `usage-stats`) are Android-specific. Ensure corresponding iOS implementations exist before adding cross-platform features.

---

## 🚢 Building for Distribution

### Preview Build (APK)
```bash
eas build --platform android --profile preview --local
```

### Production Build (AAB for Play Store)
```bash
eas build --platform android --profile production
```

### EAS Configuration
Review `eas.json` for build profiles:
- `development` — Development client with internal distribution
- `preview` — Internal distribution for testing
- `production` — Auto-incremented version for production

---

## 📊 Project Timeline

| Phase | Activity | Status |
|-------|----------|--------|
| Phase 1 | Empathise — User Research & Surveys | ✅ Complete |
| Phase 2 | Define — Problem Framing (5 Whys) | ✅ Complete |
| Phase 3 | Ideate — Brainstorming & Selection | ✅ Complete |
| Phase 4 | Prototype — App Development | ✅ Complete |
| Phase 5 | Test — User Testing & Feedback | ✅ Complete |
| Future | Cross-platform expansion, advanced AI features | 📋 Planned |

---

## 👥 Team & Roles

| Name | Roll No | Role |
|------|---------|------|
| Pranay Popat Tanpure | 10466 | Lead Developer, AI/Backend |
| Kartik Rajesh Rokade | 10455 | Frontend & UX |
| Charu Ramakant Singla | 10463 | Research & Design |
| Ruthika Sandeep Tatar | 10467 | Testing & Documentation |
| Malhar Dnyaneshwar Taware | 10468 | Native Modules & Build |
| Harsh Kishor Wagh | 10470 | Analytics & Data |

**Project Guide:** Prof. Dr. Shivaji V. Mundhe — Basic Sciences and Engineering, F.Y. B. Tech., PICT

---

## 🔗 Useful Links

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router Guide](https://expo.github.io/router/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Design Thinking Process](https://www.interaction-design.org/literature/topics/design-thinking)

---

## Code of Conduct

Be respectful, constructive, and professional in all interactions. Follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

---

## Questions?

Open a GitHub **Discussion** or reach out to the maintainers directly on GitHub.

**Happy coding! 🚀**