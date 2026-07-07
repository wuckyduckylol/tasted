import type { TextStyle, ViewStyle } from 'react-native';

import type { Band } from '../types/domain';

/**
 * Tasted design tokens — warm, appetizing, rounded (SPEC.md Section 12.6 palette,
 * elevated per the Get Started walkthrough UI pass).
 * All colors flow through here; never hardcode hex in components.
 */
export const colors = {
  base: '#FAF7F2', // warm off-white
  baseDark: '#17150F', // warm charcoal
  accent: '#FF5A36', // flame coral
  accentSoft: '#FFEDE7', // coral tint — selected states, chips, highlights
  accentBorder: '#FFC7B8', // coral border for selected cards
  candy: '#F290B9', // candy pink — hero/celebration surfaces (dark text only)
  candySoft: '#FCE9F2', // pink tint — chips and soft fills on cream
  // Verdict colors — reserved for scores ONLY (never decorative use).
  loved: '#2FBF71',
  fine: '#F5A623',
  disliked: '#E4433B',
  text: '#17150F',
  textMuted: '#6F6A5F',
  textFaint: '#9B958A', // placeholders, tertiary labels
  card: '#FFFFFF',
  border: '#E7E1D6',
  overlay: 'rgba(23, 21, 15, 0.45)',
  onAccent: '#FFFFFF',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radii = { xs: 8, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

/** Minimum tap target per accessibility requirement (Section 12.3). */
export const minTapTarget = 44;

/**
 * Font families (Baloo 2 display + Nunito body — loaded in app/_layout.tsx).
 * Chunky rounded lowercase display per the happly-style art direction.
 * Weights are baked into family names; do NOT combine with fontWeight on Android.
 */
export const fonts = {
  display: 'Baloo2_800ExtraBold',
  displayMedium: 'Baloo2_700Bold',
  body: 'Nunito_400Regular',
  bodySemiBold: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyExtraBold: 'Nunito_800ExtraBold',
} as const;

/** Type scale — use these instead of ad-hoc fontSize/fontFamily pairs. */
export const type = {
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.text },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.text },
  heading: { fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 28, color: colors.text },
  section: { fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 24, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.text },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 24, color: colors.text },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 14, lineHeight: 20, color: colors.text },
  caption: { fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 16, color: colors.textMuted },
} satisfies Record<string, TextStyle>;

/** Soft warm card shadow — pair with backgroundColor card + radius md/lg. */
export const shadows = {
  card: {
    shadowColor: colors.baseDark,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: colors.baseDark,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} satisfies Record<string, ViewStyle>;

/** Motion durations (ms) — micro 150–300, per HIG/MD guidance. */
export const motion = { fast: 150, base: 220, slow: 300 } as const;

export function bandColor(band: Band): string {
  return colors[band];
}

/** Verdict color for a 0–10 score, using the band ranges from Section 5.1. */
export function scoreColor(score: number): string {
  if (score >= 7) return colors.loved;
  if (score >= 4) return colors.fine;
  return colors.disliked;
}
