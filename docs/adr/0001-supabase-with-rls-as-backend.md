# ADR-0001: Supabase with Row-Level Security as the entire backend

Date: 2026-07-01 (recorded 2026-07-06) · Status: accepted

## Context
Solo-founder consumer app needing auth, relational data, storage, and
scheduled jobs without an ops team.

## Decision
Supabase (Postgres + GoTrue + Storage + Edge Functions). Authorization
lives in Postgres RLS policies, not app code. The client ships only the
publishable anon key; the service-role key never leaves server-side
scripts/jobs.

## Consequences
- One managed vendor: TLS, backups, token rotation are platform concerns.
- Security reviews concentrate on migrations (policies) instead of every
  screen — but every new table MUST land with policies in the same
  migration, and DDL on the live project requires a Management API token
  (dashboard SQL editor or `sbp_` token), which is a deliberate human gate.
