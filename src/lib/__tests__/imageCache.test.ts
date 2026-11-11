import { imageCacheKey, remoteImageSource } from '../imageCache';

describe('imageCacheKey', () => {
  it('ignora el token de la URL firmada', () => {
    const a = 'https://x.supabase.co/storage/v1/object/sign/memories/c1/foto.jpg?token=aaa';
    const b = 'https://x.supabase.co/storage/v1/object/sign/memories/c1/foto.jpg?token=bbb';
    expect(imageCacheKey(a)).toBe('storage:memories/c1/foto.jpg');
    expect(imageCacheKey(a)).toBe(imageCacheKey(b));
  });

  it('no inventa llave para URIs locales o vacías', () => {
    expect(imageCacheKey('file:///tmp/a.jpg')).toBeUndefined();
    expect(imageCacheKey(null)).toBeUndefined();
    expect(imageCacheKey('')).toBeUndefined();
  });
});

describe('remoteImageSource', () => {
  it('agrega cacheKey solo a URLs de Storage', () => {
    expect(remoteImageSource('https://x/storage/v1/object/sign/avatars/u/a.jpg?token=t')).toEqual({
      uri: 'https://x/storage/v1/object/sign/avatars/u/a.jpg?token=t',
      cacheKey: 'storage:avatars/u/a.jpg',
    });
    expect(remoteImageSource('file:///a.jpg')).toEqual({ uri: 'file:///a.jpg' });
  });
});
