import { advanceInsertion, expectedMaxComparisons, startInsertion, type InsertionState } from './insertion';
import type { ComparisonOutcome } from '../../types/domain';

function run(peerCount: number, outcomes: ComparisonOutcome[]): InsertionState {
  let state = startInsertion(peerCount);
  for (const outcome of outcomes) {
    state = advanceInsertion(state, outcome);
  }
  return state;
}

describe('startInsertion cold start (SPEC 5.1)', () => {
  it('skips comparisons entirely with 0 peers', () => {
    const state = startInsertion(0);
    expect(state.nextPeerIndex).toBeNull();
    expect(state.insertionIndex).toBe(0);
    expect(state.comparisonsMade).toBe(0);
  });

  it('skips comparisons entirely with 1 peer and inserts at end', () => {
    const state = startInsertion(1);
    expect(state.nextPeerIndex).toBeNull();
    expect(state.insertionIndex).toBe(1);
    expect(state.comparisonsMade).toBe(0);
  });

  it('asks for a comparison with 2+ peers', () => {
    expect(startInsertion(2).nextPeerIndex).toBe(1);
    expect(startInsertion(2).insertionIndex).toBeNull();
  });
});

describe('binary insertion index (SPEC 5.1 binaryInsertionRank)', () => {
  it('new item beats everything → index 0', () => {
    // peers: 4 (best-first). mids: 2 → 1 → 0
    const state = run(4, ['new_item_better', 'new_item_better', 'new_item_better']);
    expect(state.insertionIndex).toBe(0);
  });

  it('new item loses to everything → index = peerCount', () => {
    // peers: 4. mids: 2 → 3
    const state = run(4, ['peer_better', 'peer_better']);
    expect(state.insertionIndex).toBe(4);
  });

  it('lands in the middle correctly', () => {
    // peers: 4, want slot 2 (worse than peers 0,1; better than 2,3).
    // mid=2: new better → hi=2. mid=1: peer better → lo=2 → done at 2.
    const state = run(4, ['new_item_better', 'peer_better']);
    expect(state.insertionIndex).toBe(2);
  });

  it('too close to call stops immediately and inserts adjacent to that peer', () => {
    const first = advanceInsertion(startInsertion(8), 'too_close');
    expect(first.insertionIndex).toBe(4); // mid of [0,8)
    expect(first.comparisonsMade).toBe(1);

    // After narrowing once, too_close inserts at the new mid.
    let state = startInsertion(8);
    state = advanceInsertion(state, 'peer_better'); // lo=5, hi=8, mid=6
    state = advanceInsertion(state, 'too_close');
    expect(state.insertionIndex).toBe(6);
  });

  it('ignores outcomes after completion', () => {
    let state = run(2, ['new_item_better', 'new_item_better']);
    expect(state.insertionIndex).toBe(0);
    const frozen = advanceInsertion(state, 'peer_better');
    expect(frozen).toEqual(state);
  });
});

describe('comparison count is O(log n) and capped at 4 (SPEC 5.1 note, Section 17)', () => {
  it('needs at most ceil(log2(n+1)) comparisons below the cap', () => {
    expect(expectedMaxComparisons(2)).toBe(2);
    expect(expectedMaxComparisons(3)).toBe(2);
    expect(expectedMaxComparisons(7)).toBe(3);
    expect(expectedMaxComparisons(15)).toBe(4);
  });

  it('never exceeds 4 comparisons even for very large lists', () => {
    for (const n of [16, 50, 1000]) {
      for (const outcome of ['peer_better', 'new_item_better'] as const) {
        let state = startInsertion(n);
        let steps = 0;
        while (state.insertionIndex === null) {
          state = advanceInsertion(state, outcome);
          steps += 1;
          expect(steps).toBeLessThanOrEqual(4);
        }
        expect(state.comparisonsMade).toBeLessThanOrEqual(4);
        expect(state.insertionIndex).toBeGreaterThanOrEqual(0);
        expect(state.insertionIndex).toBeLessThanOrEqual(n);
      }
    }
  });

  it('worst case for 15 peers finishes in exactly 4 without capping artifacts', () => {
    let state = startInsertion(15);
    while (state.insertionIndex === null) {
      state = advanceInsertion(state, 'peer_better');
    }
    expect(state.comparisonsMade).toBe(4);
    expect(state.insertionIndex).toBe(15);
  });
});
