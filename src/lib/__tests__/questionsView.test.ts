import type { HistoryItem } from '../questions';
import {
  answerExcerpt,
  categoryColor,
  categoryRowState,
  historyPartnerLine,
  historyStamp,
  shortStamp,
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
  it('categoryColor es estable y rosa solo para picantes', () => {
    expect(categoryColor('amor')).toBe(categoryColor('amor'));
    expect(categoryColor('x', 'picante')).toBe('pink');
    expect(categoryColor('amor')).not.toBe('pink');
  });

  it('answerExcerpt recorta y usa la opción elegida', () => {
    expect(answerExcerpt(answer('a'.repeat(200)), { options: null }, 10)).toBe('aaaaaaaaaa…');
    expect(answerExcerpt(answer('con sol', 1), { options: ['Playa', 'Monte'] })).toBe(
      'Monte · con sol',
    );
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

  it('sellos de fecha', () => {
    expect(shortStamp('2026-10-29')).toBe('29 OCT 2026');
    expect(historyStamp(item({ day: '2026-10-20' }), 'America/Mexico_City')).toBe('20 OCT 2026');
    expect(historyStamp(item({}), 'America/Mexico_City')).toBe('28 OCT 2026');
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
