import { detectTimeZone, timeZoneLabel } from '../timezone';

describe('timezone', () => {
  afterEach(() => jest.restoreAllMocks());

  it('detecta la zona del dispositivo', () => {
    jest
      .spyOn(Intl, 'DateTimeFormat')
      .mockReturnValue({ resolvedOptions: () => ({ timeZone: 'America/Tijuana' }) } as never);
    expect(detectTimeZone()).toBe('America/Tijuana');
  });
  it('cae a Ciudad de México si no hay "/" o falla', () => {
    jest
      .spyOn(Intl, 'DateTimeFormat')
      .mockReturnValue({ resolvedOptions: () => ({ timeZone: 'UTC' }) } as never);
    expect(detectTimeZone()).toBe('America/Mexico_City');
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('no intl');
    });
    expect(detectTimeZone()).toBe('America/Mexico_City');
  });
  it('etiqueta', () => {
    expect(timeZoneLabel('America/Mexico_City')).toBe('Ciudad de México');
    expect(timeZoneLabel('America/Los_Angeles')).toBe('Los Angeles');
  });
});
