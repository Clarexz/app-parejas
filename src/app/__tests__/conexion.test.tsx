import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme';

import ConnectionScreen from '../conexion';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockRefetch = jest.fn();
let mockData: unknown;

jest.mock('@/lib/useServerHealth', () => ({
  useServerHealth: () => ({ data: mockData, isFetching: false, refetch: mockRefetch }),
}));
jest.mock('@/lib/supabase', () => ({ supabaseUrl: 'https://api.example.com/path' }));

const renderScreen = () =>
  render(
    <ThemeProvider>
      <ConnectionScreen />
    </ThemeProvider>,
  );

describe('ConnectionScreen', () => {
  it('muestra servidor conectado, host y latencia', async () => {
    mockData = { auth: 'ok', rest: 'ok', status: 'connected', latencyMs: 42 };
    await renderScreen();
    expect(screen.getByText('App Parejas')).toBeTruthy();
    expect(screen.getByText('Conectados con el servidor')).toBeTruthy();
    expect(screen.getByText('api.example.com')).toBeTruthy();
    expect(screen.getByText('42 ms')).toBeTruthy();
  });

  it('muestra sin conexión y reintenta al presionar el botón', async () => {
    mockData = { auth: 'error', rest: 'error', status: 'offline', latencyMs: 10 };
    await renderScreen();
    expect(screen.getByText('Sin conexión')).toBeTruthy();
    expect(
      screen.getByText('No hay señal con el servidor. Revisa tu internet y vuelve a intentar.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('muestra el estado de verificación mientras no hay datos', async () => {
    mockData = undefined;
    await renderScreen();
    expect(screen.getByText('Revisando el servidor…')).toBeTruthy();
  });

  it('abre el catálogo con una pulsación larga sobre el título', async () => {
    mockData = { auth: 'ok', rest: 'ok', status: 'connected', latencyMs: 42 };
    await renderScreen();
    await fireEvent(screen.getByText('App Parejas'), 'longPress');
    expect(mockPush).toHaveBeenCalledWith('/catalogo');
  });
});
