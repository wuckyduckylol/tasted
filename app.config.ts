import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Tasted',
  slug: 'tasted',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'tasted',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.tasted.app',
  },
  android: {
    package: 'com.tasted.app',
    adaptiveIcon: {
      backgroundColor: '#F290B9',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F290B9',
        image: './assets/images/splash-icon.png',
        imageWidth: 140,
      },
    ],
    'expo-secure-store',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    // Set in .env (never committed). See SPEC.md Section 15.
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? '',
  },
});
