import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/**
 * Local source of truth for the analytics opt-out toggle. capture() reads it
 * synchronously before sending; defaults to on (disclosed in the privacy
 * policy). The Profile switch and onboarding consent flow flip it.
 *
 * Persistence is done manually via effects (setter + hydrateConsent), NOT the
 * zustand `persist` middleware — persist + AsyncStorage runs storage access at
 * module-load time, which breaks the web bundle's runtime init. Keep all
 * storage I/O off the import path.
 */
const STORAGE_KEY = 'tasted-analytics-consent';

interface ConsentState {
  analyticsEnabled: boolean;
  setAnalyticsEnabled: (value: boolean) => void;
}

export const useConsent = create<ConsentState>((set) => ({
  analyticsEnabled: true,
  setAnalyticsEnabled: (value) => {
    set({ analyticsEnabled: value });
    void AsyncStorage.setItem(STORAGE_KEY, value ? '1' : '0').catch(() => {});
  },
}));

/** Loads the saved choice into the store. Call once from an effect after mount. */
export async function hydrateConsent(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved !== null) useConsent.setState({ analyticsEnabled: saved === '1' });
  } catch {
    // no saved value or storage unavailable — default (enabled) stands
  }
}
