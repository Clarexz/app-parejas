import {
  collapseSpaces,
  customQuestionMessages,
  parseCustomQuestion,
  validateCustomQuestion,
  type CustomQuestionDraft,
} from '../customQuestions';

const draft = (over: Partial<CustomQuestionDraft> = {}): CustomQuestionDraft => ({
  category: 'viajes',
  type: 'open',
  text: '¿A dónde nos escapamos este año?',
  options: [],
  intensity: 'ligera',
  ...over,
});

describe('customQuestions', () => {
  it('colapsa espacios y saltos de línea', () => {
    expect(collapseSpaces('  hola   mundo \n  feliz ')).toBe('hola mundo feliz');
  });

  it('una pregunta abierta válida se manda normalizada y sin opciones', () => {
    const r = validateCustomQuestion(draft({ text: '  ¿A dónde   nos escapamos este año?  ' }));
    expect(r).toEqual({
      ok: true,
      value: {
        category: 'viajes',
        type: 'open',
        text: '¿A dónde nos escapamos este año?',
        options: null,
        intensity: 'ligera',
      },
    });
  });

  it('el texto va de 10 a 220 letras ya normalizado', () => {
    expect(validateCustomQuestion(draft({ text: 'corta' }))).toEqual({
      ok: false,
      errors: { text: 'too_short' },
    });
    // 9 letras + espacios de más siguen siendo cortas
    expect(validateCustomQuestion(draft({ text: '   abc    def   ' })).ok).toBe(false);
    expect(validateCustomQuestion(draft({ text: 'a'.repeat(10) })).ok).toBe(true);
    expect(validateCustomQuestion(draft({ text: 'a'.repeat(220) })).ok).toBe(true);
    expect(validateCustomQuestion(draft({ text: 'a'.repeat(221) }))).toEqual({
      ok: false,
      errors: { text: 'too_long' },
    });
  });

  it('exige categoría', () => {
    expect(validateCustomQuestion(draft({ category: null }))).toEqual({
      ok: false,
      errors: { category: 'required' },
    });
  });

  it('de opciones: 2 a 4, recortadas, de 1 a 60 y distintas; ignora las vacías', () => {
    const ok = validateCustomQuestion(
      draft({ type: 'choice', options: ['  Playa ', '', 'Monte'] }),
    );
    expect(ok).toMatchObject({ ok: true, value: { type: 'choice', options: ['Playa', 'Monte'] } });

    expect(validateCustomQuestion(draft({ type: 'choice', options: ['Playa', ' '] }))).toEqual({
      ok: false,
      errors: { options: 'too_few' },
    });
    expect(
      validateCustomQuestion(draft({ type: 'choice', options: ['a', 'b', 'c', 'd', 'e'] })),
    ).toEqual({ ok: false, errors: { options: 'too_many' } });
    expect(
      validateCustomQuestion(draft({ type: 'choice', options: ['a', 'b'.repeat(61)] })),
    ).toEqual({ ok: false, errors: { options: 'too_long' } });
    expect(
      validateCustomQuestion(draft({ type: 'choice', options: ['a', 'b'.repeat(60)] })).ok,
    ).toBe(true);
    expect(
      validateCustomQuestion(draft({ type: 'choice', options: ['Playa', ' playa '] })),
    ).toEqual({
      ok: false,
      errors: { options: 'duplicate' },
    });
  });

  it('en una abierta se ignoran las opciones', () => {
    const r = validateCustomQuestion(draft({ options: ['x', 'y'] }));
    expect(r).toMatchObject({ ok: true, value: { options: null } });
  });

  it('junta varios errores y los traduce', () => {
    const r = validateCustomQuestion(draft({ category: null, text: 'hola', type: 'choice' }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual({ category: 'required', text: 'too_short', options: 'too_few' });
    const m = customQuestionMessages(r.errors);
    expect(m.category).toBe('Elige una categoría.');
    expect(m.text).toMatch(/mínimo 10/);
    expect(m.options).toMatch(/al menos 2/);
    expect(customQuestionMessages({})).toEqual({ category: null, text: null, options: null });
  });

  it('parseCustomQuestion valida tipo e intensidad', () => {
    const row = {
      id: 'q',
      category: 'viajes',
      category_name: 'Viajes',
      category_emoji: '✈️',
      type: 'choice',
      text: '¿?',
      options: ['a', 'b'],
      intensity: 'ligera',
      created_by: 'u',
      created_at: '2026-11-12T00:00:00Z',
      answered_by_me: false,
      answered_by_partner: true,
    };
    expect(parseCustomQuestion(row)).toMatchObject({ options: ['a', 'b'], type: 'choice' });
    expect(() => parseCustomQuestion({ ...row, type: 'x' })).toThrow();
    expect(() => parseCustomQuestion({ ...row, intensity: 'x' })).toThrow();
  });
});
