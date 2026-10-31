import {
  countdownHeadline,
  countdownNote,
  countdownSpoken,
  eventErrorMessages,
  pastLabel,
  personName,
  validateEventDraft,
} from '../eventsView';

const ok = { title: 'Su viaje', emoji: '', note: '', dateValid: true };

describe('validateEventDraft', () => {
  it('acepta un borrador válido', () => {
    expect(validateEventDraft(ok)).toBeNull();
  });
  it('rechaza título vacío o largo', () => {
    expect(validateEventDraft({ ...ok, title: '   ' })?.title).toBe('empty');
    expect(validateEventDraft({ ...ok, title: 'a'.repeat(61) })?.title).toBe('too_long');
    expect(validateEventDraft({ ...ok, title: 'a'.repeat(60) })).toBeNull();
  });
  it('rechaza emoji, nota larga y fecha inválida', () => {
    expect(validateEventDraft({ ...ok, emoji: 'x'.repeat(17) })?.emoji).toBe('too_long');
    expect(validateEventDraft({ ...ok, note: 'x'.repeat(281) })?.note).toBe('too_long');
    expect(validateEventDraft({ ...ok, dateValid: false })?.date).toBe('invalid');
  });
});

describe('eventErrorMessages', () => {
  it('sin errores no hay mensajes', () => {
    expect(eventErrorMessages(null)).toEqual({
      title: undefined,
      emoji: undefined,
      note: undefined,
      date: undefined,
    });
  });
  it('usa el error de fecha recibido', () => {
    expect(eventErrorMessages({ date: 'invalid' }, 'Ese día no existe en ese mes.').date).toBe(
      'Ese día no existe en ese mes.',
    );
    expect(eventErrorMessages({ title: 'empty' }).title).toMatch(/nombre/);
  });
});

describe('textos de días', () => {
  it('headline', () => {
    expect(countdownHeadline(0)).toEqual({ value: 'Hoy', unit: '' });
    expect(countdownHeadline(1)).toEqual({ value: '1', unit: 'día' });
    expect(countdownHeadline(12)).toEqual({ value: '12', unit: 'días' });
  });
  it('spoken', () => {
    expect(countdownSpoken(0)).toBe('es hoy');
    expect(countdownSpoken(1)).toBe('es mañana');
    expect(countdownSpoken(5)).toBe('faltan 5 días');
  });
  it('pastLabel', () => {
    expect(pastLabel(1)).toBe('ayer');
    expect(pastLabel(9)).toBe('hace 9 días');
  });
});

describe('countdownNote', () => {
  it('automáticas explican de dónde salen', () => {
    expect(countdownNote({ kind: 'anniversary', eventId: null, recurring: true })).toMatch(
      /aniversario/,
    );
    expect(countdownNote({ kind: 'birthday', eventId: null, recurring: true })).toMatch(/perfil/);
  });
  it('propias: solo avisan si se repiten', () => {
    expect(countdownNote({ kind: 'custom', eventId: 'a', recurring: true })).toBe(
      'Se repite cada año',
    );
    expect(countdownNote({ kind: 'visit', eventId: 'a', recurring: false })).toBeNull();
  });
});

describe('personName', () => {
  it('apodo, nombre o respaldo', () => {
    expect(personName({ nickname: 'Cari', display_name: 'Ale' }, 'Tú')).toBe('Cari');
    expect(personName({ nickname: ' ', display_name: 'Ale' }, 'Tú')).toBe('Ale');
    expect(personName(null, 'Tú')).toBe('Tú');
  });
});
