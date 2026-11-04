import type { HistoryItem } from '../questions';
import {
  answerDisplay,
  answerExcerpt,
  categoryRowState,
  historyPartnerLine,
  spicyCopy,
  streakHeadline,
} from '../questionsView';

const answer = (text: string | null, choice: number | null = null) => ({
  id: 'a',
  user_id: 'u',
  text,
  choice,
  created_at: '',
  updated_at: '',
});
const item = (over: Partial<HistoryItem>): HistoryItem => ({
  question: {
    id: 'q1',
    slug: 'q',
    category: 'amor',
    category_name: 'Amor',
    category_emoji: '',
    type: 'open',
    text: '¿?',
    options: ['Playa', 'Monte'],
    intensity: 'ligera',
  },
  day: null,
  mine: null,
  partner: null,
  partner_answered: false,
  comment_count: 0,
  last_activity: '2026-10-29T03:00:00Z',
  ...over,
});

describe('questionsView', () => {
  it('answerExcerpt recorta y usa la opción elegida', () => {
    expect(answerExcerpt(answer('a'.repeat(200)), { options: null }, 10)).toBe('aaaaaaaaaa…');
    expect(answerExcerpt(answer('con sol', 1), { options: ['Playa', 'Monte'] })).toBe(
      'Monte · con sol',
    );
  });

  it('"Otra" muestra la opción propia y un índice raro no truena', () => {
    const q = { options: ['Playa', 'Monte'] };
    expect(answerExcerpt(answer('Un crucero', -1), q)).toBe('Otra: Un crucero');
    expect(answerDisplay(answer(null, -1), q)).toBe('Otra');
    expect(answerDisplay(answer('x', 9), q)).toBe('x');
  });

  it('oculta la respuesta de la pareja si yo no contesté', () => {
    const partner = answer('secreto');
    expect(historyPartnerLine(item({ partner, partner_answered: true }))).toEqual({
      kind: 'locked',
    });
    expect(
      historyPartnerLine(item({ mine: answer('yo'), partner, partner_answered: true })),
    ).toEqual({ kind: 'answer', text: 'secreto' });
    expect(historyPartnerLine(item({ mine: answer('yo') }))).toEqual({ kind: 'pending' });
  });

  it('categoryRowState y streakHeadline', () => {
    expect(categoryRowState({ answered_by_me: true, answered_by_partner: true })).toBe('both');
    expect(categoryRowState({ answered_by_me: false, answered_by_partner: true })).toBe('partner');
    expect(streakHeadline(0)).toMatch(/Todavía no hay racha/);
    expect(streakHeadline(23)).toBe('23 días seguidos contestando.');
  });

  it('spicyCopy según el opt-in de cada quien', () => {
    const m = (me: boolean, p: boolean) => [
      { user_id: 'me', spicy_opt_in: me },
      { user_id: 'p', spicy_opt_in: p },
    ];
    expect(spicyCopy(m(true, true), 'me', 'Caleb')).toMatchObject({
      partnerLine: 'Caleb ya las activó.',
      result: 'Activas para los dos.',
      active: true,
    });
    expect(spicyCopy(m(false, true), 'me', 'Caleb').active).toBe(false);
    expect(spicyCopy(m(true, false), 'me', 'Caleb').partnerLine).toBe('Caleb todavía no.');
  });
});
