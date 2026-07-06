import { chainStatsFromItemScores, rankTopChains } from './topChains';

describe('chainStatsFromItemScores', () => {
  it('aggregates a rating-count-weighted mean per chain', () => {
    const stats = chainStatsFromItemScores([
      { chainId: 'a', weightedScore: 8, ratingCount: 10 },
      { chainId: 'a', weightedScore: 6, ratingCount: 30 },
      { chainId: 'b', weightedScore: 9, ratingCount: 5 },
    ]);
    const a = stats.find((s) => s.chainId === 'a');
    expect(a).toEqual({ chainId: 'a', ratingCount: 40, meanScore: 6.5 });
    const b = stats.find((s) => s.chainId === 'b');
    expect(b).toEqual({ chainId: 'b', ratingCount: 5, meanScore: 9 });
  });

  it('ignores unscored and zero-count items', () => {
    const stats = chainStatsFromItemScores([
      { chainId: 'a', weightedScore: null, ratingCount: 10 },
      { chainId: 'a', weightedScore: 7, ratingCount: 0 },
    ]);
    expect(stats).toEqual([]);
  });
});

describe('rankTopChains', () => {
  const chainIds = ['a', 'b', 'c', 'd', 'e'];

  it('puts favorites first, in pick order, regardless of community score', () => {
    const ranked = rankTopChains({
      chainIds,
      stats: [{ chainId: 'a', ratingCount: 500, meanScore: 9.8 }],
      favoriteChainIds: ['e', 'c'],
    });
    expect(ranked.slice(0, 2)).toEqual(['e', 'c']);
    expect(ranked[2]).toBe('a'); // best non-favorite next
  });

  it('pulls low-volume chains toward the global mean (no one-rating wonders)', () => {
    const ranked = rankTopChains({
      chainIds: ['solid', 'wonder', 'meh'],
      stats: [
        { chainId: 'solid', ratingCount: 200, meanScore: 8.0 },
        { chainId: 'wonder', ratingCount: 1, meanScore: 10 }, // single hype rating
        { chainId: 'meh', ratingCount: 200, meanScore: 4.0 },
      ],
      favoriteChainIds: [],
    });
    expect(ranked[0]).toBe('solid');
    expect(ranked[1]).toBe('wonder'); // still above the genuinely mid chain…
    expect(ranked[2]).toBe('meh');
  });

  it('trusts the chain mean as volume grows', () => {
    const few = rankTopChains({
      chainIds: ['est', 'newbie', 'mid'],
      stats: [
        { chainId: 'est', ratingCount: 500, meanScore: 8.0 },
        { chainId: 'newbie', ratingCount: 2, meanScore: 9.9 }, // two hype ratings
        { chainId: 'mid', ratingCount: 500, meanScore: 5.0 },
      ],
      favoriteChainIds: [],
    });
    // Two 9.9s don't beat an established 8.0 with 500 ratings…
    expect(few).toEqual(['est', 'newbie', 'mid']);

    const many = rankTopChains({
      chainIds: ['est', 'newbie', 'mid'],
      stats: [
        { chainId: 'est', ratingCount: 500, meanScore: 8.0 },
        { chainId: 'newbie', ratingCount: 5000, meanScore: 9.9 }, // …but 5000 do.
        { chainId: 'mid', ratingCount: 500, meanScore: 5.0 },
      ],
      favoriteChainIds: [],
    });
    expect(many[0]).toBe('newbie');
  });

  it('falls back to favorites-then-catalog-order when nothing is rated yet', () => {
    const ranked = rankTopChains({ chainIds, stats: [], favoriteChainIds: ['d'] });
    expect(ranked).toEqual(['d', 'a', 'b', 'c', 'e']);
  });

  it('respects the limit', () => {
    const ids = Array.from({ length: 30 }, (_, i) => `chain-${i}`);
    expect(rankTopChains({ chainIds: ids, stats: [], favoriteChainIds: [] })).toHaveLength(10);
    expect(
      rankTopChains({ chainIds: ids, stats: [], favoriteChainIds: [], limit: 3 }),
    ).toHaveLength(3);
  });
});
