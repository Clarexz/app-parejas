export type EndpointStatus = 'ok' | 'error';
export type ServerStatus = 'connected' | 'degraded' | 'offline' | 'not_configured';

export type ServerHealth = {
  auth: EndpointStatus;
  rest: EndpointStatus;
  status: ServerStatus;
  latencyMs: number | null;
};

const TIMEOUT_MS = 8000;

/**
 * Consulta /auth/v1/health y /rest/v1/ del servidor. Módulo puro: recibe `fetch` inyectado.
 * La raíz de REST solo responde 200 con la service key; con la anon key PostgREST contesta 401,
 * lo que igual prueba que está vivo. Por eso REST cuenta como "ok" con cualquier respuesta que no
 * sea 404 ni 5xx (una llave inválida ya se nota porque Auth falla).
 */
export async function checkServerHealth(
  baseUrl: string | undefined,
  anonKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = TIMEOUT_MS,
): Promise<ServerHealth> {
  if (!baseUrl || !anonKey) {
    return { auth: 'error', rest: 'error', status: 'not_configured', latencyMs: null };
  }
  const root = baseUrl.replace(/\/+$/, '');
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
  const started = Date.now();

  const probe = async (
    path: string,
    isUp: (res: Response) => boolean = (res) => res.ok,
  ): Promise<EndpointStatus> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${root}${path}`, { headers, signal: controller.signal });
      return isUp(res) ? 'ok' : 'error';
    } catch {
      return 'error';
    } finally {
      clearTimeout(timer);
    }
  };

  const [auth, rest] = await Promise.all([
    probe('/auth/v1/health'),
    probe('/rest/v1/', (res) => res.status !== 404 && res.status < 500),
  ]);
  const status: ServerStatus =
    auth === 'ok' && rest === 'ok'
      ? 'connected'
      : auth === 'ok' || rest === 'ok'
        ? 'degraded'
        : 'offline';
  return { auth, rest, status, latencyMs: Date.now() - started };
}
