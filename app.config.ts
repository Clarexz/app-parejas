import { existsSync } from 'node:fs';

import type { ConfigContext, ExpoConfig } from 'expo/config';

import { ANDROID_PACKAGE, APP_NAME, APP_SCHEME } from './src/constants/app.ts';

// En CI, release-apk.yml define APP_VERSION (tag sin la "v") y APP_VERSION_CODE (run number).
const version = process.env.APP_VERSION ?? '0.0.0';
const versionCode = Number(process.env.APP_VERSION_CODE ?? '1');
// google-services.json (Firebase, para push) no va en git: release-apk.yml lo decodifica del
// secreto GOOGLE_SERVICES_JSON_BASE64. Sin él el APK compila igual, pero sin push remoto.
const googleServicesFile = existsSync('./google-services.json')
  ? './google-services.json'
  : undefined;

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
      backgroundColor: '#F7F4EC',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    googleServicesFile,
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
        backgroundColor: '#F7F4EC',
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        dark: { backgroundColor: '#23201B', image: './assets/images/splash-icon.png' },
      },
    ],
    'expo-secure-store',
    // Solo galería: sin cámara ni micrófono (el picker los pide por defecto para video).
    ['expo-image-picker', { cameraPermission: false, microphonePermission: false }],
    [
      'expo-notifications',
      {
        // Ícono pequeño de la barra de estado: blanco sobre transparente (npm run brand).
        icon: './assets/images/notification-icon.png',
        color: '#1E3270',
        defaultChannel: 'actividad',
      },
    ],
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
