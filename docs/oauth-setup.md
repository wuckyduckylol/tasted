# Sign in with Apple & Google — setup

The app code is done (`signInWithProvider` in `src/features/auth/api.ts`, buttons on the sign-in screen). It uses Supabase OAuth with the PKCE flow: the provider opens in a secure in-app browser and the returned code is exchanged for a session.

**Two things gate it working:** provider credentials in the Supabase dashboard, and a native/dev build. The OAuth redirect (`tasted://auth-callback`) cannot complete in Expo Go or the web preview — test with `npx expo run:ios` / `run:android` or an EAS build. Until credentials exist, tapping the button shows a friendly "isn't set up yet" message.

Redirect/callback URL both providers point at (Supabase handles it):
`https://<project-ref>.supabase.co/auth/v1/callback`

## Apple (required by App Store if any third-party sign-in is offered)

Needs an Apple Developer account ($99/yr).

1. developer.apple.com → Certificates, IDs & Profiles → Identifiers → your **App ID** → enable **Sign in with Apple**.
2. Create a **Services ID** (this is the OAuth client id, e.g. `com.tasted.app.signin`); enable Sign in with Apple on it and add the Supabase callback URL above as the return URL.
3. Create a **Sign in with Apple Key** → download the `.p8`. Note the **Key ID** and your **Team ID**.
4. Supabase → Authentication → Providers → **Apple** → enable, and enter: Services ID (client id), Team ID, Key ID, and the `.p8` key contents.
5. `app.config.ts` already sets `scheme: 'tasted'` and `ios.bundleIdentifier: 'com.tasted.app'` — no app change needed.

(Optional later: `expo-apple-authentication` gives the native Apple button on iOS for a slightly nicer UX; the current web-OAuth flow is compliant.)

## Google

1. console.cloud.google.com → new project → **APIs & Services → OAuth consent screen** (External; add app name, support email `tastedteam@gmail.com`, scopes email + profile).
2. **Credentials → Create credentials → OAuth client ID → Web application**. Add the Supabase callback URL above under "Authorized redirect URIs". Copy the **client ID** and **client secret**.
3. Supabase → Authentication → Providers → **Google** → enable, paste the web client ID + secret.
4. (For the native Google SDK path you'd also make iOS/Android client IDs, but the current browser-based flow only needs the Web client.)

## After enabling

- Set the Supabase **Site URL** and add `tasted://auth-callback` to **Redirect URLs** (Authentication → URL Configuration) so the deep link is allowed.
- New users created via OAuth get an auto-generated username (from the `handle_new_user` trigger) and skip the onboarding wizard — they can set name/username and adjust settings in Profile. Routing brand-new OAuth users through onboarding is a possible future enhancement.
