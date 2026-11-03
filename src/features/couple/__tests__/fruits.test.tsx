import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { CoupleState } from '../api';
import { useFruits } from '../hooks';

const mockFetch = jest.fn();
jest.mock('../api', () => ({
  EMPTY_COUPLE_STATE: { couple: null, members: [], me: null, partner: null },
  fetchCoupleState: (...a: unknown[]) => mockFetch(...a),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/features/auth', () => ({ useSession: () => ({ user: { id: 'b' } }) }));

type P = CoupleState['me'];
const profile = (id: string, fruit: string | null) => ({ id, fruit }) as P;
const state = (me: P, partner: P): CoupleState => ({
  couple: { id: 'c1' } as CoupleState['couple'],
  members: [],
  me,
  partner,
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

beforeEach(() => mockFetch.mockReset());

describe('useFruits', () => {
  it('sin datos: Sandía y sin pareja', async () => {
    mockFetch.mockResolvedValue({ couple: null, members: [], me: null, partner: null });
    const { wrapper } = setup();
    const { result } = await renderHook(() => useFruits(), { wrapper });
    expect(result.current.me.key).toBe('sandia');
    expect(result.current.partner).toBeNull();
  });

  it('ninguno eligió: Sandía para el id menor y Mango para el mayor', async () => {
    mockFetch.mockResolvedValue(state(profile('b', null), profile('a', null)));
    const { wrapper } = setup();
    const { result } = await renderHook(() => useFruits(), { wrapper });
    await waitFor(() => expect(result.current.partner?.key).toBe('sandia'));
    expect(result.current.me.key).toBe('mango');
    expect(result.current.me.hex).toBe('#FFC24B');
  });

  it('solo tu pareja eligió: tomas la sugerida', async () => {
    mockFetch.mockResolvedValue(state(profile('b', null), profile('a', 'uva')));
    const { wrapper } = setup();
    const { result } = await renderHook(() => useFruits(), { wrapper });
    await waitFor(() => expect(result.current.partner?.key).toBe('uva'));
    expect(result.current.me.key).toBe('limon');
  });

  it('sin pareja: tu fruta', async () => {
    mockFetch.mockResolvedValue(state(profile('b', 'pitaya'), null));
    const { wrapper } = setup();
    const { result } = await renderHook(() => useFruits(), { wrapper });
    await waitFor(() => expect(result.current.me.key).toBe('pitaya'));
    expect(result.current.partner).toBeNull();
  });
});
