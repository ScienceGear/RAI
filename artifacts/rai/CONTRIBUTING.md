# Contributing to RAI

Thank you for your interest in contributing to RAI! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork**
   ```bash
   git clone https://github.com/<your-username>/rai.git
   cd RAI
   ```
3. **Install dependencies**
   ```bash
   pnpm install
   ```
4. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Fill in your Supabase credentials in `.env` (see `.env.example` for reference)
3. Start the development server:
   ```bash
   pnpm dev
   ```

### Code Structure

- **`app/`** — Route files (Expo Router). Add new screens/routes here.
- **`components/`** — Reusable UI components.
- **`lib/`** — Core business logic (AI, auth, cloud, scheduling, etc.)
- **`src/services/`** — Background services, engines, and platform integrations.
- **`modules/`** — Native Expo modules for Android-specific features.
- **`types/`** — Shared TypeScript interfaces.

### Coding Standards

- Use **TypeScript** — All code must be strictly typed. No `any` types.
- Use **Expo Router** pattern — File-based routing with `+` prefix for routes.
- Use **Zustand** for client state, **React Query** for server state.
- Write **JSDoc** comments for exported functions and types.
- Follow the existing **Tailwind CSS** utility pattern for styling.

### Testing

Before submitting a PR:
1. Run type checking:
   ```bash
   pnpm typecheck
   ```
2. Ensure the app builds:
   ```bash
   pnpm build
   ```
3. Test on Android:
   ```bash
   pnpm android
   ```

### Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** — Keep commits focused and descriptive
3. **Run type checking** to ensure no type errors
4. **Open a Pull Request** with:
   - A clear description of what was changed and why
   - Screenshots/GIFs if UI changes are involved
   - Reference to related issues (if any)

### Reporting Issues

- Use the GitHub **Issues** tab
- Include:
  - Device model and OS version
  - Steps to reproduce
  - Expected vs. actual behavior
  - Screenshots or logs

### Important Notes

- **Never commit secrets or API keys** — Use `.env` which is gitignored
- The `.env` file must contain `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Keep the `package.json` workspace references intact
- Any new native module additions require corresponding Expo config plugin updates

## Code of Conduct

Be respectful, constructive, and professional in all interactions. Follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

## Questions?

Open a GitHub Discussion or reach out to the maintainers.