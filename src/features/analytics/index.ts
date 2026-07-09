import { config, isAnalyticsConfigured } from '../../lib/config';
import { useConsent } from './consent';

/**
 * Minimal, dependency-free product analytics over PostHog's HTTP capture API.
 * No native SDK, so it works identically on iOS/Android/web. Every call is a
 * double no-op unless (a) a PostHog key is configured AND (b) the user hasn't
 * opted out — see src/features/analytics/consent.ts. Best-effort: failures are
 * swallowed and never surface to the user.
 */
let distinctId = 'anonymous';

export function identify(userId: string): void {
  distinctId = userId;
}

export function resetIdentity(): void {
  distinctId = 'anonymous';
}

export function capture(event: string, properties: Record<string, unknown> = {}): void {
  if (!isAnalyticsConfigured) return;
  if (!useConsent.getState().analyticsEnabled) return;
  void fetch(`${config.posthogHost}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: config.posthogKey,
      event,
      distinct_id: distinctId,
      properties: { ...properties, $lib: 'tasted-rn' },
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {
    // analytics is best-effort; swallow network/config errors
  });
}
