import type { Database } from '../../types/database';
import {
  itemAttributesSchema,
  type Chain,
  type ChainCandidate,
  type Item,
  type ItemScore,
  type Profile,
  type Rating,
} from '../../types/domain';

type Tables = Database['public']['Tables'];

export function mapProfile(row: Tables['profiles']['Row']): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    isPrivate: row.is_private,
    streakCount: row.streak_count,
  };
}

export function mapChain(row: Tables['chains']['Row']): Chain {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url,
    isActive: row.is_active,
    displayOrder: row.display_order,
  };
}

export type ItemRowWithTags = Tables['items']['Row'] & {
  item_tags: { tags: { slug: string } | null }[];
};

export function mapItem(row: ItemRowWithTags): Item {
  const attributes = itemAttributesSchema.safeParse(row.attributes);
  return {
    id: row.id,
    chainId: row.chain_id,
    name: row.name,
    description: row.description,
    bucket: row.bucket,
    imageUrl: row.image_url,
    attributes: attributes.success ? attributes.data : {},
    isActive: row.is_active,
    isNew: row.is_new,
    tagSlugs: row.item_tags.flatMap((link) => (link.tags ? [link.tags.slug] : [])),
  };
}

export function mapRating(row: Tables['ratings']['Row']): Rating {
  return {
    id: row.id,
    userId: row.user_id,
    itemId: row.item_id,
    band: row.band,
    wouldOrderAgain: row.would_order_again,
    personalScore: Number(row.personal_score),
    note: row.note,
    updatedAt: row.updated_at,
  };
}

export function mapItemScore(row: Tables['item_scores']['Row']): ItemScore {
  return {
    itemId: row.item_id,
    numRatings: row.num_ratings,
    meanScore: row.mean_score === null ? null : Number(row.mean_score),
    weightedScore: row.weighted_score === null ? null : Number(row.weighted_score),
    worthItPct: row.worth_it_pct === null ? null : Number(row.worth_it_pct),
    distLoved: row.dist_loved,
    distFine: row.dist_fine,
    distDisliked: row.dist_disliked,
  };
}

export function mapChainCandidate(row: Tables['chain_candidates']['Row']): ChainCandidate {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    isUnlocked: row.is_unlocked,
    voteCount: row.vote_count,
  };
}
