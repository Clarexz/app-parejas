import { base64ToArrayBuffer } from '../base64';

const bytes = (b64: string) => Array.from(new Uint8Array(base64ToArrayBuffer(b64)));

describe('base64ToArrayBuffer', () => {
  it('decodifica con y sin relleno', () => {
    expect(bytes('TWFu')).toEqual([77, 97, 110]);
    expect(bytes('TWE=')).toEqual([77, 97]);
    expect(bytes('TQ==')).toEqual([77]);
    expect(bytes('')).toEqual([]);
  });
  it('ignora saltos de línea y prefijo data:', () => {
    expect(bytes('data:image/jpeg;base64,TW\nFu')).toEqual([77, 97, 110]);
  });
  it('decodifica bytes altos (JPEG)', () => {
    expect(bytes('/9j/')).toEqual([0xff, 0xd8, 0xff]);
  });
});
