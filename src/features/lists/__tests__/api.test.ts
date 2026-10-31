import {
  addListItem,
  clearDoneListItems,
  deleteList,
  fetchListItems,
  fetchLists,
  reorderListItems,
  saveList,
  setListItemDone,
} from '../api';

const mockRpc = jest.fn();
const mockFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...a: unknown[]) => mockRpc(...a),
    from: (...a: unknown[]) => mockFrom(...a),
  },
}));

/** Cadena de PostgREST que se resuelve (await) con `result`. */
function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'limit']) c[m] = jest.fn(() => c);
  c.then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res);
  return c;
}

beforeEach(() => {
  mockRpc.mockReset();
  mockFrom.mockReset();
});

describe('fetchLists', () => {
  it('calcula hechos y total de cada lista', async () => {
    mockFrom.mockReturnValue(
      chain({
        data: [
          {
            id: 'l1',
            title: 'Súper',
            kind: 'groceries',
            list_items: [
              { id: 'a', done: true },
              { id: 'b', done: false },
              { id: 'c', done: true },
            ],
          },
          { id: 'l2', title: 'Vacía', kind: 'other', list_items: null },
        ],
        error: null,
      }),
    );
    const lists = await fetchLists('c1');
    expect(mockFrom).toHaveBeenCalledWith('lists');
    expect(lists[0]).toMatchObject({ id: 'l1', itemCount: 3, doneCount: 2 });
    expect(lists[0]).not.toHaveProperty('list_items');
    expect(lists[1]).toMatchObject({ itemCount: 0, doneCount: 0 });
  });

  it('lanza el error del servidor', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: new Error('boom') }));
    await expect(fetchLists('c1')).rejects.toThrow('boom');
  });
});

describe('fetchListItems', () => {
  it('pide los renglones de la lista por posición', async () => {
    const c = chain({ data: [{ id: 'a' }], error: null });
    mockFrom.mockReturnValue(c);
    expect(await fetchListItems('l1')).toEqual([{ id: 'a' }]);
    expect(c.eq).toHaveBeenCalledWith('list_id', 'l1');
    expect(c.order).toHaveBeenCalledWith('position', { ascending: true });
  });
});

describe('RPC', () => {
  it('saveList crea (sin id) y recorta', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'l1' }, error: null });
    await saveList({ title: '  Súper ', kind: 'groceries', emoji: ' ' });
    expect(mockRpc).toHaveBeenCalledWith('save_list', {
      p_title: 'Súper',
      p_kind: 'groceries',
      p_emoji: undefined,
      p_id: undefined,
    });
  });

  it('saveList edita con id', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'l1' }, error: null });
    await saveList({ id: 'l1', title: 'Viaje', kind: 'trip', emoji: '✈️' });
    expect(mockRpc).toHaveBeenCalledWith('save_list', {
      p_title: 'Viaje',
      p_kind: 'trip',
      p_emoji: '✈️',
      p_id: 'l1',
    });
  });

  it('cada operación llama a su RPC', async () => {
    mockRpc.mockResolvedValue({ data: 2, error: null });
    await deleteList('l1');
    await addListItem('l1', ' leche ');
    await setListItemDone('i1', true);
    expect(await clearDoneListItems('l1')).toBe(2);
    await reorderListItems('l1', ['b', 'a']);
    expect(mockRpc.mock.calls.map((c) => c[0])).toEqual([
      'delete_list',
      'add_list_item',
      'set_list_item_done',
      'clear_done_list_items',
      'reorder_list_items',
    ]);
    expect(mockRpc).toHaveBeenCalledWith('add_list_item', { p_list_id: 'l1', p_text: 'leche' });
    expect(mockRpc).toHaveBeenCalledWith('reorder_list_items', {
      p_list_id: 'l1',
      p_ids: ['b', 'a'],
    });
  });

  it('propaga el error de la RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'invalid_order' } });
    await expect(reorderListItems('l1', [])).rejects.toEqual({ message: 'invalid_order' });
  });
});
