import {
  nextInPack,
  packAction,
  packProgress,
  packProgressLine,
  packStatus,
  parsePack,
  type Pack,
} from '../packs';

const pack = (over: Partial<Pack> = {}): Pack => ({
  slug: 'pack-a',
  name: 'Tema',
  emoji: '✨',
  description: 'Algo',
  intensity: 'ligera',
  position: 1,
  total: 10,
  answered_by_me: 0,
  answered_by_both: 0,
  next_question_id: 'q1',
  ...over,
});

describe('packs', () => {
  it('parsePack valida la intensidad', () => {
    const row = { ...pack(), intensity: 'profunda' };
    expect(parsePack(row).intensity).toBe('profunda');
    expect(() => parsePack({ ...row, intensity: 'rara' })).toThrow(/pack\.intensity/);
  });

  it('estado: nuevo, en curso, terminado, vacío y bloqueado', () => {
    expect(packStatus(pack(), false)).toBe('new');
    expect(packStatus(pack({ answered_by_me: 3 }), false)).toBe('in_progress');
    expect(packStatus(pack({ answered_by_me: 10, next_question_id: null }), false)).toBe(
      'finished',
    );
    expect(packStatus(pack({ total: 0, next_question_id: null }), false)).toBe('empty');
    expect(packStatus(pack({ intensity: 'picante' }), false)).toBe('locked');
    expect(packStatus(pack({ intensity: 'picante' }), true)).toBe('new');
  });

  it('un tema picante bloqueado lo sigue estando aunque ya tenga respuestas', () => {
    const p = pack({ intensity: 'picante', answered_by_me: 5, next_question_id: null });
    expect(packStatus(p, false)).toBe('locked');
  });

  it('progreso entre 0 y 1 y su línea', () => {
    expect(packProgress(pack({ total: 10, answered_by_both: 4 }))).toBe(0.4);
    expect(packProgress(pack({ total: 0 }))).toBe(0);
    expect(packProgress(pack({ total: 4, answered_by_both: 9 }))).toBe(1);
    expect(packProgressLine(pack({ total: 12, answered_by_both: 3 }))).toBe(
      '3 de 12 contestadas por los dos',
    );
  });

  it('acción principal: Empezar o Seguir; nada si no hay qué contestar', () => {
    expect(packAction('new')).toEqual({ label: 'Empezar' });
    expect(packAction('in_progress')).toEqual({ label: 'Seguir' });
    expect(packAction('finished')).toBeNull();
    expect(packAction('locked')).toBeNull();
    expect(packAction('empty')).toBeNull();
  });

  describe('nextInPack', () => {
    it('devuelve la siguiente sin contestar', () => {
      expect(nextInPack([pack({ next_question_id: 'q7' })], 'pack-a', 'q6')).toEqual({
        kind: 'next',
        questionId: 'q7',
      });
    });

    it('terminado cuando no queda ninguna', () => {
      expect(nextInPack([pack({ next_question_id: null })], 'pack-a', 'q6')).toEqual({
        kind: 'finished',
      });
    });

    it('espera si los datos están viejos (siguiente = la actual) o se están refrescando', () => {
      expect(nextInPack([pack({ next_question_id: 'q6' })], 'pack-a', 'q6')).toEqual({
        kind: 'pending',
      });
      expect(nextInPack([pack({ next_question_id: 'q7' })], 'pack-a', 'q6', false)).toEqual({
        kind: 'pending',
      });
    });

    it('espera si el tema no está en la lista', () => {
      expect(nextInPack([], 'pack-a', 'q6')).toEqual({ kind: 'pending' });
    });
  });
});
