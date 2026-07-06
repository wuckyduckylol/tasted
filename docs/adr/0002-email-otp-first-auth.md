# ADR-0002: Email OTP first; phone OTP parked until Twilio

Date: 2026-07-06 · Status: accepted (supersedes the phone-first plan from
the Get Started walkthrough — temporarily)

## Context
The hand-drawn onboarding wants phone-number-first signup. Supabase phone
OTP requires a funded Twilio Messaging Service; email OTP works with any
SMTP (custom SMTP now configured via Gmail; Resend planned at domain
purchase).

## Decision
Ship the wizard with email → 6–10 digit code → password. Keep
startPhoneSignIn/verifyPhoneOtp in features/auth/api.ts; the phone screen
was deleted in commit history and returns as step 1 when Twilio lands.

## Consequences
- Whole wizard is testable today; OTP length tolerant (6–10) because it is
  a Supabase project setting.
- Two auth identifier flows will coexist later; email+password remains the
  recovery path either way.
