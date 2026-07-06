# Tasted — Security & Reliability Posture

Status legend: ✅ in place · ☁️ platform-managed (Supabase/Expo/EAS) · 🟡 partial — gap noted · 📋 planned pre-launch · ➖ not applicable at this stage (reason given)

Last reviewed: 2026-07-06. Re-review before public launch.

## Application security

| Control | Status | Detail |
|---|---|---|
| Input sanitization & injection prevention | ✅ | All external input parsed with Zod before use (`src/features/*/validation.ts`). DB access goes exclusively through supabase-js (parameterized PostgREST — no string-built SQL anywhere in the app). User-supplied `%` stripped from `ilike` search patterns. |
| Authentication | ✅ / 🟡 | Email OTP + password via Supabase Auth (bcrypt at rest, ☁️). Phone OTP wired, parked until Twilio creds. Gap: Apple/Google OAuth pending creds (SPEC §15) — required by App Store if any social login ships. |
| Authorization, roles, permissions | ✅ ☁️ | Postgres Row-Level Security on every table (migration `20260701000001` §RLS): owner-only writes, public-read only where intended (catalog, item_scores, public profiles). Service-role key is server/seed-side only — never shipped in the app bundle. There are no admin roles in-app by design; catalog writes are service-role only. |
| Session management & token expiry | ☁️ | Supabase JWT access tokens (1h) + rotating refresh tokens, auto-refreshed by supabase-js; stored via AsyncStorage today. 🟡 Pre-launch: move token storage to `expo-secure-store` (Keychain/Keystore). |
| Secrets management | ✅ | `.env` gitignored; only `EXPO_PUBLIC_*` (publishable) values reach the client; service-role key used only by `supabase/seed/seed.mjs`. 📋 On GitHub: enable secret scanning + push protection. |
| HTTPS / TLS / cert rotation | ☁️ | All traffic to `*.supabase.co` over TLS 1.2+; certs managed and rotated by Supabase. No custom endpoints exist. |
| Rate limiting & abuse prevention | 🟡 | Supabase Auth rate limits active (email 30/hr with custom SMTP, per-user 60s interval — matches in-app resend cooldown). Bayesian weighted scores blunt rating brigades (SPEC 5.2, tested). Gap 📋: per-user write quotas (ratings/votes per day) as Postgres policies or Edge Function checks. |
| Dependency scanning & patching | ✅ | CI runs `npm audit --audit-level=high` (`.github/workflows/ci.yml`); Dependabot weekly (`.github/dependabot.yml`) once the repo is on GitHub. Current: 16 moderate advisories, all transitive via Expo SDK toolchain — resolved by SDK upgrades, not forced resolutions. |
| Multi-tenancy & data isolation | ➖ / ✅ | Single-tenant consumer app; per-user isolation IS the tenancy model and is enforced by RLS (own-rows-only policies on ratings, favorites, taste profiles, push tokens, votes). |

## Data & compliance

| Control | Status | Detail |
|---|---|---|
| PII handling | 🟡 | PII collected: email, phone (later), name, username, avatar. Minimization is decent (no address, no payment data — RevenueCat will hold that). Gaps 📋: privacy policy (required for App Store), in-app account **deletion** (Apple guideline 5.1.1(v) — SPEC §6.13, Phase 14) which must cascade profile + storage objects (FK cascades already in place). |
| Data retention & deletion | 📋 | Proposed defaults (need owner sign-off): account data deleted on account deletion (cascade); push tokens pruned on sign-out; no analytics yet so no event retention question. Document in privacy policy. |
| GDPR | 📋 | Applies if EU users are served. Needs: privacy policy, deletion (above), export-on-request (Supabase dashboard can serve early volume manually). Realistic for v1 launch scope. |
| HIPAA | ➖ | No health data is collected or implied. Not applicable. |
| Audit trails & tamper-evident logging | 🟡 ☁️ | Supabase retains Postgres + Auth logs (immutable to the app; retention per plan tier). App writes no PII to console in production paths (`console.warn` in auth maps errors, logs no credentials). ➖ for v1: app-level tamper-evident audit tables — no admin mutations exist to audit; revisit when moderation tooling lands. |

## Testing & quality

| Control | Status | Detail |
|---|---|---|
| Unit tests | ✅ | 76 tests / 11 suites; scoring library at 100% line coverage (SPEC §17 mandates this — it's the product core). |
| Coverage threshold in CI | ✅ | Jest `coverageThreshold` ≥95% statements/lines on `src/lib/scoring`, enforced in CI. Deliberately scoped to pure logic where coverage is meaningful, not padded across UI. |
| Integration / E2E tests | 📋 | Recommended: Maestro flows (onboarding happy path, rate-an-item) once auth test users exist. Blocked on: a dedicated test account + Twilio test creds or email OTP test hook. |
| Regression tests | ✅ (process) | Every bug fixed lands with a test when it's in pure logic (see topChains tests). UI regressions covered by the E2E plan above. |
| Load & stress testing | ➖ | Premature pre-launch: Supabase free tier limits are the ceiling, and there is no traffic model yet. Revisit at ~1k DAU with k6 against PostgREST + the scores job. |
| Chaos engineering | ➖ | Single managed backend; no service mesh to break. The meaningful equivalent — offline tolerance — is real work: 📋 offline rating queue (SPEC §12.2, Phase 14). |
| Code review process | 🟡 | Solo founder + agent today; conventional commits, small reviewable diffs. 📋 On GitHub: PR flow with CI required-checks on `main`. |

## Resilience & operations

| Control | Status | Detail |
|---|---|---|
| Error handling & graceful degradation | ✅ | Every screen has loading/empty/error states with retry (SPEC §12.1); auth errors mapped to human copy, raw cause console-logged (SPEC §12.5); push registration no-ops silently when unconfigured. |
| Retry with backoff & idempotency | ✅ / 🟡 | TanStack Query retries reads (retry: 1) with backoff; mutations are idempotent upserts (ratings upsert per user+item, follows upsert, push-token upsert, favorites replace-set). Gap: offline mutation queue (Phase 14). |
| Circuit breakers & fallbacks | ➖ / ✅ | One upstream (Supabase) — a client-side breaker adds state without adding safety; TanStack Query's cache already serves stale reads for a day (`gcTime: 24h`) when the network fails, which is the useful fallback. |
| Concurrency & race prevention | ✅ | DB-level uniqueness backstops all racy paths: usernames (unique + trigger retry), favorites `unique(user_id, rank)`, ratings PK, comparison inserts. OTP verify guards double-submit (`submitted` ref). Community scores recomputed by a single server-side job, not clients. |
| Caching strategy & invalidation | ✅ | TanStack Query: `staleTime` 60s, `gcTime` 24h (offline reads), targeted `queryKey` invalidation after mutations. CDN caching only for public storage; avatar URLs cache-busted on re-upload (`?v=timestamp`). |
| RTO / RPO, disaster recovery | ☁️ 🟡 | Supabase daily backups → RPO ≤24h, RTO = restore time (Pro plan gets PITR: RPO ~2min). Code + migrations + seed catalog are all in git — full environment is reproducible (`supabase/migrations` + `seed.mjs`). 📋 Owner: decide if Pro-plan PITR is worth it at launch; document restore runbook in README. |
| Accessibility | ✅ / 🟡 | Labels/roles on all controls, ≥44pt targets, WCAG-checked palette, inline `role=alert` errors, progressbar semantics, and (new) OS reduce-motion honored in animated components. 📋 remaining: Dynamic Type audit at max sizes, VoiceOver pass on device. |
| Architecture docs & ADRs | ✅ | `docs/ARCHITECTURE.md` + `docs/adr/` (started 2026-07-06). |

## Owner action list (in priority order)

1. **Create the GitHub repo & push** — activates CI, Dependabot, secret scanning, PR review flow. (Everything is committed and ready.)
2. **Apply migration `20260705000004`** — avatars bucket + favorites table (SQL Editor paste, or hand the agent an `sbp_` token). Currently blocks avatar upload + top-3 save.
3. **Privacy policy + support email** — required for App Store submission; drives the retention wording above.
4. Decide **Supabase Pro (PITR backups)** at launch.
5. Later: Twilio (phone auth), Apple/Google OAuth creds, RevenueCat (all SPEC §15).
