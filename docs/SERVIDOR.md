# Servidor: Supabase self-hosted en el VPS

Guía operativa del backend de App Parejas. Complementa a `docs/PLAN.md` §7, §8.3 y §12.
Todo lo de `server/` y `scripts/server/` está en el repo; los secretos **no**.

## 1. Arquitectura en el VPS

Datos del VPS real: Ubuntu 24.04, 15 GiB de RAM (~6 libres), **sin swap**, Docker 29.x / Compose v5, se
administra como root. Ya corren 4 stacks de Supabase, n8n y otros; el reverse proxy es **Traefik en un
contenedor** (`n8n-traefik-1`, provider Docker, `exposedbydefault=false`, entrypoints `web`/`websecure`,
certresolver `mytlschallenge`). En el host no hay `pg_dump`: siempre se usa el del contenedor.

```
Internet
   │ 443 (HTTPS, Let's Encrypt vía TLS-ALPN)      parejas-api.srv1574981.hstgr.cloud
   ▼
┌─ Traefik (contenedor n8n-traefik-1) ─────────────────────────────────────────┐
│  router parejas-api (labels del api-gw): Host + SOLO /auth|rest|realtime|     │
│  storage|functions /v1 ; la raíz (Studio) no coincide → 404                   │
└───────────────┬───────────────────────────────────── red externa n8n_default ┘
                │ (api-gw está en n8n_default Y en app-parejas-net, por compose)
┌───────────────▼──────── red Docker "app-parejas-net" (10.77.0.0/24) ──────────┐
│ app-parejas-gateway (api-gw: Envoy; o Kong con STACK_GATEWAY=kong) — SIN      │
│                      puertos publicados en el host                            │
│   ├─► app-parejas-auth (GoTrue)        ├─► app-parejas-rest (PostgREST)       │
│   ├─► realtime-dev.app-parejas-realtime ├─► app-parejas-storage + imgproxy    │
│   ├─► app-parejas-functions (edge-runtime: `notify` ─► FCM)                   │
│   └─► app-parejas-studio / app-parejas-meta                                   │
│ app-parejas-db (Postgres 17, volumen stack/volumes/db/data) — sin puertos     │
└────────────────────────────────────────────────────────────────────────────────┘
 En 127.0.0.1 (solo por túnel SSH):  Studio 13000 ·  [opcional] pooler 15432/16543
 Apagados por defecto:  analytics (Logflare) · vector · supavisor
```

Memoria: los límites por defecto suman **2816 MB (~2.75 GB)**, con `memswap_limit` igual a `mem_limit`
(sin swap, un contenedor que se pasa muere por OOM en vez de arrastrar al VPS):
db 768m, realtime 384m, studio 384m, storage 256m, functions 256m, auth 192m, rest 192m,
meta 128m, imgproxy 128m, gateway 128m. Son techos ajustados: si `docker inspect -f '{{.State.OOMKilled}}'`
da `true` en alguno, súbelo con `MEM_*` en `.env`. Con `STACK_LOGS=true` suma ~1 GB más (no recomendado:
solo hay ~6 GB libres).

## 2. Rutas

| Ruta | Contenido |
|---|---|
| `/opt/app-parejas/repo` | Clon de este repositorio (nadie lo edita a mano; `deploy.sh` exige que esté limpio). |
| `/opt/app-parejas/stack` | Copia del `docker/` oficial de `supabase/supabase` (versión fijada) + `docker-compose.override.yml` (+ `docker-compose.logs.override.yml`). `stack/.env` es un symlink a `secrets/.env`. Datos: `stack/volumes/db/data`, `stack/volumes/storage`, `stack/volumes/functions`. |
| `/opt/app-parejas/secrets` (700) | `.env`, `CREDENCIALES.md`, `functions.env` (secretos de Edge Functions), keystore Android, `firebase-service-account.json` (Fase 4). Archivos 600. |
| `/opt/app-parejas/backups` | `db/` (dumps `.dump`), `storage/` (`.tar.gz`), `cron.log`. |

Los otros proyectos del VPS viven en `/docker/<nombre>`; este usa `/opt/app-parejas` por decisión tomada.
`APP_ROOT` se puede sobrescribir (`APP_ROOT=/otra/ruta ./deploy.sh`).

## 3. Cómo se aisló de los otros proyectos del VPS

- Proyecto compose propio `-p app-parejas` (y `name: app-parejas` en el override).
- Red propia `app-parejas-net` con subred explícita `10.77.0.0/24` (`APP_PAREJAS_SUBNET`, fuera de las 172.x de otros stacks); volúmenes con prefijo `app-parejas_`; contenedores `app-parejas-*`
  (el oficial usa `supabase-*`, que chocaría con otro Supabase).
- Postgres **sin** puerto publicado. Supavisor (que en el oficial publicaba 5432/6543 en todas las
  interfaces) queda apagado, y si se enciende solo escucha en 127.0.0.1 y en puertos poco comunes.
- El gateway no publica puertos en el host: Traefik lo alcanza por la red externa `n8n_default`, a la que el propio
  `api-gw` se une desde el compose (sin `docker network connect` manual, sobrevive a recreaciones). Es el único
  servicio en esa red. Studio solo en `127.0.0.1:13000`.
- Vector no corre (leería el socket de Docker, es decir, los logs de **todos** los contenedores).
- Límites de memoria por contenedor y rotación de logs (10 MB x 3) para no dejar sin RAM/disco al resto.
- Los scripts solo tocan el proyecto `app-parejas`: nada de `docker system prune`, ni redes/volúmenes ajenos.
- El único punto de contacto con el exterior es Traefik, con una lista blanca de prefijos en la regla del router.

## 4. Instalación (prompt S1, resumen)

1. Instalar dependencias si faltan: `git`, `rsync`, `jq`, `curl`, `openssl`, Docker + Compose >= 2.24.4.
2. `mkdir -p /opt/app-parejas/{repo,stack,backups/db,backups/storage}`; `mkdir -m 700 /opt/app-parejas/secrets`.
3. Clonar el repo en `repo/`.
4. Traer el compose oficial **fijando la versión** (la copia en `stack/` es la fijación):
   ```bash
   git clone --depth 1 --filter=blob:none --sparse https://github.com/supabase/supabase /tmp/supabase-src
   git -C /tmp/supabase-src sparse-checkout set docker
   git -C /tmp/supabase-src rev-parse HEAD > /opt/app-parejas/stack/SUPABASE_COMMIT   # anótalo en CREDENCIALES.md
   cp -a /tmp/supabase-src/docker/. /opt/app-parejas/stack/ && rm -rf /tmp/supabase-src
   cp /opt/app-parejas/repo/server/docker-compose*.yml /opt/app-parejas/stack/
   ```
5. Crear `secrets/.env` desde `server/.env.example` (`chmod 600`), generar secretos (se puede usar
   `sh utils/generate-keys.sh --update-env` del stack oficial, ver comentarios del `.env.example`),
   fijar dominio en `SUPABASE_PUBLIC_URL` / `API_EXTERNAL_URL` / `SITE_URL`, y `ln -s ../secrets/.env stack/.env`.
6. `source scripts/server/lib.sh && compose config >/dev/null && compose up -d --wait`.
7. Traefik: no hay nada que configurar a mano; el `api-gw` trae las labels y se une a `n8n_default`
   (ver `server/proxy/traefik.md`). El certificado lo emite Traefik al primer acceso.
8. `./scripts/server/deploy.sh --local` (--local prueba contra la IP del contenedor del gateway, sin Traefik; aplica migraciones, crea buckets) y luego `./scripts/server/smoke-test.sh`.
9. Instalar el cron de §6 y guardar todo en `secrets/CREDENCIALES.md` (600).

## 5. Desplegar una fase (prompt S-deploy)

```bash
cd /opt/app-parejas/repo
git fetch && git checkout <rama> && git pull --ff-only   # el dry-run evalúa lo que hay en el clon
./scripts/server/deploy.sh <rama> --dry-run              # revisa qué haría (recomendado)
./scripts/server/deploy.sh <rama>
```

`--dry-run` no hace checkout: muestra los commits nuevos de la rama, pero evalúa migraciones y
pasos con el contenido **actual** del clon; por eso conviene hacer el checkout antes. Si el `pull`
trae una versión nueva de `deploy.sh` o `lib.sh`, el script se vuelve a ejecutar solo con la
versión nueva (conservando el lock), para no correr pasos viejos.

Qué hace, en orden: verifica que el clon no tenga cambios locales; `git fetch` + `checkout` + `pull
--ff-only`; `backup.sh --pre-deploy` (dump previo, últimos 10); aplica `supabase/migrations/*.sql`
con `scripts/apply-migrations.sh` (vía `PSQL="docker exec -i app-parejas-db psql ..."`, registra en
`supabase_migrations.schema_migrations`, cada migración en su transacción); aplica el seed de
preguntas `supabase/seed/*.sql` con `scripts/apply-seed.sh` (idempotente, ver `docs/CONTENT.md`); sincroniza
`supabase/functions/` a `stack/volumes/functions/` con `rsync --delete` (conserva `main/`, el
enrutador del edge-runtime) y reinicia `functions` solo si hubo cambios; crea/sincroniza los
buckets de `server/buckets.json`; corre `smoke-test.sh`. Flags: `--skip-backup`, `--dry-run`,
`--local` (smoke test sin HTTPS). Si algo falla se detiene (`set -e`); el dump previo queda en
`backups/db/pre-deploy-*.dump`.

Secretos de Edge Functions (p. ej. credenciales de FCM): `secrets/functions.env` (`KEY=VALOR`, 600);
se inyectan al contenedor `functions` con `compose up -d functions`.

### 5.1 Notificaciones push (Fase 4)

```
INSERT en answers / answer_comments / moods / nudges
  └─ trigger private.notify_on_insert → private.notification_event (destinatario, tokens, prefs)
       └─ pg_net: POST http://functions:9000/notify   (header x-notify-secret)
            └─ Edge Function notify → OAuth con la cuenta de servicio → FCM HTTP v1 → celular
                 └─ tokens rechazados → rpc delete_push_tokens (service role)
```

- **Configuración** (`scripts/server/set-notify-config.sh`, idempotente, `--dry-run`): genera
  `NOTIFY_SECRET` en `secrets/functions.env` si no existe; si está
  `secrets/firebase-service-account.json` (600), guarda su base64 en `FIREBASE_SERVICE_ACCOUNT_B64`;
  copia `notify_url` y `notify_secret` a `private.settings` (schema sin acceso desde el API) y
  recarga `functions`. Si cambias la cuenta de servicio, vuelve a correrlo.
- Sin `private.settings` configurado, los triggers no mandan nada (la escritura nunca falla por un
  push: los errores quedan como `WARNING` en el log de Postgres).
- **Probar:** `scripts/server/test-push.sh <correo>` manda una notificación de prueba a los
  celulares de esa persona y muestra la respuesta de la función (`net._http_response`). Desde la app:
  Más → Avisos → "Mandarme una de prueba".
- **Diagnóstico:** `compose logs --tail=100 functions` (líneas `notify <kind>: sent=… invalid=…`);
  `select id, status_code, left(content, 200) from net._http_response order by id desc limit 5;`
  (pg_net guarda las respuestas unas horas). `smoke-test.sh` revisa que `notify` responda 401 sin
  secreto y avisa si falta la configuración.

## 6. Respaldos (cron)

```cron
30 3 * * * /opt/app-parejas/repo/scripts/server/backup.sh >> /opt/app-parejas/backups/cron.log 2>&1
0  4 * * 0 /opt/app-parejas/repo/scripts/server/backup.sh --storage >> /opt/app-parejas/backups/cron.log 2>&1
```

- BD: `pg_dump -Fc` completo, `backups/db/app-parejas-YYYYmmdd-HHMMSS.dump`, retención 14 días. Se
  verifica que `pg_restore -l` pueda leerlo antes de aceptarlo.
- Storage: `backups/storage/app-parejas-storage-*.tar.gz`, retención 4 semanas.
- Pre-deploy: `pre-deploy-app-parejas-*.dump`, últimos 10.
- Los secretos **no** se incluyen. Si copias respaldos fuera del VPS (recomendado, es el mismo disco), no los
  mezcles con `secrets/`. Revisa de vez en cuando `cron.log` y el espacio en disco.

## 7. Studio por túnel SSH

Studio solo escucha en `127.0.0.1:${STUDIO_HOST_PORT}` (13000) y Traefik no tiene router para él.
Desde tu computadora:

```bash
ssh -L 3000:127.0.0.1:13000 usuario@IP-DEL-VPS
# y abre http://localhost:3000   (Studio directo, sin pasar por el proxy)
```

El gateway ya no publica puerto en el host, así que Studio solo se alcanza por este túnel.

## 8. Restaurar (prompt S-restore)

**Prueba de restauración** (no toca producción; hacerla de vez en cuando y en la Fase 12):

```bash
./scripts/server/restore.sh /opt/app-parejas/backups/db/app-parejas-AAAAmmdd-HHMMSS.dump
# restaura en la BD temporal app_parejas_restore_test y muestra tablas/usuarios/migraciones
./scripts/server/restore.sh --drop-test        # limpiar al terminar
```

**Restaurar sobre producción** (desastre o rollback), exige ambos flags:

```bash
./scripts/server/restore.sh ARCHIVO.dump --into-production --yes-i-am-sure
```

Hace un dump de seguridad (`pre-restore-app-parejas-*.dump`), detiene los servicios que usan la BD
(solo del proyecto), restaura con `--clean --if-exists`, los levanta y recuerda correr el smoke test.
Puede mostrar errores benignos de `pg_restore` (objetos de extensiones). Para Storage: detener
`storage`, extraer el tar.gz en `stack/volumes/storage` y levantar `storage`.

**VPS nuevo desde cero**: repetir §4 hasta el paso 6 (con el mismo `secrets/.env`, **mismos JWT_SECRET
y llaves**, o las sesiones y la app dejan de funcionar), luego restaurar el dump y el tar.gz, y smoke test.

## 9. Operación diaria

Todos los comandos de compose, desde el repo:

```bash
cd /opt/app-parejas/repo && source scripts/server/lib.sh
compose ps                       # estado
compose logs -f --tail=100 auth  # logs de un servicio (auth, rest, realtime, storage, functions, db, api-gw)
compose restart rest
docker stats --no-stream $(docker ps -q --filter label=com.docker.compose.project=app-parejas)   # RAM
```

**Apagar/encender servicios para ahorrar RAM**
- Analytics y Vector: ya no se cargan (no están en el compose base). `STACK_LOGS=true` en `secrets/.env`
  y `compose up -d` los enciende; `false` y `compose up -d --remove-orphans` los quita. Studio funciona
  sin ellos (solo no muestra la sección de logs).
- Supavisor (pooler): `STACK_POOLER=true` + `compose up -d`; para apagarlo, `false` y `compose up -d --remove-orphans`.
- Studio (~300 MB): `compose stop studio` libera RAM; ojo, el gateway lo declara en `depends_on`, así que
  `compose up -d` lo vuelve a levantar. `compose stop studio` otra vez (o súbelo solo cuando lo necesites).
- Todo el stack: `compose stop` (conserva datos) / `compose up -d`. **Nunca** `compose down -v` ni borrar `stack/volumes/`.

**Rotar llaves** (hacer un backup antes: `backup.sh`)
- `DASHBOARD_PASSWORD`: cambiar en `.env` y `compose up -d api-gw studio`.
- `JWT_SECRET` (invalida `ANON_KEY`, `SERVICE_ROLE_KEY` y todas las sesiones): generar nuevo secreto, **volver a
  firmar** ambas llaves (receta en `server/.env.example`), editar `.env`, `compose up -d --force-recreate`
  (todo salvo `db`), actualizar la llave anónima en la app / GitHub Secrets y volver a iniciar sesión.
- `POSTGRES_PASSWORD`: la BD conserva la contraseña vieja (solo se aplica al crear el volumen), así que primero
  `ALTER ROLE ... PASSWORD '<nueva>'` para `postgres`, `supabase_admin`, `authenticator`, `supabase_auth_admin`,
  `supabase_storage_admin`, `supabase_functions_admin`, `pgbouncer`, `supabase_read_only_user`
  (`docker exec -i app-parejas-db psql -U supabase_admin -d postgres`), luego `.env` y `compose up -d --force-recreate`.
- `SECRET_KEY_BASE`, `VAULT_ENC_KEY`, `REALTIME_DB_ENC_KEY`, `PG_META_CRYPTO_KEY`: cifran datos internos; no rotar sin motivo.
- Registrar todo cambio en `secrets/CREDENCIALES.md`.

**Cerrar el registro** cuando los dos ya se registraron: `DISABLE_SIGNUP=true` en `.env` y `compose up -d auth`.

**Actualizar la versión de Supabase**: nunca de forma automática. Traer el `docker/` oficial nuevo a un
directorio aparte, comparar con `diff -ru` contra `stack/`, hacer backup, aplicar y correr el smoke test.

## 10. Troubleshooting

| Síntoma | Qué mirar |
|---|---|
| `smoke-test` ❌ contenedor `unhealthy` | `compose logs --tail=100 <servicio>`; `db` primero: casi todo depende de ella. |
| 404 de Traefik en un prefijo del API | Labels no aplicadas (`docker inspect app-parejas-gateway`), `PAREJAS_API_HOST` distinto al dominio, o el api-gw no está en `n8n_default` (`smoke-test.sh` lo revisa). |
| 502/504/gateway timeout desde el dominio | Traefik no llega al api-gw: red equivocada (`traefik.docker.network` debe ser `n8n_default`) o contenedor caído. Probar sin Traefik: `./scripts/server/smoke-test.sh --local`. |
| `compose up` dice que la red `n8n_default` no existe | Se llama distinto en este VPS: ajustar `TRAEFIK_NETWORK` en `.env` (`docker network ls`). |
| 401 `No API key found` | Falta el header `apikey` (la app debe usar la ANON_KEY). |
| Realtime no conecta / `tenant not found` | Proxy sin cabeceras `Upgrade`/`Connection`; o el alias de red `realtime-dev.supabase-realtime` no existe (`docker inspect app-parejas-gateway`/realtime). |
| `docker exec ... psql` (el host no tiene pg_dump/psql) pide contraseña o falla auth | Usar `-U supabase_admin` (el contenedor trae `PGPASSWORD`); verificar `DB_USER`/`DB_DUMP_USER` en `lib.sh`. |
| `deploy.sh`: "cambios locales" | `git -C /opt/app-parejas/repo status`; descartar con `git checkout -- .` solo si es seguro. |
| Migración falla a medias | Cada una es transaccional: no queda registrada ni aplicada. Corregir en el repo, `deploy.sh`. El dump previo está en `backups/db/`. |
| Edge Function no aparece | `ls stack/volumes/functions`, `compose logs functions`; recordar que `main/` es del oficial. |
| Disco lleno | `du -sh stack/volumes/* backups/*`; bajar retención en `backup.sh`; logs ya rotan. |
| Contenedor reiniciándose por memoria (OOM) | `docker inspect -f '{{.State.OOMKilled}}' <contenedor>`; subir `MEM_*` en `.env`. |

## 11. Plan B: Supabase Cloud Free

Si el VPS no aguanta (S0 mide la RAM libre), la app no cambia de código; solo la configuración:

- **Qué cambia**: la URL (`https://<ref>.supabase.co`) y la `anon key` del proyecto cloud (Settings > API) en la
  configuración de la app / GitHub Secrets. El service role key solo se usa en servidores o scripts, nunca en la app.
- **Migraciones**: el mismo script, por conexión directa o pooler de sesión (cadena en Settings > Database):
  ```bash
  DB_URL='postgresql://postgres.<ref>:<contraseña>@aws-0-<region>.pooler.supabase.com:5432/postgres' \
    bash scripts/apply-migrations.sh
  ```
  (la conexión directa del plan gratuito es solo IPv6; el pooler de sesión funciona por IPv4).
- **Auth**: en el dashboard, Site URL y Redirect URLs, desactivar "Confirm email" (sin SMTP).
- **Edge Functions**: `supabase functions deploy notify` (CLI) con los secretos en `supabase secrets set`.
- **Buckets**: crearlos en el dashboard o con la API de Storage y el mismo `server/buckets.json`.
- **Ojo**: el plan gratuito pausa el proyecto tras ~1 semana sin actividad, tiene límites (500 MB de BD, 1 GB de
  Storage) y no incluye respaldos descargables: seguir haciendo `pg_dump` periódicos con `DB_URL`.
- `scripts/server/*` no aplican en este modo (son para el VPS).
