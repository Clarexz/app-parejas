import { formatTimeFriendly, joinTime, splitTime, stepHour, stepMinute } from '../timeField';

describe('timeField', () => {
  it('separa y une la hora', () => {
    expect(splitTime('09:30')).toEqual({ hour: 9, minute: 30 });
    expect(joinTime({ hour: 9, minute: 5 })).toBe('09:05');
    expect(splitTime('basura')).toEqual({ hour: 21, minute: 0 });
    expect(splitTime('25:00')).toEqual({ hour: 21, minute: 0 });
  });

  it('las horas dan la vuelta al día', () => {
    expect(stepHour('21:00', 1)).toBe('22:00');
    expect(stepHour('23:15', 1)).toBe('00:15');
    expect(stepHour('00:30', -1)).toBe('23:30');
  });

  it('los minutos van de 15 en 15 sin tocar la hora', () => {
    expect(stepMinute('21:00', 1)).toBe('21:15');
    expect(stepMinute('21:45', 1)).toBe('21:00');
    expect(stepMinute('21:00', -1)).toBe('21:45');
    expect(stepMinute('21:07', 1)).toBe('21:15');
    expect(stepMinute('21:07', -1)).toBe('21:00');
  });

  it('la formatea para leerse', () => {
    expect(formatTimeFriendly('21:00')).toBe('9:00 p. m.');
    expect(formatTimeFriendly('00:15')).toBe('12:15 a. m.');
    expect(formatTimeFriendly('12:00')).toBe('12:00 p. m.');
    expect(formatTimeFriendly('08:45')).toBe('8:45 a. m.');
  });
});
