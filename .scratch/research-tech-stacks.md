# Tech Stack Research: Rating-Tracking Sports Community App

> Research date: 2026-10-10
> Scope: Web + iOS + Android from a single codebase, optimised for a solo developer / small team

---

## 1. Cross-Platform Frameworks

### Recommendation: **Expo (React Native)** — best overall for solo/small-team

| Dimension | Expo (React Native) | Flutter | Capacitor / Ionic |
|---|---|---|---|
| **Language** | TypeScript / JavaScript | Dart | HTML/CSS/JS (any framework) |
| **Rendering** | Native UI components | Custom renderer (Skia/Impeller) | WebView |
| **Web support** | First-class via React Native Web + Expo Router | Supported but less mature | Excellent (it *is* the web) |
| **OTA updates** | Built-in (EAS Update) | Requires 3rd-party (Shorebird) | N/A (web deploys instantly) |
| **Ecosystem** | Massive (npm) | Growing (pub.dev) | Full npm / web ecosystem |
| **Native access** | Config Plugins, no eject needed | Platform channels | Capacitor plugins |
| **Learning curve** | Low if you know React/TS | Medium (new language) | Very low for web devs |
| **Performance** | Excellent (New Architecture, JSI) | Best-in-class | Near-native (WebView overhead) |
| **Best for** | Mobile-first + web from one codebase | Pixel-perfect custom UI, animation-heavy | Wrapping existing web app into mobile |

**Why Expo wins for this project:**
- A rating-tracking app is data/UI-driven, not animation-heavy — Expo's native components are more than sufficient.
- Single codebase targets Web, iOS, Android with file-based routing (Expo Router).
- EAS Build handles cloud builds for iOS/Android without a Mac.
- EAS Update enables instant OTA bug-fix pushes without App Store review.
- TypeScript is the natural fit if using Supabase (TS SDK).
- The npm ecosystem has mature libraries for charts, tables, and data visualisation needed for leaderboards.

**When to reconsider:**
- Choose **Flutter** if you need heavy custom animations or pixel-perfect branded UI identical across platforms.
- Choose **Capacitor** only if you already have an existing web app you want to wrap.

---

## 2. Backend Options

### Recommendation: **Supabase** — best balance of power, speed, and control

| Dimension | Supabase | Firebase | Custom (Node/Fastify) | Serverless (Workers/Lambda) |
|---|---|---|---|---|
| **Database** | PostgreSQL (managed) | Firestore (NoSQL) | Your choice | Your choice |
| **Auth** | Built-in, RLS-integrated | Built-in, very mature | DIY or Passport/Auth.js | DIY or Cognito |
| **Real-time** | Postgres Realtime + Broadcast | Excellent, offline-first | Socket.io / custom | WebSocket via API Gateway |
| **Edge Functions** | Deno-based | Cloud Functions | N/A (it *is* the backend) | Native |
| **Vendor lock-in** | Low (open-source, self-hostable) | High (proprietary) | None | Medium (provider-specific) |
| **Pricing** | Predictable (resource-based) | Pay-per-read/write (can spike) | Hosting costs only | Pay-per-invocation |
| **Time-to-market** | Very fast | Very fast | Slow (build everything) | Medium |
| **SQL / Relational** | ✅ First-class | ❌ NoSQL only | ✅ If you choose SQL | ✅ If you choose SQL |

**Why Supabase wins for this project:**
- **Relational data is essential**: Players, teams, matches, seasons, rating histories — these are deeply relational. PostgreSQL's JOINs, window functions, and ACID transactions make ELO/Glicko calculations reliable and simple.
- **Row Level Security (RLS)**: Auth policies enforced at the database level — no middleware to write.
- **Built-in auth**: Google, Apple, email/password social login with ~15 min setup each.
- **Real-time**: Postgres Realtime streams row changes; Broadcast handles pub/sub for live scoring.
- **Open-source & portable**: No vendor lock-in. Can self-host later or migrate the Postgres DB to any provider.
- **Edge Functions**: Deno-based serverless functions for rating calculations, notifications, etc.
- **Generous free tier**: 500 MB database, 1 GB storage, 2 GB bandwidth, 50k monthly active users.

**When to reconsider:**
- Choose **Firebase** if offline-first mobile sync is critical (e.g., scoring at venues with no internet).
- Choose a **custom backend** only if you have very specific compute needs (ML-based rating models, complex business logic that doesn't fit Edge Functions).

---

## 3. Database

### Recommendation: **PostgreSQL (via Supabase)** — purpose-built for this use case

| Dimension | PostgreSQL (Supabase) | Firestore | PlanetScale/MySQL | MongoDB |
|---|---|---|---|---|
| **Query power** | Window functions, CTEs, JOINs | Limited (no JOINs) | Good (MySQL 8+ window fns) | Aggregation pipelines |
| **Ranking queries** | `RANK() OVER (ORDER BY rating DESC)` — trivial | Must denormalise or use extensions | Supported | Possible but verbose |
| **Transactions** | Full ACID | Limited | Full ACID | Multi-doc transactions |
| **Real-time** | Supabase Realtime | Built-in | ❌ (polling) | Change Streams |
| **Scaling** | Vertical (Supabase handles) | Auto-horizontal | Auto-horizontal (serverless) | Horizontal (Atlas) |
| **Cost model** | Predictable (instance-based) | Per-read/write (can spike) | Predictable | Predictable (Atlas) |
| **Schema evolution** | Migrations (SQL) | Schemaless | Migrations | Schemaless |

**Why PostgreSQL wins for rating systems:**

```sql
-- Example: Leaderboard with rank, win rate, and recent form
SELECT
  p.id, p.name, p.rating,
  RANK() OVER (ORDER BY p.rating DESC) AS rank,
  COUNT(m.id) AS matches_played,
  ROUND(AVG(CASE WHEN m.winner_id = p.id THEN 1.0 ELSE 0.0 END) * 100, 1) AS win_pct
FROM players p
LEFT JOIN matches m ON m.player1_id = p.id OR m.player2_id = p.id
WHERE p.club_id = $1
GROUP BY p.id
ORDER BY p.rating DESC
LIMIT 50;
```

This kind of query is trivial in PostgreSQL, extremely difficult in Firestore, and would require denormalisation or multiple queries in MongoDB.

**Additional PostgreSQL advantages:**
- **Materialised views** for pre-computed leaderboards that refresh on a schedule.
- **pg_cron** (available on Supabase) for scheduled rating recalculations.
- **PostGIS** extension if you ever need location-based features (nearby courts/clubs).
- **Full-text search** built-in for player/club search.

---

## 4. Hosting & Deployment

### Recommendation: **Vercel (web frontend) + Supabase (backend)** — cheapest for MVP

Since Supabase handles the backend, database, auth, and real-time, you only need hosting for the **web frontend** (the Expo web build).

| Platform | Best for | Free tier | Cost trap |
|---|---|---|---|
| **Vercel** | Static/SSR web apps | 100 GB bandwidth, serverless fns | Seat-based pricing on Pro ($20/seat) |
| **Netlify** | Static sites, forms | 100 GB bandwidth | Build minutes, bandwidth overages |
| **Railway** | Full-stack (if custom backend) | $5/mo credit | No permanent free tier for active services |
| **Fly.io** | Global edge deployment | 3 shared VMs | Egress fees, ops complexity |
| **Cloudflare Pages** | Static + Workers | Unlimited bandwidth (static) | Workers limits on free tier |

**Recommended MVP architecture (cost: $0/month):**

```
┌─────────────────────────────────────────────────┐
│                  Supabase (Free Tier)            │
│  ┌──────────┐  ┌──────┐  ┌─────────┐  ┌──────┐ │
│  │ Postgres │  │ Auth │  │Realtime │  │ Edge │ │
│  │   DB     │  │      │  │         │  │ Fns  │ │
│  └──────────┘  └──────┘  └─────────┘  └──────┘ │
└─────────────────────────────────────────────────┘
        ▲              ▲             ▲
        │              │             │
   ┌────┴────┐   ┌─────┴────┐  ┌────┴────┐
   │   Web   │   │   iOS    │  │ Android │
   │ (Vercel)│   │ (App     │  │ (Play   │
   │  Free   │   │  Store)  │  │  Store) │
   └─────────┘   └──────────┘  └─────────┘
         All powered by Expo (single codebase)
```

**Monthly cost at different scales:**

| Scale | Supabase | Vercel | Total |
|---|---|---|---|
| **MVP (0–1k users)** | $0 (free tier) | $0 (free tier) | **$0** |
| **Growth (1k–10k users)** | $25 (Pro) | $0–$20 | **$25–$45** |
| **Scale (10k–50k users)** | $25+ (Pro + usage) | $20 | **$45–$100** |

---

## 5. Authentication

### Recommendation: **Supabase Auth** — tightly integrated, supports all needed providers

| Provider | Google | Apple | Email/Password | Phone/SMS |
|---|---|---|---|---|
| **Supabase** | ✅ (incl. One-Tap) | ✅ (native + web) | ✅ | ✅ |
| **Firebase** | ✅ | ✅ | ✅ | ✅ |
| **Auth.js** | ✅ | ✅ | ✅ | ❌ (needs adapter) |
| **Clerk** | ✅ | ✅ | ✅ | ✅ |

**Why Supabase Auth wins:**
- **Zero additional services**: Auth is built into Supabase — no separate billing, no extra SDK.
- **Row Level Security**: Auth tokens are automatically available in Postgres policies. You can write `auth.uid() = player.user_id` directly in RLS policies.
- **Native mobile support**: Works with `signInWithIdToken` for native Google/Apple sign-in dialogs on mobile (better UX than web redirects).
- **Setup time**: ~15–30 minutes per provider (one-time console configuration).
- **50k MAU free**: More than enough for an MVP and early growth.

**Key implementation notes:**
- Use **native sign-in** (not OAuth redirect) on mobile for the best UX.
- Apple requires secret key rotation every 6 months — set a calendar reminder.
- Always configure both development (`localhost`) and production redirect URLs.

---

## 6. Real-Time Features

### Recommendation: **Supabase Realtime (Broadcast + Postgres Changes)** — no additional infra needed

| Technology | Direction | Latency | Complexity | Scaling | Best for |
|---|---|---|---|---|---|
| **SSE** | Server → Client | Low | Low | Easy | Score feeds, leaderboard updates |
| **WebSockets** | Bidirectional | Ultra-low | High | Hard (stateful) | Live chat, in-play betting |
| **Polling** | Client → Server | High | Very low | Easy | Non-critical updates, fallback |
| **Supabase Realtime** | Server → Client (+ Broadcast) | Low | Very low | Managed | All of the above |

**Supabase Realtime provides two mechanisms:**

1. **Postgres Changes**: Subscribe to row-level changes on any table. Perfect for:
   - Rating changes appearing in real-time on leaderboards
   - Match results updating as they're recorded
   - Player profile updates

2. **Broadcast**: Pub/Sub messaging to arbitrary channels. Perfect for:
   - Live match scoring (spectators see score updates instantly)
   - Tournament bracket updates
   - "Player X just won!" activity feed

**Example implementation:**
```typescript
// Subscribe to leaderboard changes for a specific club
const channel = supabase
  .channel('club-leaderboard')
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'players', filter: `club_id=eq.${clubId}` },
    (payload) => {
      updateLeaderboard(payload.new);
    }
  )
  .subscribe();

// Broadcast live scoring
const matchChannel = supabase.channel(`match-${matchId}`);
matchChannel.send({
  type: 'broadcast',
  event: 'score-update',
  payload: { set: 2, score: [21, 18] }
});
```

**Architecture recommendation:**
- Use **Supabase Realtime (Postgres Changes)** for data-driven updates (ratings, leaderboards).
- Use **Supabase Broadcast** for ephemeral events (live scoring during a match).
- Use **REST API** (standard Supabase client) for all write operations (recording match results, updating profiles).
- Implement **reconnection logic** with a full state re-sync on reconnect.

---

## 7. Recommended Stack Summary

| Layer | Choice | Rationale |
|---|---|---|
| **Frontend** | Expo (React Native) + TypeScript | Single codebase for Web/iOS/Android, OTA updates, huge ecosystem |
| **Routing** | Expo Router (file-based) | Unified navigation across platforms |
| **UI Library** | Tamagui or NativeWind (Tailwind) | Cross-platform styling with web support |
| **Backend** | Supabase | Managed Postgres, Auth, Realtime, Edge Functions — all-in-one |
| **Database** | PostgreSQL (via Supabase) | Relational data, window functions for rankings, ACID for ratings |
| **Auth** | Supabase Auth | Google, Apple, email/password — integrated with RLS |
| **Real-time** | Supabase Realtime | Postgres Changes + Broadcast — no extra infra |
| **Hosting (web)** | Vercel or Cloudflare Pages | Free tier, global CDN, trivial deploys |
| **Mobile builds** | EAS Build (Expo) | Cloud builds for iOS/Android, no Mac required |
| **OTA updates** | EAS Update (Expo) | Push fixes without App Store review |

### Total MVP cost: **$0/month** (all free tiers)

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Supabase free tier limits | Service interruption at scale | Upgrade to Pro ($25/mo) — still very cheap |
| Expo web support rough edges | Some components need platform-specific code | Use `Platform.select()` and conditional imports |
| Supabase Realtime at high concurrency | Latency under heavy load | Supabase Pro includes higher limits; can add caching layer later |
| Apple auth key rotation | Auth breaks silently after 6 months | Calendar reminder + monitoring alert |
| Vendor dependency on Supabase | Migration pain if they change pricing | Supabase is open-source; can self-host on any Postgres |
| App Store review delays | Slow iteration on mobile | EAS Update for OTA patches (JS-only changes bypass review) |

---

## 9. Alternative Stacks Considered

### Alternative A: Flutter + Firebase
- **Pro**: Best mobile performance, excellent offline support, mature real-time.
- **Con**: Dart (new language), Firestore is NoSQL (bad for relational rating data), vendor lock-in, unpredictable pricing at scale, Flutter web is less mature.

### Alternative B: Next.js + Capacitor + Supabase
- **Pro**: Best web experience (SSR, SEO), wrap web app for mobile.
- **Con**: WebView on mobile (less native feel), more complex build pipeline, Capacitor plugins less mature than Expo's.

### Alternative C: Expo + Custom Backend (Fastify/Hono on Railway)
- **Pro**: Full control, no BaaS limitations.
- **Con**: Must build auth, real-time, file storage from scratch — significantly more development time for a solo dev.

---

## 10. Getting Started Checklist

1. **`npx create-expo-app badminque --template tabs`** — scaffold the project
2. **Create Supabase project** — set up database, enable auth providers
3. **Design database schema** — players, matches, ratings, clubs tables
4. **Implement auth** — Google + Apple + email/password via Supabase Auth
5. **Build core screens** — Leaderboard, Match Recording, Player Profile
6. **Add real-time** — Supabase Realtime for leaderboard + live scoring
7. **Deploy web** — Expo web build → Vercel
8. **Submit mobile** — EAS Build → App Store + Play Store
9. **Set up EAS Update** — OTA updates for rapid iteration
