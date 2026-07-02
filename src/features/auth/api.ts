import { getSupabase } from '../../lib/supabase';
import type { SignInInput, SignUpInput } from './validation';

/** Maps Supabase auth errors to user-friendly messages (SPEC 12.5). */
function friendlyAuthError(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Wrong email or password.';
  if (msg.includes('already registered')) return 'That email already has an account. Sign in instead.';
  if (msg.includes('rate limit')) return 'Too many attempts. Wait a minute and try again.';
  return 'Could not sign you in. Check your connection and try again.';
}

export async function signInWithPassword(input: SignInInput): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword(input);
  if (error) throw new Error(friendlyAuthError(error.message));
}

export interface SignUpResult {
  /** False when email confirmation is enabled and the user must verify first. */
  sessionActive: boolean;
}

export async function signUpWithPassword(input: SignUpInput): Promise<SignUpResult> {
  const { data, error } = await getSupabase().auth.signUp({
    email: input.email,
    password: input.password,
    // The on_auth_user_created trigger creates the profile from this metadata.
    options: { data: { username: input.username } },
  });
  if (error) throw new Error(friendlyAuthError(error.message));
  return { sessionActive: data.session !== null };
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw new Error('Could not sign out. Try again.');
}
