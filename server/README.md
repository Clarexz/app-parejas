# server/ - backend self-hosted de App Parejas

Todo lo necesario para levantar Supabase self-hosted en el VPS **sin secretos** (los secretos
viven solo en `/opt/app-parejas/secrets/` del VPS). La guía completa (arquitectura, deploy,
respaldos, restauración, túnel a Studio, plan B) está en [`docs/SERVIDOR.md`](../docs/SERVIDOR.md).

| Archivo | Para qué |
|---|---|
| `docker-compose.override.yml` | Ajustes sobre el `docker-compose.yml` **oficial** de Supabase: proyecto/red `app-parejas`, contenedores `app-parejas-*`, Postgres sin publicar, gateway solo en `127.0.0.1:${KONG_HTTP_PORT}`, Studio solo en `127.0.0.1:${STUDIO_HOST_PORT}`, pooler apagado, límites de RAM, logs rotados, `env_file` opcional para las Edge Functions. |
| `docker-compose.logs.override.yml` | Solo se carga si `STACK_LOGS=true` (Analytics/Logflare + Vector). |
| `.env.example` | Plantilla de las variables del stack (mismas claves que el `.env.example` oficial) con instrucciones para generar cada secreto. Se copia a `/opt/app-parejas/secrets/.env`. |
| `buckets.json` | Buckets de Storage que `deploy.sh` crea/sincroniza (idempotente). Formato: `[{"id":"avatars","public":false}]`; opcionales `name`, `file_size_limit`, `allowed_mime_types`. |
| `proxy/` | Ejemplos para el reverse proxy existente: `nginx.conf.example`, `Caddyfile.example`, `traefik.md`, `nginx-proxy-manager.md`. Todos exponen **solo** `/auth|rest|realtime|storage|functions/v1/` y dejan pasar WebSocket. |

Los scripts que se ejecutan en el VPS están en [`scripts/server/`](../scripts/server/):
`lib.sh` (helpers), `deploy.sh`, `backup.sh`, `smoke-test.sh`, `restore.sh`.

## Disposición en el VPS (`APP_ROOT=/opt/app-parejas`)

```
/opt/app-parejas/
  repo/       clon de este repositorio
  stack/      copia de docker/ del repo oficial supabase/supabase (versión fijada) + los
              docker-compose*.override.yml de server/ ; stack/.env -> ../secrets/.env (symlink)
  secrets/    (700) .env, CREDENCIALES.md, functions.env, keystore, cuenta de servicio Firebase
  backups/    db/ (dumps) y storage/ (tar.gz)
```

Proyecto compose: `docker compose -p app-parejas`. En los scripts se usa `source scripts/server/lib.sh`
y luego la función `compose ...` (ya añade proyecto, `--env-file` y los `-f` correctos).

## Uso resumido

```bash
# Instalación inicial (lo hace el prompt S1; ver docs/SERVIDOR.md §4)
cd /opt/app-parejas/repo
cp server/docker-compose*.yml /opt/app-parejas/stack/
cp server/.env.example /opt/app-parejas/secrets/.env && chmod 600 /opt/app-parejas/secrets/.env
#   ... rellenar los CAMBIAR_* ...
source scripts/server/lib.sh && compose up -d --wait

# Cada fase
./scripts/server/deploy.sh [rama] [--dry-run] [--skip-backup]

# Operación
./scripts/server/backup.sh [--storage]
./scripts/server/smoke-test.sh [--local]
./scripts/server/restore.sh ARCHIVO.dump          # prueba en BD temporal
```

## Interruptores en `secrets/.env` (los lee `lib.sh`)

| Variable | Valores | Efecto |
|---|---|---|
| `STACK_GATEWAY` | `envoy` (default) / `kong` | Gateway `api-gw`. Kong agrega `docker-compose.kong.yml` (más RAM). |
| `STACK_LOGS` | `false` (default) / `true` | Enciende Analytics + Vector (`docker-compose.logs.yml` oficial + nuestro override). |
| `STACK_POOLER` | `false` (default) / `true` | Enciende Supavisor (perfil `pooler`), solo en 127.0.0.1:15432/16543. |

Nota sobre versiones: el compose oficial cambia con frecuencia (hoy el gateway por defecto es
Envoy, y Analytics/Vector ya no están en el compose base sino en `docker-compose.logs.yml`).
La copia en `stack/` **es** la versión fijada: no se actualiza sin decidirlo (ver docs/SERVIDOR.md §9).
