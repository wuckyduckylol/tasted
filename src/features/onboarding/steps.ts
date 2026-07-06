/**
 * Onboarding wizard step order (Get Started walkthrough pages 1–2).
 * Progress bars and the root auth gate both derive from this single list.
 * NOTE: email OTP is the interim primary auth; the sketched phone-first flow
 * returns once Twilio is configured (startPhoneSignIn/verifyPhoneOtp are ready).
 */
export const WIZARD_STEPS = [
  'email',
  'verify',
  'password',
  'name',
  'username',
  'avatar',
  'welcome',
  'top-three',
  'top-ten',
  'contacts',
  'friends',
  'notifs',
  'ready',
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

/** 0..1 fill for the wizard progress bar. */
export function stepProgress(step: WizardStep): number {
  return (WIZARD_STEPS.indexOf(step) + 1) / WIZARD_STEPS.length;
}

/**
 * (auth)-group routes a SIGNED-IN user is allowed to stay on.
 * Everything after OTP verify runs with a live session; the root gate must not
 * bounce these to the tabs. 'verify' is included because the session lands
 * a tick before navigation to 'email'. 'onboarding' is the rate-5 taste flow.
 */
export const SIGNED_IN_AUTH_ROUTES: ReadonlySet<string> = new Set([
  'verify',
  'password',
  'name',
  'username',
  'avatar',
  'welcome',
  'top-three',
  'top-ten',
  'contacts',
  'friends',
  'notifs',
  'ready',
  'onboarding',
]);
