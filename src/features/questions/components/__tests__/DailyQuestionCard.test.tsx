import { fireEvent, render, screen } from '@testing-library/react-native';

import type { AnswerInfo, QuestionCard } from '@/lib/questions';
import { ThemeProvider } from '@/theme';

import { DailyQuestionCardView } from '../DailyQuestionCard';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../../hooks', () => ({ useDailyQuestion: jest.fn() }));
jest.mock('@/features/couple', () => ({ useCouple: () => ({ partner: null }) }));

const answer = (user: string): AnswerInfo => ({
  id: `a-${user}`,
  user_id: user,
  text: 'hola',
  choice: null,
  created_at: '',
  updated_at: '',
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

const renderCard = (card: QuestionCard, onPress = jest.fn()) =>
  render(
    <ThemeProvider>
      <DailyQuestionCardView card={card} partnerName="Caleb" onPress={onPress} />
    </ThemeProvider>,
  );

describe('DailyQuestionCardView', () => {
  it('sin contestar: te toca', async () => {
    const onPress = jest.fn();
    await renderCard(base, onPress);
    expect(screen.getByText('TE TOCA')).toBeTruthy();
    expect(screen.getByText('¿A dónde nos escapamos?')).toBeTruthy();
    expect(screen.getByText('Caleb todavía no contesta.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });

  it('sin contestar pero la pareja ya escribió: avisa que te toca', async () => {
    await renderCard({ ...base, partner_answered: true });
    expect(screen.getByText('Caleb ya escribió y la dobló. Te toca.')).toBeTruthy();
  });

  it('esperando a tu pareja', async () => {
    await renderCard({ ...base, mine: answer('u1') });
    expect(screen.getByText('ESPERANDO')).toBeTruthy();
    expect(screen.getByText('Ya pegaste la tuya. Caleb todavía no contesta.')).toBeTruthy();
  });

  it('los dos contestaron: sello y número de comentarios', async () => {
    await renderCard({
      ...base,
      mine: answer('u1'),
      partner: answer('u2'),
      partner_answered: true,
      comment_count: 3,
    });
    expect(screen.getByText('LOS DOS CONTESTARON')).toBeTruthy();
    expect(screen.getByText('3 comentarios')).toBeTruthy();
  });
});
