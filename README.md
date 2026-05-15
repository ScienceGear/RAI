# 🚀 RAI — AI-Powered Productivity Coach

**Intelligence meets productivity. Built with React Native + Expo.**

![Expo](https://img.shields.io/badge/Expo-SDK%2054-yellowgreen) ![React Native](https://img.shields.io/badge/React%20Native-0.81-blue) ![License](https://img.shields.io/badge/License-MIT-purple)

RAI is an AI-driven mobile productivity app that helps you stay focused, manage tasks, track screen time, and build better habits — proactively, not passively.

🔗 **Live Site:** [https://rai.sciencegear.tech/](https://rai.sciencegear.tech/)

---

## ✨ Features

- 🧠 **AI Task Parsing** — Add tasks in plain text, RAI does the rest
- 📅 **Smart Scheduling** — Tasks auto-scheduled based on your energy profile
- 📊 **Screen Time Analytics** — Know where your time really goes
- ⚡ **Danger Zone Alerts** — AI detects your distraction hours before you do
- 🎯 **Focus Timer** — Pomodoro sessions with smart notifications
- 👥 **Squad System** — Team up, stay accountable together
- 🗣️ **AI Coaching** — Daily briefings, confidence boosts, weekly reports

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Expo 54, React Native 0.81 |
| Routing | Expo Router 6 |
| State | Zustand + React Context |
| Database | Supabase (PostgreSQL + Realtime) |
| Styling | Tailwind CSS / NativeWind |
| Auth | Supabase Auth |

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/ScienceGear/RAI.git
cd RAI

# Install
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your Supabase URL and ANON key

# Run
pnpm dev
```

**Or on Android:**
```bash
pnpm android
```

## 📁 Structure

```
artifacts/rai/
├── app/              # Routes (Expo Router)
├── components/       # UI Components
├── lib/              # Core logic (AI, Auth, Cloud, Scheduler)
├── modules/          # Native modules (app-blocker, usage-stats)
├── src/
│   ├── services/     # Background engines
│   └── supabase/     # DB client & auth
├── supabase/         # SQL schemas
└── types/            # TypeScript types
```

## 📥 Download

| Build | Link |
|-------|------|
| **APK (Debug)** | Build locally: `eas build --platform android --profile preview --local` |
| **AAB (Production)** | `eas build --platform android --profile production` |

## 🚢 Deploy

```bash
eas build --platform android --profile production
eas submit --platform android --latest
```

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 👥 Team

| Name | Roll No |
|------|---------|
| Pranay Popat Tanpure | 10466 |
| Kartik Rajesh Rokade | 10455 |
| Charu Ramakant Singla | 10463 |
| Ruthika Sandeep Tatar | 10467 |
| Malhar Dnyaneshwar Taware | 10468 |
| Harsh Kishor Wagh | 10470 |

**Guide:** Prof. Dr. Shivaji V. Mundhe

**Institution:** Pune Institute of Computer Technology (PICT), Dhankawadi, Pune

---

<p align="center">
  <b>RAI — Reasoning Artificial Intelligence</b><br>
  <i>Your smart productivity companion, powered by AI.</i>
</p>