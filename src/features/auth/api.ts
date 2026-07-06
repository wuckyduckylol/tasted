import { getSupabase } from '../../lib/supabase';
import type { SignInInput, SignUpInput } from './validation';

/** Maps Supabase auth errors to user-friendly messages (SPEC 12.5). */
function friendlyAuthError(message: string): string {
  // Raw cause goes to the console for whoever is debugging; the user gets clean copy.
  console.warn('[auth]', message);
  const msg = message.toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Wrong email or password.';
  if (msg.includes('already registered')) return 'That email already has an account. Sign in instead.';
  if (msg.includes('email rate limit') || msg.includes('only request this after')) {
    return 'Confirmation emails are rate-limited right now. Try again in about an hour.';
  }
  if (msg.includes('confirmation email') || msg.includes('sending email')) {
    return 'Could not send the confirmation email. Try again shortly.';
  }
  if (msg.includes('rate limit')) return 'Too many attempts. Wait a minute and try again.';
  if (msg.includes('not confirmed')) return 'Confirm your email first, then sign in.';
  if (msg.includes('sms') || msg.includes('phone provider') || msg.includes('twilio')) {
    return 'Text messages aren’t set up yet on this build. (Twilio must be configured in Supabase — SPEC.md Section 15.)';
  }
  if (msg.includes('token has expired') || msg.includes('otp_expired') || msg.includes('invalid otp')) {
    return 'That code expired or didn’t match. Request a new one.';
  }
  return `Could not sign you in (${message}).`;
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

/**
 * Emails a 6-digit sign-in code; creates the auth user on first use.
 * NOTE: the Supabase "Magic Link" email template must include {{ .Token }}
 * for the code to appear in the email (dashboard → Auth → Email Templates).
 */
export async function startEmailSignIn(email: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw new Error(friendlyAuthError(error.message));
}

/** Verifies the emailed code; on success a session is active. */
export async function verifyEmailOtp(email: string, token: string): Promise<void> {
  const { error } = await getSupabase().auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw new Error(friendlyAuthError(error.message));
}

/** Sends an SMS code to an E.164 phone; creates the auth user on first use. */
export async function startPhoneSignIn(phoneE164: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOtp({
    phone: phoneE164,
    options: { channel: 'sms' },
  });
  if (error) throw new Error(friendlyAuthError(error.message));
}

/** Verifies the SMS code; on success a session is active. */
export async function verifyPhoneOtp(phoneE164: string, token: string): Promise<void> {
  const { error } = await getSupabase().auth.verifyOtp({
    phone: phoneE164,
    token,
    type: 'sms',
  });
  if (error) throw new Error(friendlyAuthError(error.message));
}

/** Attaches an email to the signed-in (phone-first) account, for recovery. */
export async function attachEmail(email: string): Promise<void> {
  const { error } = await getSupabase().auth.updateUser({ email });
  if (error) throw new Error(friendlyAuthError(error.message));
}

/** Sets a password on the signed-in account — backup login alongside phone OTP. */
export async function attachPassword(password: string): Promise<void> {
  const { error } = await getSupabase().auth.updateUser({ password });
  if (error) throw new Error(friendlyAuthError(error.message));
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw new Error('Could not sign out. Try again.');
}
