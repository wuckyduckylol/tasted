/**
 * Hand-written to match supabase/migrations. Once a Supabase project is linked,
 * regenerate with: npx supabase gen types typescript --linked > src/types/database.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Bucket = 'drinks' | 'sweet' | 'savory';
type Band = 'loved' | 'fine' | 'disliked';

interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
  streak_count: number;
  last_active_date: string | null;
  created_at: string;
}

interface ChainRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  display_order: number | null;
  launched_at: string | null;
  created_at: string;
}

interface ItemRow {
  id: string;
  chain_id: string;
  name: string;
  description: string | null;
  bucket: Bucket;
  image_url: string | null;
  attributes: Json;
  is_active: boolean;
  is_new: boolean;
  launched_at: string | null;
  created_at: string;
}

interface TagRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface ItemTagRow {
  item_id: string;
  tag_id: string;
}

interface RatingRow {
  id: string;
  user_id: string;
  item_id: string;
  band: Band;
  would_order_again: boolean;
  personal_score: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

interface ComparisonRow {
  id: string;
  user_id: string;
  bucket: Bucket;
  band: Band;
  item_a: string;
  item_b: string;
  winner_item_id: string | null;
  created_at: string;
}

interface ItemScoreRow {
  item_id: string;
  num_ratings: number;
  mean_score: number | null;
  weighted_score: number | null;
  worth_it_pct: number | null;
  dist_loved: number;
  dist_fine: number;
  dist_disliked: number;
  updated_at: string;
}

interface TasteProfileRow {
  user_id: string;
  attribute_weights: Json;
  updated_at: string;
}

interface UserSimilarityRow {
  user_a: string;
  user_b: string;
  similarity: number;
  co_rated: number;
  created_at: string;
}

interface PredictedScoreRow {
  user_id: string;
  item_id: string;
  predicted_score: number;
  source: 'content' | 'collab' | 'blend' | 'community';
  confidence: number;
  updated_at: string;
}

interface WantToTryRow {
  user_id: string;
  item_id: string;
  created_at: string;
}

interface FollowRow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

interface ChainCandidateRow {
  id: string;
  name: string;
  logo_url: string | null;
  is_unlocked: boolean;
  vote_count: number;
  created_at: string;
}

interface ChainVoteRow {
  user_id: string;
  candidate_id: string;
  created_at: string;
}

interface ReportRow {
  id: string;
  reporter_id: string;
  target_type: 'rating' | 'note' | 'user' | 'photo';
  target_id: string;
  reason: string | null;
  created_at: string;
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  payload: Json;
  read: boolean;
  created_at: string;
}

interface PushTokenRow {
  user_id: string;
  expo_push_token: string;
  platform: string | null;
  created_at: string;
}

interface ItemSuggestionRow {
  id: string;
  user_id: string;
  chain_id: string | null;
  name: string;
  details: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

type Insertable<Row, Required extends keyof Row> = Pick<Row, Required> &
  Partial<Omit<Row, Required>>;

interface Table<Row, Required extends keyof Row> {
  Row: Row;
  Insert: Insertable<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow, 'id' | 'username'>;
      chains: Table<ChainRow, 'name' | 'slug'>;
      items: Table<ItemRow, 'chain_id' | 'name' | 'bucket'>;
      tags: Table<TagRow, 'name' | 'slug'>;
      item_tags: Table<ItemTagRow, 'item_id' | 'tag_id'>;
      ratings: Table<
        RatingRow,
        'user_id' | 'item_id' | 'band' | 'would_order_again' | 'personal_score'
      >;
      comparisons: Table<ComparisonRow, 'user_id' | 'bucket' | 'band' | 'item_a' | 'item_b'>;
      item_scores: Table<ItemScoreRow, 'item_id'>;
      taste_profiles: Table<TasteProfileRow, 'user_id'>;
      user_similarity: Table<UserSimilarityRow, 'user_a' | 'user_b' | 'similarity' | 'co_rated'>;
      predicted_scores: Table<
        PredictedScoreRow,
        'user_id' | 'item_id' | 'predicted_score' | 'source' | 'confidence'
      >;
      want_to_try: Table<WantToTryRow, 'user_id' | 'item_id'>;
      follows: Table<FollowRow, 'follower_id' | 'following_id'>;
      chain_candidates: Table<ChainCandidateRow, 'name'>;
      chain_votes: Table<ChainVoteRow, 'user_id' | 'candidate_id'>;
      reports: Table<ReportRow, 'reporter_id' | 'target_type' | 'target_id'>;
      notifications: Table<NotificationRow, 'user_id' | 'type'>;
      push_tokens: Table<PushTokenRow, 'user_id' | 'expo_push_token'>;
      item_suggestions: Table<ItemSuggestionRow, 'user_id' | 'name'>;
    };
    Views: Record<string, never>;
    Functions: {
      replace_band_rankings: {
        Args: { p_bucket: Bucket; p_band: Band; p_scores: Json };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
