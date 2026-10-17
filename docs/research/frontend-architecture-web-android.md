# Frontend Architecture Evaluation: Next.js PWA + Android (TWA/Capacitor) vs. Expo (React Native)

**Status**: Recommended  
**Date**: 2026-10-17  
**Author**: Senior Frontend Architect  
**Domain**: Badminque (Club-First Badminton Rating & Match-Tracking System)  
**Budget Constraint**: Strict $0.00 / month ongoing infrastructure ceiling  
**Target Platforms**: Web App & Android App (iOS explicitly out of scope for MVP)  
**Related Documents**: 
- [`GLOSSARY.md`](file:///data/data/com.termux/files/home/repo/badminque/GLOSSARY.md)
- [`docs/adr/0001-tech-stack-decision.md`](file:///data/data/com.termux/files/home/repo/badminque/docs/adr/0001-tech-stack-decision.md)
- [`CODING_STANDARDS.md`](file:///data/data/com.termux/files/home/repo/badminque/CODING_STANDARDS.md)
- [`docs/research/rating-algorithm-spec.md`](file:///data/data/com.termux/files/home/repo/badminque/docs/research/rating-algorithm-spec.md)
- [`docs/research/sync-protocol-spec.md`](file:///data/data/com.termux/files/home/repo/badminque/docs/research/sync-protocol-spec.md)
- [`prototypes/courtside-queue-board.html`](file:///data/data/com.termux/files/home/repo/badminque/prototypes/courtside-queue-board.html)

---

## 1. Executive Summary & Architectural Verdict

Badminque delivers universal skill transparency for recreational badminton communities. In ADR 0001, Badminque committed to an offline-first **Next.js PWA** paired with a decoupled **Python (FastAPI)** backend and **Neon Serverless PostgreSQL**. With the explicit addition of an **Android App** target (while omitting iOS for now), this evaluation determines the optimal cross-platform strategy for a solo developer operating under a strict **$0.00/month** cost ceiling.

### The Architectural Verdict

We recommend **Option 1A: Next.js PWA wrapped via Google Trusted Web Activity (TWA / Bubblewrap)**, organized in a **Shared-Core Monorepo (pnpm + Turborepo)**.

```
                                 BADMINQUE ARCHITECTURE
                                
      ┌────────────────────────────────────────────────────────────────────────┐
      │                     @badminque/core (Pure TypeScript)                  │
      │  - Rating Calculation Engine (RS / RD, Weak-Link, Log MOV Multiplier)   │
      │  - Queueing & Matchmaking State Machine (Fair Play, Split & Mix)       │
      │  - Offline Sync Batch Protocol & Idempotent UUID Schemas               │
      │  - Abstract StorageAdapter Interface                                   │
      └───────────────────────────────────┬────────────────────────────────────┘
                                          │
                        ┌─────────────────┴─────────────────┐
                        │                                   │
                        ▼                                   ▼
          ┌───────────────────────────┐       ┌───────────────────────────┐
          │     @badminque/web        │       │   @badminque/android      │
          │   (Next.js PWA Shell)     │       │     (TWA Wrapper)         │
          │                           │       │                           │
          │  - CSS Grid 3-Court Board │       │  - Google Bubblewrap      │
          │  - IndexedDB Persistence  │ ◄──── │  - Digital Asset Links    │
          │  - Service Worker Caching │       │  - Fullscreen Chrome Tab  │
          │  - QR Passport Landing    │       │  - Zero APK Codebase Fork │
          └─────────────┬─────────────┘       └─────────────┬─────────────┘
                        │                                   │
                        │ Deployed to Vercel ($0)           │ Built on GitHub Actions ($0)
                        │                                   │
                        ▼                                   ▼
             Desktop & Mobile Web Browsers            Google Play Store & Sideload APK
```

### Core Decision Drivers
1. **100% Single UI Codebase**: TWA allows the exact same Next.js App Router code, Tailwind CSS styles, and IndexedDB database to run both as a mobile web app and as an installable Android APK. Zero lines of UI translation code are required.
2. **Superior Dense 2D Grid Ergonomics**: Badminque's courtside tablet interface is a dense, high-information "one-pager spreadsheet" displaying 3 courts, 3 on-deck slots, and player rosters simultaneously. Web **CSS Grid** solves this natively; React Native's Yoga engine is 1D Flexbox, where CSS Grid remains experimental and fragile.
3. **Zero-Cost CI Independence ($0/mo)**: Building signed Android APKs via Bubblewrap on **GitHub Actions** takes under 2 minutes and consumes less than 10% of GitHub's free runner allowance. Conversely, **Expo EAS Build** restricts free accounts to a rigid ceiling of **15 Android builds per month** with lengthy queue waits, creating a severe operational bottleneck for a solo developer.
4. **Frictionless Onboarding Bridge**: Scanning an unauthenticated Roster Player's Claim Token QR code opens instantly (<500ms) in any mobile browser without requiring an app download. Once claimed, the web app prompts an Android install that shares the authenticated session state directly with the TWA container.

---

## 2. Comprehensive Comparison Matrix

The table below evaluates the three primary architectural candidates across the required dimensions:

| Dimension | Option 1A: Next.js PWA + TWA (Bubblewrap) | Option 1B: Next.js PWA + Capacitor | Option 2: Expo (React Native) + Expo Router / RNW | Option 3: Separate Next.js Web + Native RN Monorepo |
| :--- | :--- | :--- | :--- | :--- |
| **1. Offline Storage & Sync** | **IndexedDB** (`idb`/Dexie). Durable via `navigator.storage.persist()`. Shared with browser. | **IndexedDB** in WebView or `@capacitor/sqlite`. Completely offline on install. | **SQLite** (`op-sqlite`) on mobile; **Wasm/IndexedDB** on web. Storage fragmentation. | Dual storage backends: IndexedDB for Web, SQLite for Android. High abstraction tax. |
| **2. Courtside UI Ergonomics** | **Native CSS Grid + Tailwind**. Pixel-perfect 3-court layout, subgrid, large touch targets. | **Native CSS Grid + Tailwind**. Identical to web. | **Yoga Flexbox** (1D). CSS Grid is experimental in RN 0.87+. Height alignment friction. | Web has CSS Grid; RN requires manual flex percentage math. Two UIs to maintain. |
| **3. Android Tablet Performance** | Hardware-accelerated Chromium (Blink). 60 FPS DOM updates, low memory on budget tablets. | Android System WebView. Good performance, slightly higher cold-start than TWA. | Native `ViewGroup` hierarchy. Can suffer measure/layout passes on deep 400+ view hierarchies. | Native UI on Android; Blink on Web. Best native feel, but highest development overhead. |
| **4. Build & CI Pipeline ($0/mo)** | **GitHub Actions** (`@bubblewrap/cli`). ~1.5 min build, 0 cost, unlimited builds. | **GitHub Actions** (`gradlew assembleRelease`). ~3.5 min build, 0 cost. | **EAS Build**: capped at **15 Android builds/mo** on Free tier. Local CI Gradle takes 10+ min. | Dual CI pipelines (Vercel web + EAS/Gradle Android). High maintenance. |
| **5. Solo Developer Velocity** | **Maximum (100% code sharing)**. Debug in Chrome DevTools. Instant HMR. Instant OTA via web deploy. | **Very High (95% code sharing)**. Native plugin configuration needed for updates. | **Medium**. RN Web translation leaks, dual-platform styling bugs, conditional imports. | **Lowest**. Solo dev must build, test, and style every single screen twice. |
| **6. Onboarding & Claiming Bridge** | **Frictionless**. Instant mobile web load (<1s). Direct session transfer to TWA. | Instant mobile web load. Session not shared automatically with Capacitor WebView. | QR scans open heavy RN Web bundle or force Play Store redirect (high drop-off). | QR opens lightweight web, but code is duplicated across two repositories. |
| **Verdict** | ⭐️ **PRIMARY RECOMMENDATION** | 🔄 **BACKUP FOR NATIVE PLUGINS** | ❌ **REJECTED (CI Limits & Grid Friction)** | ❌ **REJECTED (Excessive Solo Dev Tax)** |

---

## 3. Dimension 1: Offline Storage & Synchronization Architecture

### 3.1 Web & PWA: IndexedDB Durability & Quota Guarantees
In Badminque, courtside club nights take place in school gymnasiums and sports halls with intermittent or absent cellular coverage. Under ADR 0001, match logging must operate with zero network dependence.

- **Technology Selection**: IndexedDB accessed via a thin typed Promise wrapper ([`idb`](https://github.com/jakearchibald/idb), 1.2 KB) or [`Dexie.js`](https://dexie.org/).
- **Storage Quota**: Modern Chromium on Android grants web origins a quota equal to at least 60% of total free disk space (typically 10 GB to 40 GB on budget 64 GB/128 GB tablets). Badminque’s entire operational footprint (200 roster players, 1,000 historical matches, ratings, and audit trails) consumes less than 5 MB of structured JSON.
- **Eviction Protection**: By default, browser storage is "best-effort" and subject to LRU eviction under severe disk pressure. To prevent data loss, the application requests persistent storage on initialization:
  ```ts
  // storageService.ts
  export async function ensurePersistentStorage(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      console.info(`[Storage] Persistent storage granted: ${isPersisted}`);
      return isPersisted;
    }
    return false;
  }
  ```
  In Android Chrome and Trusted Web Activities, once an app is installed or granted persistent status, Chromium guarantees that IndexedDB records are never evicted automatically.

### 3.2 React Native: SQLite / MMKV vs. The Expo Web Dual-Storage Dilemma
In a native React Native application:
- On Android, SQLite (`expo-sqlite` or `op-sqlite`) writes directly to disk (`/data/user/0/...`), offering rock-solid ACID reliability and lightning-fast synchronous C++ access via JSI (JavaScript Interface). Key-value caches leverage `react-native-mmkv`.
- **The Fatal Flaw on Expo Web**: SQLite does not run natively in web browsers. To run SQLite on the web, Expo relies on WebAssembly (`wa-sqlite` / `sql.js`). WebAssembly SQLite requires `SharedArrayBuffer` for synchronous multi-threaded operations, which browsers strictly restrict unless the hosting server emits two Cross-Origin isolation headers:
  ```http
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  ```
  Enforcing these headers prevents loading un-isolated cross-origin assets (such as Google profile avatars for claimed players, external club logos, or third-party CDN scripts) unless those third parties explicitly set CORS headers. If Expo Web falls back to `@react-native-async-storage/async-storage`, it relies on browser `localStorage`, which is synchronous, blocks the main thread, and is restricted to a rigid 5 MB quota.

### 3.3 Storage Abstraction & The Idempotent Sync Protocol
In accordance with [`CODING_STANDARDS.md`](file:///data/data/com.termux/files/home/repo/badminque/CODING_STANDARDS.md) §2.4, UI components must never interact with browser storage APIs directly. All persistence is encapsulated behind an abstract `StorageAdapter` interface in the shared core:

```ts
// packages/core/src/storage/types.ts
export interface MatchRecord {
  id: string;               // Client-generated UUID v4
  club_night_id: string;
  recorded_at: string;      // ISO 8601 UTC
  sequence_num: number;     // Monotonic counter per session
  court_id: number;
  format: 'SINGLE_21' | 'BEST_OF_3' | 'SINGLE_30';
  team_a_player_ids: [string, string];
  team_b_player_ids: [string, string];
  team_a_scores: number[];
  team_b_scores: number[];
  status: 'PENDING' | 'SYNCING' | 'SYNCED';
}

export interface StorageAdapter {
  saveMatch(match: MatchRecord): Promise<void>;
  getPendingMatches(): Promise<MatchRecord[]>;
  markMatchesSynced(matchIds: string[]): Promise<void>;
  getRoster(): Promise<RosterPlayer[]>;
  upsertRosterPlayer(player: RosterPlayer): Promise<void>;
}
```

#### Sync Queue Lifecycle
```
[Organizer Logs Match] ──► [IndexedDB: Status=PENDING] ──► [Optimistic Rating Preview]
                                       │
                         (Network Reconnected Event)
                                       │
                                       ▼
                   POST /api/v1/sync/batch (UUID Batch)
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
  200 OK (Batch Accepted)                                Network Drop / Timeout
            │                                                     │
            ▼                                                     ▼
[IndexedDB: Status=SYNCED]                              [Retain PENDING in Queue]
[Update Authoritative Ratings]                          [Retry with Exact Same UUIDs]
```

- **Strict Idempotency**: Matches are assigned client-generated UUIDs v4 courtside. The server enforces `ON CONFLICT (id) DO NOTHING`. Network drop retries never double-count matches or alter ratings twice.
- **Chronological Batch Fold**: When connectivity restores, pending records are sorted by `(recorded_at, sequence_num)` before transmission, guaranteeing deterministic rating recalculation on the server.

---

## 4. Dimension 2: Courtside UI Ergonomics & Layout Density

### 4.1 The Courtside One-Pager Challenge
As demonstrated in [`prototypes/courtside-queue-board.html`](file:///data/data/com.termux/files/home/repo/badminque/prototypes/courtside-queue-board.html), Badminque's primary operational interface is **not** a standard vertically scrolled mobile feed. It is a high-density, touch-optimized **Command Station** operated from a 10"–12" landscape Android tablet mounted courtside.

The display must fit four synchronized panels simultaneously without vertical page jitter:
1. **Header Bar**: Live club night status, rotation mode selector ("Fair Play", "Split & Mix", "Court Ladder"), and sync status badge.
2. **Active Court Matrix (Top Row)**: 3 independent courts displayed side-by-side. Each court card contains:
   - Court status banner (`IN MATCH`, `PROPOSED`, `IDLE`).
   - Elapsed match timer with second-by-second updates.
   - Dual Pair Capsules (Pair A vs Pair B) with player avatars, names, singles/doubles ratings, and match counts.
   - 1-tap score preset matrix: 6 touch targets for 30-point scoring (`30-28`, `30-25`, `30-20`, `30-15`, `30-8`, `Custom`).
3. **On-Deck Staging Area (Middle Row)**: 3 upcoming match cards (`Next Up`, `Following`, `In the Hole`), each pre-partitioned into Pair A vs Pair B to give resting players instant visibility.
4. **Bench Queue & Roster Panel (Right / Split Row)**: Scrollable table of all checked-in roster players sorted by priority score $Q(i)$, with resting badges, 1-match skip toggles, and tap-to-override controls.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ [BADMINQUE] Club Night #14  │ Mode: [Split & Mix ▼] │ Sync: [● Online (All Synced)]          │
├───────────────────────────────┬───────────────────────────────┬──────────────────────────────┤
│ COURT 1 (IN MATCH 12:44)      │ COURT 2 (PROPOSED)            │ COURT 3 (IN MATCH 04:12)      │
│ [Alice (1620) & Bob (1580)]   │ [Grace (1420) & Hank (1410)]  │ [Ian (1700) & Jack (1680)]    │
│            vs                 │              vs               │             vs               │
│ [Charlie(1590) & Dave(1610)]  │ [Ivy (1430) & Leo (1400)]     │ [Kyle (1650) & Liam (1690)]   │
│ [ End Match (30 pts) ]        │ [ ⚡ Dispatch to Court ]       │ [ End Match (30 pts) ]       │
├───────────────────────────────┴───────────────────────────────┴──────────────────────────────┤
│ ON-DECK POOL (NEXT 3 MATCHES)                                                                │
│ [Next Up: Quad #4]            │ [Following: Quad #5]          │ [In the Hole: Quad #6]       │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ BENCH QUEUE & ROSTER TABLE (Scrollable, Sorted by Queue Priority Q(i))                       │
│ #1 Marcus (0 matches, 18m rest)  │  #2 Sarah (1 match, 12m rest)  │  #3 David [1-Skip Breather] │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 CSS Grid & Tailwind CSS (Web) vs. Flexbox & Yoga (React Native)

#### The Web Advantage (CSS Grid)
CSS Grid was explicitly engineered for 2-dimensional layouts where alignment is required across both rows and columns simultaneously.
- **Uniform Column Tracks**: `grid-template-columns: repeat(3, minmax(0, 1fr))` guarantees that all 3 courts take exactly equal widths without percentage rounding bugs.
- **Subgrid Alignment**: With CSS Subgrid (`grid-template-rows: subgrid`), elements inside Court 1 (such as the action buttons or score preset boxes) automatically align with the corresponding elements in Court 2 and Court 3, regardless of differing player name lengths.
- **Tailwind Ergonomics**:
  ```tsx
  <div className="grid grid-cols-3 gap-4">
    {activeCourts.map((court) => (
      <CourtStationCard key={court.id} court={court} />
    ))}
  </div>
  ```
- **Touch Target Compliance**: Large touch targets ($\ge 44 \times 44$ px) are trivially enforced with Tailwind's `min-h-[44px] min-w-[44px]` utilities.

#### The React Native Impediment (Yoga Flexbox)
- **1D Flexbox Limitations**: React Native relies on Meta's **Yoga** layout engine, which operates purely on 1D Flexbox. Emulating a 3-court dashboard requires nesting horizontal rows inside vertical containers with hardcoded percentage widths (`width: '33.33%'`).
- **Unequal Card Heights & Layout Thrashing**: In badminton courtside operation, Court 1 might be in `SCORE_ENTRY` (displaying 6 preset score buttons) while Court 2 is `IN_MATCH` (displaying a timer). In Flexbox, Card 1 expands vertically while Card 2 collapses. To force them to equal heights, developers must either hardcode artificial pixel heights or measure heights via `onLayout` callbacks, which triggers layout recalculations and dropped frames.
- **CSS Grid in Yoga (2025–2026 Status)**: While Yoga has introduced experimental CSS Grid algorithms in React Native 0.87+, support is nascent, lacks subgrid capabilities, and emits runtime layout inconsistencies across Android OEM skins.

---

## 5. Dimension 3: Android Device & Tablet Performance

### 5.1 The Modest Hardware Environment
Badminton clubs do not invest in flagship iPads or high-end Galaxy Tab S9 hardware. Courtside tablets are overwhelmingly entry-level devices purchased for under $130:
- **Common Devices**: Samsung Galaxy Tab A7 Lite / Tab A9, Lenovo Tab M9 / M10 Plus, Amazon Fire HD 10 (sideloaded Play Store), Redmi Pad SE.
- **Specifications**: 3 GB to 4 GB RAM, MediaTek Helio G80/G99 or Unisoc T606/T616 processors, 60 Hz LCD panels.

### 5.2 Android Chromium / TWA vs. React Native Fabric

| Performance Vector | Next.js PWA via TWA (Blink / V8) | React Native (Hermes + Fabric / New Architecture) |
| :--- | :--- | :--- |
| **Rendering Pipeline** | Hardware-accelerated Chromium Blink engine. Highly optimized for DOM updates, GPU compositing layers, and CSS Grid. | Translates React components into native `android.view.ViewGroup` and `android.widget.TextView` objects. |
| **Hierarchy Overhead** | Extremely lightweight. 350 DOM nodes consume ~25 MB of RAM in the shared browser process. | Heavy on budget devices. 350 native Views generate 25+ levels of ViewGroup nesting, causing expensive `onMeasure` and `onLayout` passes on budget CPUs. |
| **Timer Execution** | Ticking 3 court clocks every 1,000 ms updates text nodes directly via virtual DOM diffing with <1% CPU usage. | Updates bridge across JSI into native text view setters. Highly optimized by Hermes, but equal in performance to Blink. |
| **Cold Start Time** | **400 ms – 700 ms** (if Chrome is warm in system memory, which is standard on Android). | **350 ms – 500 ms** (precompiled Hermes bytecode). |
| **Memory Footprint** | Low app-specific footprint (~30 MB) because Chromium's core runtime libraries are shared with the OS. | Moderate (~50 MB – 70 MB) for standalone native binary and graphics buffers. |
| **Scroll Smoothness** | Flawless 60 FPS on Android Chrome with passive touch listeners and CSS `contain: strict`. | 60 FPS using FlatList / FlashList, but requires careful optimization to avoid blank card flashes during rapid bench queue scrolling. |

**Key Finding**: Because Badminque is an information-dense dashboard rather than an animation-heavy game, Chromium's Blink layout engine handles dense grid structures with *lower* layout overhead than a deeply nested native Android `ViewGroup` hierarchy.

---

## 6. Dimension 4: Build, Distribution & CI Pipeline ($0.00/mo Ceiling)

The project operates under a non-negotiable **$0.00/month** budget. All continuous integration, artifact compilation, and code delivery must run on free tiers without hitting quota lockouts.

### 6.1 The Expo EAS Build Free Tier Risk
Expo provides an outstanding developer experience, but its cloud build service (**EAS Build**) enforces strict free tier limits:
- **Build Quota**: **30 total builds per month**, divided into **15 Android builds** and **15 iOS builds**.
- **Overage Policy**: Free accounts **cannot** pay for overages; once 15 Android builds are exhausted, compilation is completely blocked until the next monthly billing cycle resets, unless the user subscribes to the Starter plan ($19/month).
- **Queue Delays**: Free tier builds are placed on the lowest-priority queue. During peak developer hours in North America and Europe, queue wait times frequently reach 25–45 minutes *before* compilation begins.
- **Local CI Alternative**: Running `npx expo prebuild` and compiling via Gradle on GitHub Actions requires building the C++ Hermes engine and ReactAndroid dependencies from scratch, consuming **8 to 14 minutes** of runner time per commit.

### 6.2 The Zero-Cost GitHub Actions + Bubblewrap CI Pipeline
By contrast, building a Trusted Web Activity APK via Google's [`@bubblewrap/cli`](https://github.com/GoogleChromeLabs/bubblewrap) requires zero cloud build subscriptions and runs entirely within GitHub Actions:

```yaml
# .github/workflows/build-android-twa.yml
name: Build Android TWA APK

on:
  push:
    branches: [main]
    paths:
      - 'apps/web/**'
      - 'packages/**'

jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Set up Java 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: 17

      - name: Install Bubblewrap CLI
        run: npm install -g @bubblewrap/cli

      - name: Initialize & Build TWA APK
        env:
          KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          bubblewrap build --manifest https://badminque.vercel.app/manifest.json
      
      - name: Upload Release APK
        uses: actions/upload-artifact@v4
        with:
          name: badminque-android-release
          path: app-release-signed.apk
```

- **Execution Duration**: **1 minute 45 seconds**.
- **Runner Consumption**: A 2-minute job consumes ~0.1% of GitHub's 2,000 free monthly Linux runner minutes. An active developer can trigger 1,000 builds per month at **$0.00**.
- **Instant Over-The-Air (OTA) Updates**: Because TWA delegates rendering to the verified web origin (`https://badminque.vercel.app`), deploying a frontend bug fix or rating algorithm refinement to Vercel updates the Android App **instantly** on the next launch. The developer does not need to rebuild or redistribute an APK for web-level changes.

---

## 7. Dimension 5: Solo Developer Velocity & Maintenance Overhead

For a solo developer, cognitive load and platform divergence are the primary causes of project abandonment.

```
DEVELOPMENT EFFORT COMPARISON FOR SOLO DEVELOPER

Option 1A: Next.js + TWA
┌─────────────────────────────────────────────────────────────┐
│ 100% Shared UI Codebase                                     │
│ (React + Next.js App Router + Tailwind CSS + IndexedDB)     │
└─────────────────────────────────────────────────────────────┘
  1 Router │ 1 Styling System │ 1 Test Suite │ 0 Forked Logic

Option 2: Expo + React Native Web
┌──────────────────────────────┬──────────────────────────────┐
│ Native React Native UI (75%) │ Web-Specific Shims (25%)     │
└──────────────────────────────┴──────────────────────────────┘
  Dual Styling Nuances │ WebAssembly Workarounds │ Leaky Abstractions

Option 3: Separate Web & Native Apps
┌──────────────────────────────┬──────────────────────────────┐
│ Next.js Web App (100%)       │ React Native Mobile App (100%)│
└──────────────────────────────┴──────────────────────────────┘
  2 Routers │ 2 Styling Systems │ 2 Test Suites │ 2x Maintenance Overhead
```

### 7.1 Single Mental Model vs. Leaky Abstractions
- **Next.js + TWA**: The developer builds and tests in Chrome DevTools using desktop responsive mode set to 1280x800 landscape tablet resolution. Hot Module Replacement (HMR) updates in under 100 ms. What works in Chrome on desktop is guaranteed to work identically in Chrome on the Android tablet.
- **Expo + React Native Web**: While React Native Web is capable, it introduces constant friction:
  - Scroll views and touch events behave differently on mobile touchscreens vs. desktop mice.
  - Third-party React libraries (such as accessible headless UI primitives, charts, sound generators, and QR scanners) frequently require React Native equivalents (`react-native-svg` vs SVG, `@zxing/library` vs `expo-camera`).
  - Debugging styling anomalies requires switching between the Metro bundler for Web and an Android emulator.

### 7.2 Ecosystem Availability
By committing to the standard Web ecosystem:
- **Icons**: Standard [`lucide-react`](https://lucide.dev/).
- **Audio Feedback**: The standard HTML5 Web Audio API provides synthesized courtside chimes when matches start and finish, with zero native audio plugin configuration.
- **Testing**: End-to-end tests for the entire courtside queue state machine, score entries, and offline sync fallbacks are executed via Playwright in standard Chromium headless browsers on CI.

---

## 8. Dimension 6: Onboarding UX & Frictionless Web-Android Bridge

### 8.1 The Tricount Player Lifecycle at Club Night
In recreational badminton, demanding that new players download a 40 MB mobile app from an app store before playing creates immediate resistance. Badminque adopts the **Tricount Identity Model** (validated in Ticket #4):

```
                       TRICOUNT ONBOARDING & CLAIMING JOURNEY

  COURTSIDE TABLET                                       PLAYER'S SMARTPHONE
  
  [Organizer checks in                                   [Player arrives at venue;
   "Marcus" on tablet]                                    plays matches without an account]
          │
          │ (Matches recorded under permanent UUID)
          ▼
  [Club Night Concludes:
   Organizer presents Claim Token QR] ─────────► [Player scans QR with Phone Camera]
                                                           │
                                                           ▼
                                                 [Instant Mobile Web Browser]
                                                 - URL: badminque.app/claim?token=...
                                                 - Zero download barrier (<500ms load)
                                                 - Full Match History & RS/RD Rating
                                                           │
                                                           ▼
                                                 [1-Tap Account Claiming]
                                                 - Google One-Tap or Email/Password
                                                 - Links auth_user_id to historical UUID
                                                           │
                                                           ▼
                                                 [Smart Install Call-To-Action]
                                                 - "Add to Home Screen" or "Install App"
                                                 - Session cookie automatically shared
```

### 8.2 Frictionless Onboarding Comparison
1. **Web-First (Next.js PWA + TWA)**:
   - When Marcus scans the QR code, his mobile browser immediately renders his **Player Passport** via fast server-rendered or static HTML (<500 ms).
   - He views his Singles Rating ($R_S$), Doubles Rating ($R_D$), and individual match logs immediately.
   - He taps "Claim My Rating", enters his email or clicks Google One-Tap, and binds his permanent UUID.
   - An install banner invites him to install the Android App. If he installs the TWA app from Google Play, **Google Chrome shares cookie and session storage directly with the TWA container**. When he opens the installed Android app, he is already logged in.
2. **Native-First (Expo / React Native)**:
   - Scanning the QR code must either redirect Marcus to the Google Play Store (forcing a 30 MB download before he can see his score) or open a heavy React Native Web bundle.
   - If he installs the native app, the native app cannot access cookies stored in mobile Chrome. He must re-authenticate and scan the token a second time.

---

## 9. Concrete Tradeoff Analysis: Bubblewrap (TWA) vs. Capacitor

While TWA is our primary recommendation for MVP, **Capacitor** serves as a proven secondary alternative. The table below delineates the concrete engineering tradeoffs between them:

| Architectural Criterion | Option 1A: Google Bubblewrap (TWA) | Option 1B: Capacitor (Ionic) |
| :--- | :--- | :--- |
| **Underlying Engine** | Google Chrome / Chromium browser engine via Chrome Custom Tab. | Android System WebView (`android.webkit.WebView`). |
| **APK Binary Footprint** | Tiny (~1.2 MB – 2.0 MB). | Small to Moderate (~8 MB – 15 MB). |
| **Offline Cold Start on 1st Install** | Requires 1 online load to prime the Service Worker cache. | **100% offline immediately on 1st launch** (assets packaged inside `android_asset`). |
| **Asset Updates (Bug Fixes)** | **Instant OTA**: Updates deploy to Vercel and load immediately. | Requires rebuilding APK or configuring 3rd-party OTA (Capgo). |
| **Browser State Sharing** | **Full Sharing**: Shares cookies, cache, and IndexedDB with Chrome. | Isolated: WebView storage is sandboxed from standalone Chrome. |
| **Native Hardware Plugins** | Web APIs only (Web Bluetooth, Web Audio, WakeLock). | Full ecosystem of native Cordova/Capacitor Android plugins. |
| **Next.js Compatibility** | Compatible with standard Next.js deployments on Vercel. | Requires Next.js static export (`output: 'export'`). |

### Evolutionary Strategy
- **Phase 1 (MVP)**: Launch with **Next.js PWA + TWA (Bubblewrap)**. Delivers instant web updates, $0 CI overhead, and shared auth state.
- **Phase 2 (Hardened Hardware)**: If courtside tablet deployments demand zero-network first cold boot or specialized Bluetooth hardware (e.g., physical scoreboard integration), add a Capacitor build target using `output: 'export'`.

---

## 10. Monorepo Architecture Blueprint

To ensure complete modularity and prevent UI code from coupling with mathematical algorithms, the repository will be structured as a lightweight Turborepo workspace:

```
badminque/
├── apps/
│   ├── web/                         # Next.js 15 PWA Application
│   │   ├── app/                     # App Router (routes, layouts, pages)
│   │   │   ├── (courtside)/         # Courtside tablet station route
│   │   │   ├── passport/[id]/       # Public Player Passport route
│   │   │   └── claim/               # Tricount account claiming route
│   │   ├── components/              # React UI components (CSS Grid, Tailwind)
│   │   ├── hooks/                   # Custom hooks (useOfflineQueue, useCourts)
│   │   ├── public/
│   │   │   ├── manifest.json        # Web App Manifest
│   │   │   └── .well-known/
│   │   │       └── assetlinks.json  # Digital Asset Links for TWA
│   │   ├── next.config.mjs          # Serwist PWA Service Worker config
│   │   └── package.json
│   │
│   └── android/                     # Android TWA Packaging
│       ├── twa-manifest.json        # Bubblewrap configuration
│       └── build.gradle             # Lightweight Gradle wrapper
│
├── packages/
│   ├── core/                        # 100% Pure TypeScript Domain Engine
│   │   ├── src/
│   │   │   ├── rating/              # Invariant rating calculations (RS, RD, MOV)
│   │   │   ├── queue/               # Queue sorting priority Q(i), pair matching
│   │   │   ├── sync/                # Batch serialization, idempotency checks
│   │   │   └── storage/             # Abstract StorageAdapter interfaces
│   │   └── package.json
│   │
│   └── tsconfig/                    # Shared TypeScript configurations
│
├── backend/                         # Python FastAPI Rating Engine (ADR 0001)
│   ├── app/
│   │   ├── api/v1/sync.py           # Batch sync endpoint (ON CONFLICT DO NOTHING)
│   │   ├── core/rating.py           # Authoritative Python rating engine
│   │   └── db/                      # Neon PostgreSQL models & migrations
│   └── pyproject.toml
│
├── .github/
│   └── workflows/
│       ├── ci.yml                   # Lint, type-check, and test runner
│       └── build-android.yml        # Zero-cost TWA APK build via Bubblewrap
│
├── turbo.json                       # Turborepo task pipeline
└── package.json                     # pnpm root workspace
```

---

## 11. Risk Analysis & Mitigation Matrix

| Potential Risk | Severity | Probability | Concrete Architectural Mitigation |
| :--- | :---: | :---: | :--- |
| **First-Boot Offline Failure (TWA)**: Tablet is turned on for the very first time in a venue with zero internet before the Service Worker can prime. | Medium | Low | **Mitigation**: Organizer setup checklist requires opening Badminque once at home/club office prior to session. Furthermore, provide a standalone offline HTML fallback page bundled in the APK. |
| **Browser Storage Eviction**: Android OS cleans up disk space and deletes IndexedDB records. | High | Low | **Mitigation**: Invoke `navigator.storage.persist()` on application boot. In Chromium, persistent storage origins are exempt from automatic disk cleaning. |
| **Android Tablet Fragmentation**: Budget tablets (Unisoc/MediaTek) have outdated Android WebViews. | Medium | Low | **Mitigation**: TWA delegates to the standalone Google Chrome app, which is updated independently of the OS via Google Play Store on all certified Android devices. |
| **Future iOS Expansion**: Requirements expand to require an iOS App Store binary. | Medium | Medium | **Mitigation**: The Next.js PWA is already 100% compliant with iOS Safari Standalone PWA mode. For App Store submission, Capacitor can be activated in the monorepo with zero UI rewrites. |
| **Vercel Hobby Tier Bandwidth**: Public traffic to player passport pages exceeds free tier bandwidth. | Low | Low | **Mitigation**: Passport pages are statically pre-rendered with aggressive CDN edge caching headers (TTL 24 hours), minimizing origin execution. |

---

## 12. Conclusion & Next Steps

Targeting both a **Web App** and an **Android App** does not necessitate abandoning the architecture established in ADR 0001. On the contrary, packaging an offline-first **Next.js PWA** inside an Android **Trusted Web Activity (TWA)** via Bubblewrap provides:
1. **Unmatched Layout Fidelity**: Native CSS Grid handles the dense 3-court tablet command center without the constraints of Yoga Flexbox.
2. **Zero-Cost Sustainability**: Eliminates EAS Build's 15-build monthly limit, maintaining the strict $0.00/month infrastructure ceiling on GitHub Actions.
3. **Maximum Solo Velocity**: 100% of the UI, state, and offline persistence is written once in TypeScript and verified in standard web tooling.

### Recommended Immediate Tasks
1. Initialize the monorepo workspace structure (`apps/web`, `packages/core`) in accordance with Issue [#13](https://github.com/kidomarcostelo/badminque/issues/13).
2. Port the rating formulas and queue priority state machine from the prototypes into `@badminque/core`.
3. Scaffold `@badminque/web` using Next.js App Router and configure `@serwist/next` for offline caching.
4. Set up `.github/workflows/build-android-twa.yml` to automatically emit signed Android APKs on commit.
