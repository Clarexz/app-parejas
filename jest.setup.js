// Worklets no corre en Node sin su mock oficial; Reanimated usa el resolver de jest.config.js.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));

// expo-notifications necesita módulos nativos: en Jest se simula lo mínimo (sin permisos ni tokens).
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5, HIGH: 6 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ status: 'undetermined', canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'denied', canAskAgain: false })),
  getDevicePushTokenAsync: jest.fn(async () => {
    throw new Error('sin token en pruebas');
  }),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  useLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponseAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
}));

// react-native-maps registra un módulo nativo (Fabric) al importarse: en Jest se simula con vistas
// vacías. La pantalla real usa MapView solo en Android con GOOGLE_MAPS_API_KEY (ver src/lib/maps.ts).
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const make = (name) => {
    const Component = React.forwardRef((props, ref) =>
      React.createElement(View, { ...props, ref, testID: props.testID ?? name }),
    );
    Component.displayName = name;
    return Component;
  };
  const MapView = make('MapView');
  return {
    __esModule: true,
    default: MapView,
    MapView,
    Marker: make('Marker'),
    Callout: make('Callout'),
    PROVIDER_GOOGLE: 'google',
    PROVIDER_DEFAULT: null,
  };
});
