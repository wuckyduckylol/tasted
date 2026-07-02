import {
  bandForScore,
  bandRange,
  defaultWouldOrderAgain,
  interpolateBandScores,
  midpoint,
} from './bands';

describe('band ranges (SPEC 5.1)', () => {
  it('maps bands to their score ranges', () => {
    expect(bandRange('loved')).toEqual([7.0, 10.0]);
    expect(bandRange('fine')).toEqual([4.0, 6.9]);
    expect(bandRange('disliked')).toEqual([0.0, 3.9]);
  });

  it('computes midpoints', () => {
    expect(midpoint(bandRange('loved'))).toBe(8.5);
    expect(midpoint(bandRange('fine'))).toBe(5.45);
    expect(midpoint(bandRange('disliked'))).toBe(1.95);
  });

  it('defaults would-order-again to loved and fine only', () => {
    expect(defaultWouldOrderAgain('loved')).toBe(true);
    expect(defaultWouldOrderAgain('fine')).toBe(true);
    expect(defaultWouldOrderAgain('disliked')).toBe(false);
  });

  it('classifies scores back into bands at the boundaries', () => {
    expect(bandForScore(7.0)).toBe('loved');
    expect(bandForScore(6.9)).toBe('fine');
    expect(bandForScore(4.0)).toBe('fine');
    expect(bandForScore(3.9)).toBe('disliked');
  });
});

describe('interpolateBandScores (SPEC 5.1 recomputeBandScores)', () => {
  it('gives a single item the band midpoint', () => {
    expect(interpolateBandScores(1, 'loved')).toEqual([8.5]);
    expect(interpolateBandScores(1, 'disliked')).toEqual([1.95]);
  });

  it('hits both endpoints: best → hi, worst → lo', () => {
    const scores = interpolateBandScores(4, 'loved');
    expect(scores[0]).toBe(10.0);
    expect(scores[3]).toBe(7.0);
  });

  it('is strictly descending (best first)', () => {
    const scores = interpolateBandScores(7, 'fine');
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThan(scores[i - 1]);
    }
  });

  it('spaces evenly within the band', () => {
    expect(interpolateBandScores(2, 'loved')).toEqual([10.0, 7.0]);
    expect(interpolateBandScores(3, 'loved')).toEqual([10.0, 8.5, 7.0]);
  });

  it('stays inside the band range for any k', () => {
    for (const band of ['loved', 'fine', 'disliked'] as const) {
      const [lo, hi] = bandRange(band);
      for (const k of [1, 2, 5, 20, 100]) {
        for (const s of interpolateBandScores(k, band)) {
          expect(s).toBeGreaterThanOrEqual(lo);
          expect(s).toBeLessThanOrEqual(hi);
        }
      }
    }
  });

  it('returns empty for zero items', () => {
    expect(interpolateBandScores(0, 'fine')).toEqual([]);
  });
});
