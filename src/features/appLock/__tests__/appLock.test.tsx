import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppState, Platform, Text as RNText } from 'react-native';

import { ThemeProvider } from '@/theme';

import { AppLockGate } from '../AppLockGate';
import { AppLockOptions, AppLockRow } from '../AppLockSettings';
import { clearAppLock, hydrateAppLock, setAppLockEnabled, useAppLockStore } from '../store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-local-authentication', () => ({
  authenticateAsync: jest.fn(),
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
}));

const auth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;
const originalOS = Platform.OS;

const setOS = (os: 'android' | 'web') => {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
};

const mountGate = () =>
  render(
    <ThemeProvider>
      <AppLockGate>
        <RNText>contenido</RNText>
      </AppLockGate>
    </ThemeProvider>,
  );

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await clearAppLock();
  useAppLockStore.setState({ hydrated: false, unlocked: false });
  setOS('android');
});

afterAll(() => setOS(originalOS as 'android'));

describe('store', () => {
  it('guarda, lee y borra la preferencia', async () => {
    setAppLockEnabled(true);
    await waitFor(async () => expect(await AsyncStorage.getItem('app-lock:v1')).toBeTruthy());
    useAppLockStore.setState({ enabled: false });
    await hydrateAppLock();
    expect(useAppLockStore.getState().enabled).toBe(true);
    await clearAppLock();
    expect(await AsyncStorage.getItem('app-lock:v1')).toBeNull();
    expect(useAppLockStore.getState().enabled).toBe(false);
  });
});

describe('AppLockGate', () => {
  it('apagado: muestra el contenido sin bloqueo', async () => {
    await mountGate();
    await waitFor(() => expect(screen.queryByTestId('lock-screen')).toBeNull());
    expect(screen.getByText('contenido')).toBeTruthy();
    expect(auth.authenticateAsync).not.toHaveBeenCalled();
  });

  it('en web nunca bloquea', async () => {
    setOS('web');
    await AsyncStorage.setItem('app-lock:v1', JSON.stringify({ enabled: true, timeout: '1m' }));
    await mountGate();
    expect(screen.queryByTestId('lock-screen')).toBeNull();
  });

  it('arranque en frío con bloqueo: cubre, pide huella sola y se abre al pasar', async () => {
    await AsyncStorage.setItem('app-lock:v1', JSON.stringify({ enabled: true, timeout: '1m' }));
    auth.authenticateAsync.mockResolvedValue({ success: true });
    await mountGate();
    await waitFor(() => expect(auth.authenticateAsync).toHaveBeenCalledTimes(1));
    expect(auth.authenticateAsync).toHaveBeenCalledWith({
      promptMessage: 'Desbloquear ahorita',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });
    await waitFor(() => expect(screen.queryByTestId('lock-screen')).toBeNull());
  });

  it('si cancelan, sigue bloqueado y el botón reintenta', async () => {
    await AsyncStorage.setItem('app-lock:v1', JSON.stringify({ enabled: true, timeout: '1m' }));
    auth.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' } as never);
    await mountGate();
    await waitFor(() => expect(auth.authenticateAsync).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Desbloquear')).toBeTruthy();
    auth.authenticateAsync.mockResolvedValue({ success: true });
    await fireEvent.press(screen.getByText('Desbloquear'));
    await waitFor(() => expect(screen.queryByTestId('lock-screen')).toBeNull());
  });

  it('tapa el contenido al pasar a segundo plano', async () => {
    await AsyncStorage.setItem('app-lock:v1', JSON.stringify({ enabled: true, timeout: '5m' }));
    auth.authenticateAsync.mockResolvedValue({ success: true });
    let handler: (s: string) => void = () => {};
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, h: never) => {
      handler = h;
      return { remove: jest.fn() };
    }) as never);
    await mountGate();
    await waitFor(() => expect(screen.queryByTestId('lock-screen')).toBeNull());
    await act(async () => handler('background'));
    expect(screen.getByTestId('lock-screen')).toBeTruthy();
    // Regresa antes del plazo: se destapa sin pedir huella otra vez.
    await act(async () => handler('active'));
    expect(screen.queryByTestId('lock-screen')).toBeNull();
    expect(auth.authenticateAsync).toHaveBeenCalledTimes(1);
  });
});

describe('AppLockRow', () => {
  const mountRow = () =>
    render(
      <ThemeProvider>
        <AppLockRow />
        <AppLockOptions />
      </ThemeProvider>,
    );

  it('sin huella ni bloqueo de pantalla: avisa y no activa', async () => {
    auth.hasHardwareAsync.mockResolvedValue(true);
    auth.isEnrolledAsync.mockResolvedValue(false);
    await mountRow();
    await fireEvent.press(screen.getByRole('switch'));
    expect(await screen.findByText(/Primero configura una huella/)).toBeTruthy();
    expect(useAppLockStore.getState().enabled).toBe(false);
    expect(auth.authenticateAsync).not.toHaveBeenCalled();
  });

  it('con huella: confirma antes de guardar y muestra el tiempo', async () => {
    auth.hasHardwareAsync.mockResolvedValue(true);
    auth.isEnrolledAsync.mockResolvedValue(true);
    auth.authenticateAsync.mockResolvedValue({ success: true });
    await mountRow();
    await fireEvent.press(screen.getByRole('switch'));
    await waitFor(() => expect(useAppLockStore.getState().enabled).toBe(true));
    expect(await screen.findByText('5 minutos')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('5 minutos'));
    expect(useAppLockStore.getState().timeout).toBe('5m');
  });

  it('si no confirma, no se activa', async () => {
    auth.hasHardwareAsync.mockResolvedValue(true);
    auth.isEnrolledAsync.mockResolvedValue(true);
    auth.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' } as never);
    await mountRow();
    await fireEvent.press(screen.getByRole('switch'));
    await waitFor(() => expect(auth.authenticateAsync).toHaveBeenCalled());
    expect(useAppLockStore.getState().enabled).toBe(false);
  });
});
