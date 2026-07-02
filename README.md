# Tasted

Mobile app that tells you the best thing to order at each major fast-food chain, powered by a
personal taste profile you build by rating individual menu items. Full product spec: [SPEC.md](./SPEC.md).

Stack: Expo (React Native) + TypeScript strict, expo-router, Supabase (Postgres/Auth/RLS/Edge
Functions), TanStack Query, Zustand, Zod, Jest.

## First-time setup

1. **Create a Supabase project** at supabase.com, then copy `.env.example` to `.env` and fill in:
   - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only; used by the seed script)
2. **Apply migrations** (in order) — either `supabase db push` with the linked CLI, or paste the
   files from `supabase/migrations/` into the SQL editor:
   - `20260701000001_init.sql` — all tables, RLS, triggers
   - `20260701000002_item_scores_job.sql` — community score job (+pg_cron schedule)
   - `20260701000003_social_collab.sql` — similarity batch + collab/friends RPCs
3. **Seed the catalog** (chains/items/tags/candidates only — never ratings):
   ```sh
   node supabase/seed/seed.mjs
   ```
4. **Run the app**:
   ```sh
   npm install --legacy-peer-deps
   npm start          # then i for iOS simulator, a for Android
   ```

## Development

- `npm run typecheck` — TS strict, no `any`
- `npm test` — Jest; the scoring algorithms in `src/lib/scoring` are fully unit-tested (SPEC §17)
- `npm run lint` / `npm run format`

## Architecture notes

- All DB access goes through `src/lib/db/*`; components never call Supabase directly.
- All scoring/ranking is pure functions in `src/lib/scoring` — see SPEC §5.
- Community aggregates (`item_scores`) are recomputed server-side (trigger + pg_cron + edge
  function); clients only read them.
- No fabricated data anywhere: empty/"score forming" states render until real ratings exist.

## Not configured yet (human steps — SPEC §15)

- Apple / Google OAuth credentials (email/password works today; social buttons explain themselves)
- Expo push credentials (token registration no-ops without them)
- RevenueCat (entitlement gate returns free tier for everyone)
