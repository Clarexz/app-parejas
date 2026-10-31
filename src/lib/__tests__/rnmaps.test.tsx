import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

describe('mock de react-native-maps', () => {
  it('se puede importar en Jest', () => {
    expect(MapView).toBeDefined();
    expect(Marker).toBeDefined();
    expect(PROVIDER_GOOGLE).toBe('google');
  });
});
