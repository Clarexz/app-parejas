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

// Vistas previas del selector de widgets: las genera el diseño; si aún no existen se omiten.
const widgetPreview = (name: string) => {
  const path = `./assets/widgets/${name}.png`;
  return existsSync(path) ? (path as `./${string}`) : undefined;
};

const WIDGET_DEFAULTS = {
  minWidth: '110dp',
  minHeight: '110dp',
  targetCellWidth: 2,
  targetCellHeight: 2,
  maxResizeWidth: '320dp',
  maxResizeHeight: '220dp',
  resizeMode: 'horizontal|vertical',
  updatePeriodMillis: 1800000,
  widgetCategory: 'home_screen',
} as const;

const GOOGLE_FONTS = './node_modules/@expo-google-fonts';

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
    // Galería y cámara (stories, Fase 6); sin micrófono (no grabamos video).
    [
      'expo-image-picker',
      { cameraPermission: 'Para tomar la foto de tu story.', microphonePermission: false },
    ],
    // Guardar fotos de stories en la galería; solo imágenes, sin ubicación de la foto.
    ['expo-media-library', { granularPermissions: ['photo'], isAccessMediaLocationEnabled: false }],
    [
      'expo-notifications',
      {
        // Ícono pequeño de la barra de estado: blanco sobre transparente (npm run brand).
        icon: './assets/images/notification-icon.png',
        color: '#1E3270',
        defaultChannel: 'actividad',
      },
    ],
    [
      'react-native-android-widget',
      {
        fonts: [
          `${GOOGLE_FONTS}/gochi-hand/400Regular/GochiHand_400Regular.ttf`,
          `${GOOGLE_FONTS}/figtree/400Regular/Figtree_400Regular.ttf`,
          `${GOOGLE_FONTS}/figtree/600SemiBold/Figtree_600SemiBold.ttf`,
          `${GOOGLE_FONTS}/figtree/700Bold/Figtree_700Bold.ttf`,
          `${GOOGLE_FONTS}/courier-prime/400Regular/CourierPrime_400Regular.ttf`,
          `${GOOGLE_FONTS}/courier-prime/700Bold/CourierPrime_700Bold.ttf`,
        ],
        widgets: [
          {
            name: 'DaysTogether',
            label: 'Días juntos',
            description: 'Cuántos días llevan juntos.',
            previewImage: widgetPreview('DaysTogether'),
            ...WIDGET_DEFAULTS,
          },
          {
            name: 'PartnerMood',
            label: 'Mood de mi pareja',
            description: 'Cómo anda tu pareja ahorita.',
            previewImage: widgetPreview('PartnerMood'),
            ...WIDGET_DEFAULTS,
          },
          {
            name: 'Countdown',
            label: 'Cuenta regresiva',
            description: 'Cuánto falta para su próxima fecha especial.',
            previewImage: widgetPreview('Countdown'),
            ...WIDGET_DEFAULTS,
          },
        ],
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
