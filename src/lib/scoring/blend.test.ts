import { predictForYou, type BlendInputs } from './blend';

function inputs(overrides: Partial<BlendInputs>): BlendInputs {
  return {
    userScore: null,
    collabScore: null,
    neighborsUsed: 0,
    contentScore: null,
    communityScore: null,
    itemNumRatings: 0,
    userRatingsCount: 0,
    ...overrides,
  };
}

describe('predictForYou (SPEC 5.5, Section 17)', () => {
  it("returns the user's own score when already rated", () => {
    const p = predictForYou(inputs({ userScore: 8.2, communityScore: 5 }));
    expect(p).toEqual({ score: 8.2, source: 'user', confidence: 1, lowConfidence: false });
  });

  it('cold profile falls back to the community number with lowConfidence', () => {
    const p = predictForYou(
      inputs({ contentScore: 9.1, userRatingsCount: 1, communityScore: 6.4, itemNumRatings: 40 }),
    );
    expect(p).not.toBeNull();
    expect(p?.source).toBe('community');
    expect(p?.score).toBe(6.4);
    expect(p?.lowConfidence).toBe(true);
  });

  it('cold profile with no community data returns null → UI shows forming state', () => {
    expect(predictForYou(inputs({ contentScore: 9.1, userRatingsCount: 1 }))).toBeNull();
    expect(predictForYou(inputs({}))).toBeNull();
  });

  it('confidence crosses the threshold as the user rates more', () => {
    const cold = predictForYou(
      inputs({ contentScore: 8, userRatingsCount: 2, communityScore: 6, itemNumRatings: 20 }),
    );
    const warm = predictForYou(
      inputs({ contentScore: 8, userRatingsCount: 10, communityScore: 6, itemNumRatings: 20 }),
    );
    expect(cold?.lowConfidence).toBe(true);
    expect(cold?.source).toBe('community');
    expect(warm?.lowConfidence).toBe(false);
    expect(warm?.source).toBe('blend');
    expect(warm?.confidence).toBeGreaterThan(cold?.confidence as number);
  });

  it('personalized prediction leans toward content once warm', () => {
    const p = predictForYou(
      inputs({ contentScore: 9, userRatingsCount: 16, communityScore: 5, itemNumRatings: 10 }),
    );
    expect(p?.score).toBeGreaterThan(5);
    expect(p?.lowConfidence).toBe(false);
  });

  it('weights shift toward collab when neighbors exist', () => {
    const withCollab = predictForYou(
      inputs({
        collabScore: 9,
        neighborsUsed: 3,
        contentScore: 5,
        userRatingsCount: 8,
        communityScore: 5,
        itemNumRatings: 10,
      }),
    );
    const withoutCollab = predictForYou(
      inputs({ contentScore: 5, userRatingsCount: 8, communityScore: 5, itemNumRatings: 10 }),
    );
    expect(withCollab?.score as number).toBeGreaterThan(withoutCollab?.score as number);
  });

  it('single-source personalized predictions report their source', () => {
    const contentOnly = predictForYou(inputs({ contentScore: 7.5, userRatingsCount: 20 }));
    expect(contentOnly?.source).toBe('content');
    const collabOnly = predictForYou(inputs({ collabScore: 7.5, neighborsUsed: 3 }));
    expect(collabOnly?.source).toBe('collab');
  });

  it('keeps blended score within [0,10]', () => {
    const p = predictForYou(
      inputs({
        collabScore: 10,
        neighborsUsed: 5,
        contentScore: 10,
        userRatingsCount: 50,
        communityScore: 10,
        itemNumRatings: 100,
      }),
    );
    expect(p?.score as number).toBeLessThanOrEqual(10);
    expect(p?.score as number).toBeGreaterThanOrEqual(0);
  });
});
