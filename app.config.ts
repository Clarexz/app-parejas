import type { ConfigContext, ExpoConfig } from 'expo/config';

import { ANDROID_PACKAGE, APP_NAME, APP_SCHEME } from './src/constants/app';

// En CI, release-apk.yml define APP_VERSION (tag sin la "v") y APP_VERSION_CODE (run number).
const version = process.env.APP_VERSION ?? '0.0.0';
const versionCode = Number(process.env.APP_VERSION_CODE ?? '1');

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: 'app-parejas',
  version,
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: APP_SCHEME,
  userInterfaceStyle: 'automatic',
  platforms: ['android', 'web'],
  android: {
    package: ANDROID_PACKAGE,
    versionCode,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  // Web solo se usa en desarrollo para QA visual (npm run shots).
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-secure-store',
    './plugins/with-android-signing',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  },
});
