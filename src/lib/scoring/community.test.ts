import { bandDistribution, isScoreForming, weightedScore, worthItPct } from './community';

describe('Bayesian weighted_score (SPEC 5.2, Section 17)', () => {
  const C = 6.0; // global mean
  const m = 10;

  it('pulls low-volume items toward the global mean', () => {
    // One rave 10.0 rating: (1/11)*10 + (10/11)*6 = 6.36
    expect(weightedScore(10, 1, C, m)).toBeCloseTo(6.36, 2);
    // One hateful 0.0 rating stays near C too.
    expect(weightedScore(0, 1, C, m)).toBeCloseTo(5.45, 2);
  });

  it('approaches the item mean R as volume grows', () => {
    const R = 9.0;
    const few = weightedScore(R, 5, C, m);
    const some = weightedScore(R, 50, C, m);
    const many = weightedScore(R, 5000, C, m);
    expect(few).toBeLessThan(some);
    expect(some).toBeLessThan(many);
    expect(many).toBeCloseTo(R, 1);
    expect(Math.abs(weightedScore(R, 100000, C, m) - R)).toBeLessThan(0.01);
  });

  it('stays bounded under a brigade of sudden extreme ratings', () => {
    // 30 coordinated 0-score ratings on a new item: weighted stays well above 0.
    const brigaded = weightedScore(0, 30, C, m);
    expect(brigaded).toBeGreaterThanOrEqual((m / (30 + m)) * C - 0.01);
    expect(brigaded).toBeCloseTo(1.5, 2);
    // And always within [0,10].
    expect(brigaded).toBeGreaterThanOrEqual(0);
    expect(brigaded).toBeLessThanOrEqual(10);
  });

  it('returns the global mean when the item has no ratings', () => {
    expect(weightedScore(0, 0, C, m)).toBe(C);
  });
});

describe('worth_it_pct and distribution (SPEC 5.2)', () => {
  it('computes percent would-order-again', () => {
    expect(worthItPct(3, 4)).toBe(75);
    expect(worthItPct(0, 5)).toBe(0);
    expect(worthItPct(5, 5)).toBe(100);
    expect(worthItPct(1, 3)).toBeCloseTo(33.33, 2);
  });

  it('is null with zero ratings — no fabricated numbers', () => {
    expect(worthItPct(0, 0)).toBeNull();
  });

  it('counts band distribution', () => {
    expect(bandDistribution(['loved', 'loved', 'fine', 'disliked'])).toEqual({
      loved: 2,
      fine: 1,
      disliked: 1,
    });
    expect(bandDistribution([])).toEqual({ loved: 0, fine: 0, disliked: 0 });
  });
});

describe('score forming display rule (SPEC 5.2)', () => {
  it('shows forming below 5 ratings', () => {
    expect(isScoreForming(0)).toBe(true);
    expect(isScoreForming(4)).toBe(true);
    expect(isScoreForming(5)).toBe(false);
    expect(isScoreForming(6)).toBe(false);
  });
});
