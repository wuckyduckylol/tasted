import { leadDisplay, predictForItems, sortValue } from './predict';
import type { Item, ItemScore, Prediction, Rating } from '../../types/domain';

function item(id: string): Item {
  return {
    id,
    chainId: 'c1',
    name: id,
    description: null,
    bucket: 'savory',
    imageUrl: null,
    attributes: { crispy: 0.8, protein: 'chicken' },
    isActive: true,
    isNew: false,
    tagSlugs: ['chicken'],
  };
}

function rating(itemId: string, personalScore: number): Rating {
  return {
    id: `r-${itemId}`,
    userId: 'u1',
    itemId,
    band: 'loved',
    wouldOrderAgain: true,
    personalScore,
    note: null,
    updatedAt: '2026-07-01T00:00:00Z',
  };
}

function itemScore(itemId: string, numRatings: number, worthItPct: number | null): ItemScore {
  return {
    itemId,
    numRatings,
    meanScore: 7,
    weightedScore: 6.5,
    worthItPct,
    distLoved: numRatings,
    distFine: 0,
    distDisliked: 0,
  };
}

describe('leadDisplay states (SPEC 6.4, Section 17 component states)', () => {
  const prediction: Prediction = { score: 8.1, source: 'content', confidence: 0.8, lowConfidence: false };
  const coldPrediction: Prediction = { score: 6.5, source: 'community', confidence: 0.1, lowConfidence: true };

  it('rated item always shows the own score, in both modes', () => {
    const r = rating('a', 9.2);
    expect(leadDisplay('forYou', r, prediction, itemScore('a', 20, 90))).toEqual({ kind: 'own', score: 9.2 });
    expect(leadDisplay('bestOverall', r, null, itemScore('a', 20, 90))).toEqual({ kind: 'own', score: 9.2 });
  });

  it('For You shows the personalized prediction when confident', () => {
    expect(leadDisplay('forYou', null, prediction, itemScore('a', 20, 90))).toEqual({
      kind: 'predicted',
      score: 8.1,
    });
  });

  it('For You falls back to community Worth It % for a cold profile', () => {
    expect(leadDisplay('forYou', null, coldPrediction, itemScore('a', 20, 90))).toEqual({
      kind: 'community',
      worthItPct: 90,
    });
  });

  it('under 5 ratings shows forming instead of a number (SPEC 5.2)', () => {
    expect(leadDisplay('bestOverall', null, null, itemScore('a', 4, 100))).toEqual({ kind: 'forming' });
    expect(leadDisplay('forYou', null, coldPrediction, itemScore('a', 4, 100))).toEqual({ kind: 'forming' });
    expect(leadDisplay('forYou', null, null, null)).toEqual({ kind: 'forming' });
  });

  it('Best Overall shows Worth It %', () => {
    expect(leadDisplay('bestOverall', null, null, itemScore('a', 12, 84))).toEqual({
      kind: 'community',
      worthItPct: 84,
    });
  });
});

describe('sortValue', () => {
  it('sinks forming rows and ranks scores descending-compatible', () => {
    expect(sortValue({ kind: 'forming' })).toBeLessThan(0);
    expect(sortValue({ kind: 'own', score: 9 })).toBe(9);
    expect(sortValue({ kind: 'community', worthItPct: 90 })).toBe(9);
  });
});

describe('predictForItems', () => {
  it('uses own rating as the prediction source for rated items', () => {
    const predictions = predictForItems({
      items: [item('a')],
      ratingsByItemId: new Map([['a', rating('a', 8.8)]]),
      profile: { 'attr:crispy': 0.5 },
      scores: new Map(),
      userRatingsCount: 10,
    });
    expect(predictions.get('a')).toEqual({ score: 8.8, source: 'user', confidence: 1, lowConfidence: false });
  });

  it('returns null (forming) for unrated items with no data at all', () => {
    const predictions = predictForItems({
      items: [item('b')],
      ratingsByItemId: new Map(),
      profile: {},
      scores: new Map(),
      userRatingsCount: 0,
    });
    expect(predictions.get('b')).toBeNull();
  });
});
