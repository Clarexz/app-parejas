import { MAX_RETRIES, retryDelay, shouldPersistQuery, shouldRetry } from '../queryPolicy';

const q = (queryKey: unknown[], status = 'success') => ({ queryKey, state: { status } });

describe('shouldPersistQuery', () => {
  it('guarda consultas exitosas normales', () => {
    expect(shouldPersistQuery(q(['memories', 'list', 'c1']))).toBe(true);
    expect(shouldPersistQuery(q(['daily-question', 'c1', '2026-01-01']))).toBe(true);
  });

  it('no guarda consultas en error o cargando', () => {
    expect(shouldPersistQuery(q(['memories', 'list', 'c1'], 'error'))).toBe(false);
    expect(shouldPersistQuery(q(['memories', 'list', 'c1'], 'pending'))).toBe(false);
  });

  it('excluye URLs firmadas (avatares, stories, fotos de memorias, audio)', () => {
    expect(shouldPersistQuery(q(['signed-url', 'a/b.jpg']))).toBe(false);
    expect(shouldPersistQuery(q(['stories', 'media', 'a/b.jpg']))).toBe(false);
    expect(shouldPersistQuery(q(['memories', 'urls', 'a.jpg', 'b.jpg']))).toBe(false);
    expect(shouldPersistQuery(q(['questions', 'audio', 'x']))).toBe(false);
  });

  it('excluye estado que solo vale en vivo', () => {
    expect(shouldPersistQuery(q(['server-health']))).toBe(false);
    expect(shouldPersistQuery(q(['app-update', '0.1.0']))).toBe(false);
    expect(shouldPersistQuery(q(['distance-permission']))).toBe(false);
  });

  it('no confunde datos de usuario con segmentos excluidos', () => {
    expect(shouldPersistQuery(q(['history', 'c1', 'urls de viaje', null]))).toBe(true);
    expect(shouldPersistQuery(q(['stories', 'active', 'c1']))).toBe(true);
  });
});

describe('shouldRetry', () => {
  it('reintenta errores de red hasta MAX_RETRIES', () => {
    const net = new TypeError('Network request failed');
    expect(shouldRetry(0, net)).toBe(true);
    expect(shouldRetry(MAX_RETRIES - 1, net)).toBe(true);
    expect(shouldRetry(MAX_RETRIES, net)).toBe(false);
  });

  it('no reintenta errores de negocio ni de validación', () => {
    expect(shouldRetry(0, { code: 'P0001', message: 'invalid_answer' })).toBe(false);
    expect(shouldRetry(0, { code: '23514' })).toBe(false);
    expect(shouldRetry(0, { code: '42501' })).toBe(false);
    expect(shouldRetry(0, { code: 'PGRST116' })).toBe(false);
    expect(shouldRetry(0, { code: 'invalid_credentials' })).toBe(false);
  });

  it('no reintenta 4xx pero sí 5xx y fallos de conexión', () => {
    expect(shouldRetry(0, { status: 401 })).toBe(false);
    expect(shouldRetry(0, { status: 404 })).toBe(false);
    expect(shouldRetry(0, { status: 503 })).toBe(true);
    expect(shouldRetry(0, { status: 0, message: 'Failed to fetch' })).toBe(true);
  });

  it('reintenta lo desconocido', () => {
    expect(shouldRetry(0, null)).toBe(true);
    expect(shouldRetry(1, 'boom')).toBe(true);
  });
});

describe('retryDelay', () => {
  it('crece exponencialmente con tope de 10 s', () => {
    expect(retryDelay(0)).toBe(1000);
    expect(retryDelay(1)).toBe(2000);
    expect(retryDelay(2)).toBe(4000);
    expect(retryDelay(4)).toBe(10_000);
    expect(retryDelay(20)).toBe(10_000);
  });
});
