import { pearsonSimilarity, predictCollab } from './collab';

describe('pearsonSimilarity (SPEC 5.4)', () => {
  it('requires at least 3 co-rated items', () => {
    expect(pearsonSimilarity([1, 2], [1, 2])).toBeNull();
    expect(pearsonSimilarity([], [])).toBeNull();
  });

  it('detects perfect agreement and perfect disagreement', () => {
    expect(pearsonSimilarity([1, 5, 9], [2, 6, 10])).toBeCloseTo(1);
    expect(pearsonSimilarity([1, 5, 9], [9, 5, 1])).toBeCloseTo(-1);
  });

  it('is null when either user has zero variance', () => {
    expect(pearsonSimilarity([5, 5, 5], [1, 2, 3])).toBeNull();
  });
});

describe('predictCollab (SPEC 5.4)', () => {
  it('returns null with no qualifying neighbors', () => {
    expect(predictCollab([])).toBeNull();
    expect(predictCollab([{ similarity: 0.1, personalScore: 9 }])).toBeNull(); // below threshold
  });

  it('weights neighbor scores by similarity', () => {
    const p = predictCollab([
      { similarity: 0.9, personalScore: 9 },
      { similarity: 0.3, personalScore: 3 },
    ]);
    // (0.9*9 + 0.3*3) / 1.2 = 7.5
    expect(p).toBeCloseTo(7.5, 2);
  });
});
