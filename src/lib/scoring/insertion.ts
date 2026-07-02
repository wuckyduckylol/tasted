import type { ComparisonOutcome } from '../../types/domain';

/**
 * Binary insertion into a ranked band list as a pure state machine
 * (SPEC 5.1 binaryInsertionRank). The UI drives it: while `nextPeerIndex`
 * is non-null, ask the user to compare against that peer (best-first list),
 * then call `advanceInsertion` with the outcome.
 */
export interface InsertionState {
  readonly peerCount: number;
  readonly maxComparisons: number;
  readonly lo: number;
  readonly hi: number;
  readonly comparisonsMade: number;
  /** Index into the peers list to compare against next; null when done. */
  readonly nextPeerIndex: number | null;
  /** Final insertion index (0 = best); null until done. */
  readonly insertionIndex: number | null;
}

export function startInsertion(peerCount: number, maxComparisons = 4): InsertionState {
  // Cold start (SPEC 5.1): fewer than 2 peers → no comparisons, insert at end.
  if (peerCount < 2) {
    return {
      peerCount,
      maxComparisons,
      lo: peerCount,
      hi: peerCount,
      comparisonsMade: 0,
      nextPeerIndex: null,
      insertionIndex: peerCount,
    };
  }
  return {
    peerCount,
    maxComparisons,
    lo: 0,
    hi: peerCount,
    comparisonsMade: 0,
    nextPeerIndex: Math.floor(peerCount / 2),
    insertionIndex: null,
  };
}

export function advanceInsertion(state: InsertionState, outcome: ComparisonOutcome): InsertionState {
  if (state.insertionIndex !== null || state.nextPeerIndex === null) {
    return state; // already done; ignore
  }
  const mid = state.nextPeerIndex;
  const comparisonsMade = state.comparisonsMade + 1;

  if (outcome === 'too_close') {
    // Too close to call → stop, insert adjacent to the compared peer.
    return finish(state, comparisonsMade, mid);
  }

  const lo = outcome === 'peer_better' ? mid + 1 : state.lo;
  const hi = outcome === 'new_item_better' ? mid : state.hi;

  if (lo >= hi) {
    return finish({ ...state, lo, hi }, comparisonsMade, lo);
  }
  if (comparisonsMade >= state.maxComparisons) {
    // Cap reached (SPEC 5.1 note): stop early, approximate with the window middle.
    return finish({ ...state, lo, hi }, comparisonsMade, Math.floor((lo + hi) / 2));
  }
  return {
    ...state,
    lo,
    hi,
    comparisonsMade,
    nextPeerIndex: Math.floor((lo + hi) / 2),
    insertionIndex: null,
  };
}

function finish(state: InsertionState, comparisonsMade: number, index: number): InsertionState {
  return {
    ...state,
    comparisonsMade,
    nextPeerIndex: null,
    insertionIndex: index,
  };
}

/** Max comparisons binary insertion needs for a list of n peers, before the hard cap. */
export function expectedMaxComparisons(peerCount: number, cap = 4): number {
  if (peerCount < 2) return 0;
  return Math.min(Math.ceil(Math.log2(peerCount + 1)), cap);
}
