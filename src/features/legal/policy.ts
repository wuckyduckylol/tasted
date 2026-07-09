/**
 * Canonical privacy-policy content. Rendered in-app by app/privacy.tsx and
 * mirrored to docs/privacy-policy.md (which is what you host at the public URL
 * the App Store requires). Keep the two in sync — this module is the source.
 */
export const PRIVACY_CONTACT = 'tastedteam@gmail.com';
export const PRIVACY_EFFECTIVE = 'July 8, 2026';
export const PRIVACY_MIN_AGE = 13;

export interface PolicySection {
  heading: string;
  body: string[];
}

export const PRIVACY_POLICY: PolicySection[] = [
  {
    heading: 'The short version',
    body: [
      'Tasted lets you rate fast-food menu items and get recommendations tuned to your taste. We collect the account details you give us and the ratings you make, use them to run and personalize the app, and never sell your data.',
      `You must be at least ${PRIVACY_MIN_AGE} to use Tasted. Questions? Email ${PRIVACY_CONTACT}.`,
    ],
  },
  {
    heading: 'What we collect',
    body: [
      'Account: your email address (and, later, phone number), name, username, and optional profile photo.',
      'Your content: the items you rate, quick head-to-head comparisons you make while rating, who you follow, chains you favorite, items you want to try, and any item suggestions or reports you submit.',
      'Device & technical: your push-notification token (only if you allow notifications) and basic app/OS version info needed to run the service.',
      'Usage analytics: with analytics enabled, we record in-app events (screens viewed, features used) and coarse device info through PostHog to understand how the app is used and improve it. This is tied to your account id, not to your name, and you can turn it off anytime in Profile.',
    ],
  },
  {
    heading: 'What we do NOT collect',
    body: [
      'We do not collect precise location, contacts, payment card numbers, or health data. We do not track you across other apps or websites for advertising.',
    ],
  },
  {
    heading: 'How we use your information',
    body: [
      'To run the app: create your account, save your ratings, and show your food log and tier list.',
      'To personalize: a statistical algorithm uses your ratings — and compares your taste with other users who rate similarly — to predict what you would like. This is not generative AI, and your data is never used to train any third-party AI model.',
      'To keep it safe: review reports and item suggestions, and prevent abuse.',
      'To improve: analyze usage (if analytics is on) and fix problems.',
    ],
  },
  {
    heading: 'Legal bases (EEA/UK users)',
    body: [
      'We process your account and content to provide the service you asked for (contract). Analytics relies on your consent, which you can withdraw at any time. Safety and abuse-prevention rely on our legitimate interests.',
    ],
  },
  {
    heading: 'Who we share it with',
    body: [
      'We use trusted service providers who process data on our behalf, only to run Tasted: Supabase (database, authentication, storage — hosted in the United States), Expo (push-notification delivery), and PostHog (product analytics). If you sign in with Apple or Google, that provider confirms your identity to us. Payment processing (RevenueCat) applies only if you buy a future premium tier.',
      'We do not sell your personal information, and we do not share it for cross-context behavioral advertising.',
    ],
  },
  {
    heading: 'How long we keep it',
    body: [
      'We keep your account and content while your account is active. When you delete your account, your profile, ratings, and related content are deleted; push tokens are removed when you sign out.',
    ],
  },
  {
    heading: 'Your choices and rights',
    body: [
      'You can edit your profile, toggle a private profile, and turn analytics off in Profile at any time.',
      'You can request access to, correction of, a copy of, or deletion of your data by emailing ' +
        PRIVACY_CONTACT +
        '. Depending on where you live (for example under GDPR or the CCPA), you may have additional rights, including the right to withdraw consent and to lodge a complaint with your data-protection authority. We will not discriminate against you for exercising any right.',
    ],
  },
  {
    heading: 'Security',
    body: [
      'Data is encrypted in transit. Access to your data is enforced at the database level with row-level security, so one account cannot read or change another account’s data. No system is perfectly secure, but we work to protect your information.',
    ],
  },
  {
    heading: 'Children',
    body: [
      `Tasted is not directed to children under ${PRIVACY_MIN_AGE}, and we do not knowingly collect their data. If you believe a child has given us information, email ${PRIVACY_CONTACT} and we will delete it.`,
    ],
  },
  {
    heading: 'International transfers',
    body: [
      'Our providers process data in the United States. Where required, we rely on appropriate safeguards for international transfers.',
    ],
  },
  {
    heading: 'Changes',
    body: [
      'We may update this policy; we will change the effective date above and, for material changes, notify you in the app. Continued use after an update means you accept the revised policy.',
    ],
  },
  {
    heading: 'Contact',
    body: [`Questions or requests: ${PRIVACY_CONTACT}.`],
  },
];
