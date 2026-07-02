/**
 * Premium entitlement gate (SPEC Section 11 — hooks only, no store).
 * When RevenueCat is set up (human step, SPEC 15), swap the implementation to
 * read customer info from react-native-purchases; call sites stay unchanged.
 */
export type Entitlement = 'premium';

export interface Entitlements {
  isReady: boolean;
  has: (entitlement: Entitlement) => boolean;
}

export function useEntitlements(): Entitlements {
  return {
    isReady: true,
    // No store yet: everyone is on the free tier. Never fake premium.
    has: () => false,
  };
}

/** Delivery-app affiliate links (SPEC 11): placeholder until real links exist. */
export function affiliateLinksFor(_itemId: string): { label: string; url: string }[] {
  return [];
}
