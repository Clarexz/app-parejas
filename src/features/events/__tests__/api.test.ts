import { deleteEvent, fetchEvents, saveEvent } from '../api';

const mockRpc = jest.fn();
const mockFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...a: unknown[]) => mockRpc(...a),
    from: (...a: unknown[]) => mockFrom(...a),
  },
}));

const row = {
  id: 'e1',
  couple_id: 'c1',
  created_by: 'u1',
  kind: 'visit',
  title: 'Nos vemos',
  emoji: null,
  date: '2026-12-20',
  recurring_yearly: false,
  note: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

beforeEach(() => {
  mockRpc.mockReset();
  mockFrom.mockReset();
});

describe('fetchEvents', () => {
  it('pide los eventos de la pareja ordenados por fecha', async () => {
    const limit = jest
      .fn()
      .mockResolvedValue({ data: [row, { ...row, id: 'e2', kind: 'x' }], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    mockFrom.mockReturnValue({ select: () => ({ eq }) });
    const events = await fetchEvents('c1');
    expect(mockFrom).toHaveBeenCalledWith('events');
    expect(eq).toHaveBeenCalledWith('couple_id', 'c1');
    expect(order).toHaveBeenCalledWith('date', { ascending: true });
    expect(events.map((e) => e.kind)).toEqual(['visit', 'custom']);
  });

  it('propaga el error', async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: new Error('x') });
    mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ order: () => ({ limit }) }) }) });
    await expect(fetchEvents('c1')).rejects.toThrow('x');
  });
});

describe('saveEvent', () => {
  it('crea con save_event y nunca repite una visita', async () => {
    mockRpc.mockResolvedValue({ data: row, error: null });
    const saved = await saveEvent({
      title: 'Nos vemos',
      date: '2026-12-20',
      kind: 'visit',
      recurringYearly: true,
      emoji: '',
    });
    expect(mockRpc).toHaveBeenCalledWith('save_event', {
      p_title: 'Nos vemos',
      p_date: '2026-12-20',
      p_kind: 'visit',
      p_emoji: undefined,
      p_recurring_yearly: false,
      p_note: undefined,
      p_id: undefined,
    });
    expect(saved.id).toBe('e1');
  });

  it('edita pasando el id', async () => {
    mockRpc.mockResolvedValue({ data: { ...row, kind: 'custom' }, error: null });
    await saveEvent({
      id: 'e1',
      title: 'Cumple',
      date: '2027-01-02',
      kind: 'custom',
      recurringYearly: true,
      emoji: '🎂',
      note: 'ojo',
    });
    expect(mockRpc).toHaveBeenCalledWith(
      'save_event',
      expect.objectContaining({
        p_id: 'e1',
        p_recurring_yearly: true,
        p_emoji: '🎂',
        p_note: 'ojo',
      }),
    );
  });

  it('propaga el error del RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'invalid_event' } });
    await expect(saveEvent({ title: '', date: '2026-01-01', kind: 'custom' })).rejects.toBeTruthy();
  });
});

describe('deleteEvent', () => {
  it('llama delete_event', async () => {
    mockRpc.mockResolvedValue({ error: null });
    await deleteEvent('e1');
    expect(mockRpc).toHaveBeenCalledWith('delete_event', { p_id: 'e1' });
  });
});
