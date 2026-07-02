import { getSupabase } from '../supabase';
import { mapChainCandidate } from './mappers';
import type { ChainCandidate } from '../../types/domain';

/** Votes needed before a candidate is flagged for unlock (SPEC 5.8, tunable). */
export const UNLOCK_THRESHOLD = 100;

export async function listChainCandidates(): Promise<ChainCandidate[]> {
  const { data, error } = await getSupabase()
    .from('chain_candidates')
    .select('*')
    .order('vote_count', { ascending: false });
  if (error) throw error;
  return data.map(mapChainCandidate);
}

export async function listMyVotedCandidateIds(userId: string): Promise<Set<string>> {
  const { data, error } = await getSupabase()
    .from('chain_votes')
    .select('candidate_id')
    .eq('user_id', userId);
  if (error) throw error;
  return new Set(data.map((row) => row.candidate_id));
}

/** One vote per user per candidate; the DB trigger keeps vote_count in sync. */
export async function voteForCandidate(userId: string, candidateId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('chain_votes')
    .insert({ user_id: userId, candidate_id: candidateId });
  if (error && error.code !== '23505') throw error; // duplicate vote is a no-op
}
