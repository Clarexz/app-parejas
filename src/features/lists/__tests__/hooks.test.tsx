import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { List, ListItem } from '../api';
import {
  listKeys,
  useAddListItem,
  useLists,
  useReorderListItems,
  useToggleListItem,
} from '../hooks';

const mockFetchLists = jest.fn();
const mockAdd = jest.fn();
const mockToggle = jest.fn();
const mockReorder = jest.fn();
jest.mock('../api', () => ({
  fetchLists: (...a: unknown[]) => mockFetchLists(...a),
  fetchList: jest.fn(),
  fetchListItems: jest.fn(),
  saveList: jest.fn(),
  deleteList: jest.fn(),
  addListItem: (...a: unknown[]) => mockAdd(...a),
  updateListItem: jest.fn(),
  setListItemDone: (...a: unknown[]) => mockToggle(...a),
  deleteListItem: jest.fn(),
  clearDoneListItems: jest.fn(),
  reorderListItems: (...a: unknown[]) => mockReorder(...a),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({ couple: { id: 'c1' }, me: { id: 'u1' } }),
}));

const item = (id: string, position: number, done = false): ListItem => ({
  id,
  couple_id: 'c1',
  created_by: 'u1',
  done_by: done ? 'u2' : null,
  list_id: 'l1',
  text: id,
  done,
  done_at: done ? '2026-10-30T00:00:00Z' : null,
  position,
  created_at: '2026-10-30T00:00:00Z',
  updated_at: '2026-10-30T00:00:00Z',
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

const itemsOf = (client: QueryClient) =>
  client.getQueryData<ListItem[]>(listKeys.items('l1')) ?? [];

beforeEach(() => {
  mockFetchLists.mockReset();
  mockAdd.mockReset();
  mockToggle.mockReset();
  mockReorder.mockReset();
});

describe('useLists', () => {
  it('carga las listas de la pareja', async () => {
    mockFetchLists.mockResolvedValue([{ id: 'l1' } as List]);
    const { wrapper } = setup();
    const { result } = await renderHook(() => useLists(), { wrapper });
    await waitFor(() => expect(result.current.lists).toHaveLength(1));
    expect(mockFetchLists).toHaveBeenCalledWith('c1');
  });

  it('isError solo cuando no hay datos', async () => {
    mockFetchLists.mockRejectedValue(new Error('x'));
    const { wrapper } = setup();
    const { result } = await renderHook(() => useLists(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useToggleListItem', () => {
  it('tacha al instante con quién lo hizo y revierte si falla', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(listKeys.items('l1'), [item('a', 0), item('b', 1)]);
    let reject: (e: Error) => void = () => {};
    mockToggle.mockReturnValue(new Promise((_, r) => (reject = r)));
    const { result } = await renderHook(() => useToggleListItem(), { wrapper });

    await act(async () => {
      result.current.mutate({ listId: 'l1', id: 'a', done: true });
    });
    await waitFor(() => expect(itemsOf(client)[0].done).toBe(true));
    expect(itemsOf(client)[0].done_by).toBe('u1');

    await act(async () => {
      reject(new Error('boom'));
    });
    await waitFor(() => expect(itemsOf(client)[0].done).toBe(false));
  });
});

describe('useAddListItem', () => {
  it('muestra el renglón al instante y lo cambia por el real', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(listKeys.items('l1'), [item('a', 0)]);
    let resolve: (i: ListItem) => void = () => {};
    mockAdd.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = await renderHook(() => useAddListItem(), { wrapper });

    await act(async () => {
      result.current.mutate({ listId: 'l1', text: ' leche ' });
    });
    await waitFor(() => expect(itemsOf(client)).toHaveLength(2));
    expect(itemsOf(client)[1]).toMatchObject({ text: 'leche', position: 1 });
    expect(itemsOf(client)[1].id.startsWith('tmp-')).toBe(true);

    await act(async () => {
      resolve(item('real', 1));
    });
    await waitFor(() => expect(itemsOf(client).map((i) => i.id)).toEqual(['a', 'real']));
  });

  it('si falla, quita solo el renglón provisional', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(listKeys.items('l1'), [item('a', 0)]);
    mockAdd.mockRejectedValue(new Error('boom'));
    const { result } = await renderHook(() => useAddListItem(), { wrapper });
    await act(async () => {
      result.current.mutate({ listId: 'l1', text: 'x' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(itemsOf(client).map((i) => i.id)).toEqual(['a']);
  });
});

describe('useReorderListItems', () => {
  it('reordena al instante y revierte si el servidor rechaza el orden', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(listKeys.items('l1'), [item('a', 0), item('b', 1), item('c', 2)]);
    let reject: (e: Error) => void = () => {};
    mockReorder.mockReturnValue(new Promise((_, r) => (reject = r)));
    const { result } = await renderHook(() => useReorderListItems(), { wrapper });

    await act(async () => {
      result.current.mutate({ listId: 'l1', ids: ['c', 'a', 'b'] });
    });
    await waitFor(() => expect(itemsOf(client).map((i) => i.id)).toEqual(['c', 'a', 'b']));
    expect(mockReorder).toHaveBeenCalledWith('l1', ['c', 'a', 'b']);

    await act(async () => {
      reject(new Error('invalid_order'));
    });
    await waitFor(() => expect(itemsOf(client).map((i) => i.id)).toEqual(['a', 'b', 'c']));
  });
});
