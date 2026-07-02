import { buildBandPlan } from './plan';
import type { ComparisonPeer } from '../../lib/scoring';

function peer(itemId: string, personalScore: number): ComparisonPeer {
  return { itemId, itemName: itemId, imageUrl: null, personalScore };
}

describe('buildBandPlan', () => {
  const peers = [peer('a', 9.0), peer('b', 8.0), peer('c', 7.5)]; // best-first

  it('inserts at the top and re-interpolates the whole band', () => {
    const plan = buildBandPlan(peers, 0, 'loved', 'new');
    expect(plan.rank).toBe(0);
    expect(plan.bandSize).toBe(4);
    expect(plan.ratedItemScore).toBe(10.0);
    expect(plan.scoresByItemId).toEqual({ new: 10.0, a: 9.0, b: 8.0, c: 7.0 });
  });

  it('inserts at the bottom', () => {
    const plan = buildBandPlan(peers, 3, 'loved', 'new');
    expect(plan.ratedItemScore).toBe(7.0);
    expect(plan.scoresByItemId.a).toBe(10.0);
  });

  it('cold start with no peers → band midpoint', () => {
    const plan = buildBandPlan([], 0, 'fine', 'new');
    expect(plan.ratedItemScore).toBe(5.45);
    expect(plan.bandSize).toBe(1);
  });

  it('clamps out-of-range insertion indexes', () => {
    expect(buildBandPlan(peers, 99, 'loved', 'new').rank).toBe(3);
    expect(buildBandPlan(peers, -1, 'loved', 'new').rank).toBe(0);
  });
});
