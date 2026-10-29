import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme';

import ConnectionScreen from '../index';

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
    expect(screen.getByText('Servidor: conectado ✅')).toBeTruthy();
    expect(screen.getByText('api.example.com')).toBeTruthy();
    expect(screen.getByText('Latencia: 42 ms')).toBeTruthy();
  });

  it('muestra sin conexión y reintenta al presionar el botón', async () => {
    mockData = { auth: 'error', rest: 'error', status: 'offline', latencyMs: 10 };
    await renderScreen();
    expect(screen.getByText('Servidor: sin conexión ❌')).toBeTruthy();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(mockRefetch).toHaveBeenCalled();
  });
});
