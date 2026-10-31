import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Memory } from '../api';
import { memoryKeys, useDeleteMemory, useMemories, useMemory, useOnThisDay } from '../hooks';

const mockFetchMemories = jest.fn();
const mockFetchMemory = jest.fn();
const mockDeleteMemory = jest.fn();
jest.mock('../api', () => ({
  fetchMemories: (...a: unknown[]) => mockFetchMemories(...a),
  fetchMemory: (...a: unknown[]) => mockFetchMemory(...a),
  deleteMemory: (...a: unknown[]) => mockDeleteMemory(...a),
  saveMemory: jest.fn(),
  savePhotoToGallery: jest.fn(),
  memoryMediaUrls: jest.fn(),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({ couple: { id: 'c1' } }),
  useToday: () => ({ today: '2026-10-31', timeZone: 'America/Mexico_City' }),
}));

const memory = (id: string, happened_on: string): Memory => ({
  id,
  couple_id: 'c1',
  created_by: 'u1',
  title: id,
  body: null,
  happened_on,
  lat: null,
  lng: null,
  place_name: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  photos: [],
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => {
  mockFetchMemories.mockReset();
  mockFetchMemory.mockReset();
  mockDeleteMemory.mockReset();
});

describe('useMemories', () => {
  it('carga las memorias de la pareja', async () => {
    mockFetchMemories.mockResolvedValue([memory('a', '2026-10-01')]);
    const { wrapper } = setup();
    const { result } = await renderHook(() => useMemories(), { wrapper });
    await waitFor(() => expect(result.current.memories).toHaveLength(1));
    expect(mockFetchMemories).toHaveBeenCalledWith('c1');
    expect(result.current.isError).toBe(false);
  });

  it('isError solo cuando no hay datos', async () => {
    mockFetchMemories.mockRejectedValue(new Error('x'));
    const { wrapper } = setup();
    const { result } = await renderHook(() => useMemories(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.memories).toEqual([]);
  });
});

describe('useMemory', () => {
  it('arranca con la memoria de la lista en caché y luego la carga', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(memoryKeys.list('c1'), [memory('a', '2026-10-01')]);
    mockFetchMemory.mockResolvedValue({ ...memory('a', '2026-10-01'), title: 'Fresca' });
    const { result } = await renderHook(() => useMemory('a'), { wrapper });
    expect(result.current.memory?.title).toBe('a');
    await waitFor(() => expect(result.current.memory?.title).toBe('Fresca'));
  });

  it('sin id no consulta', async () => {
    const { wrapper } = setup();
    const { result } = await renderHook(() => useMemory(null), { wrapper });
    expect(result.current.memory).toBeNull();
    expect(mockFetchMemory).not.toHaveBeenCalled();
  });
});

describe('useOnThisDay', () => {
  it('usa el "hoy" de la pareja', async () => {
    mockFetchMemories.mockResolvedValue([
      memory('a', '2025-10-31'),
      memory('b', '2025-10-30'),
      memory('c', '2024-10-31'),
    ]);
    const { wrapper } = setup();
    const { result } = await renderHook(() => useOnThisDay(), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.items.map((i) => [i.memory.id, i.yearsAgo])).toEqual([
      ['a', 1],
      ['c', 2],
    ]);
  });
});

describe('useDeleteMemory', () => {
  it('quita la memoria de la lista al instante y la restaura si falla', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(memoryKeys.list('c1'), [
      memory('a', '2026-10-01'),
      memory('b', '2026-09-01'),
    ]);
    let reject: (e: Error) => void = () => {};
    mockDeleteMemory.mockReturnValue(new Promise((_, r) => (reject = r)));
    const { result } = await renderHook(() => useDeleteMemory(), { wrapper });
    act(() => result.current.mutate('a'));
    await waitFor(() =>
      expect((client.getQueryData(memoryKeys.list('c1')) as Memory[]).map((m) => m.id)).toEqual([
        'b',
      ]),
    );
    mockFetchMemories.mockResolvedValue([memory('a', '2026-10-01'), memory('b', '2026-09-01')]);
    await act(async () => reject(new Error('fallo')));
    await waitFor(() =>
      expect((client.getQueryData(memoryKeys.list('c1')) as Memory[]).map((m) => m.id)).toEqual([
        'a',
        'b',
      ]),
    );
  });
});
