# SPEC.md — Fast-Food Dish Rating App (complete build spec)

This is the authoritative build spec. Build strictly in the phase order in Section 14. After each phase, run the app and the tests before moving on. Do not skip the algorithm unit tests in Section 17 — the scoring logic is the core of the product and must be correct.

## 0. How to use this file (for the builder)

1. Create the repo, add this file as `SPEC.md` at the root, and create a `CLAUDE.md` from the block in Section 1.4.
2. Work through Section 14 phase by phase. Treat each phase as a milestone: implement, run, test, then continue.
3. Anything requiring an external account or secret is listed in Section 15 — pause and ask the human for those values; never invent them.
4. UI styling will be refined later in a separate tool. For now, build clean, functional, accessible screens using the design tokens in Section 12.6. Correct behavior and data flow matter more than visual polish at this stage.

## 1. Product

### 1.1 What it is

A mobile app that tells a user the best thing to order at each of the top ~10 fast-food chains, powered by a personal taste profile the user builds by rating individual menu items. The rated-menu database is the core asset; new-item "drops" are a feature, not the identity.

### 1.2 Core loop

Rate items → build a personal taste profile → get personalized "for you" predictions on every menu → discover what to order → rate more.

### 1.3 Key principles

* Rating is nearly frictionless: one tap for gut reaction, then 2–4 head-to-head comparisons.
* Comparisons only happen within the same bucket (Drinks / Sweet / Savory) and same band (loved / fine / disliked). Never compare across buckets.
* The lead number a user sees on a menu is a personalized predicted score, not a raw community average.
* Community score is a Bayesian weighted average, displayed primarily as a "Worth It %".
* No fabricated data — ever. The ONLY preloaded data is the catalog: chains, menu items, tags, item attributes, and chain-vote candidates (these are real, factual reference data — the actual menus). Every rating, personal score, community score, review, recommendation, user, and follow must come from real user input. NEVER seed, mock, or generate fake ratings, fake users, fake community scores, or dummy reviews — not in production and NOT during development to make screens look populated. When there is no real data yet, render the empty / "score forming" states defined in Sections 6 and 12. Personalized and community numbers are computed only from real ratings; if none exist, show the empty state.

### 1.4 CLAUDE.md to create at repo root

```
# Project: FastFood Dish Rater

Mobile app (Expo/React Native + Supabase) for rating individual fast-food menu items
and getting personalized recommendations. Full spec in SPEC.md — read it before building.

## Stack
- Expo (React Native) + TypeScript (strict)
- expo-router for navigation
- Supabase: Postgres, Auth, Storage, Row-Level Security, Edge Functions (Deno)
- TanStack Query (server state) + Zustand (local UI state)
- Zod for all input validation
- Jest + React Native Testing Library for tests

## Conventions
- TypeScript strict mode, no `any`.
- Feature-folder structure under `src/features/*`.
- All DB access through a typed data layer in `src/lib/db` — no raw Supabase calls in components.
- All scoring/ranking logic lives in `src/lib/scoring` as PURE functions with unit tests.
- Validate all external input with Zod.
- Conventional commits. Small, reviewable commits per feature.
- Never commit secrets. Read config from `.env` via `app.config.ts`.

## Rules
- Build in the phase order defined in SPEC.md Section 14.
- Do not implement DoorDash/Uber Eats order import (out of scope — see SPEC.md Section 16).
- Ask the human for any account/secret listed in SPEC.md Section 15.
```

## 2. Tech stack (locked)

* Frontend: Expo (React Native), TypeScript strict, `expo-router`.
* State: TanStack Query for all server data; Zustand for local UI state.
* Validation: Zod on every external boundary.
* Backend: Supabase — Postgres, Auth (email/password + Sign in with Apple + Google), Storage (item/user photos), Row-Level Security on every table, Edge Functions (Deno/TypeScript) for server-side jobs.
* Scheduled jobs: Supabase `pg_cron` + Edge Functions for recomputing community scores and user similarity.
* Push notifications: Expo Notifications.
* Analytics (optional, Phase 13): PostHog.
* Payments (Phase 12, deferred): RevenueCat.
* Testing: Jest + React Native Testing Library; algorithm unit tests are mandatory.
* Lint/format: ESLint + Prettier.

## 3. Repository structure

```
/
├── app/                        # expo-router routes (screens)
│   ├── (auth)/                 # sign-in / sign-up / onboarding
│   ├── (tabs)/                 # home, search, drops, profile
│   ├── chain/[chainId].tsx     # chain menu screen
│   ├── item/[itemId].tsx       # item detail
│   ├── rate/[itemId].tsx       # rating flow
│   └── vote.tsx                # vote for next chain
├── src/
│   ├── features/               # feature modules (rating, recommendations, social, ...)
│   ├── components/             # shared UI components
│   ├── lib/
│   │   ├── db/                 # typed Supabase data layer
│   │   ├── scoring/            # PURE scoring/ranking functions (unit-tested)
│   │   ├── supabase.ts         # client init
│   │   └── config.ts
│   ├── hooks/
│   ├── stores/                 # zustand stores
│   └── types/                  # shared TS types (generated from DB + domain)
├── supabase/
│   ├── migrations/             # SQL migrations
│   ├── functions/              # edge functions
│   └── seed/                   # seed data scripts
├── app.config.ts
├── CLAUDE.md
└── SPEC.md
```

## 4. Data model (Postgres / Supabase)

Every table has `id uuid primary key default gen_random_uuid()` unless noted, plus `created_at timestamptz default now()`. Enable RLS on all tables (policies in Section 9).

### 4.1 profiles

Mirrors `auth.users`. `id uuid` references `auth.users(id)`.

* `username text unique not null`
* `display_name text`
* `avatar_url text`
* `is_private boolean default false`
* `streak_count int default 0`
* `last_active_date date`

### 4.2 chains

* `name text not null`
* `slug text unique not null`
* `logo_url text`
* `is_active boolean default true` -- currently live in the app (the "top 10")
* `display_order int`
* `launched_at timestamptz`

### 4.3 items (menu items)

* `chain_id uuid references chains(id) not null`
* `name text not null`
* `description text`
* `bucket text not null check (bucket in ('drinks','sweet','savory'))` -- classify by BASE FOOD, not flavor accents
* `image_url text`
* `attributes jsonb default '{}'` -- content-based rec features, e.g. {"spicy":0.8,"crispy":1,"protein":"chicken","portion":"medium","price_tier":2}
* `is_active boolean default true`
* `is_new boolean default false` -- drops flag
* `launched_at timestamptz`

### 4.4 tags (fine categories for filtering + leaderboards)

* `name text not null`
* `slug text unique not null` Examples: fries, burger, chicken-sandwich, nuggets, shake, dessert, breakfast.

### 4.5 item_tags (many-to-many)

* `item_id uuid references items(id)`
* `tag_id uuid references tags(id)`
* primary key (item_id, tag_id)

### 4.6 ratings (source of truth for a user's opinion)

* `user_id uuid references profiles(id) not null`
* `item_id uuid references items(id) not null`
* `band text not null check (band in ('loved','fine','disliked'))`
* `would_order_again boolean not null` -- default: band in ('loved','fine') = true, 'disliked' = false (tunable)
* `personal_score numeric(4,2) not null` -- 0.00–10.00, from interpolation (Section 5.1)
* `note text`
* `updated_at timestamptz default now()`
* unique (user_id, item_id) -- one rating per user per item; re-rating updates

### 4.7 comparisons (audit log of head-to-heads; also future-proofs ranking)

* `user_id uuid not null`
* `bucket text not null`
* `band text not null`
* `item_a uuid references items(id)`
* `item_b uuid references items(id)`
* `winner_item_id uuid` -- null = "too close to call"

### 4.8 item_scores (aggregated community numbers; recomputed by job)

* `item_id uuid references items(id) primary key`
* `num_ratings int default 0`
* `mean_score numeric(4,2)` -- raw mean of personal_score
* `weighted_score numeric(4,2)` -- Bayesian (Section 5.2)
* `worth_it_pct numeric(5,2)` -- % would_order_again
* `dist_loved int default 0`
* `dist_fine int default 0`
* `dist_disliked int default 0`
* `updated_at timestamptz default now()`

### 4.9 taste_profiles (content-based)

* `user_id uuid references profiles(id) primary key`
* `attribute_weights jsonb default '{}'` -- learned per-attribute preference vector
* `updated_at timestamptz default now()`

### 4.10 user_similarity (collaborative filtering; top-N neighbors)

* `user_a uuid references profiles(id)`
* `user_b uuid references profiles(id)`
* `similarity numeric(5,4)` -- -1..1
* `co_rated int` -- number of items both rated
* primary key (user_a, user_b)

### 4.11 predicted_scores (cache of "for you" predictions)

* `user_id uuid references profiles(id)`
* `item_id uuid references items(id)`
* `predicted_score numeric(4,2)`
* `source text check (source in ('content','collab','blend','community'))`
* `confidence numeric(4,3)`
* `updated_at timestamptz default now()`
* primary key (user_id, item_id)

### 4.12 want_to_try

* `user_id uuid references profiles(id)`
* `item_id uuid references items(id)`
* primary key (user_id, item_id)

### 4.13 follows

* `follower_id uuid references profiles(id)`
* `following_id uuid references profiles(id)`
* primary key (follower_id, following_id)

### 4.14 chain_candidates (for the "vote for the next chain")

* `name text not null`
* `logo_url text`
* `is_unlocked boolean default false`
* `vote_count int default 0` -- denormalized, kept in sync by trigger

### 4.15 chain_votes

* `user_id uuid references profiles(id)`
* `candidate_id uuid references chain_candidates(id)`
* primary key (user_id, candidate_id)

### 4.16 reports (moderation)

* `reporter_id uuid references profiles(id)`
* `target_type text check (target_type in ('rating','note','user','photo'))`
* `target_id uuid`
* `reason text`

### 4.17 notifications

* `user_id uuid references profiles(id)`
* `type text` -- 'drop', 'friend_rating', 'chain_unlocked', ...
* `payload jsonb`
* `read boolean default false`

### 4.18 push_tokens

* `user_id uuid references profiles(id)`
* `expo_push_token text`
* `platform text`
* primary key (user_id, expo_push_token)

## 5. Core algorithms (implement in `src/lib/scoring` as pure, unit-tested functions)

### 5.1 Rating capture & personal score

Bands map to score ranges:

* loved → [7.0, 10.0]
* fine → [4.0, 6.9]
* disliked → [0.0, 3.9]

Flow when a user rates `item` in bucket B:

```
submitRating(user, item, band):
  wouldOrderAgain = (band != 'disliked')          # tunable; default loved+fine = true
  peers = ratings by user WHERE bucket = B AND band = band, ordered best→worst
  if peers.length < 2:
      rank = insert at end
      personalScore = midpoint(bandRange)          # cold-start: no comparison
  else:
      rank = binaryInsertionRank(item, peers)      # 2..ceil(log2(peers.length+1)) comparisons
  insert item at rank; recomputeBandScores(user, B, band)
  save rating(user, item, band, wouldOrderAgain, personalScore)

binaryInsertionRank(item, peers):
  lo = 0; hi = peers.length
  while lo < hi:
     mid = floor((lo+hi)/2)
     result = askUserComparison(item, peers[mid])   # UI prompt, same bucket+band
     log comparison
     if result == 'new_item_better': hi = mid
     elif result == 'peer_better':   lo = mid + 1
     else: # too close → stop, insert adjacent to mid
         return mid
  return lo

recomputeBandScores(user, bucket, band):
  list = ranked items in (user,bucket,band), best first, length k
  [lo, hi] = bandRange(band)
  if k == 1: scores = [midpoint([lo,hi])]
  else: for i in 0..k-1: score[i] = hi - (i/(k-1))*(hi-lo)   # best→hi, worst→lo
  persist personal_score per item
```

Notes:

* Cap comparisons at 4 max even for large lists (stop early; approximate is fine).
* Re-rating an existing item removes it, then re-inserts.

### 5.2 Community score (recomputed by job in `item_scores`)

```
R = mean(personal_score) for item across all users
v = count(ratings) for item
C = global mean(personal_score) across ALL items          # recompute periodically
m = 10                                                     # min ratings before item's own mean is trusted (tunable)
weighted_score = (v/(v+m))*R + (m/(v+m))*C                 # Bayesian, resists brigading
worth_it_pct = 100 * count(would_order_again = true) / v
dist_* = counts of loved / fine / disliked
```

Display rules:

* If `v < 5`, show "score forming" instead of a number.
* Primary displayed community number = `worth_it_pct` ("Worth It %"); secondary = `weighted_score` (/10).

### 5.3 Content-based recommendation (works from day one, no community data needed)

```
buildTasteProfile(user):
  for each rated item: vec = attributesToVector(item.attributes, item.tags)
  weight each vec by (personal_score - 5)       # liked items pull positive, disliked negative
  attribute_weights = normalized weighted mean of vecs
  persist to taste_profiles

predictContent(user, item):
  sim = cosine(taste_profiles[user].attribute_weights, attributesToVector(item))
  return mapToScoreRange(sim)                    # → 0..10, clamp to item bucket sanity
```

### 5.4 Collaborative filtering (Phase 8; graduates from content-based)

```
computeSimilarity(userA, userB):
  common = items both rated
  if common.length < 3: return null
  return pearson(personal_scores over common)     # store top-N neighbors per user

predictCollab(user, item):
  neighbors = top-N users by similarity who rated item, similarity > threshold
  if neighbors empty: return null
  return weightedAvg(neighbor.personal_score, weight = neighbor.similarity)
```

### 5.5 Blended "For You" prediction (what the menu screen shows)

```
predictForYou(user, item):
  if user already rated item: return {score: rating.personal_score, source:'user'}
  collab = predictCollab(user,item)
  content = predictContent(user,item)
  community = item_scores[item].weighted_score
  # weights shift toward collab as data grows
  score = blend(collab, content, community, weights based on availability/confidence)
  confidence = f(#ratings by user, neighbors available, item num_ratings)
  if confidence < THRESHOLD: return {score: community, source:'community', lowConfidence:true}
  return {score, source, confidence}
```

Cold-profile rule: a brand-new user with too few ratings sees the community Worth It % as the lead number until confidence crosses the threshold. Never show a confident personalized number to a profile the app knows nothing about.

### 5.6 Anti-brigading / integrity

* Rating weight in aggregates scales with account age + #ratings, capped (new throwaway accounts count less).
* Rate limit: max N ratings per user per hour (start N=30).
* New-item cooling: while `is_new` AND `v < m`, show "forming"; optionally use a higher `m` for new items.
* One rating per (user,item), enforced by unique constraint.

### 5.7 Leaderboards

```
bestOf(tag, bucket?, minRatings=m):
  items WHERE tag AND (bucket?) AND num_ratings >= minRatings
  ORDER BY weighted_score DESC
```

Powers "best fries in fast food", "best chicken sandwich", etc. — cross-chain.

### 5.8 Vote-to-unlock

```
onVote(user, candidate):
  insert chain_votes (unique per user+candidate); increment candidate.vote_count
  if candidate.vote_count >= UNLOCK_THRESHOLD OR activeChainsDensityMilestoneMet():
      flag candidate for unlock (admin/auto): create chain, mark is_unlocked
Never remove/swap an active chain (would delete ratings).
```

## 6. Screens (every screen, with states)

For every screen implement: loading state, empty state, error state, and pull-to-refresh where a list is shown.

### 6.1 Auth

* Sign up / Sign in: email/password + Sign in with Apple + Google. Username selection (unique). Zod-validated.

### 6.2 Onboarding (first session — critical for retention)

1. Pick the chains you eat at (multi-select from active chains).
2. Rate 5–10 items you know, using the rating flow (Section 6.6). This seeds the taste profile.
3. End screen: show the user's first personalized recommendation ("Based on that, you'd probably love ___"). This is the payoff — do not skip it.

### 6.3 Home (tab)

Sections, top to bottom: personalized "For You" picks (from `predictForYou`), "Best of [chain]" shortcuts, Drops feed (new items), friends' recent ratings (if any). Mix of personalized and friends/deterministic content.

### 6.4 Chain menu screen (`chain/[chainId]`)

* Header: chain name, "top 10" indicator.
* Toggle: For you (default) | Best overall. Toggle changes both the sort and the lead number.
* Each item row: thumbnail, name, a small community context line (e.g. "94% would order again"), and a lead score:
  * If the user rated it → their own score with a check mark.
  * Else in "For you" mode → `predictForYou` score (color-coded green/amber/red by band).
  * Else in "Best overall" mode → community Worth It %.
  * If `num_ratings < 5` → "new / score forming" instead of a number.
* Default sort: For you = predicted score desc; Best overall = worth_it_pct desc.

### 6.5 Item detail (`item/[itemId]`)

* Lead: personalized predicted score (or user's own if rated), with band color + "predicted for you" label.
* Community block: Worth It %, weighted /10, and the loved/fine/disliked distribution bar.
* "People who rate like you gave it X" (from collaborative filtering; hide if unavailable).
* Photos, "Rate this" button, "Want to try" bookmark toggle.

### 6.6 Rating flow (`rate/[itemId]`)

1. Gut reaction: Loved it / It was fine / Didn't like it (sets band).
2. 2–4 head-to-head comparisons vs items in the SAME bucket AND band ("Which did you like more?"). Include a "Too close to call" option.
3. Optional: photo + note.
4. Save → show the resulting personal score and where it landed in their ranking. Cold-start: if fewer than 2 peers in that bucket+band, skip comparisons (Section 5.1).

### 6.7 Profile (tab)

* User's food log (all ratings), stats ("% of each menu tried"), streak, shareable tier list entry point, leaderboard rank. Follow/followers. Public vs private toggle.

### 6.8 Search

* Search items and chains; filter by bucket and tag.

### 6.9 Drops feed

* New items (`is_new`) across active chains, each with a forming/live verdict and a quick "rate it" CTA.

### 6.10 Vote for next chain (`vote`)

* List of `chain_candidates` with live vote counts; one vote per user per candidate; shows progress toward unlock threshold.

### 6.11 Leaderboards

* "Best [tag]" views (best fries, best chicken sandwich, best dessert), cross-chain, using Section 5.7.

### 6.12 Share tier list card

* Generates a shareable image (user's top items / tier list) for external sharing. Use `react-native-view-shot` or Expo equivalent.

### 6.13 Settings

* Account, sign-out, notification preferences, privacy (public/private), delete account (must delete all personal data).

## 7. Navigation map

* `(auth)` stack: sign-in, sign-up, onboarding.
* `(tabs)`: Home, Search, Drops, Profile.
* Pushed routes: chain menu, item detail, rating flow, vote, leaderboards, settings, share.

## 8. Backend jobs (Supabase Edge Functions + pg_cron)

* recompute_item_scores: recompute `item_scores` (Bayesian, worth-it %, distribution) — on a schedule (e.g. every few minutes) and/or via trigger on new ratings. Recompute global mean C periodically.
* recompute_taste_profiles: update a user's `taste_profiles` after they rate (trigger or queued).
* recompute_user_similarity: batch job (nightly) to update top-N neighbors in `user_similarity`.
* refresh_predictions: refresh `predicted_scores` cache for active users (scheduled + on demand).
* send_push: deliver notifications (drops, friend activity, chain unlocked) via Expo push.

## 9. Auth & security (Row-Level Security policies)

* profiles: readable per privacy setting; writable only by owner.
* ratings/comparisons/want_to_try/taste_profiles/predicted_scores: a user may read/write only their own rows; aggregate `item_scores` is world-readable.
* follows: owner-managed.
* chain_votes: insert only own; unique.
* items/chains/tags/item_tags/chain_candidates: world-readable; writable by service role only (seeding/admin).
* reports/notifications/push_tokens: owner-scoped. Enforce all sensitive writes server-side (Edge Functions) where integrity matters (score recompute, vote counting).

## 10. Notifications

* New drop at a chain the user rates often.
* A friend rated something / joined.
* A chain the user voted for got unlocked.
* Streak reminders (opt-in). All respect notification preferences.

## 11. Monetization (Phase 12 — deferred; build the hooks, not the store yet)

* Affiliate links to delivery apps on item detail (placeholder now, real links later).
* Premium tier via RevenueCat: advanced taste analytics, ad-free, early drops access. Gate premium features behind an entitlement check. Do NOT implement payment account setup — that's a human step (Section 15).

## 12. Non-functional requirements

1. Every list/screen has loading, empty, and error states.
2. Offline-tolerant reads via TanStack Query cache; queue a rating if submitted offline and sync on reconnect.
3. Accessibility: labeled controls, min 44px tap targets, screen-reader labels, sufficient contrast.
4. Performance: paginate long lists; memoize rows; avoid N+1 queries (use joins/RPC).
5. Error handling: user-friendly messages, no raw exceptions surfaced.
6. Design tokens (interim, until UI pass): warm off-white base `#FAF7F2`, warm charcoal dark base `#17150F`, brand accent flame coral `#FF5A36`; verdict colors — loved `#2FBF71`, fine `#F5A623`, disliked `#E4433B` (reserve these three for scores only). Never dark-filter food photos.

## 13. Seed data plan

Only the catalog is seeded — never ratings or scores.

* Manually seed the top ~10 active chains and their menus (name, bucket, tags, attributes, image_url). This is real menu data, the app's reference catalog — not fabricated content.
* Seed a set of `chain_candidates` for the vote screen.
* Provide a `supabase/seed/` script that loads a JSON menu file so menus are versioned and re-runnable.
* Bucket every item by base food; tag every item finely.
* Do NOT seed any ratings, users, community scores, or reviews. `item_scores` and all personal/predicted scores must start empty and populate only from real user ratings. Early real ratings are entered by the founder and first users through the normal rating flow in-app — that is real data, gathered early, not seeded fake data.
* Missing / new items: users do not free-create catalog items (that breaks standardization and leaderboards). Instead provide a lightweight "suggest an item" action that files a request for admin/service-role review; approved suggestions are added to the catalog. Keep the catalog curated.

## 14. Build phases (do IN ORDER; run + test after each)

1. Scaffold: Expo + TS + expo-router + Supabase client + ESLint/Prettier + Jest. App boots.
2. DB + auth: migrations for all tables (Section 4) + RLS (Section 9); email/Apple/Google auth; profile creation; seed 2–3 chains + menus.
3. Scoring lib: implement Section 5.1 + 5.2 as pure functions with full unit tests (Section 17). No UI yet.
4. Rating flow + item detail: Section 6.6 + 6.5; ratings persist; personal scores computed; comparisons logged.
5. Community scores: `recompute_item_scores` job + `item_scores`; item detail shows Worth It % / weighted score / distribution.
6. Chain menu screen: Section 6.4 with For You (content-based, Section 5.3/5.5) vs Best Overall toggle; per-item states.
7. Onboarding: Section 6.2, ending on the first real recommendation.
8. Profile + log + stats + leaderboards: Sections 6.7, 6.11, 5.7.
9. Drops feed: Section 6.9 + `is_new` handling + cooling rule.
10. Social + collaborative filtering: follows, friends feed, taste-similarity (Section 5.4), "people who rate like you".
11. Vote-to-unlock: Section 6.10 + 5.8.
12. Share tier list card + notifications: Sections 6.12, 10.
13. Monetization hooks (deferred): Section 11 — entitlement gating only.
14. Polish: all empty/error/loading states, accessibility, performance, analytics, broader tests.

## 15. Human setup checklist (ask the human; never guess these)

* Supabase project: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (service key server-side only).
* Local tooling: Node LTS, Expo CLI, EAS CLI installed by the human.
* Sign in with Apple / Google OAuth client credentials (when enabling social auth).
* Apple Developer account ($99/yr) and Google Play account ($25 one-time) — only when shipping to stores.
* RevenueCat account + API keys — only at Phase 12.
* Expo push credentials — at Phase 11.
* A `.env` file populated with the above (never committed).

## 16. Out of scope for v1 (do not build)

* DoorDash / Uber Eats order import / auto-rating. No consumer order-history API is available (DoorDash has none; Uber Eats' consumer API is partnership-gated). Rating is manual only.
* A production ML recommendation model. Use the content-based + collaborative heuristics in Section 5; a learned model is a later data-driven project.
* Automated app-store submission.
* Web app (mobile only for v1).

## 17. Testing requirements (mandatory)

Unit-test the pure scoring functions in `src/lib/scoring` — this is non-negotiable, it's the core:

* Band → range mapping and interpolation (`recomputeBandScores`): correct ordering, endpoints, k=1 midpoint case.
* `binaryInsertionRank`: correct insertion index for a sequence of comparison outcomes; comparison count is O(log n) and capped at 4.
* Cold-start: fewer than 2 peers → band midpoint, no comparisons requested.
* Bayesian `weighted_score`: pulls low-`v` items toward `C`; approaches `R` as `v` grows; brigade case (many sudden ratings) stays bounded.
* `worth_it_pct` and distribution counts.
* Content-based `predictContent` and blend fallback: cold profile falls back to community; confidence gating works.
* Cross-bucket guard: comparisons are NEVER generated across buckets or across bands. Add component tests for the rating flow and the chain menu score-display states (rated / predicted / forming).
