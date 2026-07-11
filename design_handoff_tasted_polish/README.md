# Handoff: Tasted UI Polish & Motion (direction "candy thread v2")

## Overview
A full visual + motion refresh of the Tasted app (Expo / React Native, expo-router). The sign-up walkthrough already commits to the brand (candy field, confetti, chunky lowercase Baloo, ticker); this handoff carries that energy into the main app, fixes inconsistencies (system-font leaks, border+shadow-on-everything, radius drift), swaps the body font Nunito → **Figtree**, and adds a tasteful motion system. The color palette is **unchanged**.

## About the Design Files
The files in this bundle are **design references created in HTML** (`Tasted Design Review.dc.html` — open it in a browser with the two sibling `.js`/`.jsx` files kept next to it). They are prototypes showing intended look and motion, **not production code**. The task is to **recreate these designs inside the existing Tasted codebase** (React Native + TypeScript, expo-router, existing `src/lib/theme.ts` token system) using its established patterns. All DB access stays in `src/lib/db/*`; no fabricated data — every number shown in the mocks maps to data the app already computes.

In the HTML file, sections are labeled: **3a** = home, **4a** chain menu, **4b** item detail, **4c** rate band step, **4d** rate celebration, **4e** search, **4f** ranks, **4g** drops, **4h** profile. Section 1 (1a–1j) is the current app for before/after reference.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, copy and motion timings are final. Recreate pixel-perfectly with the codebase's existing components where possible (extend `src/components/ui.tsx`, `ItemRow.tsx`, `score.tsx`, reuse `Marquee.tsx`).

---

## Global changes (do these first)

### 1. Body font: Nunito → Figtree
- Add `@expo-google-fonts/figtree`; load `Figtree_400Regular`, `Figtree_600SemiBold`, `Figtree_700Bold`, `Figtree_800ExtraBold` in `app/_layout.tsx` (replacing the Nunito imports).
- Update `fonts` in `src/lib/theme.ts`:
  - `body: 'Figtree_400Regular'`, `bodySemiBold: 'Figtree_600SemiBold'`, `bodyBold: 'Figtree_700Bold'`, `bodyExtraBold: 'Figtree_800ExtraBold'`.
  - `display` / `displayMedium` (Baloo 2 800/700) **unchanged**.
- Delete every hardcoded `system-ui` / bare `fontWeight` text style (they exist in: chain toggle labels, item-detail ScoreNumber + CommunityBlock, drops NEW badge, profile stats + chainStat rows, rate band/compare labels). Everything routes through `theme.type` or `fonts.*`.

### 2. Card recipe (one recipe everywhere)
- White card: `backgroundColor: colors.card`, `borderRadius: 16`, **no border**, soft shadow:
  `shadowColor: colors.baseDark, shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: {0, 6}, elevation: 2`.
- Add to `theme.ts` as `shadows.soft` and a `radii` note: cards = 16, pills/fields = 999, thumbs/badges = 14, hero corners = 28.
- Candy pink (`#F290B9`) is a **surface** (hero bands, vote card, NEW chip bg tint `#FCE9F2`) — never a card border.
- Verdict colors (`loved/fine/disliked`) stay **reserved for scores** (plus the rate-step face tints below).

### 3. New tokens to add to `theme.ts`
```ts
// tints (avatar/badge backgrounds)
butter: '#FCEFD4', peach: '#FFE3D6',            // + existing accentSoft/candySoft
// rate-step face tints
lovedSoft: '#E9F6EE', fineSoft: '#FCF3E3', dislikedSoft: '#FBEAE8',
// track for progress/rings
track: '#F3EFE7',
```

### 4. Voice & copy
- All headers lowercase (Baloo). Remove uppercase `COMMUNITY` label.
- Replace dev-speak empty states: never show `Run node supabase/seed/seed.mjs` etc. to users → "the menu's still loading up — check back soon".
- `Saved!` → celebration screen (4d). `Tried it? Rate it` → inline `tried it? rate it →`. `★` glyph in button label → lucide `star` icon.

---

## Screens

### 3a · Home — `app/(tabs)/index.tsx`
Remove the navigation header entirely (`headerShown: false` for this tab); the screen owns its top.
- **Candy hero** (bg `candy`, bottom radius 28, padding 60/20/20): top row = wordmark `tasted` (Baloo 800 24, color `base`) + **streak chip** (pill `rgba(250,247,242,.4)`, flame icon 14 + `8 week streak` Figtree 800 12.5, color `text`); below, title `where are you eating?` Baloo 800 34/38, color `text`, margin-top 14. Three confetti squares (9–12px, radius 3, coral/cream, opacity .7–.9) absolutely positioned, drifting (motion §D).
- **Ticker** (reuse `Marquee.tsx`): dark `baseDark` pill (radius 999, margin 10/16/0, padding-v 7), text Figtree 700 11.5 `base`, letter-spacing .5. Content = drops/score/vote news only (no friend items): `new drop: peppermint frosty · fries holding 9.2 at mcdonald's · raising cane's leads the vote`.
- **friends just rated** (section header Baloo 800 19): horizontal row of chips — white pill (min-height 40, radius 999, soft shadow, padding 3 14 3 4): avatar circle 32 (tint bg, Baloo initial), column(username Figtree 700 12.5 / item Figtree 600 10.5 `textFaint`), score Baloo 800 15 in `scoreColor()`. Data: `getFriendsRecentRatings`.
- **Vote card**: full-width candy card (radius 16, min-height 64, shadow `rgba(242,144,185,.35)` 0/6/16): cream-tint circle 40 + `vote` icon, `vote the next chain` Figtree 700 15 + `Raising Cane's leads · 2 days left` Figtree 600 12 at 65% text, chevron. → `/vote`.
- **pick a chain** (section header): chain rows = card recipe, min-height 70, padding 14/16: badge circle 44 `candySoft` with Baloo 800 18 coral initial; name Figtree 700 16; **subtitle = the app's hero data**: `your best: Fries (Large) · 9.2` (score bold, `scoreColor`), or `try next: Frosty · 8.8 predicted`, or `rate 3 more to unlock predictions` (fallback). Chevron color `candy`. Requires a per-chain top-pick selector (own rating max → else top prediction → else count prompt) built on `src/features/recommendations`.
- **Quick-rate FAB**: coral pill (height 54, radius 999, padding 0 20 0 16, shadow raised), `plus` icon 22 + `rate` Figtree 800 16 white; absolute right 16, bottom = tab bar + 12. Breathes (motion §D). Action: opens search in "pick something to rate" mode.
- **Tab bar**: `base` bg, hairline top `#F0EBE1`, icon 23 + 4px dot under active (coral); no labels.
- **Streak definition change**: streak counted in **weeks** (consecutive weeks with ≥1 app open/rating), copy `N week streak`. Rename/derive from `profile.streakCount` server logic accordingly.

### 4a · Chain menu — `app/chain/[chainId].tsx`
- Candy band (bottom radius 28, padding 58/20/18): back button = circle 36 `rgba(250,247,242,.5)` + chevron; title chain name Baloo 800 26 + subtitle `38 items · you've tried 12` Figtree 600 12.5 at 65%.
- Segmented control: white pill (radius 999, padding 4, soft shadow); active segment coral pill, label Figtree 700 14 white; inactive `textMuted`. (Animate the active pill slide 220ms when toggling.)
- **Top-pick spotlight** (first row, only in "for you" mode): `accentSoft` card radius 16: white thumb 52/radius 16 with bucket icon; overline `YOUR TOP PICK` Figtree 800 11 coral ls .6; name Baloo 800 19; context Figtree 600 12.5 muted; score Baloo 800 26 `scoreColor` + `you ✓` caption.
- Item rows: card recipe min-height 68; thumb 46 radius 14 `candySoft` + bucket icon coral 22; name Figtree 700 15.5; context Figtree 600 12 muted — **never duplicates the lead**: if lead shows `76% worth it`, context shows `421 ratings`; forming shows `3 ratings — score forming` with lead = `new` chip (Figtree 800 13 `textFaint` on `track`, radius 999).
- Lead block: score Baloo 800 19 + caption Figtree 700 10.5 (`you ✓` / `for you` / `worth it`).

### 4b · Item detail — `app/item/[itemId].tsx`
- Header hero: `candySoft` band (bottom radius 28): back + share circle buttons (36, `rgba(255,255,255,.7)`); thumb 64 radius 20 white + bucket icon 32; name Baloo 800 25; `McDonald's · sweet` Figtree 600 13 muted.
- **your score card** (card recipe): ring 92px (svg r52, stroke 8, track `track`, fg `scoreColor(score)`, rounded caps) with Baloo 800 26 score + `/10` caption inside; right column: `your score` Baloo 800 16, `#3 of 12 in loved · sweet` Figtree 600 12.5 muted, note italic Figtree 600 12.5 `textFaint`. (Unrated state: keep card, ring becomes dashed track, copy `not rated yet — predictions unlock after a few ratings`.)
- **community card**: header `community` Baloo 800 16 (lowercase); left `81%` (Baloo 800 30 + %) over `would order again`; right `7.6/10` Baloo 800 18 over `214 ratings`; dist bar height 10 radius 5 (loved/fine/disliked flex widths).
- Collab row (card): `users` icon coral 18 + `people with your taste gave it 8.3/10` (number Baloo 15).
- Actions: primary coral pill `re-rate this` (Figtree 800 16.5, coral-tinted shadow `rgba(255,90,54,.3)` 0/6/16); secondary white pill + `star` icon amber + `on your want-to-try list`. Footnote `ordering links coming soon` Figtree 600 12 `textFaint` centered.

### 4c · Rate — band step — `app/rate/[itemId].tsx`
- Modal: grabber bar 44×5 `border` radius 999 top-center; **step dots** (3): active = 18×6 coral pill, inactive 6×6 `border`.
- `how was it?` Figtree 600 14 muted → item name Baloo 800 30.
- Band cards (card recipe, radius 18, min-height 76): face circle 48 in tint (`lovedSoft`/`fineSoft`/`dislikedSoft`) with lucide `smile`/`meh`/`frown` 26 in verdict color; label lowercase Figtree 800 17 `text` (`loved it` / `it was fine` / `didn't like it`); sub `goes in your 7–10 range` (4–7, 0–4) Figtree 600 12 muted; chevron in verdict color.
- Footer hint: `next: a couple of quick head-to-heads to place it exactly` Figtree 600 12.5 `textFaint` centered.

### 4d · Rate — celebration (replaces the "Saved!" step)
- Full screen, bg vertical gradient `#E9F6EE → base` (top 42%) — tint follows band (`fineSoft`/`dislikedSoft` for other bands). Close `x` top-right.
- Overline `saved to your ranks` Figtree 800 14 muted.
- **Ring** 200px (svg r70, stroke 9, track `#EDE7DB`, fg band color, rounded): score Baloo 800 56 counts up inside + `out of 10` Figtree 700 13.
- **Confetti burst**: 12 squares (8–12px, radius 2–3; coral, candy, loved-green, butter `#F5C042`) exploding from ring center — exact offsets/rotations in motion §C.
- Item name Baloo 800 24; **rank chip** white pill (soft shadow): trophy icon 15 band-color + `#3 of 12 in loved · sweet` Figtree 800 13.5.
- Buttons: coral pill `done`; ghost row `share it` with `share-2` icon.

### 4e · Search — `app/(tabs)/search.tsx`
- No header bar; title `search` Baloo 800 30.
- Field: white pill (min-height 52, radius 999, soft shadow): `search` icon coral 19 + placeholder `fries, whopper, frosty…` Figtree 600 15.5 `textFaint`.
- Bucket chips: active = coral pill white Figtree 700 13.5; inactive = white pill soft shadow.
- Result rows: card recipe min-height 68, subtitle `Chick-fil-A · 94% would order again` (chain added), chevron `candy`. Scores stay hidden in search (existing behavior).

### 4f · Ranks — `app/(tabs)/ranks.tsx`
- Title `your ranks` Baloo 800 30 + `47 dishes · sorted by your score` Figtree 600 13 muted.
- **Podium** (top 3, columns 1:1.15:1, order 2-1-3, align-end): white cards radius 18/20; rank circle 34/38 (`track` bg, Baloo muted number; #1 `accentSoft` bg coral number + `crown` icon 20 amber above); name Figtree 700 12–12.5 centered; chain Figtree 600 10 `textFaint`; score Baloo 800 22 (#1: 26) in `bandColor`.
- List rows 4+: card recipe min-height 60; rank number Baloo 800 15 **`textFaint`** (not coral — verdict color owns the row); name Figtree 700 15 + chain 11.5 `textFaint`; score Baloo 800 18 `bandColor`.

### 4g · Drops — `app/(tabs)/drops.tsx`
- Title row: `sparkles` icon coral 24 (flickers, §D) + `drops` Baloo 800 30 + `new on menus this week` Figtree 600 13 muted.
- Drop cards (card recipe, radius 18, padding 16, gap 12) — everything inside one card:
  - Meta row: `NEW` chip (bg `candySoft`, Figtree 800 11, radius 999) + `Popeyes · added tuesday` Figtree 600 12 `textFaint` + status right: dot 7px (amber=forming pulsing §D, green=live) + `verdict forming`/`verdict live` Figtree 700 11.5 muted.
  - Item row (thumb 46 + name + context; live drops show lead score).
  - Action: inline `tried it? rate it` Figtree 800 14 coral + `arrow-right` 15 (44px hit slop) — **no full-width button**.

### 4h · Profile — `app/(tabs)/profile.tsx`
- Identity row: avatar circle 60 `candySoft` Baloo initials + `@fry_scientist` Baloo 800 24 + flame 13 `8 week streak` Figtree 700 12.5 muted; share circle button right.
- Stat cards ×3 (ratings / followers / following): white radius 16, number Baloo 800 22 (counts up), label Figtree 700 11 muted.
- **menus tried card**: per chain — name Figtree 700 13 / `9/24 · 38%` Figtree 700 12 muted; progress track 7px `track` radius 999, coral fill (draws in, §D).
- Settings card: rows 50px, Figtree 600 15, hairline `#F3EFE7` separators, native Switch (`trackColor.true = accent`).
- find friends card: inline field (pill, `base` bg) + coral `follow` pill button on one row.
- Actions card: `share tier list`, `privacy policy` rows with chevrons; `sign out` in `disliked` red. (Replaces three stacked buttons.)
- food log: card rows min-height 64, subtitle `Chick-fil-A · rated monday`, score Baloo 800 18 `bandColor`.

---

## Motion system
Use `react-native-reanimated` (add if absent). Gate **all** ambient/looping motion + entrances behind the existing `useReducedMotion()` from `src/components/ui.tsx`. Add to `theme.ts`: `motion.enter = 550`, `motion.count = 1300`, `motion.ring = 1350`, easings below.

**A. Entrance stagger (every list/screen)** — items fade in + translateY 14→0, 550ms, easing `cubic-bezier(.16,.8,.3,1)`, delay ≈ 40–60ms × index (exact delays annotated per element in the HTML `animation-delay`s). Reanimated: `entering={FadeInDown.duration(550).delay(i*50)}` with custom easing. "Pop" variant (spotlight card, vote card, podium, buttons, faces): scale .86 → 1.045 → 1, 550ms `cubic-bezier(.2,1.2,.36,1)` (or `withSpring` damping ≈ 14, stiffness ≈ 180).

**B. Count-up numbers** (celebration score, top-pick score, friend chips, community %, profile stats, podium): 0 → value, 1300ms, ease-out-cubic, 300ms start delay; 1 decimal for scores, integers for counts. `useSharedValue` + `withDelay(300, withTiming(v, {duration:1300, easing: Easing.out(Easing.cubic)}))` + ReText/`useAnimatedProps`.

**C. Celebration (4d)** — choreography: ring dashoffset full→13% remainder over 1350ms `cubic-bezier(.2,.7,.3,1)` delay 250ms; count-up per §B; confetti at t=0: each square animates from center to `(tx, ty)` with rotation, fading 1→0, 1200ms `cubic-bezier(.12,.55,.25,1)`, per-piece delay 0–130ms. Offsets (px, rotation): (-118,-142,230°) (96,-158,-190°) (148,-64,160°) (-156,-40,-140°) (-130,78,200°) (126,96,-230°) (44,-172,120°) (-52,-168,-160°) (168,22,190°) (-172,30,-120°) (60,140,150°) (-66,132,-170°). Name pops at 900ms, rank chip 1050ms, `done` 1200ms, `share it` 1300ms.

**D. Ambient loops** (pause when reduced-motion):
- Confetti drift (home hero): translate (0,0)→(3,9) + rotate +16°, 7s ease-in-out alternate, staggered starts.
- FAB / forming-dot breathe: scale 1→1.02, 5.5s ease-in-out loop.
- Flame / sparkles flicker: scale 1→1.14 + rotate −3°→4°, 2.6s ease-in-out loop, origin bottom-center.
- Ticker: reuse `Marquee` (speed 40, existing).

**E. Micro-interactions**: press scale .965, 150–160ms `cubic-bezier(.2,.7,.3,1.4)` (align existing Button's .97). Progress bars / dist bar: scaleX 0→1 (origin left), 700ms `cubic-bezier(.2,.7,.2,1)`, staggered 100ms. Ring draws (item detail, 4b): same as §C ring at 92px (r52, dasharray 327).

## State & data notes
- Home per-chain best: derive from `listMyRatingsWithItems` (max own score per chain) → else best `getCollabPredictions`/content prediction → else count-to-unlock copy.
- Weekly streak: consecutive calendar weeks with activity; copy `N week streak`.
- Vote card: leading candidate + closes-in countdown from the vote data source (`app/vote.tsx` queries).
- Quick-rate FAB: route to search with a `mode=rate` param (rows navigate to `/rate/[itemId]`).
- Celebration inputs already exist: `saveRating` returns `{personalScore, rank, bandSize}`.

## Design tokens (full palette — unchanged)
`base #FAF7F2 · baseDark/text #17150F · accent #FF5A36 · accentSoft #FFEDE7 · candy #F290B9 · candySoft #FCE9F2 · loved #2FBF71 · fine #F5A623 · disliked #E4433B · textMuted #6F6A5F · textFaint #9B958A · card #FFFFFF · border #E7E1D6 (hairlines/tracks only)` + new: `butter #FCEFD4 · peach #FFE3D6 · lovedSoft #E9F6EE · fineSoft #FCF3E3 · dislikedSoft #FBEAE8 · track #F3EFE7`. Spacing scale 4/8/16/24/32/48 unchanged.

## Assets
- Icons: `lucide-react-native` (already a dependency): house, search, list-ordered, sparkles, circle-user-round, trophy, vote, flame, plus, chevron-left/right, arrow-right, share-2, star, users, crown, smile, meh, frown, x, sandwich, cup-soda, ice-cream-cone.
- Logos: already in repo at `assets/logo/` (wordmark is font-rendered Baloo — keep).
- Fonts: `@expo-google-fonts/baloo-2` (keep), `@expo-google-fonts/figtree` (add), remove `@expo-google-fonts/nunito` when migration completes.

## Files in this bundle
- `Tasted Design Review.dc.html` — the interactive design doc (sections 3a + 4a–4h are the spec; section 1 is the current app for diffing). Keep `support.js` + `ios-frame.jsx` next to it and open in a browser; motion replays on scroll or via each screen's "replay" button.
- `support.js`, `ios-frame.jsx` — runtime + device frame for the HTML doc (reference only).

## Suggested implementation order
1. Fonts + tokens + card recipe (`theme.ts`, `_layout.tsx`, `ui.tsx`) — app-wide lift immediately.
2. Shared bits: entrance-stagger helper, CountUpText, ScoreRing, press-scale wrapper.
3. Home 3a (hero, ticker, friends chips, vote card, chain rows w/ best-pick, FAB, tab bar).
4. Celebration 4d + rate step 4c.
5. Chain 4a, item 4b.
6. Ranks 4f, drops 4g, search 4e, profile 4h.
7. Copy sweep (lowercase voice, dev-speak empty states).
