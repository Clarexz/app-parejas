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

// API key de Google Maps (secreto opcional): sin ella el APK compila igual, pero el mapa de las
// memorias es el "mapa de papel" propio en lugar de Google Maps.
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || undefined;

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
    // Distancia (Fase 8): solo ubicación aproximada. expo-location agrega también la precisa en su
    // manifiesto; aquí se bloquea para que Android solo ofrezca "Aproximada".
    blockedPermissions: ['android.permission.ACCESS_FINE_LOCATION'],
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
    // Galería y cámara (stories y memorias); sin micrófono (no grabamos video).
    [
      'expo-image-picker',
      {
        cameraPermission: 'Para tomar fotos de tus stories y memorias.',
        microphonePermission: false,
      },
    ],
    // Guardar fotos en la galería; solo imágenes. `isAccessMediaLocationEnabled` permite leer el GPS
    // del EXIF de las fotos de una memoria para proponer el lugar.
    ['expo-media-library', { granularPermissions: ['photo'], isAccessMediaLocationEnabled: true }],
    // Distancia (Fase 8): ubicación aproximada, opt-in y sin servicio en primer plano (sin
    // notificación fija). `isAndroidBackgroundLocationEnabled` pide "Permitir todo el tiempo" solo
    // si la persona elige el modo en segundo plano. Android no tiene textos de permiso en el
    // manifiesto: la explicación vive en la pantalla Distancia.
    [
      'expo-location',
      {
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: false,
      },
    ],
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
          {
            name: 'PartnerStory',
            label: 'Story de tu pareja',
            description: 'Lo último que pegó tu pareja, sin abrir la app.',
            previewImage: widgetPreview('PartnerStory'),
            ...WIDGET_DEFAULTS,
          },
          {
            name: 'Distance',
            label: 'Distancia',
            description: 'A cuántos kilómetros están ahorita.',
            previewImage: widgetPreview('Distance'),
            ...WIDGET_DEFAULTS,
          },
        ],
      },
    ],
    './plugins/with-android-signing',
    ...(googleMapsApiKey
      ? [['react-native-maps', { androidGoogleMapsApiKey: googleMapsApiKey }] as [string, object]]
      : []),
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    mapsEnabled: Boolean(googleMapsApiKey),
  },
});
