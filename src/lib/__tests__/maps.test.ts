import { Platform } from 'react-native';

import { mapsEnabled } from '../maps';

let mockExtra: Record<string, unknown> | undefined;
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockExtra === undefined ? null : { extra: mockExtra };
    },
  },
}));

describe('mapsEnabled', () => {
  const original = Platform.OS;
  afterEach(() => {
    Platform.OS = original;
    mockExtra = undefined;
  });

  it('true solo en Android con la bandera encendida', () => {
    Platform.OS = 'android';
    mockExtra = { mapsEnabled: true };
    expect(mapsEnabled()).toBe(true);
    mockExtra = { mapsEnabled: false };
    expect(mapsEnabled()).toBe(false);
    mockExtra = {};
    expect(mapsEnabled()).toBe(false);
    mockExtra = undefined;
    expect(mapsEnabled()).toBe(false);
  });

  it('false en web aunque la bandera esté encendida', () => {
    Platform.OS = 'web';
    mockExtra = { mapsEnabled: true };
    expect(mapsEnabled()).toBe(false);
  });
});
