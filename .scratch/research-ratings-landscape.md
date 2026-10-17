# Ratings & Platform Landscape Research

> Compiled 2026-10-10. Sources: web search across official sites, press releases, app stores, and community forums.

---

## 1. Universal Badminton Rating (UBR)

### What is it?
UBR (universalbadmintonrating.com) is an independent, community-driven rating system designed for recreational and club-level badminton players. It is **not** affiliated with the BWF (Badminton World Federation) or any national federation. It positions itself as "built by players, for players."

### Founders
No publicly named individual founders. Presented as a grassroots community initiative.

### Algorithm
- **Elo-inspired** rating system with performance-based adjustments.
- **Score sensitivity**: Factors in the final score, not just win/loss. Losing 21-19 to a much stronger player can still boost your rating.
- **Expected-outcome model**: Before each match, the system calculates the probability of each player/team winning based on current ratings. Actual result is compared against expectation.
- **Dynamic updates**: Rating updates after every recorded event.
- **K-factor weighting**: Higher-tier matches (tournaments vs. casual) may be weighted more heavily.
- **Separate ratings** for singles, doubles, and mixed doubles.

### Adoption Status
- **Grassroots / club-by-club adoption**. Not mandated by any national federation.
- Used by individual clubs and local event organizers across multiple countries.
- No official list of adopting countries — adoption is organic and bottom-up.
- Not comparable in scale to DUPR's pickleball penetration.

### API / Public Specification
- **No publicly documented API** for third-party developers.
- The platform provides club-facing tools (event management, court assignment automation) but does not expose a developer-facing API.

### Key Features
- Live rating dashboard with trajectory tracking
- Automated fair matchmaking for club mixers/events
- Player rotation and court assignment automation
- Match history and progress visualization

### Comparable Systems
| System | Algorithm | Focus |
|---|---|---|
| **UBR** | Elo-inspired | Club/recreational |
| **Smashio** | Glicko-2 | Competitive tracking, global leaderboards |
| **EloSmash** | Elo | Club management + ratings |
| **Badminton 360** | Elo | Free club tool + expense splitting |
| **BWF World Ranking** | Points accumulation (52-week) | Professional/federation level |

---

## 2. DUPR (Dynamic Universal Pickleball Rating)

### Overview
DUPR is the dominant standardized rating system for pickleball. Founded in **2021** by **Steve Kuhn** (also founder of Major League Pickleball). Kuhn's background is in finance (Goldman Sachs, Citadel, Pine River Capital).

### How the Algorithm Works
- **Elo-family** system calibrated for pickleball dynamics.
- **Rating scale**: 2.000 – 8.000.
- **Inputs**:
  - Match result (win/loss)
  - Score differential (margin of victory)
  - Strength of opponent (opponent's current DUPR)
  - Opponent reliability (matches against rated players weighted more)
  - Recency (newer matches weighted more heavily)
  - Match type (recreational and tournament matches all count)
- **Expected score model**: Calculates expected outcome; compares to actual. Outperforming expectation (even in a loss) can raise your rating.
- **Reliability Score**: More recorded matches = higher reliability = more stable rating.
- **Dynamic**: Updates in real-time as results are entered (not batch-processed after tournaments).

### What Made DUPR Successful
1. **Solved "skill transparency"**: Replaced subjective self-ratings with objective, data-driven numbers. Eliminated sandbagging and mismatches.
2. **Universal scale**: A 4.0 means the same thing everywhere — "passport for play." Players can travel and find fair matches instantly.
3. **"Golf handicap" effect**: Quantified skill → gamified improvement → increased engagement/retention.
4. **Ecosystem lock-in**: Became the official rating for Major League Pickleball, PPA Tour, and thousands of clubs. Network effects made it the de facto standard.
5. **Includes recreational play**: Unlike federation rankings that only count tournaments, DUPR accepts casual match results — capturing the massive recreational base.
6. **Social/community features**: The DUPR app is also a social platform (find clubs, connect with players, log matches).

### Business Model (SaaS)
- **B2B**: Software tools for clubs, leagues, tournament organizers (automated match logging, bracket seeding, player grouping).
- **Consumer app**: Free for players (track progress, find matches, community). 2M+ registered players.
- **Data ecosystem**: Standardized rating data is valuable to professional tours, facility operators, brand partners.
- **Partnerships**: Exclusive deals with MLP, PPA, brand sponsorships leveraging the user database.
- **Funding**: $8M raised (Jan 2024). Investors include Andre Agassi, Raine Ventures, Jay Farner. Controlling interest acquired by David Kass-led group.

### Key Takeaways for Badminque
- DUPR proves that a **universal rating for a racket sport** can achieve massive adoption.
- Critical success factor: capturing **recreational play**, not just tournament results.
- The rating must be **simple to understand** and **easy to contribute to** (log a match from your phone).
- Integration with the **club/event management workflow** is essential (not a standalone rating — it's embedded in how you run events).

---

## 3. RecClub (reclub.co)

### What is it?
RecClub is a mobile-first platform for organizing local sports communities — primarily used for pickleball but supports multiple sports. It functions as a combined club management + event organization + social discovery platform.

### Core Features
| Category | Features |
|---|---|
| **Club Management** | Member management, attendance tracking, payment collection, automated notifications |
| **Event Organization** | Schedule meets, round-robin tournaments, leagues |
| **DUPR Integration** | Submit match results directly to DUPR; automatic rating sync; verified/club-reported matches carry more weight |
| **Discovery** | Find local sports, pickup games, and clubs |
| **Social** | In-app chat, community features |
| **Matchmaking** | View DUPR ratings to arrange skill-matched games |

### DUPR Integration Details
- Organizers submit results to DUPR in seconds (no CSV uploads).
- Club-reported matches via RecClub are "verified" — weighted more heavily in DUPR algorithm.
- Players link their DUPR profile within RecClub.
- Clubs must register as a DUPR club and connect via API.

### Business Model
- **Free for players** with sports-relevant banner ads.
- Value proposition is the network effect: players come for DUPR integration, clubs come because players are there.

### Tech Stack
- No publicly known tech stack details. Mobile app (iOS + Android). Likely a standard mobile + REST API architecture.

### Relevance to Badminque
RecClub is the **closest functional analog** to what Badminque could be for badminton:
- Club management + rating integration + social discovery in one app.
- The tight DUPR integration is the killer feature — it makes RecClub the easiest path to getting your rating updated.
- **Key lesson**: The rating system and the club management tool should be **tightly coupled**, not separate products.

---

## 4. Existing Badminton Apps & Market Gaps

### Current Landscape

#### Comprehensive Club Management
| App | Focus | Rating System |
|---|---|---|
| **SportEasy** | All-in-one club admin (members, payments, messaging) | None built-in |
| **Rankedin** | Racket sports — club management, live rankings, tournaments | Community leaderboards |
| **Book & Go** | Facility management, court reservations, matchmaking | Skill-level matching |
| **Playinga** | Club websites, tournament management, player stats | Performance tracking |

#### Session/Matchmaking Management
| App | Focus | Rating System |
|---|---|---|
| **Badminton Match Manager** | Social session management, auto-balanced doubles | Basic balancing |
| **ePegboard** | Digital pegboard for clubs — smart game picking, court scheduling | Fair match balancing |
| **ShuttleFlow** | Session management, player queues, court assignments | None |

#### Rating & Score Tracking
| App | Focus | Rating System |
|---|---|---|
| **EloSmash** | Club management + Elo ratings + tournaments | Elo |
| **Badminton 360** | Club management + rankings + expense splitting | Elo |
| **Smashduck** (iOS) | Tournament/club management, local data | Customizable ranking rules |
| **Smashio** | Competitive tracking, global leaderboards | Glicko-2 |
| **Smash Tracker** | Live scoring + Wear OS + member management | Win rate / partner analysis |

### Critical Market Gaps

1. **No "DUPR for badminton"**: No single rating system has achieved universal adoption across recreational badminton. Every club uses its own approach (or none at all). UBR is the closest but has limited penetration and no public API.

2. **Fragmented tools**: Clubs juggle WhatsApp groups + spreadsheets + separate booking systems + manual pegboards. No single app consolidates the full workflow (scheduling → matchmaking → scoring → rating → payment).

3. **Recreational players are invisible**: Federation rankings (BWF, national systems) only track tournament players. The vast majority of recreational/club players have no portable skill metric.

4. **No "RecClub for badminton"**: No app combines club management + universal rating + social discovery specifically for badminton in the way RecClub does for pickleball.

5. **Poor matchmaking for club nights**: The biggest pain point. Generating balanced doubles matches at a club night (mixed skill levels, rotating partners) is still done manually or with primitive tools. Existing solutions (ePegboard, Badminton Match Manager) work but are standalone — not connected to a broader rating ecosystem.

6. **No cross-club portability**: A player's skill level / history at Club A doesn't transfer to Club B. There's no universal player profile.

7. **Lack of actionable performance insights**: Most apps track wins/losses but don't provide meaningful analytics (trends, partner compatibility, performance against different skill levels).

8. **Social discovery gap**: Finding new clubs, pickup games, or hitting partners in a new city is still word-of-mouth or Facebook groups.

---

## 5. Strategic Implications for Badminque

### The Opportunity
Badminton is in the position pickleball was in ~2020 before DUPR: a popular racket sport with millions of recreational players but **no universal rating, no integrated club platform, and fragmented tooling**.

### Winning Formula (learned from DUPR + RecClub)
1. **Rating + Club Management = one product** (not separate). The rating feeds the matchmaking; the club workflow feeds the rating.
2. **Capture recreational play** (not just tournaments). This is where the volume is.
3. **Make match logging effortless** (ideally automatic or 1-tap).
4. **Club night automation** is the wedge: solve the pegboard/rotation problem with smart, rating-aware matchmaking.
5. **Cross-club portability**: A player's rating follows them everywhere.
6. **Start local, grow globally**: Adopt club-by-club (bottom-up), not federation-down.

### Rating Algorithm Recommendation
- Start with an **Elo-based system** (simple, well-understood, battle-tested).
- Separate ratings for singles/doubles/mixed.
- Factor in: score differential, opponent strength, match recency.
- Add a reliability/confidence score based on match volume.
- Consider Glicko-2 for better handling of rating uncertainty (used by Smashio).
