import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Local source of truth for the analytics opt-out toggle. Persisted so the
 * choice survives restarts; capture() reads it synchronously before sending.
 * Defaults to on (disclosed in the privacy policy); the Profile switch and the
 * onboarding consent flow flip it, and updates mirror to auth metadata.
 */
interface ConsentState {
  analyticsEnabled: boolean;
  setAnalyticsEnabled: (value: boolean) => void;
}

export const useConsent = create<ConsentState>()(
  persist(
    (set) => ({
      analyticsEnabled: true,
      setAnalyticsEnabled: (value) => set({ analyticsEnabled: value }),
    }),
    {
      name: 'tasted-consent',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
