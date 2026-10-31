import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { EventRow } from '../api';
import { eventKeys, useCountdowns, useDeleteEvent, useEvents } from '../hooks';

const mockFetchEvents = jest.fn();
const mockDeleteEvent = jest.fn();
jest.mock('../api', () => ({
  fetchEvents: (...a: unknown[]) => mockFetchEvents(...a),
  deleteEvent: (...a: unknown[]) => mockDeleteEvent(...a),
  saveEvent: jest.fn(),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({
    couple: { id: 'c1', anniversary_date: '2023-02-14' },
    me: { id: 'u1', display_name: 'Ale', nickname: null, birthday: null },
    partner: { id: 'u2', display_name: 'Caleb', nickname: 'Cal', birthday: '1995-11-05' },
  }),
  useToday: () => ({ today: '2026-10-31', timeZone: 'America/Mexico_City' }),
}));

const event = (id: string, extra: Partial<EventRow> = {}): EventRow => ({
  id,
  couple_id: 'c1',
  created_by: 'u1',
  kind: 'custom',
  title: id,
  emoji: null,
  date: '2026-12-20',
  recurring_yearly: false,
  note: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  ...extra,
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => {
  mockFetchEvents.mockReset();
  mockDeleteEvent.mockReset();
});

describe('useEvents', () => {
  it('carga los eventos de la pareja', async () => {
    mockFetchEvents.mockResolvedValue([event('a')]);
    const { wrapper } = setup();
    const { result } = await renderHook(() => useEvents(), { wrapper });
    await waitFor(() => expect(result.current.events).toHaveLength(1));
    expect(mockFetchEvents).toHaveBeenCalledWith('c1');
  });

  it('isError solo cuando no hay datos', async () => {
    mockFetchEvents.mockRejectedValue(new Error('x'));
    const { wrapper } = setup();
    const { result } = await renderHook(() => useEvents(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useCountdowns', () => {
  it('combina automáticas, visita y pasados', async () => {
    mockFetchEvents.mockResolvedValue([
      event('v', { kind: 'visit', title: 'Nos vemos', date: '2026-11-10' }),
      event('old', { title: 'Concierto', date: '2026-09-01' }),
    ]);
    const { wrapper } = setup();
    const { result } = await renderHook(() => useCountdowns(), { wrapper });
    await waitFor(() => expect(result.current.visit).not.toBeNull());
    expect(result.current.visit?.daysUntil).toBe(10);
    expect(result.current.featured?.key).toBe('event:v');
    expect(result.current.past.map((e) => e.id)).toEqual(['old']);
    const titles = result.current.countdowns.map((c) => c.title);
    expect(titles).toContain('Cumple de Cal');
    expect(titles).toContain('Nos vemos');
  });
});

describe('useDeleteEvent', () => {
  it('quita el evento al instante y revierte si falla', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(eventKeys.list('c1'), [event('a'), event('b')]);
    mockDeleteEvent.mockRejectedValue(new Error('x'));
    mockFetchEvents.mockResolvedValue([event('a'), event('b')]);
    const { result } = await renderHook(() => useDeleteEvent(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('a').catch(() => {});
    });
    expect(client.getQueryData<EventRow[]>(eventKeys.list('c1'))?.map((e) => e.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('borra con éxito', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(eventKeys.list('c1'), [event('a'), event('b')]);
    mockDeleteEvent.mockResolvedValue(undefined);
    mockFetchEvents.mockResolvedValue([event('b')]);
    const { result } = await renderHook(() => useDeleteEvent(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('a');
    });
    expect(mockDeleteEvent).toHaveBeenCalledWith('a');
  });
});
