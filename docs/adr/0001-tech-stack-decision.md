# 0001. Architecture and Tech Stack Selection

Date: 2026-10-10  
Status: accepted

## Context

Badminque aims to provide a standardized rating system and club-night match tracker for badminton communities (analogous to DUPR and RecClub in pickleball). The initial operational context is a single club night session operated from a tablet by a club organizer, with unreliable venue internet connectivity, zero initial budget ($0/month target), and solo-developer maintenance requiring high development velocity.

## Decision

We commit to an offline-first Progressive Web App (PWA) with a decoupled Python API and serverless PostgreSQL database:

1. **Frontend**: **Next.js (React / TypeScript)** configured as an offline-first PWA. Service Workers handle app shell caching; client-side IndexedDB stores club rosters and match logs locally during club night. Deployed on **Vercel** (Hobby Tier - $0/mo).
2. **Backend**: **Python (FastAPI)**. Python allows rapid iteration and mathematical prototyping for Elo/UBR rating curves and score-differential weighting. FastAPI provides native async execution and automated OpenAPI contracts. Deployed as a container on **Koyeb** (Free Eco Tier - $0/mo, zero spin-down).
3. **Database**: **Neon (Serverless PostgreSQL)**. Provides full ACID compliance, PostgreSQL window functions (`RANK() OVER`) for club leaderboards, and connection pooling. Free tier provides 0.5 GB storage ($0/mo).
4. **User & Auth Model (Tricount Model)**: Organizers operate the club session tablet under an organizer account. Players participate as roster entries without mandatory registration. Players may optionally register accounts later to claim historical match records.
5. **Sync Mechanism**: Matches are logged offline in IndexedDB on the tablet during club night and submitted in batch to the FastAPI endpoint once online connectivity is restored.

## Considered Options

- **Fullstack Next.js Monolith (Server Actions / API Routes)**: Rejected because rating algorithm tuning, mathematical modeling, and potential migration to specialized rating services benefit from Python's numerical ecosystem.
- **Go (Gin/Chi)**: Rejected for MVP because Python is already mastered by the developer, avoiding dual-learning friction alongside PWA offline synchronization.
- **Supabase BaaS**: Considered, but decoupled FastAPI provides full autonomy over custom batch rating updates, custom offline sync validation, and future algorithm portability.
- **CockroachDB Serverless**: Considered for its 10 GB free tier; rejected in favor of Neon due to standard PostgreSQL performance characteristics and zero Raft consensus overhead on single-row writes.
- **Firestore / MongoDB**: Rejected because calculating dynamic rating updates and leaderboard ranks requires relational joins and SQL window functions.

## Consequences

- Total ongoing infrastructure cost is $0.00/month across Vercel, Koyeb, and Neon.
- The frontend and backend communicate via clean REST contracts defined in OpenAPI schemas.
- Client-side offline synchronization logic (handling conflict resolution and batch commits) must be explicitly managed between IndexedDB and the FastAPI sync endpoint.
