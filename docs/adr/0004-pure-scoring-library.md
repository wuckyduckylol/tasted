# ADR-0004: All ranking/scoring math is a pure, coverage-gated library

Date: 2026-07-01 (recorded 2026-07-06) · Status: accepted

## Context
Scores are the product. Bugs here are silent and corrosive; UI churn must
never risk the math.

## Decision
src/lib/scoring holds only deterministic pure functions. No I/O, no
supabase imports, no Date.now/random. CI enforces ≥95% statement/line
coverage on this directory (jest coverageThreshold).

## Consequences
- The scoring lib is testable to near-total coverage cheaply.
- Server jobs (Edge Functions) re-implement formulas in SQL/TS — any
  formula change must update both and extend tests (SPEC §17 list).
