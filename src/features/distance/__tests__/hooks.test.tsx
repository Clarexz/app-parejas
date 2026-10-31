import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { useDistance, useLocations, useLocationSync } from '../hooks';

const mockFetch = jest.fn();
const mockRemoveChannel = jest.fn();
const mockOn = jest.fn();
const channel = { on: (...a: unknown[]) => (mockOn(...a), channel), subscribe: () => channel };
jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: () => channel,
    removeChannel: (...a: unknown[]) => mockRemoveChannel(...a),
  },
}));
jest.mock('../api', () => ({ fetchLocations: (...a: unknown[]) => mockFetch(...a) }));
jest.mock('@/features/auth', () => ({ useSession: () => ({ user: { id: 'me' } }) }));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({
    couple: { id: 'c1' },
    me: { id: 'me', display_name: 'Ale', nickname: null },
    partner: { id: 'her', display_name: 'Caleb', nickname: 'Cale' },
  }),
}));

const mockShareNow = jest.fn(async () => 'sent');
const mockFg = jest.fn();
const mockBg = jest.fn();
const mockRunning = jest.fn();
const mockStart = jest.fn(async () => undefined);
const mockMode = jest.fn();
jest.mock('../locationService', () => ({
  isLocationSupported: () => true,
  shareNow: () => mockShareNow(),
  getForegroundPermission: () => mockFg(),
  getBackgroundPermission: () => mockBg(),
  isBackgroundRunning: () => mockRunning(),
  startBackground: () => mockStart(),
  applyShareMode: jest.fn(),
}));
jest.mock('../preferences', () => ({ readShareMode: () => mockMode() }));

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

const rows = [
  { user_id: 'me', couple_id: 'c1', lat: 19.43, lng: -99.13, city: 'CDMX', updated_at: 'x' },
  { user_id: 'her', couple_id: 'c1', lat: 25.67, lng: -100.31, city: 'Monterrey', updated_at: 'x' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue(rows);
  mockFg.mockResolvedValue({ granted: true });
  mockBg.mockResolvedValue({ granted: true });
  mockRunning.mockResolvedValue(true);
});

describe('useLocations / useDistance', () => {
  it('trae las filas y escucha Realtime (incluye DELETE)', async () => {
    const { result, unmount } = await renderHook(() => useLocations(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect(mockFetch).toHaveBeenCalledWith('c1');
    const events = mockOn.mock.calls.map((c) => (c[1] as { event: string }).event);
    expect(events).toEqual(['*', 'DELETE']);
    await unmount();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('entrega lo que ve la UI', async () => {
    const { result } = await renderHook(() => useDistance(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.kind).toBe('both'));
    expect(result.current.kmText).toMatch(/km$/);
    expect(result.current.route).toBe('CDMX ↔ Monterrey');
    expect(result.current.partnerName).toBe('Cale');
  });

  it('un error de lectura se marca en isError', async () => {
    mockFetch.mockRejectedValue(new Error('x'));
    const { result } = await renderHook(() => useDistance(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.kind).toBe('none');
  });
});

describe('useLocationSync', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'android'));

  it('con la distancia apagada no lee ni manda nada', async () => {
    mockMode.mockResolvedValue('off');
    await renderHook(() => useLocationSync());
    await new Promise((r) => setTimeout(r, 0));
    expect(mockShareNow).not.toHaveBeenCalled();
    expect(mockFg).not.toHaveBeenCalled();
  });

  it('con modo activo y permiso manda la ubicación', async () => {
    mockMode.mockResolvedValue('foreground');
    await renderHook(() => useLocationSync());
    await waitFor(() => expect(mockShareNow).toHaveBeenCalledTimes(1));
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('sin permiso no manda ni pide nada', async () => {
    mockMode.mockResolvedValue('foreground');
    mockFg.mockResolvedValue({ granted: false });
    await renderHook(() => useLocationSync());
    await waitFor(() => expect(mockFg).toHaveBeenCalled());
    expect(mockShareNow).not.toHaveBeenCalled();
  });

  it('en segundo plano reinicia la tarea si no corre', async () => {
    mockMode.mockResolvedValue('background');
    mockRunning.mockResolvedValue(false);
    await renderHook(() => useLocationSync());
    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));
    expect(mockShareNow).toHaveBeenCalled();
  });

  it('al volver a primer plano vuelve a intentar', async () => {
    mockMode.mockResolvedValue('foreground');
    let listener: ((s: string) => void) | undefined;
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation(((
      _t: string,
      cb: (s: string) => void,
    ) => {
      listener = cb;
      return { remove: jest.fn() };
    }) as never);
    await renderHook(() => useLocationSync());
    await waitFor(() => expect(mockShareNow).toHaveBeenCalledTimes(1));
    listener?.('active');
    await waitFor(() => expect(mockShareNow).toHaveBeenCalledTimes(2));
    spy.mockRestore();
  });
});
