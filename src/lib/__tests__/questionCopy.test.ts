import type { QuestionCard, Streak } from '../questions';
import {
  packCardNote,
  commentCountLabel,
  partnerFoldedLabel,
  questionErrorKind,
  repairPrompt,
  repairsLeftLine,
  repairView,
  REPAIR_TODAY_NOTE,
  sameChoice,
  streakLine,
  streakView,
} from '../questionCopy';

const ans = (choice: number | null) => ({
  id: 'a',
  user_id: 'u',
  text: null,
  choice,
  audio_path: null,
  audio_ms: null,
  created_at: '',
  updated_at: '',
});

describe('questionCopy', () => {
  it('escribe la racha con singular y plural', () => {
    expect(streakLine(23)).toBe('23 días seguidos contestando.');
    expect(streakLine(1)).toBe('1 día seguido contestando.');
    expect(streakLine(0)).toMatch(/Contesten hoy/);
  });

  it('escribe el aviso de recuperar ayer', () => {
    expect(repairPrompt(12)).toBe(
      'Se les pasó ayer. Contesten la de ayer hoy para salvar su racha de 12 días; hoy ya no suma.',
    );
    expect(repairPrompt(1)).toContain('racha de 1 día;');
    expect(repairsLeftLine(3, 5)).toBe('Les quedan 3 de 5 recuperaciones este mes');
    expect(repairsLeftLine(1, 5)).toBe('Les queda 1 de 5 recuperación este mes');
    expect(repairsLeftLine(0, 5)).toMatch(/Ya no les quedan/);
  });

  it('decide qué mostrar de la recuperación', () => {
    const s: Streak = {
      current: 4,
      best: 9,
      today: '2026-11-04',
      today_done: false,
      today_is_repair: false,
      repair_day: '2026-11-03',
      repairs_used: 1,
      repairs_left: 4,
      repairs_per_month: 5,
      missing_days: ['2026-11-03'],
    };
    expect(repairView(s)).toEqual({
      kind: 'repair',
      day: '2026-11-03',
      current: 4,
      left: 4,
      perMonth: 5,
    });
    expect(repairView({ ...s, repairs_left: 0 })).toEqual({ kind: 'none' });
    expect(repairView({ ...s, repair_day: null })).toEqual({ kind: 'none' });
    expect(repairView({ ...s, today_is_repair: true, repair_day: null })).toEqual({
      kind: 'repaired_today',
    });
    expect(REPAIR_TODAY_NOTE).toMatch(/no suma/);
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
    expect(sameChoice({ mine: ans(-1), partner: ans(-1) })).toBe(false);
  });

  it('clasifica los errores de pregunta', () => {
    expect(questionErrorKind({ message: 'no_questions' })).toBe('no_questions');
    expect(questionErrorKind({ code: 'question_not_found' })).toBe('not_found');
    expect(questionErrorKind(new Error('x'))).toBe('other');
    expect(questionErrorKind(null)).toBe('other');
  });

  it('resume la racha', () => {
    const s: Streak = {
      current: 4,
      best: 9,
      today: '',
      today_done: true,
      today_is_repair: false,
      repair_day: 'a',
      repairs_used: 0,
      repairs_left: 5,
      repairs_per_month: 5,
      missing_days: ['a'],
    };
    expect(streakView(s)).toEqual({ kind: 'streak', current: 4, missing: 1 });
    expect(streakView({ ...s, current: 0, missing_days: [] })).toEqual({
      kind: 'start',
      missing: 0,
    });
  });

  it('la nota de la tarjeta de un tema', () => {
    expect(packCardNote('locked', { total: 10, answered_by_both: 0 })).toBe(
      'Se abre cuando los dos quieran.',
    );
    expect(packCardNote('empty', { total: 0, answered_by_both: 0 })).toMatch(/Pronto/);
    expect(packCardNote('in_progress', { total: 12, answered_by_both: 3 })).toBe(
      '3 de 12 contestadas por los dos',
    );
    expect(packCardNote('finished', { total: 12, answered_by_both: 12 })).toBe(
      'Las 12 contestadas por los dos.',
    );
  });
});
