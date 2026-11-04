import { fireEvent, render, screen } from '@testing-library/react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AnswerInfo, QuestionCard, Streak } from '@/lib/questions';
import { ThemeProvider } from '@/theme';

import { QuestionView } from '../QuestionView';

const mockMutateAsync = jest.fn();
jest.mock('../../hooks', () => ({
  useSubmitAnswer: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useDeleteAnswer: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useStreak: () => ({
    streak: {
      current: 3,
      best: 5,
      today: '2026-10-30',
      today_done: false,
      today_is_repair: false,
      repair_day: null,
      repairs_used: 0,
      repairs_left: 5,
      repairs_per_month: 5,
      missing_days: [],
    } satisfies Streak,
  }),
  useSendNudge: () => ({ mutate: jest.fn(), isPending: false }),
  useComments: () => ({
    comments: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useAddComment: () => ({ mutate: jest.fn(), isPending: false }),
  useReactToComment: () => ({ mutate: jest.fn() }),
  useDeleteComment: () => ({ mutate: jest.fn() }),
}));
jest.mock('@/components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('@/features/couple', () => ({
  useCouple: () => ({
    me: { id: 'u1', display_name: 'Ale', nickname: null },
    partner: { id: 'u2', display_name: 'Caleb', nickname: null },
  }),
  useToday: () => ({ today: '2026-10-30', timeZone: 'America/Mexico_City' }),
}));

const answer = (user: string, text: string): AnswerInfo => ({
  id: `a-${user}`,
  user_id: user,
  text,
  choice: null,
  created_at: '2026-10-30T10:00:00Z',
  updated_at: '2026-10-30T10:00:00Z',
});

const base: QuestionCard = {
  question: {
    id: 'q1',
    slug: 's',
    category: 'viajes',
    category_name: 'Viajes',
    category_emoji: '✈️',
    type: 'open',
    text: '¿A dónde nos escapamos?',
    options: null,
    intensity: 'ligera',
  },
  day: '2026-10-30',
  mine: null,
  partner: null,
  partner_answered: false,
  comment_count: 0,
};

const renderView = (card: QuestionCard) =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 412, height: 915 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <ThemeProvider>
        <QuestionView card={card} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );

describe('QuestionView', () => {
  beforeEach(() => mockMutateAsync.mockClear());

  it('sin contestar oculta la respuesta de tu pareja y no deja comentar', async () => {
    await renderView({ ...base, partner_answered: true, partner: answer('u2', 'A Oaxaca') });
    expect(screen.getByText('Caleb ya contestó')).toBeTruthy();
    expect(screen.queryByText('A Oaxaca')).toBeNull();
    expect(screen.queryByText('Sin comentarios todavía')).toBeNull();
    expect(screen.getByRole('button', { name: 'Contestar' })).toBeTruthy();
  });

  it('el botón de pegar espera a que haya algo escrito', async () => {
    mockMutateAsync.mockResolvedValue({ card: base, justCompleted: false });
    await renderView(base);
    const button = screen.getByRole('button', { name: 'Contestar' });
    expect(button.props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('Tu respuesta'), 'A la playa');
    await fireEvent.press(screen.getByRole('button', { name: 'Contestar' }));
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'A la playa', choice: null }),
    );
  });

  it('contestada, con la pareja pendiente: ofrece recordarle y abre los comentarios', async () => {
    await renderView({ ...base, mine: answer('u1', 'A la playa') });
    expect(screen.getByText('A la playa')).toBeTruthy();
    expect(screen.getByText('Caleb todavía no contesta.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pícale a Caleb' })).toBeTruthy();
    expect(screen.getByText('Nadie ha dicho nada todavía. Empiecen ustedes.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeTruthy();
  });

  it('los dos contestaron: se ve la respuesta de tu pareja', async () => {
    await renderView({
      ...base,
      mine: answer('u1', 'A la playa'),
      partner: answer('u2', 'A Oaxaca'),
      partner_answered: true,
    });
    expect(screen.getByText('A Oaxaca')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pícale a Caleb' })).toBeNull();
  });

  describe('pregunta de opciones', () => {
    const choiceCard: QuestionCard = {
      ...base,
      question: { ...base.question, type: 'choice', options: ['Playa', 'Monte'] },
    };

    it('agrega "Otra" al final y pide escribir la opción propia', async () => {
      mockMutateAsync.mockResolvedValue({ card: choiceCard, justCompleted: false });
      await renderView(choiceCard);
      expect(screen.getAllByRole('radio').map((r) => r.props.accessibilityLabel)).toEqual([
        'Playa',
        'Monte',
        'Otra',
      ]);
      expect(screen.queryByLabelText('Tu opción')).toBeNull();
      expect(screen.queryByText('Algo más que quieras decir (opcional)')).toBeNull();

      await fireEvent.press(screen.getByRole('radio', { name: 'Otra' }));
      expect(
        screen.getByRole('button', { name: 'Contestar' }).props.accessibilityState.disabled,
      ).toBe(true);
      await fireEvent.changeText(screen.getByLabelText('Tu opción'), 'Un crucero');
      await fireEvent.press(screen.getByRole('button', { name: 'Contestar' }));
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Un crucero', choice: -1 }),
      );
    });

    it('una opción normal se manda sin texto', async () => {
      mockMutateAsync.mockResolvedValue({ card: choiceCard, justCompleted: false });
      await renderView(choiceCard);
      await fireEvent.press(screen.getByRole('radio', { name: 'Monte' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Contestar' }));
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ text: null, choice: 1 }),
      );
    });

    it('muestra "Otra: …" y conserva la nota vieja de las respuestas con opción', async () => {
      const other: AnswerInfo = { ...answer('u1', 'Un crucero'), choice: -1 };
      const old: AnswerInfo = { ...answer('u2', 'con sol'), choice: 0 };
      await renderView({
        ...choiceCard,
        mine: other,
        partner: old,
        partner_answered: true,
      });
      expect(screen.getByText('Otra: Un crucero')).toBeTruthy();
      expect(screen.getByText('Playa · con sol')).toBeTruthy();
    });

    it('al editar una respuesta vieja con nota, la manda tal cual', async () => {
      mockMutateAsync.mockResolvedValue({ card: choiceCard, justCompleted: false });
      await renderView({ ...choiceCard, mine: { ...answer('u1', 'con sol'), choice: 0 } });
      await fireEvent.press(screen.getByRole('button', { name: 'Editar' }));
      await fireEvent.press(screen.getByRole('radio', { name: 'Monte' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'con sol', choice: 1 }),
      );
    });
  });
});
