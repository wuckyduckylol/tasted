import { selectComparisonPeers } from './peers';
import type { Item, Rating } from '../../types/domain';

function makeItem(id: string, bucket: Item['bucket']): Item {
  return {
    id,
    chainId: 'chain-1',
    name: `Item ${id}`,
    description: null,
    bucket,
    imageUrl: null,
    attributes: {},
    isActive: true,
    isNew: false,
    tagSlugs: [],
  };
}

function makeRating(itemId: string, band: Rating['band'], personalScore: number): Rating {
  return {
    id: `r-${itemId}`,
    userId: 'user-1',
    itemId,
    band,
    wouldOrderAgain: band !== 'disliked',
    personalScore,
    note: null,
    updatedAt: '2026-07-01T00:00:00Z',
  };
}

describe('selectComparisonPeers cross-bucket/band guard (SPEC 1.3, Section 17)', () => {
  const items = new Map<string, Item>([
    ['savory-loved-1', makeItem('savory-loved-1', 'savory')],
    ['savory-loved-2', makeItem('savory-loved-2', 'savory')],
    ['savory-fine', makeItem('savory-fine', 'savory')],
    ['sweet-loved', makeItem('sweet-loved', 'sweet')],
    ['drinks-loved', makeItem('drinks-loved', 'drinks')],
  ]);
  const ratings = [
    makeRating('savory-loved-1', 'loved', 8.0),
    makeRating('savory-loved-2', 'loved', 9.5),
    makeRating('savory-fine', 'fine', 5.0),
    makeRating('sweet-loved', 'loved', 9.0),
    makeRating('drinks-loved', 'loved', 8.8),
  ];

  it('NEVER returns peers from another bucket or band', () => {
    const peers = selectComparisonPeers(ratings, items, 'savory', 'loved', 'new-item');
    expect(peers.map((p) => p.itemId).sort()).toEqual(['savory-loved-1', 'savory-loved-2']);
    for (const peer of peers) {
      expect(items.get(peer.itemId)?.bucket).toBe('savory');
      expect(ratings.find((r) => r.itemId === peer.itemId)?.band).toBe('loved');
    }
  });

  it('returns peers best-first', () => {
    const peers = selectComparisonPeers(ratings, items, 'savory', 'loved', 'new-item');
    expect(peers[0].itemId).toBe('savory-loved-2');
    expect(peers[0].personalScore).toBeGreaterThan(peers[1].personalScore);
  });

  it('excludes the item being re-rated (remove-then-reinsert, SPEC 5.1)', () => {
    const peers = selectComparisonPeers(ratings, items, 'savory', 'loved', 'savory-loved-1');
    expect(peers.map((p) => p.itemId)).toEqual(['savory-loved-2']);
  });

  it('returns empty when nothing matches both bucket and band', () => {
    expect(selectComparisonPeers(ratings, items, 'sweet', 'disliked', 'x')).toEqual([]);
    expect(selectComparisonPeers(ratings, items, 'drinks', 'fine', 'x')).toEqual([]);
  });
});
