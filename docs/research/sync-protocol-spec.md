# Offline-First Synchronization Protocol and Schema Specification

**Status**: Proposed  
**Date**: 2026-10-10  
**Context**: Resolves Ticket #3 (`wayfinder:prototype`)  
**Related Documents**: `GLOSSARY.md`, `docs/adr/0001-tech-stack-decision.md`, `docs/research/rating-algorithm-spec.md`, `prototypes/offline-sync-demo.html`  

---

## 1. Executive Summary

Badminque operates in badminton gymnasiums with unreliable or non-existent cellular and Wi-Fi reception. In accordance with **ADR 0001**, courtside club night tablets record matches offline in IndexedDB and synchronize batches to the Python FastAPI backend upon reconnecting.

This specification establishes the **data contract**, **idempotency guarantees**, and **chronological batch-fold model** to ensure:
1. **Zero Data Loss**: Matches logged offline are durable in IndexedDB across tablet sleep/restarts.
2. **Strict Idempotency**: Network dropouts during batch uploads can be retried infinitely without duplicate match recording or corrupted ratings.
3. **Deterministic Re-Rating**: The server performs an authoritative, chronological fold of match results using the rating engine specification (`docs/research/rating-algorithm-spec.md`).

---

## 2. Synchronization Architecture & Flow

```
+-----------------------------------------------------------------------------------+
| COURTSIDE TABLET (PWA / Next.js)                                                  |
|                                                                                   |
|  [Organizer Inputs Score]                                                         |
|         |                                                                         |
|         v                                                                         |
|  [IndexedDB Queue] ---> (Optimistic UI Preview with TS Rating Engine)             |
|         |                                                                         |
|         | (Network Restored: Online Event or Manual "Sync Session" Tap)            |
|         v                                                                         |
|  POST /api/v1/sync/batch (SyncBatchRequest with UUIDs & client sequence numbers)  |
+-----------------------------------------------------------------------------------+
                                          |
                                          | HTTPS / REST
                                          v
+-----------------------------------------------------------------------------------+
| FASTAPI BACKEND (Koyeb)                                                           |
|                                                                                   |
|  1. Ingest Batch in Single PostgreSQL Transaction                                  |
|  2. Upsert Roster Players (ON CONFLICT DO NOTHING)                                |
|  3. Deduplicate Matches against `matches.id` (skip previously synced UUIDs)       |
|  4. Sort New Matches Chronologically by `recorded_at` & `sequence_num`             |
|  5. Apply BadminqueRatingEngine calculations to update authoritative player state |
|  6. Commit Transaction & Return SyncBatchResponse                                 |
+-----------------------------------------------------------------------------------+
                                          |
                                          | 200 OK + Authoritative Ratings
                                          v
+-----------------------------------------------------------------------------------+
| TABLET CLIENT RECONCILIATION                                                      |
|  1. Mark matches as `synced: true` in IndexedDB                                   |
|  2. Update local cached player ratings with authoritative server ratings           |
+-----------------------------------------------------------------------------------+
```

---

## 3. Data Contracts (JSON Schemas)

### 3.1 Endpoint
`POST /api/v1/sync/batch`

### 3.2 Request: `SyncBatchRequest`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SyncBatchRequest",
  "type": "object",
  "required": ["sync_batch_id", "sent_at", "session", "roster", "matches"],
  "properties": {
    "sync_batch_id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique client-generated identifier for this transmission attempt."
    },
    "sent_at": {
      "type": "string",
      "format": "date-time"
    },
    "session": {
      "type": "object",
      "required": ["session_id", "club_id", "organizer_id", "started_at"],
      "properties": {
        "session_id": { "type": "string", "format": "uuid" },
        "club_id": { "type": "string" },
        "organizer_id": { "type": "string" },
        "venue": { "type": "string" },
        "started_at": { "type": "string", "format": "date-time" },
        "ended_at": { "type": ["string", "null"], "format": "date-time" }
      }
    },
    "roster": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["player_id", "display_name", "is_claimed"],
        "properties": {
          "player_id": { "type": "string", "format": "uuid" },
          "display_name": { "type": "string" },
          "is_claimed": { "type": "boolean" }
        }
      }
    },
    "matches": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "match_id",
          "sequence_num",
          "discipline",
          "format",
          "recorded_at",
          "team_a",
          "team_b",
          "scores"
        ],
        "properties": {
          "match_id": { "type": "string", "format": "uuid" },
          "sequence_num": { "type": "integer", "minimum": 1 },
          "discipline": { "type": "string", "enum": ["singles", "doubles"] },
          "format": { "type": "string", "enum": ["SINGLE_21", "BEST_OF_3"] },
          "recorded_at": { "type": "string", "format": "date-time" },
          "team_a": {
            "type": "array",
            "items": { "type": "string", "format": "uuid" },
            "minItems": 1,
            "maxItems": 2
          },
          "team_b": {
            "type": "array",
            "items": { "type": "string", "format": "uuid" },
            "minItems": 1,
            "maxItems": 2
          },
          "scores": {
            "type": "array",
            "items": {
              "type": "array",
              "items": { "type": "integer", "minimum": 0, "maximum": 30 },
              "minItems": 2,
              "maxItems": 2
            },
            "minItems": 1,
            "maxItems": 3
          },
          "client_optimistic_deltas": {
            "type": "object",
            "additionalProperties": { "type": "number" }
          }
        }
      }
    }
  }
}
```

### 3.3 Response: `SyncBatchResponse`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SyncBatchResponse",
  "type": "object",
  "required": [
    "sync_batch_id",
    "received_at",
    "status",
    "matches_inserted",
    "matches_skipped_duplicate",
    "authoritative_ratings"
  ],
  "properties": {
    "sync_batch_id": { "type": "string", "format": "uuid" },
    "received_at": { "type": "string", "format": "date-time" },
    "status": { "type": "string", "enum": ["success", "partial", "error"] },
    "matches_inserted": { "type": "integer" },
    "matches_skipped_duplicate": { "type": "integer" },
    "authoritative_ratings": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "rating_singles": { "type": "number" },
          "rating_doubles": { "type": "number" },
          "rd_singles": { "type": "number" },
          "rd_doubles": { "type": "number" },
          "matches_played": { "type": "integer" },
          "delta": { "type": "number" }
        }
      }
    }
  }
}
```

---

## 4. Conflict & Idempotency Rules

1. **Client-Assigned UUIDs (`match_id`)**:
   Every match is assigned a client-side UUID v4 at the moment the organizer taps "Save Match".
   In the PostgreSQL database:
   ```sql
   CREATE TABLE matches (
       id UUID PRIMARY KEY,
       session_id UUID NOT NULL REFERENCES club_sessions(id),
       recorded_at TIMESTAMPTZ NOT NULL,
       sequence_num INT NOT NULL,
       discipline VARCHAR(10) NOT NULL,
       format VARCHAR(15) NOT NULL,
       team_a UUID[] NOT NULL,
       team_b UUID[] NOT NULL,
       scores INT[][] NOT NULL,
       created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
2. **Handling Duplicate Uploads**:
   If the tablet sends a batch, the server processes it, but the cellular connection drops before the tablet receives the `200 OK` response, the tablet will retry sending the same payload upon reconnection.
   The server checks:
   ```sql
   INSERT INTO matches (...) VALUES (...)
   ON CONFLICT (id) DO NOTHING;
   ```
   If a `match_id` has already been recorded in a prior batch, the server skips recalculation for that match and increments `matches_skipped_duplicate`. This guarantees **100% idempotent safety**.
3. **Out-of-Order Match Ordering**:
   Matches in the incoming batch are sorted strictly by `(recorded_at, sequence_num)` prior to rating calculation.

---

## 5. Prototype Validation

An interactive logic demo has been built at [`prototypes/offline-sync-demo.html`](../../prototypes/offline-sync-demo.html) verifying:
- Happy-path offline match logging into IndexedDB followed by batch upload.
- Duplicate batch retry with zero double-counting.
- Optimistic local rating preview vs. server reconciliation.
