# 📱 RAI – AI-Based Proactive Productivity System

![RAI Banner](https://img.shields.io/badge/RAI-AI%20Productivity%20Coach-blueviolet)
![Flutter](https://img.shields.io/badge/Flutter-%E2%9C%93-brightgreen)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-yellowgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

A **Design Thinking** project submitted for **Innovative Ideas & Design Thinking Lab (Semester II, A.Y. 2025–26)** at **Pune Institute of Computer Technology (PICT), Dhankawadi, Pune**.

---

## 📋 Table of Contents

1. [About the Project](#about-the-project)
2. [Team Members](#team-members)
3. [Guide](#guide)
4. [Acknowledgements](#acknowledgements)
5. [Abstract](#abstract)
6. [Empathise — Understanding the User](#empathise)
7. [Define — Framing the Problem](#define)
8. [Ideate — Generating Ideas](#ideate)
9. [Prototype — Design Solutions](#prototype)
10. [Test — Validation](#test)
11. [Conclusion](#conclusion)
12. [Tech Stack](#tech-stack)
13. [Getting Started — Setup Instructions](#getting-started)
14. [How to Use the App](#how-to-use)
15. [Download Links](#download-links)
16. [Project Structure](#project-structure)
17. [Contributing](#contributing)
18. [License](#license)

---

## About the Project

**RAI (Reasoning Artificial Intelligence)** is an intelligent, real-time, user-centric productivity system designed to bridge the gap between intention and action. It integrates goal management, habit tracking, behavioral analysis, and AI-driven coaching into a single unified platform. The system provides proactive nudges, contextual reminders, and personalized insights based on user behavior, enabling more effective decision-making and consistent performance.

This project was developed as part of the **Design Thinking** methodology across five stages: **Empathise → Define → Ideate → Prototype → Test**.

---

## Team Members

| Roll No | Name |
|---------|------|
| 10455 | Kartik Rajesh Rokade |
| 10463 | Charu Ramakant Singla |
| 10466 | Pranay Popat Tanpure |
| 10467 | Ruthika Sandeep Tatar |
| 10468 | Malhar Dnyaneshwar Taware |
| 10470 | Harsh Kishor Wagh |

---

## Guide

**Prof. Dr. Shivaji V. Mundhe** — Project Guide

---

## Acknowledgements

We are deeply grateful to the Innovative Ideas and Design Thinking Lab (IIDTL) for providing us with a platform to nurture our creativity and technical skills during the completion of this semester project.

We are immensely grateful to our Project Coordinator, Teacher **Mr. Dr. Shivaji V. Mundhe**, whose dedicated support and encouragement were instrumental in the successful completion of our project.

We extend our heartfelt thanks to **Dr. P.T. Kulkarni, Director, PICT**, for his visionary leadership and unwavering support that inspire innovation and excellence. We are profoundly thankful to **Dr. S.T. Gandhe, Principal, PICT**, for his commitment to fostering innovation and creativity, which motivates us to think beyond boundaries and develop unique solutions. A special thanks to **Mr. E.M. Reddy, Head of the Department of Basic Science and Engineering (BS&E)**, for his constant guidance and motivation throughout the semester.

We would also like to thank **Dr. Amol A. Chavan, IIDTL Subject Coordinator**, for his valuable insights and mentorship, which helped us refine our project ideas and approach.

We acknowledge that this project would not have been possible without the resources, guidance, and support provided by all the above-mentioned individuals.

---

## Abstract

Students today face significant challenges in maintaining consistent productivity, focus, and discipline in their daily academic and personal lives. While periods such as examinations create structured environments that enhance performance, the absence of such external pressure often leads to procrastination, excessive social media usage, lack of accountability, and inefficient time management. Traditional productivity tools or applications remain largely passive, relying on user initiative, leading to irregular use, poor habit formation, and decreased effectiveness over time.

This project proposes **RAI (Reasoning Artificial Intelligence)**, an intelligent, real-time, and user-centric productivity system designed to bridge the gap between intention and action. The system integrates goal management, habit tracking, behavioral analysis, and AI-driven coaching into a single unified platform. It provides proactive nudges, contextual reminders, and personalized insights based on user behavior, enabling more effective decision-making and consistent performance.

Research conducted through interviews with high-performing students, observational studies, surveys, and empathy mapping revealed key challenges, including distraction from social media, a lack of structured guidance, inconsistent habits, and a lack of accountability mechanisms. These insights informed the design of RAI as a solution focused on proactive intervention, behavioral understanding, and adaptive support tailored to individual users.

The system aims to improve productivity consistency, reduce digital distractions, enhance focus, and support long-term habit formation. It also enhances user experience by acting as an intelligent companion that evolves with the user over time. This project highlights the importance of a human-centered, AI-driven approach in solving real-world productivity challenges, while opening avenues for future enhancements such as deeper behavioral prediction, cross-platform integration, and advanced personalization.

---

## Empathise — Understanding the User

### Research Objectives
- Understand key productivity challenges faced by users
- Analyze behavior patterns, distractions, and limitations of existing tools
- Identify emotional and psychological barriers
- Define requirements for an intelligent, user-centered productivity system

### Research Methods Used
1. **Observation** — User behavior was observed during study sessions, work routines, and daily activities.
2. **Interviews & Informal Discussions** — Discussions with students, professionals, and self-learners.
3. **Survey Questionnaires** — Surveys collected data on productivity levels, time spent on distractions, tool usage, and habit consistency.
4. **Behavior Analysis** — User actions were analyzed to identify peak productivity periods, distraction triggers, and task completion patterns.
5. **Comparative Analysis** — Existing productivity tools were evaluated to understand their features, limitations, and areas for improvement.

### Key Findings
- **~70% of users** reported losing significant time daily due to social media and digital distractions.
- Users reported feeling **confused and overwhelmed** when dealing with large goals.
- Nearly all users agreed that **current tools are not sufficient** and need smarter, AI-driven support.
- Users intend to be productive but struggle with consistency due to distractions.
- Existing tools fail to provide real-time support, leading to irregular productivity and guilt.

### User Persona — "Anay Patil"

| Attribute | Details |
|-----------|---------|
| Role | Engineering Student |
| Age | 20 |
| Experience | 3rd Year College |
| Tech Comfort Level | High |

**Background:** Anay is a college student who wants to study regularly but often gets distracted by social media and loses consistency. He plans his day but struggles to follow it.

**Goals:**
- Complete daily study targets
- Reduce time spent on social media
- Build consistent study habits

**Pain Points:**
- Gets distracted easily (Instagram, YouTube)
- Makes plans but doesn't follow them
- Feels overwhelmed by the large syllabus
- Feels guilty after wasting time

**What He Needs:**
- A structured daily plan
- A system to track habits and progress
- Motivation and accountability

---

## Define — Framing the Problem

### Root Cause Analysis (5 Whys Method)

| Problem | Root Cause |
|---------|------------|
| Procrastination and delay in starting tasks | Lack of proactive guidance and structured goal breakdown |
| Excessive social media distraction | No behavior-aware monitoring or real-time intervention |
| Inconsistent habits and routines | Lack of accountability and personalized habit support |
| Poor time management | Lack of adaptive planning and real-time decision support |

### "How Might We" Questions
1. How might we understand user behavior in real time to detect distractions and patterns?
2. How might we reduce social media distractions through timely intervention?
3. How might we help users start and complete tasks without feeling overwhelmed?
4. How might we enable users to build consistent habits and routines?
5. How might we introduce accountability into daily actions?
6. How might we adapt plans dynamically based on user performance?

### Scope of the Project

**In-Scope:**
- Goal Management — Setting short-term and long-term goals with actionable task breakdowns
- Task Management — Daily task creation, scheduling, prioritization, and tracking
- Habit Tracking — Monitoring daily habits with streak tracking and consistency metrics
- Behavior Analysis — Tracking productivity patterns and generating personalized insights
- Data Analytics & Reporting — Productivity reports and habit consistency analyses
- System Administration — User profiles, personalization, and secure login

**Out-of-Scope (Future Enhancements):**
- Financial or academic grading functionalities
- Full integration with all third-party applications
- Advanced AI-based emotional analysis

---

## Ideate — Generating Ideas

### Brainstorming Sessions

Three structured brainstorming sessions were conducted:

1. **Open Ideation** — Generated 50+ raw ideas using sticky notes, whiteboard clustering, mind maps, and "Yes, and…" thinking techniques.

2. **Worst Possible Idea** — Explored intentionally unrealistic concepts like "an AI that shouts when you open Instagram" and "a phone that locks itself when time is wasted" to uncover valuable insights about smart nudges and gentle accountability.

3. **Crazy 8s** — Eight rapid sketches in eight minutes visualizing the app interface, daily planner UI, AI interaction flows, notification systems, and chat-based AI prompts.

### Creative Ideas Generated
- **Real-Time Productivity Dashboard** — Goals, tasks, habits, and daily performance in one interface with visual indicators
- **Goal Breakdown System** — Converts large goals into smaller actionable tasks
- **Behavior Tracking System** — Monitors activity patterns and provides personalized feedback
- **Habit Consistency Tracker** — Maintains streaks and visualizes long-term consistency trends

### Selection Criteria
Ideas were evaluated based on: **Feasibility**, **User Experience**, **Productivity Impact**, **Personalization Capability**, and **Scalability**.

**Selected Concept: RAI – AI-Based Proactive Productivity System**
- Combines all essential features into one system
- Provides real-time guidance instead of passive tracking
- Focuses on behavior, not just planning
- Improves consistency and accountability

---

## Prototype — Design Solutions

### App Screens

| Screen | Description |
|--------|-------------|
| **Login Page** | Clean dark-themed interface with email/password authentication and registration |
| **Building Profile** | Onboarding flow collecting user goals, distractions, productive time preferences |
| **Goals** | Set and manage short-term and long-term goals |
| **Distractions & Commitments** | Identify and track distraction sources |
| **Motivation** | Define personal motivation factors |
| **Notifications & Permissions** | Configure push notifications and screen time access |
| **Access Screen Time** | Grant screen time monitoring permissions |
| **User Dashboard** | Central hub displaying RAI Score, streak, tasks completed, and AI insights |
| **Tasks Schedule** | View and manage daily/weekly task schedules |
| **RAI Score** | Comprehensive productivity score with breakdown |
| **Score Breakdown** | Detailed analysis of daily streak, focus hours, tasks completed |

### AI Architecture

The system uses a **RAG (Retrieval-Augmented Generation) memory engine**:
1. User interacts with the app (adds goals, tasks, asks questions)
2. Backend server processes the request and decides on data retrieval strategy
3. Structured data from databases + semantic matching from vector database
4. AI model generates personalized response based on current input and past behavior
5. AI agent oversees the entire flow for proactive, context-aware assistance

---

## Test — Validation

### Testing Methodology
- **Moderated Testing Sessions** — Real-time observation of user interactions
- **Unmoderated Testing** — Natural "wild-use" observation without external guidance
- **Task-Based Testing** — Measuring Efficiency Ratio and workflow bottlenecks
- **Observation-Based Testing** — Detecting hidden usability flaws through user behavior
- **Surveys & Questionnaires** — Gathering broader insights on satisfaction and motivation

### Key Findings
✅ **What Worked:**
- Proactive, personalized AI coaching described as "supportive" rather than "intrusive"
- Goal-tracking clarity received high praise
- Modern dashboard aesthetics appreciated

⚠️ **Issues Identified:**
- Dashboard appeared overly "noisy" with too much information at once (cognitive overload)
- Onboarding friction due to too many setup questions
- Excessive notifications triggered "alert fatigue"
- Users wanted more conversational, empathetic reminder tone

### Improvements Planned
- Streamlined "Quick-Start" onboarding flow
- Adaptive notification frequency model
- More human-centric, conversational notification language
- Cleaner layouts with better visual hierarchy

---

## Conclusion

### Key Takeaways
- Understanding user behavior is **more important** than just managing schedules
- AI systems should provide **timely, supportive guidance** rather than passive reminders
- Integrating multiple features into one system improves usability
- Proactive and context-aware AI is essential for maintaining consistency and accountability

### Challenges Faced
- Data scarcity and validation limitations
- Temporal constraints restricting iterative depth
- Privacy and ethical concerns regarding sensitive personal data

### Opportunities for Future Improvement
- Improved AI personalization
- Full mobile application development
- Social accountability features
- Better context awareness through integrations
- Long-term testing for effectiveness validation
- Strengthened privacy and transparency measures

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Expo 54, React Native 0.81 |
| **Routing** | Expo Router 6 (file-based routing) |
| **State Management** | Zustand + React Context API |
| **Database** | Supabase (PostgreSQL) with real-time subscriptions |
| **AI Backend** | API server proxying to Claude-compatible AI |
| **Styling** | Tailwind CSS (via NativeWind) |
| **Build Tools** | TypeScript, Metro Bundler, EAS |
| **Notifications** | Expo Notifications |
| **Analytics** | Custom Risk Engine + Predictions system |
| **Authentication** | Supabase Auth |
| **Storage** | AsyncStorage (local), Supabase (cloud) |
| **Native Modules** | Custom Usage Stats & App Blocker modules (Android) |

---

<a id="getting-started"></a>
## Getting Started — Setup Instructions

### Prerequisites
- **Node.js** 18+ with **pnpm** package manager
- **Expo Go** app (for testing on device)
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)
- **Supabase** account and project

### Step 1: Clone the Repository

```bash
git clone https://github.com/ScienceGear/RAI.git
cd RAI/Premium-Logic-Builder
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Configure Environment Variables

```bash
cd artifacts/rai
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> ⚠️ **Never commit `.env` to version control!** It contains sensitive API keys.

### Step 4: Start the Development Server

```bash
cd artifacts/rai
pnpm dev
```

Or open in Expo Go by scanning the QR code displayed in the terminal.

### Step 5: Run on Android

```bash
pnpm android
```

This builds and runs the app on a connected Android device or emulator.

### Step 6: Run on iOS (macOS only)

```bash
pnpm ios
```

### Step 7: Type Checking

```bash
pnpm typecheck
```

### Build for Production

```bash
# Build the bundle
pnpm build

# Start production server
pnpm serve
```

### EAS Build (for distribution)

```bash
cd artifacts/rai
eas build --platform android --profile preview
eas build --platform android --profile production
```

---

<a id="how-to-use"></a>
## How to Use the App

### 1. Onboarding (First Launch)
- Open the app and register with your email and password
- Complete the 8-step onboarding flow:
  - Set your **main goals**
  - Identify your **common distractions**
  - Select your **most productive time of day**
  - Set your **daily time commitment**
  - Choose your **sources of motivation**
  - Grant necessary **permissions** (notifications, screen time, battery optimization, accessibility)

### 2. Dashboard
- View your **RAI Score** (AI-powered productivity score)
- Track your **daily streak**
- See **tasks completed** and **focus minutes**
- Access AI-generated insights and recommendations

### 3. Tasks
- Add tasks naturally using AI-powered text parsing
- Tasks are automatically categorized and prioritized
- Smart scheduling assigns optimal time slots based on your energy profile
- Set deadlines and estimated durations

### 4. Focus Sessions
- Start Pomodoro-style focus timer
- AI determines the best time for deep work based on your chronotype
- Get notified when focus sessions complete

### 5. Analytics
- View detailed productivity reports
- Track screen time and distraction patterns
- See category-wise focus breakdown
- Monitor 7-day task completion trends
- View RAI Score history and progress

### 6. Squad System
- Create or join squads with friends
- Share progress and stay accountable together
- Collaborate on group goals

### 7. AI Coaching
- **Chat with RAI** — Get personalized guidance throughout the day
- **Morning Briefing** — Daily AI-generated plan and motivation
- **Confidence Boosts** — Personalized affirmations based on your achievements
- **Weekly Reports** — Comprehensive AI-generated weekly performance summaries
- **Smart Alerts** — Proactive notifications when you're heading into a danger zone

### 8. Settings
- Configure **theme** (light/dark)
- Manage **notification preferences**
- Set **focus duration** (default: 25 minutes)
- Configure **sleep schedule**
- Manage **App Blocker** settings

---

## Download Links

> **Note:** The RAI mobile app is Android-only at this time.

| Platform | Download |
|----------|----------|
| **Android APK (Preview Build)** | [Download APK](https://github.com/ScienceGear/RAI/releases/download/android-preview/app-preview.apk) |
| **Android App Bundle (Production)** | [Download AAB](https://github.com/ScienceGear/RAI/releases/download/android-production/app-production.aab) |
| **Source Code** | [Clone Repository](https://github.com/ScienceGear/RAI.git) |

To build the APK locally:

```bash
cd artifacts/rai
eas build --platform android --profile preview --local
```

The APK will be generated at `artifacts/rai/android/app/build/outputs/apk/debug/` (development) or `artifacts/rai/android/app/build/outputs/apk/release/` (production).

---

## Project Structure

```
RAI/
├── Premium-Logic-Builder/
│   ├── artifacts/
│   │   └── rai/                          # Main Expo app
│   │       ├── app/                      # Expo Router routes
│   │       │   ├── (tabs)/               # Tab navigation (home, tasks, calendar, squad, analytics)
│   │       │   ├── auth/                 # Login & registration screens
│   │       │   ├── onboarding/           # Multi-step onboarding flow
│   │       │   ├── settings/             # Settings & configuration
│   │       │   ├── focus/                # Focus timer / Pomodoro
│   │       │   ├── diary/                # AI chat diary
│   │       │   ├── goals/                # Goal management
│   │       │   ├── profile/              # User profile & stats
│   │       │   ├── blocker/              # App blocker UI
│   │       │   └── anti-quit.tsx         # Anti-quit feature
│   │       ├── components/               # Reusable UI components
│   │       ├── constants/                # Theme colors, categories
│   │       ├── contexts/                 # React Context providers
│   │       ├── hooks/                    # Custom React hooks
│   │       ├── lib/                      # Core business logic
│   │       │   ├── ai.ts                 # AI integration
│   │       │   ├── auth.ts               # Auth helpers
│   │       │   ├── cloud.ts              # Supabase CRUD operations
│   │       │   ├── scheduler.ts          # AI task scheduler
│   │       │   ├── brainstate.ts         # Brain state computation
│   │       │   ├── categorizer.ts        # AI task categorizer
│   │       │   ├── predictions.ts        # Danger zone predictions
│   │       │   ├── notifications.ts      # Web notifications
│   │       │   ├── notifications.native.ts # Native notifications
│   │       │   ├── storage.ts            # AsyncStorage wrapper
│   │       │   └── xp.ts                 # XP & achievement system
│   │       ├── modules/                  # Custom Expo modules
│   │       │   ├── app-blocker/          # App blocking (Android)
│   │       │   └── usage-stats/          # Usage tracking (Android)
│   │       ├── plugins/                  # Expo config plugins
│   │       ├── scripts/                  # Build scripts
│   │       ├── server/                   # Production static server
│   │       │   └── templates/            # Landing page HTML
│   │       ├── src/
│   │       │   ├── services/             # Background services
│   │       │   │   ├── BackgroundTaskManager.ts
│   │       │   │   ├── DangerZoneEngine.ts
│   │       │   │   ├── PermissionGateService.ts
│   │       │   │   ├── RiskEngine.ts
│   │       │   │   └── ScreenTimeService.ts
│   │       │   ├── supabase/             # Supabase client & auth
│   │       │   └── native/               # Native bridge types
│   │       ├── supabase/                 # SQL schemas
│   │       ├── types/                    # TypeScript type definitions
│   │       ├── app.json                  # Expo configuration
│   │       ├── eas.json                  # EAS build configuration
│   │       ├── babel.config.js
│   │       ├── metro.config.js
│   │       ├── tsconfig.json
│   │       ├── package.json
│   │       ├── README.md
│   │       └── CONTRIBUTING.md
│   ├── lib/                              # Shared libraries
│   │   ├── api-client-react/
│   │   ├── api-spec/
│   │   ├── api-zod/
│   │   └── db/
│   ├── scripts/                          # Root build scripts
│   └── package.json                      # Workspace root
├── README.md                             # This file
├── CONTRIBUTING.md                       # Contribution guidelines
└── .gitignore
```

---

<a id="contributing"></a>
## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

---

## References

1. Abowd, G. D., and Mynatt, E. D., "Charting Past, Present, and Future Research in Ubiquitous Computing," *ACM Transactions on Computer-Human Interaction*, vol. 7, no. 1, pp. 29–58, 2000.
2. Baumeister, R. F., and Tierney, J., *Willpower: Rediscovering the Greatest Human Strength*, Penguin Press, New York, 2011.
3. Brown, T., *Change by Design: How Design Thinking Transforms Organizations and Inspires Innovation*, HarperBusiness, New York, 2009.
4. Sharma, R., and Gupta, N., "Digital Distraction and Academic Performance Among Indian Engineering Students," *Journal of Educational Technology & Society*, vol. 24, no. 2, pp. 112–124, 2021.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

<p align="center">
  <b>RAI — Reasoning Artificial Intelligence</b><br>
  <i>Your AI-powered productivity companion 🚀</i>
</p>