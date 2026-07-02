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
