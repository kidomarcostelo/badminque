# 0001. Architecture and Tech Stack Selection

Date: 2026-10-10  
Status: accepted

## Context

Badminque aims to provide a standardized rating system and club-night match tracker for badminton communities (analogous to DUPR and RecClub in pickleball). The initial operational context is a single club night session operated from a tablet by a club organizer, with unreliable venue internet connectivity, zero initial budget ($0/month target), and solo-developer maintenance requiring high development velocity.

## Decision

We commit to an offline-first Progressive Web App (PWA) with a decoupled Python API, serverless PostgreSQL database, and automated Android packaging:

1. **Frontend & Mobile Client**: **Next.js (React / TypeScript / Tailwind CSS)** configured as an offline-first PWA and packaged for Android via **Google Trusted Web Activity (TWA / Bubblewrap)**. Service Workers handle app shell caching; client-side IndexedDB stores club rosters, match logs, and sync queues locally with `navigator.storage.persist()`. Deployed on **Vercel** (Hobby Tier - $0/mo) for web and built as signed Android `.apk` / `.aab` packages on **GitHub Actions** ($0/mo). iOS is explicitly out of scope for MVP.
2. **Backend**: **Python (FastAPI)**. Python allows rapid iteration and mathematical prototyping for Elo/UBR rating curves and score-differential weighting. FastAPI provides native async execution and automated OpenAPI contracts. Deployed as a container on **Koyeb** (Free Eco Tier - $0/mo, zero spin-down).
3. **Database**: **Neon (Serverless PostgreSQL)**. Provides full ACID compliance, PostgreSQL window functions (`RANK() OVER`) for club leaderboards, and connection pooling. Free tier provides 0.5 GB storage ($0/mo).
4. **User & Auth Model (Tricount Model)**: Organizers operate the club session tablet under an organizer account. Players participate as roster entries without mandatory registration. Players may optionally register accounts later to claim historical match records.
5. **Sync Mechanism**: Matches are logged offline in IndexedDB on the tablet during club night and submitted in batch to the FastAPI endpoint once online connectivity is restored.

## Considered Options

- **Expo (React Native) + Expo Router / React Native Web**: Evaluated for unified Web and Android cross-platform delivery (see `docs/research/frontend-architecture-web-android.md`). Rejected because: (1) Expo EAS Build Free Tier strictly caps builds at 15 Android builds/month with 25–45 min queues, violating developer velocity and free CI constraints; (2) React Native's Yoga engine is 1D Flexbox, making our dense 3-court "spreadsheet-familiar" tablet dashboard layout fragile and prone to layout thrashing compared to native CSS Grid; (3) SQLite on Web requires Wasm with COOP/COEP isolation headers or falls back to a 5 MB storage cap, while IndexedDB provides >10 GB persistent storage natively in both Chrome and TWA; (4) TWA delivers 100% single UI codebase reuse with zero platform divergence for a solo developer.
- **Capacitor (Next.js Hybrid)**: Evaluated as a web-to-native bridge. Kept as a verified architectural fallback if native hardware plugins (e.g. Bluetooth sensors) are required in the future. TWA was selected over Capacitor for MVP because TWA shares Chrome cookies, credentials, and storage directly, enabling instant session transfer from mobile web QR claiming into the installed app.
- **Fullstack Next.js Monolith (Server Actions / API Routes)**: Rejected because rating algorithm tuning, mathematical modeling, and potential migration to specialized rating services benefit from Python's numerical ecosystem.
- **Go (Gin/Chi)**: Rejected for MVP because Python is already mastered by the developer, avoiding dual-learning friction alongside PWA offline synchronization.
- **Supabase BaaS**: Considered, but decoupled FastAPI provides full autonomy over custom batch rating updates, custom offline sync validation, and future algorithm portability.
- **CockroachDB Serverless**: Considered for its 10 GB free tier; rejected in favor of Neon due to standard PostgreSQL performance characteristics and zero Raft consensus overhead on single-row writes.
- **Firestore / MongoDB**: Rejected because calculating dynamic rating updates and leaderboard ranks requires relational joins and SQL window functions.

## Consequences

- Total ongoing infrastructure cost remains strictly $0.00/month across Vercel, Koyeb, Neon, and GitHub Actions.
- Organizers and players can run Badminque as a responsive web app or install the standalone Android `.apk` built by GitHub CI.
- The web app and installed Android app share 100% of UI components, Tailwind styles, and offline IndexedDB persistence with zero platform-specific code forks.
- The frontend and backend communicate via clean REST contracts defined in OpenAPI schemas.
- Client-side offline synchronization logic (handling conflict resolution and batch commits) is encapsulated cleanly in an abstract storage and sync layer.
