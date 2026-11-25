# Zero-Cost Cloud Deployment Guide

Badminque runs completely within **$0.00/month** free-tier infrastructure limits per [ADR 0001](adr/0001-tech-stack-decision.md):

| Layer | Provider | Tier & Cost | Purpose | Source Config |
| :--- | :--- | :--- | :--- | :--- |
| **Database** | **Neon** | Free Tier ($0/mo) | Serverless PostgreSQL with ACID sync & `RANK() OVER` window queries | [`apps/api/alembic/env.py`](../apps/api/alembic/env.py) |
| **Backend API** | **Koyeb** | Free Eco Tier ($0/mo) | Python 3.12 FastAPI container + automatic Alembic migrations | [`apps/api/Dockerfile`](../apps/api/Dockerfile) |
| **Frontend PWA** | **Vercel** | Hobby Tier ($0/mo) | Offline-first Next.js 15 PWA (`@badminque/core` + `apps/web`) | [`vercel.json`](../vercel.json) |

---

## Architecture & Request Flow

```text
  Tablet / Mobile Browser (Offline-First PWA on Vercel)
   ├─ App Shell & Icons ──▶ Service Worker (/sw.js, Network-First navigate, Cache-First chunks)
   ├─ Courtside Match Log ──▶ IndexedDB (storageService.ts, permanent UUID v4 records)
   └─ API & Batch Sync  ──▶ NEXT_PUBLIC_API_URL (apiClient.ts: useRoster.ts & syncService.ts)
                                  │
                                  ▼ HTTPS + CORS (CORS_ORIGINS / CORS_ORIGIN_REGEX)
                        FastAPI Container (Koyeb Free Eco Tier)
                         ├─ Startup: alembic upgrade head -> uvicorn (apps/api/start.sh)
                         └─ Health:  GET /health -> db connectivity ping
                                  │
                                  ▼ asyncpg + SSL (normalize_database_url)
                        Neon Serverless PostgreSQL
```

---

## Quick Start: Interactive Deployment Wizard

Run the interactive provisioning script from Git Bash or WSL to walk through each browser dashboard step and capture `.env` values cleanly:

```bash
bash scripts/deploy-wizard.sh
```

If you prefer manual setup, follow the 4 stages below.

---

## Step 1: Provision Neon Serverless PostgreSQL

1. Sign in to [Neon Console](https://console.neon.tech) and create a Free-tier project (e.g. `badminque`).
2. Under **Connection Details**, select **Pooled connection** and copy the URI:
   ```text
   postgresql://user:password@ep-your-project.region.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```
3. You do **not** need to rewrite the URL scheme manually:
   - `normalize_database_url()` in [`apps/api/src/badminque_api/config.py`](../apps/api/src/badminque_api/config.py) automatically upgrades `postgresql://` (or `postgres://`) to `postgresql+asyncpg://`.
   - It strips `sslmode` and `channel_binding` query params unsupported by `asyncpg` and translates SSL requirements into `connect_args={"ssl": "require"}` for both [`database.py`](../apps/api/src/badminque_api/database.py) and [`alembic/env.py`](../apps/api/alembic/env.py).

---

## Step 2: Deploy FastAPI Backend on Koyeb

1. Open [Koyeb Dashboard](https://app.koyeb.com) and create a new **Web Service** linked to your GitHub repository (`main` branch).
2. Configure **Builder & Container Settings**:
   - **Builder**: `Dockerfile`
   - **Work directory**: `apps/api`
   - **Dockerfile location**: `apps/api/Dockerfile`
   - **Instance**: `Free` ($0/month)
   - **Port**: `8000`
   - **Health check path**: `/health`
3. Set the following **Environment Variables** (reference [`apps/api/.env.example`](../apps/api/.env.example)):

   | Variable | Example Value | Notes |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `postgresql://...?sslmode=require` | Neon pooled URI from Step 1 |
   | `ENVIRONMENT` | `production` | Disables SQL echo logging |
   | `API_PREFIX` | `/api/v1` | Global API prefix |
   | `CORS_ORIGINS` | `https://badminque.vercel.app,http://localhost:3000` | Comma-separated exact origins (or JSON list) |
   | `CORS_ORIGIN_REGEX` | `https://.*\.vercel\.app` | Permits Vercel preview deployments dynamically |

4. Deploy. On boot, [`apps/api/start.sh`](../apps/api/start.sh) executes `alembic upgrade head` to synchronize database tables on Neon before starting `uvicorn badminque_api.main:app --host 0.0.0.0 --port "${PORT:-8000}"`.
5. Copy your public Koyeb service URL (e.g. `https://badminque-api-xxx.koyeb.app`).

---

## Step 3: Deploy Next.js PWA on Vercel

1. Open [Vercel New Project](https://vercel.com/new) and import the `badminque` repository.
2. Keep **Root Directory** set to `.` (repository root). Vercel automatically reads [`vercel.json`](../vercel.json):
   - **Framework**: `nextjs`
   - **Install Command**: `pnpm install --frozen-lockfile`
   - **Build Command**: `pnpm --filter web build`
   - **Output Directory**: `apps/web/.next`
3. Add **Environment Variable** (reference [`apps/web/.env.example`](../apps/web/.env.example)):
   - `NEXT_PUBLIC_API_URL` = `https://<your-koyeb-service>.koyeb.app` (no trailing slash needed; [`buildApiUrl()`](../apps/web/src/services/apiClient.ts) strips trailing slashes).
4. Click **Deploy** and copy your live Vercel URL (e.g. `https://badminque.vercel.app`).

### PWA Offline Guarantees in Production

- **No-Cache Service Worker Headers**: [`apps/web/next.config.ts`](../apps/web/next.config.ts) serves `/sw.js` with `Cache-Control: no-cache, no-store, must-revalidate` so tablets pick up new deployments promptly.
- **API Bypass**: [`apps/web/public/sw.js`](../apps/web/public/sw.js) (`badminque-shell-v2`) strictly bypasses `/api/*` and non-`GET` requests so live leaderboards and `POST /api/v1/sync/batch` uploads never return stale cached responses, while `navigate` requests use **Network-First** with `/` offline fallback.
- **Installability Assets**: [`apps/web/public/manifest.json`](../apps/web/public/manifest.json) ships `#f8fafc` Silk Light theme colors and PNG icons (`/icons/icon-192.png`, `/icons/icon-512.png`, `/icons/apple-touch-icon.png`).

---

## Step 4: Lock CORS & Verify End-to-End Health

1. Return to Koyeb Service Settings and confirm `CORS_ORIGINS` includes your exact Vercel production domain (`https://badminque.vercel.app,http://localhost:3000`).
2. Verify backend health and Neon connectivity:
   ```bash
   curl -fsS https://<your-koyeb-service>.koyeb.app/health
   ```
   Expected JSON response:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     "environment": "production",
     "version": "0.1.0"
   }
   ```
3. Verify CORS preflight from your Vercel origin:
   ```bash
   curl -i -X OPTIONS https://<your-koyeb-service>.koyeb.app/api/v1/sync/batch \
     -H "Origin: https://<your-vercel-app>.vercel.app" \
     -H "Access-Control-Request-Method: POST"
   ```
   Confirm HTTP `200` and `access-control-allow-origin: https://<your-vercel-app>.vercel.app`.
4. Open your live Vercel URL on a tablet browser, verify the PWA **Install App** prompt / standalone launch, check in Roster Players, log Matches, and confirm offline-to-online batch synchronization commits to Neon.

---

## Local Development Without Cloud Services

- Run the Next.js PWA standalone with zero backend dependencies (`pnpm --filter web dev`) using local IndexedDB persistence and demo data seeding.
- Run the backend container locally against any Postgres or local Neon branch:
  ```bash
  docker build -t badminque-api apps/api
  docker run --rm -p 8000:8000 --env-file apps/api/.env badminque-api
  ```
