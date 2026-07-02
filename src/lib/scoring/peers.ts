import type { Band, Bucket, Item, Rating } from '../../types/domain';

export interface ComparisonPeer {
  itemId: string;
  itemName: string;
  imageUrl: string | null;
  personalScore: number;
}

/**
 * The ONLY sanctioned way to build a comparison peer list. Enforces the
 * hard rule from SPEC 1.3 / 17: comparisons never cross buckets or bands.
 * Returns peers best-first. The item being (re)rated is always excluded so
 * re-rating removes-then-reinserts (SPEC 5.1).
 */
export function selectComparisonPeers(
  ratings: Rating[],
  itemsById: Map<string, Item>,
  bucket: Bucket,
  band: Band,
  ratedItemId: string,
): ComparisonPeer[] {
  return ratings
    .filter((r) => {
      if (r.itemId === ratedItemId) return false;
      if (r.band !== band) return false;
      const item = itemsById.get(r.itemId);
      return item !== undefined && item.bucket === bucket;
    })
    .sort((a, b) => b.personalScore - a.personalScore)
    .map((r) => {
      const item = itemsById.get(r.itemId);
      return {
        itemId: r.itemId,
        itemName: item?.name ?? '',
        imageUrl: item?.imageUrl ?? null,
        personalScore: r.personalScore,
      };
    });
}
