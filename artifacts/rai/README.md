# RAI — AI-Powered Productivity Coach

![RAI](https://img.shields.io/badge/RAI-AI%20Productivity%20Coach-blueviolet)

RAI is a mobile-first AI productivity coach built with **Expo (React Native)** that helps you manage tasks, track screen time, avoid distractions, and build better habits through intelligent scheduling and AI-powered insights.

## Features

- **AI Task Parsing** — Add tasks naturally via text; RAI extracts priority, category, deadlines, and estimates automatically
- **Smart Scheduling** — AI schedules your tasks based on your energy profile, chronotype, and existing commitments
- **Screen Time Analytics** — Track app usage, identify distraction patterns, and get actionable insights
- **Danger Zone Detection** — AI detects your high-risk distraction hours and sends proactive focus reminders
- **Focus Timer** — Pomodoro-style focus sessions with smart notifications
- **Squad System** — Team up with friends, share progress, and stay accountable together
- **AI Coaching** — Get personalized daily briefings, confidence boosts, and weekly performance reports powered by AI
- **Mood & Energy Tracking** — Log your mood and energy levels; RAI correlates them with productivity patterns
- **App Blocking** — Block distracting apps during focus sessions (Android)
- **Real-time Sync** — Cross-device sync via Supabase

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo 54, React Native 0.81 |
| Routing | Expo Router 6 |
| State Management | Zustand + React Context |
| Database | Supabase (PostgreSQL) |
| AI Backend | OpenAI-compatible API |
| Styling | Tailwind CSS (via NativeWind) |
| Build Tools | TypeScript, Metro, EAS |
| Notifications | Expo Notifications |
| Analytics | Custom Risk Engine + Predictions |

## Getting Started

### Prerequisites

- Node.js 18+ with pnpm
- Expo Go app (for testing on device)
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ScienceGear/RAI.git
   cd RAI/Premium-Logic-Builder/artifacts/rai
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Run the development server**
   ```bash
   pnpm dev
   ```
   Or open in Expo Go by scanning the QR code.

5. **Run on Android**
   ```bash
   pnpm android
   ```

## Project Structure

```
artifacts/rai/
├── app/                      # Expo Router app directory
│   ├── (tabs)/               # Tab navigation
│   ├── auth/                 # Authentication screens
│   ├── onboarding/           # Onboarding flow
│   ├── settings/             # Settings screens
│   ├── blocker/              # App blocker UI
│   └── +not-found.tsx        # 404 page
├── components/               # Reusable UI components
├── constants/                # Constants and theme config
├── contexts/                 # React Context providers
├── hooks/                    # Custom React hooks
├── lib/                      # Core business logic
│   ├── ai.ts                 # AI integration (task parsing, coaching)
│   ├── auth.ts               # Authentication helpers
│   ├── cloud.ts              # Supabase/Firestore-like operations
│   ├── scheduler.ts          # Task scheduling algorithm
│   ├── brainstate.ts         # Brain state computation
│   ├── categorizer.ts        # AI task categorization
│   ├── predictions.ts        # Danger zone & brain state predictions
│   ├── notifications.ts      # Notification management (web)
│   ├── notifications.native.ts # Notification management (native)
│   ├── storage.ts            # AsyncStorage wrapper
│   └── xp.ts                 # XP & achievement system
├── modules/                  # Expo modules (native)
│   ├── app-blocker/          # App blocking module (Android)
│   └── usage-stats/          # Usage stats module (Android)
├── plugins/                  # Expo config plugins
├── scripts/                  # Build scripts
├── server/                   # Production static server
├── src/
│   ├── services/             # Background services
│   ├── supabase/             # Supabase client & auth
│   └── native/               # Native bridge definitions
├── supabase/                 # SQL schemas
└── types/                    # TypeScript type definitions
```

## Development

### Available Scripts

```bash
pnpm dev        # Start dev server with Expo
pnpm android    # Run on Android emulator/device
pnpm ios        # Run on iOS simulator (macOS only)
pnpm build      # Build production bundle
pnpm serve      # Start production server
pnpm typecheck  # Run TypeScript type checking
```

### Key Dependencies

- `expo` — React Native framework and toolchain
- `react-native-reanimated` — Animations
- `react-native-gesture-handler` — Gesture support
- `@supabase/supabase-js` — Database client
- `@tanstack/react-query` — Server state management
- `zustand` — Client state management
- `@expo/router` — File-based routing

## License

MIT

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute.