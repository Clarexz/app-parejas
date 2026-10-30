import type { Json } from '@/types/database';

import {
  ANSWER_MAX_LENGTH,
  applyReaction,
  CHOICE_NOTE_MAX_LENGTH,
  COMMENT_MAX_LENGTH,
  cardState,
  justCompleted,
  parseCategoryQuestion,
  parseHistoryItem,
  parseQuestionCard,
  parseStreak,
  reactionSummary,
  REACTION_OPTIONS,
  spicyState,
  validateAnswerInput,
  validateComment,
  type AnswerInfo,
  type QuestionCard,
} from '../questions';

const question = {
  id: 'q1',
  slug: 'viaje-ideal',
  category: 'viajes',
  category_name: 'Viajes',
  category_emoji: '✈️',
  type: 'open' as const,
  text: '¿A dónde irían?',
  options: null,
  intensity: 'ligera' as const,
};

const answer = (userId: string): AnswerInfo => ({
  id: `a-${userId}`,
  user_id: userId,
  text: 'hola',
  choice: null,
  created_at: '2026-10-30T10:00:00Z',
  updated_at: '2026-10-30T10:00:00Z',
});

const card = (over: Partial<QuestionCard> = {}): QuestionCard => ({
  question,
  day: '2026-10-30',
  mine: null,
  partner: null,
  partner_answered: false,
  comment_count: 0,
  ...over,
});

describe('cardState / justCompleted', () => {
  it('calcula el estado', () => {
    expect(cardState(card())).toBe('unanswered');
    expect(cardState(card({ partner_answered: true }))).toBe('unanswered');
    expect(cardState(card({ mine: answer('u1') }))).toBe('waiting');
    expect(cardState(card({ mine: answer('u1'), partner_answered: true }))).toBe('both');
  });

  it('justCompleted solo al pasar a both', () => {
    const waiting = card({ mine: answer('u1') });
    const both = card({ mine: answer('u1'), partner: answer('u2'), partner_answered: true });
    expect(justCompleted(waiting, both)).toBe(true);
    expect(justCompleted(card({ partner_answered: true }), both)).toBe(true);
    expect(justCompleted(both, both)).toBe(false);
    expect(justCompleted(card(), waiting)).toBe(false);
    expect(justCompleted(both, waiting)).toBe(false);
    expect(justCompleted(undefined, both)).toBe(false);
  });
});

describe('validateAnswerInput', () => {
  const open = { type: 'open' as const, options: null };
  const choice = { type: 'choice' as const, options: ['a', 'b', 'c'] };

  it('abierta: texto obligatorio tras trim', () => {
    expect(validateAnswerInput(open, {})).toEqual({ ok: false, error: 'empty' });
    expect(validateAnswerInput(open, { text: '   \n' })).toEqual({ ok: false, error: 'empty' });
    expect(validateAnswerInput(open, { text: '  hola  ' })).toEqual({
      ok: true,
      value: { text: 'hola', choice: null },
    });
  });

  it('abierta: máximo 2000 y descarta choice', () => {
    expect(validateAnswerInput(open, { text: 'a'.repeat(ANSWER_MAX_LENGTH) }).ok).toBe(true);
    expect(validateAnswerInput(open, { text: 'a'.repeat(ANSWER_MAX_LENGTH + 1) })).toEqual({
      ok: false,
      error: 'too_long',
    });
    expect(validateAnswerInput(open, { text: 'x', choice: 1 })).toEqual({
      ok: true,
      value: { text: 'x', choice: null },
    });
  });

  it('cuenta caracteres, no unidades UTF-16', () => {
    expect(validateAnswerInput(open, { text: '😀'.repeat(ANSWER_MAX_LENGTH) }).ok).toBe(true);
  });

  it('opción: índice válido obligatorio', () => {
    expect(validateAnswerInput(choice, {})).toEqual({ ok: false, error: 'choice_required' });
    expect(validateAnswerInput(choice, { choice: null })).toEqual({
      ok: false,
      error: 'choice_required',
    });
    expect(validateAnswerInput(choice, { choice: -1 }).ok).toBe(false);
    expect(validateAnswerInput(choice, { choice: 3 }).ok).toBe(false);
    expect(validateAnswerInput(choice, { choice: 1.5 }).ok).toBe(false);
    expect(validateAnswerInput({ type: 'choice', options: null }, { choice: 0 }).ok).toBe(false);
    expect(validateAnswerInput(choice, { choice: 0 })).toEqual({
      ok: true,
      value: { text: null, choice: 0 },
    });
    expect(validateAnswerInput(choice, { choice: 2, text: ' porque sí ' })).toEqual({
      ok: true,
      value: { text: 'porque sí', choice: 2 },
    });
  });

  it('opción: nota opcional de máximo 500', () => {
    expect(validateAnswerInput(choice, { choice: 0, text: '   ' })).toEqual({
      ok: true,
      value: { text: null, choice: 0 },
    });
    expect(
      validateAnswerInput(choice, { choice: 0, text: 'a'.repeat(CHOICE_NOTE_MAX_LENGTH) }).ok,
    ).toBe(true);
    expect(
      validateAnswerInput(choice, { choice: 0, text: 'a'.repeat(CHOICE_NOTE_MAX_LENGTH + 1) }),
    ).toEqual({ ok: false, error: 'too_long' });
  });
});

describe('validateComment', () => {
  it('valida vacío, largo y recorta', () => {
    expect(validateComment('  ')).toEqual({ ok: false, error: 'empty' });
    expect(validateComment(null)).toEqual({ ok: false, error: 'empty' });
    expect(validateComment(' hola ')).toEqual({ ok: true, value: 'hola' });
    expect(validateComment('a'.repeat(COMMENT_MAX_LENGTH)).ok).toBe(true);
    expect(validateComment('a'.repeat(COMMENT_MAX_LENGTH + 1))).toEqual({
      ok: false,
      error: 'too_long',
    });
  });
});

describe('spicyState', () => {
  const m = (user_id: string, spicy_opt_in: boolean) => ({ user_id, spicy_opt_in });
  it('activo solo con dos miembros y ambos', () => {
    expect(spicyState([m('a', true), m('b', true)], 'a')).toEqual({
      mine: true,
      partner: true,
      active: true,
    });
    expect(spicyState([m('a', true), m('b', false)], 'a')).toEqual({
      mine: true,
      partner: false,
      active: false,
    });
    expect(spicyState([m('a', false), m('b', true)], 'a')).toEqual({
      mine: false,
      partner: true,
      active: false,
    });
    expect(spicyState([m('a', true)], 'a')).toEqual({ mine: true, partner: false, active: false });
    expect(spicyState([], 'a')).toEqual({ mine: false, partner: false, active: false });
  });
});

describe('reactionSummary', () => {
  it('agrupa por emoji, marca la mía y ordena', () => {
    expect(REACTION_OPTIONS).toHaveLength(6);
    const r = reactionSummary({ u1: '🔥', u2: '❤️', u3: '🔥', u4: '', u5: 3 }, 'u2');
    expect(r).toEqual([
      { emoji: '🔥', count: 2, mine: false },
      { emoji: '❤️', count: 1, mine: true },
    ]);
  });
  it('empates en orden de REACTION_OPTIONS; entrada inválida da vacío', () => {
    expect(reactionSummary({ a: '👏', b: '❤️' }, 'z').map((x) => x.emoji)).toEqual(['❤️', '👏']);
    expect(reactionSummary({}, 'a')).toEqual([]);
    expect(reactionSummary(null, 'a')).toEqual([]);
    expect(reactionSummary([], 'a')).toEqual([]);
  });
});

describe('parseQuestionCard', () => {
  const raw: Json = {
    question: { ...question },
    day: '2026-10-30',
    mine: { ...answer('u1') },
    partner: null,
    partner_answered: false,
    comment_count: 2,
  };

  it('parsea una tarjeta válida', () => {
    const parsed = parseQuestionCard(raw);
    expect(parsed.question.slug).toBe('viaje-ideal');
    expect(parsed.mine?.user_id).toBe('u1');
    expect(parsed.partner).toBeNull();
    expect(parsed.comment_count).toBe(2);
  });

  it('acepta day nulo y opciones', () => {
    const parsed = parseQuestionCard({
      ...(raw as object),
      day: null,
      question: { ...question, type: 'choice', options: ['a', 'b'] },
    } as Json);
    expect(parsed.day).toBeNull();
    expect(parsed.question.options).toEqual(['a', 'b']);
  });

  it('lanza si la forma no cuadra', () => {
    expect(() => parseQuestionCard(null)).toThrow();
    expect(() => parseQuestionCard([])).toThrow();
    expect(() => parseQuestionCard({ ...(raw as object), question: null } as Json)).toThrow();
    expect(() =>
      parseQuestionCard({ ...(raw as object), question: { ...question, type: 'x' } } as Json),
    ).toThrow();
    expect(() =>
      parseQuestionCard({ ...(raw as object), partner_answered: 'si' } as Json),
    ).toThrow();
    expect(() => parseQuestionCard({ ...(raw as object), mine: { id: 'x' } } as Json)).toThrow();
    expect(() =>
      parseQuestionCard({ ...(raw as object), question: { ...question, options: [1] } } as Json),
    ).toThrow();
  });

  it('parseHistoryItem exige last_activity', () => {
    expect(parseHistoryItem({ ...(raw as object), last_activity: 't' } as Json).last_activity).toBe(
      't',
    );
    expect(() => parseHistoryItem(raw)).toThrow();
  });
});

describe('parseStreak / parseCategoryQuestion', () => {
  it('parsea la racha', () => {
    expect(
      parseStreak({
        current: 2,
        best: 5,
        today: '2026-10-30',
        today_done: true,
        missing_days: ['2026-10-29'],
      }),
    ).toEqual({
      current: 2,
      best: 5,
      today: '2026-10-30',
      today_done: true,
      missing_days: ['2026-10-29'],
    });
    expect(() => parseStreak({ current: 1 })).toThrow();
    expect(() =>
      parseStreak({ current: 1, best: 1, today: 'x', today_done: true, missing_days: [1] }),
    ).toThrow();
    expect(() => parseStreak('x')).toThrow();
  });

  it('parsea preguntas de categoría', () => {
    const row = {
      id: 'q',
      slug: 's',
      type: 'choice',
      text: 't',
      options: ['a', 'b'] as Json,
      intensity: 'picante',
      answered_by_me: true,
      answered_by_partner: false,
    };
    expect(parseCategoryQuestion(row).options).toEqual(['a', 'b']);
    expect(parseCategoryQuestion({ ...row, type: 'open', options: null }).options).toBeNull();
    expect(() => parseCategoryQuestion({ ...row, type: 'game' })).toThrow();
  });
});

describe('applyReaction', () => {
  it('pone, cambia y quita', () => {
    expect(applyReaction({}, 'u1', '🔥')).toEqual({ u1: '🔥' });
    expect(applyReaction({ u1: '🔥', u2: '❤️' }, 'u1', '👏')).toEqual({ u1: '👏', u2: '❤️' });
    expect(applyReaction({ u1: '🔥', u2: '❤️' }, 'u1', '🔥')).toEqual({ u2: '❤️' });
    expect(applyReaction({ u1: '🔥' }, 'u1', null)).toEqual({});
    expect(applyReaction(null, 'u1', '🔥')).toEqual({ u1: '🔥' });
  });
  it('no muta la entrada', () => {
    const input = { u1: '🔥' };
    applyReaction(input, 'u1', null);
    expect(input).toEqual({ u1: '🔥' });
  });
});
