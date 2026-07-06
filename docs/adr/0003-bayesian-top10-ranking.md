# ADR-0003: Top-10 restaurant list = Bayesian weighted rating + pick affinity

Date: 2026-07-05 · Status: accepted

## Context
Onboarding shows "top 10 restaurants we think you'd like" before the user
has rated anything (cold start). Community rating volume is initially tiny
and brigade-able.

## Decision
Chain score = IMDb-style Bayesian weighted rating (same formula as item
scores, SPEC 5.2) over rating-count-weighted item means; the user's
declared top-3 chains are boosted above all others in pick order.
Pure function `rankTopChains` in src/lib/scoring/topChains.ts.

## Consequences
- Low-volume chains regress to the global mean — no one-rating wonders.
- Deterministic and unit-tested; the DB layer only fetches rows.
- When personal taste vectors mature, blend content-based chain affinity
  into the boost term rather than replacing the frame.
