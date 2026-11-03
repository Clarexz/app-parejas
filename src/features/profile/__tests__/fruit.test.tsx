import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { setFruit } from '../api';
import { useSetFruit } from '../hooks';

const mockRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...a: unknown[]) => mockRpc(...a) },
}));
jest.mock('@/features/auth', () => ({ useSession: () => ({ user: { id: 'u1' } }) }));

const me = { id: 'u1', display_name: 'Ale', fruit: 'mango' };
const couple = { couple: { id: 'c1' }, members: [], me, partner: { id: 'u2', fruit: null } };

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['couple', 'u1'], couple);
  client.setQueryData(['profile', 'u1'], me);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => mockRpc.mockReset());

describe('setFruit', () => {
  it('llama a la RPC y devuelve la fruta', async () => {
    mockRpc.mockResolvedValue({ data: 'uva', error: null });
    await expect(setFruit('uva')).resolves.toBe('uva');
    expect(mockRpc).toHaveBeenCalledWith('set_fruit', { p_fruit: 'uva' });
  });

  it('propaga el error del servidor', async () => {
    const error = { code: 'P0001', message: 'fruit_taken' };
    mockRpc.mockResolvedValue({ data: null, error });
    await expect(setFruit('uva')).rejects.toBe(error);
  });
});

describe('useSetFruit', () => {
  it('pinta la fruta de inmediato (optimista)', async () => {
    let resolve: (v: unknown) => void = () => {};
    mockRpc.mockReturnValue(new Promise((r) => (resolve = r)));
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useSetFruit(), { wrapper });
    let pending: Promise<unknown> = Promise.resolve();
    await act(async () => {
      pending = result.current.mutateAsync('uva');
    });
    expect((client.getQueryData(['couple', 'u1']) as typeof couple).me.fruit).toBe('uva');
    expect((client.getQueryData(['profile', 'u1']) as typeof me).fruit).toBe('uva');
    await act(async () => {
      resolve({ data: 'uva', error: null });
      await pending;
    });
  });

  it('regresa a la fruta anterior si el servidor la rechaza', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'fruit_taken' } });
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useSetFruit(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('sandia').catch(() => {});
    });
    expect((client.getQueryData(['couple', 'u1']) as typeof couple).me.fruit).toBe('mango');
    expect((client.getQueryData(['profile', 'u1']) as typeof me).fruit).toBe('mango');
  });
});
