import type { QuestionCard, Streak } from '../questions';
import {
  commentCountLabel,
  partnerFoldedLabel,
  questionErrorKind,
  questionTextVariant,
  repairLine,
  sameChoice,
  streakLine,
  streakView,
} from '../questionCopy';

const ans = (choice: number | null) => ({
  id: 'a',
  user_id: 'u',
  text: null,
  choice,
  created_at: '',
  updated_at: '',
});

describe('questionCopy', () => {
  it('usa Gochi Hand solo hasta 140 caracteres', () => {
    expect(questionTextVariant('a'.repeat(140))).toBe('title');
    expect(questionTextVariant('a'.repeat(141))).toBe('heading');
  });

  it('escribe la racha con singular y plural', () => {
    expect(streakLine(23)).toBe('23 días seguidos contestando.');
    expect(streakLine(1)).toBe('1 día seguido contestando.');
    expect(streakLine(0)).toMatch(/Contesten hoy/);
    expect(repairLine(1)).toBe('Les falta 1 día por reparar');
    expect(repairLine(3)).toBe('Les faltan 3 días por reparar');
  });

  it('cuenta comentarios', () => {
    expect(commentCountLabel(0)).toBe('Sin comentarios todavía');
    expect(commentCountLabel(1)).toBe('1 comentario');
    expect(commentCountLabel(4)).toBe('4 comentarios');
  });

  it('dice el estado de la respuesta doblada', () => {
    expect(partnerFoldedLabel('Caleb', true)).toBe('Caleb ya escribió y la dobló. Te toca.');
    expect(partnerFoldedLabel('Caleb', false)).toBe('Caleb todavía no contesta');
  });

  it('detecta si eligieron lo mismo', () => {
    const base = { mine: ans(1), partner: ans(1) } as Pick<QuestionCard, 'mine' | 'partner'>;
    expect(sameChoice(base)).toBe(true);
    expect(sameChoice({ ...base, partner: ans(2) })).toBe(false);
    expect(sameChoice({ mine: ans(null), partner: ans(null) })).toBe(false);
    expect(sameChoice({ mine: null, partner: null })).toBe(false);
  });

  it('clasifica los errores de pregunta', () => {
    expect(questionErrorKind({ message: 'no_questions' })).toBe('no_questions');
    expect(questionErrorKind({ code: 'question_not_found' })).toBe('not_found');
    expect(questionErrorKind(new Error('x'))).toBe('other');
    expect(questionErrorKind(null)).toBe('other');
  });

  it('resume la racha', () => {
    const s: Streak = { current: 4, best: 9, today: '', today_done: true, missing_days: ['a'] };
    expect(streakView(s)).toEqual({ kind: 'streak', current: 4, missing: 1 });
    expect(streakView({ ...s, current: 0, missing_days: [] })).toEqual({
      kind: 'start',
      missing: 0,
    });
  });
});
