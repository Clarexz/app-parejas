import { checkServerHealth } from '../health';

const res = (ok: boolean, status = ok ? 200 : 503) => ({ ok, status }) as Response;
const URL = 'https://api.example.com/';

describe('checkServerHealth', () => {
  it('not_configured sin URL o llave, sin llamar a fetch', async () => {
    const f = jest.fn();
    const h = await checkServerHealth('', 'key', f);
    expect(h).toEqual({ auth: 'error', rest: 'error', status: 'not_configured', latencyMs: null });
    expect((await checkServerHealth(URL, undefined, f)).status).toBe('not_configured');
    expect(f).not.toHaveBeenCalled();
  });

  it('connected cuando ambos responden y manda headers y rutas correctas', async () => {
    const f = jest.fn().mockResolvedValue(res(true));
    const h = await checkServerHealth(URL, 'anon', f);
    expect(h).toMatchObject({ auth: 'ok', rest: 'ok', status: 'connected' });
    expect(h.latencyMs).toBeGreaterThanOrEqual(0);
    const urls = f.mock.calls.map((c) => c[0]);
    expect(urls).toEqual(
      expect.arrayContaining([
        'https://api.example.com/auth/v1/health',
        'https://api.example.com/rest/v1/',
      ]),
    );
    expect(f.mock.calls[0][1].headers).toEqual({ apikey: 'anon', Authorization: 'Bearer anon' });
  });

  it('degraded si solo uno responde', async () => {
    const f = jest.fn((u: string) =>
      Promise.resolve(res(u.includes('/auth/'))),
    ) as unknown as typeof fetch;
    expect(await checkServerHealth(URL, 'anon', f)).toMatchObject({
      auth: 'ok',
      rest: 'error',
      status: 'degraded',
    });
  });

  it('REST con 401 (anon key en la raíz) cuenta como vivo; 404 no', async () => {
    const withRest = (status: number) =>
      jest.fn((u: string) =>
        Promise.resolve(u.includes('/rest/') ? res(false, status) : res(true)),
      ) as unknown as typeof fetch;
    expect(await checkServerHealth(URL, 'anon', withRest(401))).toMatchObject({
      rest: 'ok',
      status: 'connected',
    });
    expect(await checkServerHealth(URL, 'anon', withRest(404))).toMatchObject({
      rest: 'error',
      status: 'degraded',
    });
  });

  it('offline si fetch lanza o responde error', async () => {
    const boom = jest.fn().mockRejectedValue(new Error('network'));
    expect(await checkServerHealth(URL, 'anon', boom)).toMatchObject({ status: 'offline' });
    const bad = jest.fn().mockResolvedValue(res(false));
    expect(await checkServerHealth(URL, 'anon', bad)).toMatchObject({ status: 'offline' });
  });

  it('offline si se agota el timeout', async () => {
    const hang = jest.fn(
      (_u: string, init: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('abort')));
        }),
    ) as unknown as typeof fetch;
    expect(await checkServerHealth(URL, 'anon', hang, 20)).toMatchObject({ status: 'offline' });
  });
});
