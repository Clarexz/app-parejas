import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  questionKeys,
  useAddCustomQuestion,
  useCustomQuestions,
  useMyFeedback,
  usePacks,
  useRetireCustomQuestion,
  useSetFeedback,
} from '../hooks';

const mockRpc = jest.fn();
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...(args as [])),
  },
}));
jest.mock('@/features/auth', () => ({ useSession: () => ({ user: { id: 'u1' } }) }));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({ couple: { id: 'c1' } }),
  useToday: () => ({ today: '2026-11-12', timeZone: 'America/Mexico_City' }),
}));

function setup<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(hook, { wrapper }) };
}

const packRow = {
  slug: 'pack-a',
  name: 'Tema',
  emoji: '✨',
  description: 'd',
  intensity: 'ligera',
  position: 1,
  total: 5,
  answered_by_me: 1,
  answered_by_both: 1,
  next_question_id: 'q2',
};

describe('banco de preguntas: hooks', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockMaybeSingle.mockReset();
    mockEq.mockClear();
    mockFrom.mockClear();
  });

  it('usePacks lee get_packs', async () => {
    mockRpc.mockResolvedValue({ data: [packRow], error: null });
    const { result } = await setup(() => usePacks());
    await waitFor(() => expect(result.current.packs).toHaveLength(1));
    expect(mockRpc).toHaveBeenCalledWith('get_packs');
    expect(result.current.packs[0]?.next_question_id).toBe('q2');
  });

  it('useMyFeedback lee mi fila de question_feedback', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { vote: -1 }, error: null });
    const { result } = await setup(() => useMyFeedback('q1'));
    await waitFor(() => expect(result.current.vote).toBe(-1));
    expect(mockFrom).toHaveBeenCalledWith('question_feedback');
    expect(mockEq).toHaveBeenCalledWith('question_id', 'q1');
  });

  it('useMyFeedback sin fila es sin voto', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = await setup(() => useMyFeedback('q1'));
    await waitFor(() => expect(mockMaybeSingle).toHaveBeenCalled());
    expect(result.current.vote).toBeNull();
  });

  it('useSetFeedback actualiza al instante y manda el voto', async () => {
    let resolve: (v: unknown) => void = () => {};
    mockRpc.mockReturnValue(new Promise((r) => (resolve = r)));
    const { client, result } = await setup(() => useSetFeedback());
    client.setQueryData(questionKeys.feedback('c1', 'q1'), null);
    act(() => {
      result.current.mutate({ questionId: 'q1', vote: -1 });
    });
    await waitFor(() => expect(client.getQueryData(questionKeys.feedback('c1', 'q1'))).toBe(-1));
    expect(mockRpc).toHaveBeenCalledWith('set_question_feedback', {
      p_question_id: 'q1',
      p_vote: -1,
    });
    await act(async () => resolve({ data: -1, error: null }));
  });

  it('useSetFeedback quita el voto mandando null', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const { result } = await setup(() => useSetFeedback());
    await act(async () => {
      await result.current.mutateAsync({ questionId: 'q1', vote: null });
    });
    expect(mockRpc).toHaveBeenCalledWith('set_question_feedback', {
      p_question_id: 'q1',
      p_vote: null,
    });
  });

  it('useSetFeedback regresa el voto anterior si falla', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'invalid_feedback' },
    });
    const { client, result } = await setup(() => useSetFeedback());
    client.setQueryData(questionKeys.feedback('c1', 'q1'), 1);
    await act(async () => {
      await expect(result.current.mutateAsync({ questionId: 'q1', vote: -1 })).rejects.toBeTruthy();
    });
    expect(client.getQueryData(questionKeys.feedback('c1', 'q1'))).toBe(1);
  });

  it('useCustomQuestions lee get_custom_questions', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'x',
          category: 'viajes',
          category_name: 'Viajes',
          category_emoji: '✈️',
          type: 'open',
          text: '¿Y si nos vamos?',
          options: null,
          intensity: 'ligera',
          created_by: 'u1',
          created_at: '2026-11-12T00:00:00Z',
          answered_by_me: false,
          answered_by_partner: false,
        },
      ],
      error: null,
    });
    const { result } = await setup(() => useCustomQuestions());
    await waitFor(() => expect(result.current.questions).toHaveLength(1));
    expect(mockRpc).toHaveBeenCalledWith('get_custom_questions');
  });

  it('useAddCustomQuestion manda los parámetros e invalida categorías y lista propia', async () => {
    mockRpc.mockResolvedValue({ data: 'new-id', error: null });
    const { client, result } = await setup(() => useAddCustomQuestion());
    const spy = jest.spyOn(client, 'invalidateQueries');
    await act(async () => {
      await result.current.mutateAsync({
        category: 'viajes',
        type: 'choice',
        text: '¿Playa o monte?',
        options: ['Playa', 'Monte'],
        intensity: 'profunda',
      });
    });
    expect(mockRpc).toHaveBeenCalledWith('add_custom_question', {
      p_category: 'viajes',
      p_type: 'choice',
      p_text: '¿Playa o monte?',
      p_options: ['Playa', 'Monte'],
      p_intensity: 'profunda',
    });
    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(questionKeys.custom('c1'));
    expect(keys).toContainEqual(questionKeys.categories());
  });

  it('useRetireCustomQuestion retira e invalida la lista propia y las categorías', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const { client, result } = await setup(() => useRetireCustomQuestion());
    const spy = jest.spyOn(client, 'invalidateQueries');
    await act(async () => {
      await result.current.mutateAsync('x');
    });
    expect(mockRpc).toHaveBeenCalledWith('retire_custom_question', { p_question_id: 'x' });
    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(questionKeys.custom('c1'));
    expect(keys).toContainEqual(questionKeys.categories());
  });
});
