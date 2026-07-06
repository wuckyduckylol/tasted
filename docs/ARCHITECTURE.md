# Tasted — Architecture

Decisions with lasting consequences live in [`docs/adr/`](adr/); this file is the map.

## System shape

```
┌─────────────────────────────── Expo app (iOS/Android) ───────────────────────────────┐
│                                                                                       │
│  app/ (expo-router routes)                                                            │
│   ├─ (auth)/        13-step onboarding wizard + sign-in                               │
│   ├─ (tabs)/        Home · Search · Drops · Profile                                   │
│   └─ chain/ item/ rate/ vote/ …                                                       │
│            │ render + navigation only                                                 │
│            ▼                                                                          │
│  src/features/*     screen logic per domain (auth, onboarding, rating, recs, …)       │
│            │                                                                          │
│            ├──────────► src/lib/scoring/   PURE functions, unit-tested (SPEC §5, §17) │
│            ▼                                                                          │
│  src/lib/db/        the ONLY layer that touches supabase-js (typed by                 │
│                     src/types/database.ts; components never query directly)          │
└───────────┬───────────────────────────────────────────────────────────────────────────┘
            │ HTTPS (PostgREST / GoTrue / Storage)
            ▼
   Supabase ── Postgres + RLS  ·  Auth (email OTP, password; phone parked)
             ·  Storage (avatars)  ·  Edge Functions (score recompute job)
             ·  migrations in supabase/migrations, catalog seed in supabase/seed
```

## Load-bearing rules

1. **Scoring is pure.** Everything in `src/lib/scoring` is deterministic in/out, no I/O, fully unit-tested (coverage enforced in CI). UI and DB code may *call* it, never reimplement it.
2. **One DB doorway.** All Supabase calls live in `src/lib/db/*` behind typed functions. Grep for `getSupabase()` outside `src/lib` + `src/features/auth/api.ts` + `src/features/notifications` should return nothing.
3. **RLS is the authorization model.** The client is untrusted; every table has owner-scoped policies. The service-role key exists only in `.env` for the seed script and server jobs.
4. **Validation at the edge.** External input (forms, params) passes Zod schemas in `src/features/*/validation.ts` before anything else sees it.
5. **Catalog is curated.** Seeded from versioned `supabase/seed/menu.json` — never user-created, never fabricated ratings (SPEC §1.3/§13).

## State

- **Server state:** TanStack Query (staleTime 60s, gcTime 24h for offline reads, keyed invalidation after writes).
- **Local UI state:** component state / Zustand where cross-screen.
- **Session:** supabase-js managed, surfaced via `useSession()`; the root layout's auth gate routes signed-out → `(auth)/get-started`, mid-wizard sessions stay in `(auth)` (see `SIGNED_IN_AUTH_ROUTES`).

## Onboarding flow (2026-07 walkthrough)

get-started → email → verify (OTP) → password → name → username → avatar
→ welcome → top-three → top-ten (Bayesian + affinity, ADR-0003) → contacts
→ friends → notifs → ready → rate-5-items → first personalized pick → tabs
