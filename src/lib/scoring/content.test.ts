import { attributesToVector, buildTasteProfile, cosineSimilarity, predictContent } from './content';

const crispyChicken = { crispy: 0.9, spicy: 0.1, protein: 'chicken', temp: 'hot' };
const anotherCrispyChicken = { crispy: 0.8, spicy: 0.2, protein: 'chicken', temp: 'hot' };
const sweetShake = { crispy: 0, sweet: 0.9, protein: 'none', temp: 'cold' };

describe('attributesToVector (SPEC 5.3)', () => {
  it('passes numeric attributes, one-hots strings and tags, converts booleans', () => {
    expect(attributesToVector({ crispy: 0.8, protein: 'chicken', carbonated: true }, ['fries'])).toEqual({
      'attr:crispy': 0.8,
      'attr:protein=chicken': 1,
      'attr:carbonated': 1,
      'tag:fries': 1,
    });
  });

  it('ignores empty strings', () => {
    expect(attributesToVector({ protein: '' }, [])).toEqual({});
  });
});

describe('buildTasteProfile (SPEC 5.3)', () => {
  it('is empty with no history', () => {
    expect(buildTasteProfile([])).toEqual({});
  });

  it('is empty when every rating is exactly neutral (score 5)', () => {
    expect(
      buildTasteProfile([{ vector: attributesToVector(crispyChicken, []), personalScore: 5 }]),
    ).toEqual({});
  });

  it('pulls liked features positive and disliked features negative', () => {
    const profile = buildTasteProfile([
      { vector: attributesToVector(crispyChicken, ['chicken']), personalScore: 9 },
      { vector: attributesToVector(sweetShake, ['shake']), personalScore: 1 },
    ]);
    expect(profile['attr:crispy']).toBeGreaterThan(0);
    expect(profile['attr:protein=chicken']).toBeGreaterThan(0);
    expect(profile['attr:sweet']).toBeLessThan(0);
    expect(profile['attr:temp=cold']).toBeLessThan(0);
  });
});

describe('predictContent (SPEC 5.3 / 5.5 cold rule)', () => {
  it('returns null for a cold (empty) profile — never a fake personalized score', () => {
    expect(predictContent({}, crispyChicken, [])).toBeNull();
  });

  it('scores similar items above dissimilar ones', () => {
    const profile = buildTasteProfile([
      { vector: attributesToVector(crispyChicken, ['chicken']), personalScore: 9.5 },
    ]);
    const similar = predictContent(profile, anotherCrispyChicken, ['chicken']);
    const dissimilar = predictContent(profile, sweetShake, ['shake']);
    expect(similar).not.toBeNull();
    expect(dissimilar).not.toBeNull();
    expect(similar as number).toBeGreaterThan(dissimilar as number);
  });

  it('clamps output to [0,10]', () => {
    const profile = buildTasteProfile([
      { vector: attributesToVector(crispyChicken, []), personalScore: 10 },
    ]);
    const score = predictContent(profile, crispyChicken, []);
    expect(score as number).toBeGreaterThanOrEqual(0);
    expect(score as number).toBeLessThanOrEqual(10);
  });
});

describe('cosineSimilarity', () => {
  it('is 1 for identical vectors, 0 for orthogonal or empty', () => {
    expect(cosineSimilarity({ a: 1, b: 2 }, { a: 1, b: 2 })).toBeCloseTo(1);
    expect(cosineSimilarity({ a: 1 }, { b: 1 })).toBe(0);
    expect(cosineSimilarity({}, { a: 1 })).toBe(0);
  });

  it('is -1 for opposite vectors', () => {
    expect(cosineSimilarity({ a: 1 }, { a: -1 })).toBeCloseTo(-1);
  });
});
