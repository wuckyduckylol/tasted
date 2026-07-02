import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { predictForItems } from './predict';
import { useSession } from '../../hooks/useSession';
import { listMyRatingsWithItems } from '../../lib/db/ratings';
import { getItemScores } from '../../lib/db/scores';
import { getTasteProfile } from '../../lib/db/tasteProfiles';
import type { Item, ItemScore, Prediction, Rating } from '../../types/domain';

export interface ForYouData {
  predictions: Map<string, Prediction | null>;
  ratingsByItemId: Map<string, Rating>;
  scores: Map<string, ItemScore>;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/** Everything a menu needs to render lead numbers for a set of items. */
export function useForYouData(items: Item[] | undefined): ForYouData {
  const { session } = useSession();
  const userId = session?.user.id;
  const itemIds = useMemo(() => (items ?? []).map((i) => i.id), [items]);

  const ratingsQuery = useQuery({
    queryKey: ['myRatingsWithItems', userId],
    queryFn: () => listMyRatingsWithItems(userId as string),
    enabled: Boolean(userId),
  });
  const profileQuery = useQuery({
    queryKey: ['tasteProfile', userId],
    queryFn: () => getTasteProfile(userId as string),
    enabled: Boolean(userId),
  });
  const scoresQuery = useQuery({
    queryKey: ['itemScores', itemIds],
    queryFn: () => getItemScores(itemIds),
    enabled: itemIds.length > 0,
  });

  const ratingsByItemId = useMemo(
    () => new Map((ratingsQuery.data ?? []).map(({ rating }) => [rating.itemId, rating])),
    [ratingsQuery.data],
  );
  const scores = useMemo(() => scoresQuery.data ?? new Map<string, ItemScore>(), [scoresQuery.data]);

  const predictions = useMemo(
    () =>
      predictForItems({
        items: items ?? [],
        ratingsByItemId,
        profile: profileQuery.data ?? {},
        scores,
        userRatingsCount: ratingsQuery.data?.length ?? 0,
      }),
    [items, ratingsByItemId, profileQuery.data, scores, ratingsQuery.data],
  );

  return {
    predictions,
    ratingsByItemId,
    scores,
    isLoading: ratingsQuery.isLoading || profileQuery.isLoading || scoresQuery.isLoading,
    isError: ratingsQuery.isError || profileQuery.isError || scoresQuery.isError,
    refetch: () => {
      void ratingsQuery.refetch();
      void profileQuery.refetch();
      void scoresQuery.refetch();
    },
  };
}
