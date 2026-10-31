import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  applyShareMode,
  BACKGROUND_DISTANCE_M,
  BACKGROUND_INTERVAL_MS,
  LOCATION_TASK,
  readApproxPosition,
  sendLocation,
} from '../locationService';
import { readLastSent, readShareMode } from '../preferences';

const mockSet = jest.fn(async (..._a: unknown[]) => ({}));
const mockClear = jest.fn(async () => undefined);
jest.mock('../api', () => ({
  setMyLocation: (...a: unknown[]) => mockSet(...a),
  clearMyLocation: () => mockClear(),
}));

jest.mock('expo-location', () => ({
  Accuracy: { Low: 2 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getBackgroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  hasStartedLocationUpdatesAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(async () => undefined),
  stopLocationUpdatesAsync: jest.fn(async () => undefined),
}));
const mockLoc = jest.requireMock('expo-location') as Record<string, jest.Mock>;
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const granted = { granted: true, canAskAgain: true, status: 'granted' };
const denied = { granted: false, canAskAgain: false, status: 'denied' };
const asking = { granted: false, canAskAgain: true, status: 'undetermined' };
const pos = (latitude: number, longitude: number) => ({ coords: { latitude, longitude } });

beforeEach(async () => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'android');
  await AsyncStorage.clear();
  mockLoc.getLastKnownPositionAsync.mockResolvedValue(pos(19.4326, -99.1332));
  mockLoc.reverseGeocodeAsync.mockResolvedValue([{ city: 'Ciudad de México' }]);
  mockLoc.hasStartedLocationUpdatesAsync.mockResolvedValue(false);
  mockLoc.getForegroundPermissionsAsync.mockResolvedValue(granted);
  mockLoc.getBackgroundPermissionsAsync.mockResolvedValue(granted);
});

describe('readApproxPosition', () => {
  it('redondea a ~1 km y usa la última conocida', async () => {
    expect(await readApproxPosition()).toEqual({ lat: 19.43, lng: -99.13 });
    expect(mockLoc.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('sin última conocida pide una lectura de precisión baja', async () => {
    mockLoc.getLastKnownPositionAsync.mockResolvedValue(null);
    mockLoc.getCurrentPositionAsync.mockResolvedValue(pos(25.671, -100.309));
    expect(await readApproxPosition()).toEqual({ lat: 25.67, lng: -100.31 });
    expect(mockLoc.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 2 });
  });

  it('si falla devuelve null', async () => {
    mockLoc.getLastKnownPositionAsync.mockRejectedValue(new Error('apagada'));
    expect(await readApproxPosition()).toBeNull();
  });
});

describe('sendLocation', () => {
  const here = { lat: 19.43, lng: -99.13 };

  it('manda con ciudad y guarda el envío', async () => {
    expect(await sendLocation(here, { now: 1_000 })).toBe('sent');
    expect(mockSet).toHaveBeenCalledWith({ lat: 19.43, lng: -99.13, city: 'Ciudad de México' });
    expect(await readLastSent()).toEqual({ ...here, at: 1_000 });
  });

  it('respeta el throttle y `force` lo salta', async () => {
    await sendLocation(here, { now: 1_000 });
    expect(await sendLocation(here, { now: 2_000 })).toBe('skipped');
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(await sendLocation(here, { now: 2_000, force: true })).toBe('sent');
  });

  it('sin geocodificación manda sin ciudad', async () => {
    mockLoc.reverseGeocodeAsync.mockRejectedValue(new Error('web'));
    await sendLocation(here, { now: 1 });
    expect(mockSet).toHaveBeenCalledWith({ lat: 19.43, lng: -99.13, city: null });
  });
});

describe('applyShareMode', () => {
  it('foreground: pide permiso, guarda el modo y manda enseguida', async () => {
    mockLoc.getForegroundPermissionsAsync.mockResolvedValue(asking);
    mockLoc.requestForegroundPermissionsAsync.mockResolvedValue(granted);
    const r = await applyShareMode('u1', 'foreground');
    expect(r).toEqual({ ok: true, mode: 'foreground', position: true });
    expect(await readShareMode('u1')).toBe('foreground');
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockLoc.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('permiso denegado: no guarda nada ni manda', async () => {
    mockLoc.getForegroundPermissionsAsync.mockResolvedValue(asking);
    mockLoc.requestForegroundPermissionsAsync.mockResolvedValue(denied);
    const r = await applyShareMode('u1', 'foreground');
    expect(r).toMatchObject({ ok: false, reason: 'denied', canAskAgain: false });
    expect(await readShareMode('u1')).toBe('off');
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('background: pide primero el de primer plano y arranca la tarea de baja frecuencia', async () => {
    mockLoc.getForegroundPermissionsAsync.mockResolvedValue(asking);
    mockLoc.requestForegroundPermissionsAsync.mockResolvedValue(granted);
    mockLoc.getBackgroundPermissionsAsync.mockResolvedValue(asking);
    mockLoc.requestBackgroundPermissionsAsync.mockResolvedValue(granted);
    const r = await applyShareMode('u1', 'background');
    expect(r).toMatchObject({ ok: true, mode: 'background' });
    const order = [
      mockLoc.requestForegroundPermissionsAsync.mock.invocationCallOrder[0],
      mockLoc.requestBackgroundPermissionsAsync.mock.invocationCallOrder[0],
    ];
    expect(order[0]).toBeLessThan(order[1]);
    const [task, options] = mockLoc.startLocationUpdatesAsync.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];
    expect(task).toBe(LOCATION_TASK);
    expect(options).toMatchObject({
      accuracy: 2,
      distanceInterval: BACKGROUND_DISTANCE_M,
      timeInterval: BACKGROUND_INTERVAL_MS,
      deferredUpdatesInterval: BACKGROUND_INTERVAL_MS,
    });
    // Sin servicio en primer plano: no hay notificación fija.
    expect(options).not.toHaveProperty('foregroundService');
    expect(await readShareMode('u1')).toBe('background');
  });

  it('background negado: queda en primer plano y lo avisa', async () => {
    mockLoc.getBackgroundPermissionsAsync.mockResolvedValue(asking);
    mockLoc.requestBackgroundPermissionsAsync.mockResolvedValue(denied);
    const r = await applyShareMode('u1', 'background');
    expect(r).toMatchObject({ ok: false, reason: 'background_denied', mode: 'foreground' });
    expect(mockLoc.startLocationUpdatesAsync).not.toHaveBeenCalled();
    expect(await readShareMode('u1')).toBe('foreground');
  });

  it('off: detiene la tarea, borra la ubicación y olvida el modo', async () => {
    await applyShareMode('u1', 'foreground');
    mockLoc.hasStartedLocationUpdatesAsync.mockResolvedValue(true);
    const r = await applyShareMode('u1', 'off');
    expect(r).toEqual({ ok: true, mode: 'off', position: false });
    expect(mockLoc.stopLocationUpdatesAsync).toHaveBeenCalledWith(LOCATION_TASK);
    expect(mockClear).toHaveBeenCalledTimes(1);
    expect(await readShareMode('u1')).toBe('off');
    expect(await readLastSent()).toBeNull();
  });

  it('off: si el servidor no borra, lanza y conserva el modo', async () => {
    await applyShareMode('u1', 'foreground');
    mockClear.mockRejectedValueOnce(new Error('sin red'));
    await expect(applyShareMode('u1', 'off')).rejects.toThrow('sin red');
    expect(await readShareMode('u1')).toBe('foreground');
  });

  it('el modo guardado es de cada persona', async () => {
    await applyShareMode('u1', 'foreground');
    expect(await readShareMode('u2')).toBe('off');
  });
});
