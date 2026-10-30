import {
  groupMoodsByDay,
  latestMoodByUser,
  MOOD_NOTE_MAX,
  MOOD_OPTIONS,
  moodLabel,
  validateMoodInput,
  type MoodRow,
} from '../mood';

function row(id: string, user: string, createdAt: string): MoodRow {
  return { id, couple_id: 'c', user_id: user, emoji: '😄', note: null, created_at: createdAt };
}

describe('MOOD_OPTIONS', () => {
  it('tiene 16 opciones sin repetir', () => {
    expect(MOOD_OPTIONS).toHaveLength(16);
    expect(new Set(MOOD_OPTIONS.map((o) => o.emoji)).size).toBe(16);
    expect(new Set(MOOD_OPTIONS.map((o) => o.label)).size).toBe(16);
  });

  it('moodLabel busca por emoji', () => {
    expect(moodLabel('😴')).toBe('Con sueño');
    expect(moodLabel('🦄')).toBeNull();
  });
});

describe('latestMoodByUser', () => {
  it('toma el más reciente por usuario', () => {
    const r = latestMoodByUser([
      row('1', 'a', '2026-10-30T10:00:00Z'),
      row('2', 'a', '2026-10-30T12:00:00Z'),
      row('3', 'b', '2026-10-29T12:00:00Z'),
    ]);
    expect(r.a.id).toBe('2');
    expect(r.b.id).toBe('3');
  });

  it('en empate gana el primero de la lista', () => {
    const r = latestMoodByUser([
      row('1', 'a', '2026-10-30T10:00:00Z'),
      row('2', 'a', '2026-10-30T10:00:00Z'),
    ]);
    expect(r.a.id).toBe('1');
  });

  it('lista vacía', () => {
    expect(latestMoodByUser([])).toEqual({});
  });
});

describe('groupMoodsByDay', () => {
  it('agrupa y ordena días y horas de más nuevo a más viejo', () => {
    const groups = groupMoodsByDay(
      [
        row('1', 'a', '2026-10-29T08:00:00Z'),
        row('2', 'a', '2026-10-30T08:00:00Z'),
        row('3', 'b', '2026-10-30T20:00:00Z'),
      ],
      (c) => c.slice(0, 10),
    );
    expect(groups.map((g) => g.day)).toEqual(['2026-10-30', '2026-10-29']);
    expect(groups[0].moods.map((m) => m.id)).toEqual(['3', '2']);
  });
});

describe('validateMoodInput', () => {
  it('recorta y normaliza la nota vacía a null', () => {
    expect(validateMoodInput({ emoji: ' 😄 ', note: '   ' })).toEqual({
      ok: true,
      value: { emoji: '😄', note: null },
    });
    expect(validateMoodInput({ emoji: '😄', note: ' hola ' })).toEqual({
      ok: true,
      value: { emoji: '😄', note: 'hola' },
    });
    expect(validateMoodInput({ emoji: '😄' })).toEqual({
      ok: true,
      value: { emoji: '😄', note: null },
    });
  });

  it('exige emoji', () => {
    expect(validateMoodInput({ emoji: '  ' })).toEqual({
      ok: false,
      error: 'Elige cómo te sientes.',
    });
  });

  it('rechaza emoji con espacios o demasiado largo', () => {
    expect(validateMoodInput({ emoji: '😄 😄' }).ok).toBe(false);
    expect(validateMoodInput({ emoji: 'a'.repeat(17) }).ok).toBe(false);
  });

  it('limita la nota', () => {
    expect(validateMoodInput({ emoji: '😄', note: 'a'.repeat(MOOD_NOTE_MAX) }).ok).toBe(true);
    expect(validateMoodInput({ emoji: '😄', note: 'a'.repeat(MOOD_NOTE_MAX + 1) })).toEqual({
      ok: false,
      error: 'La nota es de máximo 80 letras.',
    });
  });
});
