import {
  MAX_AUDIO_MS,
  MIN_AUDIO_MS,
  audioAnswerPath,
  formatAudioDuration,
  normalizeAudioMs,
  playbackProgress,
  spokenAudioDuration,
  validateAudioDuration,
} from '../audio';

describe('formatAudioDuration', () => {
  it('da minutos:segundos', () => {
    expect(formatAudioDuration(0)).toBe('0:00');
    expect(formatAudioDuration(7000)).toBe('0:07');
    expect(formatAudioDuration(7999)).toBe('0:07');
    expect(formatAudioDuration(65_000)).toBe('1:05');
    expect(formatAudioDuration(119_000)).toBe('1:59');
    expect(formatAudioDuration(MAX_AUDIO_MS)).toBe('2:00');
  });

  it('tolera valores raros', () => {
    expect(formatAudioDuration(-5)).toBe('0:00');
    expect(formatAudioDuration(Number.NaN)).toBe('0:00');
  });
});

describe('spokenAudioDuration', () => {
  it('lo dice con palabras', () => {
    expect(spokenAudioDuration(1000)).toBe('1 segundo');
    expect(spokenAudioDuration(7000)).toBe('7 segundos');
    expect(spokenAudioDuration(60_000)).toBe('1 minuto');
    expect(spokenAudioDuration(65_000)).toBe('1 minuto 5 segundos');
    expect(spokenAudioDuration(120_000)).toBe('2 minutos');
    expect(spokenAudioDuration(0)).toBe('0 segundos');
  });
});

describe('audioAnswerPath', () => {
  it('arma <pareja>/<usuario>/<pregunta>/<id>.m4a en minúsculas', () => {
    expect(audioAnswerPath('c', 'u', 'q', 'ABCD-1')).toBe('c/u/q/abcd-1.m4a');
  });
});

describe('validateAudioDuration', () => {
  it('acepta de 500 ms a 2 minutos', () => {
    expect(validateAudioDuration(MIN_AUDIO_MS)).toEqual({ ok: true, ms: MIN_AUDIO_MS });
    expect(validateAudioDuration(MAX_AUDIO_MS)).toEqual({ ok: true, ms: MAX_AUDIO_MS });
    expect(validateAudioDuration(4321.6)).toEqual({ ok: true, ms: 4322 });
  });

  it('rechaza lo demasiado corto o largo', () => {
    expect(validateAudioDuration(MIN_AUDIO_MS - 1)).toEqual({ ok: false, error: 'too_short' });
    expect(validateAudioDuration(Number.NaN)).toEqual({ ok: false, error: 'too_short' });
    expect(validateAudioDuration(MAX_AUDIO_MS + 1)).toEqual({ ok: false, error: 'too_long' });
  });
});

describe('normalizeAudioMs', () => {
  it('recorta el corte automático al tope y descarta lo muy corto', () => {
    expect(normalizeAudioMs(120_037)).toBe(MAX_AUDIO_MS);
    expect(normalizeAudioMs(3000.4)).toBe(3000);
    expect(normalizeAudioMs(200)).toBeNull();
  });
});

describe('playbackProgress', () => {
  it('va de 0 a 1', () => {
    expect(playbackProgress(0, 10_000)).toBe(0);
    expect(playbackProgress(2500, 10_000)).toBe(0.25);
    expect(playbackProgress(12_000, 10_000)).toBe(1);
    expect(playbackProgress(-1, 10_000)).toBe(0);
    expect(playbackProgress(500, 0)).toBe(0);
  });
});
