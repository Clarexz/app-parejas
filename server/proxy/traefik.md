# Traefik - camino REAL en este VPS

En este VPS el reverse proxy es Traefik en un contenedor (`n8n-traefik-1`): provider Docker con
`exposedbydefault=false`, entrypoints `web` y `websecure`, redirección HTTP a HTTPS y certresolver
`mytlschallenge` (TLS-ALPN). Los demás ejemplos de esta carpeta (nginx, Caddy, NPM) son solo
alternativas para otro servidor y **no aplican aquí**.

## Cómo queda conectado (ya está en `server/docker-compose.override.yml`)

Traefik solo alcanza contenedores que estén en una red a la que él está conectado. En vez de un
`docker network connect` manual (frágil: se pierde al recrear), el servicio `api-gw` se declara en
dos redes: la propia `app-parejas-net` y la externa `${TRAEFIK_NETWORK:-n8n_default}`
(`external: true`). Los demás servicios (Postgres incluido) quedan solo en `app-parejas-net`.
El gateway no publica puertos en el host.

Labels del `api-gw`:

```yaml
- traefik.enable=true
- traefik.docker.network=${TRAEFIK_NETWORK:-n8n_default}   # red por la que Traefik debe llegar
- traefik.http.routers.parejas-api.rule=Host(`${PAREJAS_API_HOST}`) && (PathPrefix(`/auth/v1`) || PathPrefix(`/rest/v1`) || PathPrefix(`/realtime/v1`) || PathPrefix(`/storage/v1`) || PathPrefix(`/functions/v1`))
- traefik.http.routers.parejas-api.entrypoints=web,websecure
- traefik.http.routers.parejas-api.tls=true
- traefik.http.routers.parejas-api.tls.certresolver=${TRAEFIK_CERTRESOLVER:-mytlschallenge}
- traefik.http.routers.parejas-api.service=parejas-api
- traefik.http.services.parejas-api.loadbalancer.server.port=8000
```

- Solo se exponen los prefijos del API. La raíz del gateway sirve Studio (con basic auth); como no
  coincide con la regla, Traefik responde **404** y Studio no sale a Internet.
- WebSocket (Realtime) funciona sin configuración extra en Traefik.
- Studio no tiene router: se usa por túnel SSH a `127.0.0.1:${STUDIO_HOST_PORT}`.
- Variables (en `secrets/.env`): `PAREJAS_API_HOST=parejas-api.srv1574981.hstgr.cloud`,
  `TRAEFIK_NETWORK=n8n_default`, `TRAEFIK_CERTRESOLVER=mytlschallenge`.

## Verificar

```bash
docker network inspect n8n_default --format '{{range .Containers}}{{.Name}} {{end}}' | tr ' ' '\n' | grep app-parejas-gateway
curl -i https://parejas-api.srv1574981.hstgr.cloud/auth/v1/health -H "apikey: $ANON_KEY"   # 200
curl -i https://parejas-api.srv1574981.hstgr.cloud/                                         # 404
```
`./scripts/server/smoke-test.sh` hace estas comprobaciones.

## Otro Traefik (referencia)

Con Traefik en el host (no en contenedor) bastaría un file provider apuntando a la IP del
contenedor; con Traefik < 3 hay que revisar la sintaxis de las reglas. No hace falta en este VPS.
