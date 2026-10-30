import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { QuestionCard } from '@/lib/questions';

import { questionKeys, useSubmitAnswer } from '../hooks';

const mockRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));
jest.mock('@/features/auth', () => ({ useSession: () => ({ user: { id: 'u1' } }) }));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({ couple: { id: 'c1' } }),
  useToday: () => ({ today: '2026-10-30', timeZone: 'America/Mexico_City' }),
}));

const question = {
  id: 'q1',
  slug: 's',
  category: 'viajes',
  category_name: 'Viajes',
  category_emoji: '✈️',
  type: 'open' as const,
  text: '¿Y tú?',
  options: null,
  intensity: 'ligera' as const,
};
const answer = (userId: string) => ({
  id: `a-${userId}`,
  user_id: userId,
  text: 'hola',
  choice: null,
  created_at: '2026-10-30T10:00:00Z',
  updated_at: '2026-10-30T10:00:00Z',
});
const waiting: QuestionCard = {
  question,
  day: '2026-10-30',
  mine: null,
  partner: null,
  partner_answered: true,
  comment_count: 0,
};

async function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...(await renderHook(() => useSubmitAnswer(), { wrapper })) };
}

describe('useSubmitAnswer', () => {
  beforeEach(() => mockRpc.mockReset());

  it('escribe la tarjeta en caché e indica que se completó', async () => {
    mockRpc.mockResolvedValue({
      data: {
        question,
        day: '2026-10-30',
        mine: answer('u1'),
        partner: answer('u2'),
        partner_answered: true,
        comment_count: 0,
      },
      error: null,
    });
    const { client, result } = await setup();
    client.setQueryData(questionKeys.daily('c1', '2026-10-30'), waiting);

    let out: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
    await act(async () => {
      out = await result.current.mutateAsync({ question, text: '  hola  ' });
    });

    expect(mockRpc).toHaveBeenCalledWith('submit_answer', {
      p_question_id: 'q1',
      p_text: 'hola',
      p_choice: undefined,
    });
    expect(out?.justCompleted).toBe(true);
    await waitFor(() => {
      const cached = client.getQueryData<QuestionCard>(questionKeys.daily('c1', '2026-10-30'));
      expect(cached?.mine?.text).toBe('hola');
    });
    expect(client.getQueryData<QuestionCard>(questionKeys.question('c1', 'q1'))?.mine).toBeTruthy();
  });

  it('no llama al servidor si la respuesta no es válida', async () => {
    const { result } = await setup();
    await act(async () => {
      await expect(result.current.mutateAsync({ question, text: '   ' })).rejects.toThrow('empty');
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('no escribe en daily-question si la tarjeta no es del día', async () => {
    mockRpc.mockResolvedValue({
      data: {
        question,
        day: null,
        mine: answer('u1'),
        partner: null,
        partner_answered: false,
        comment_count: 0,
      },
      error: null,
    });
    const { client, result } = await setup();
    await act(async () => {
      await result.current.mutateAsync({ question, text: 'hola' });
    });
    expect(client.getQueriesData({ queryKey: questionKeys.dailyAll('c1') })).toEqual([]);
    expect(client.getQueryData(questionKeys.question('c1', 'q1'))).toBeTruthy();
  });
});
