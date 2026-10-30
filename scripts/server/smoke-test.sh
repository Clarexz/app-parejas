#!/usr/bin/env bash
# =====================================================================================
# smoke-test.sh - comprobaciones rápidas del stack de App Parejas (se ejecuta EN el VPS).
#
#   smoke-test.sh            prueba contra la URL pública (SUPABASE_PUBLIC_URL, con HTTPS)
#   smoke-test.sh --local    prueba contra la IP del gateway en app-parejas-net (sin Traefik/HTTPS)
#
# Comprueba: (a) contenedores sanos, (b) Auth health, (c) PostgREST, (d) Storage,
# (e) tablas/RLS/migraciones en la BD, (f) que Postgres y el gateway NO estén expuestos,
# (g) HTTPS con certificado válido. Imprime ✅/❌ por línea; sale con código 1 si algo falla.
# =====================================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

LOCAL=0
for arg in "$@"; do
  case "$arg" in
    --local)   LOCAL=1 ;;
    -h|--help) sed -n '2,11p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "Opción desconocida: $arg (usa --local)" ;;
  esac
done
export LOCAL

requiere_cmd docker curl
cargar_env
validar_env

FALLOS=0
AVISOS=0
ok()    { printf '✅ %s\n' "$*"; }
falla() { printf '❌ %s\n' "$*"; FALLOS=$((FALLOS + 1)); }
warn()  { printf '⚠️  %s\n' "$*"; AVISOS=$((AVISOS + 1)); }
# espera_codigo CODIGO "mensaje ok" "mensaje de fallo (el código real se agrega solo)"
espera_codigo() {
  if [[ "$HTTP_CODE" == "$1" ]]; then ok "$2"; else falla "$3 -> $HTTP_CODE (esperado $1)"; fi
}

BASE="$(url_base)"
printf '== Smoke test App Parejas (%s) ==\n' "$([[ $LOCAL == 1 ]] && echo "local: $BASE" || echo "$BASE")"

# --- (a) Contenedores ---------------------------------------------------------------------
ESPERADOS=(app-parejas-db app-parejas-gateway app-parejas-auth app-parejas-rest \
           realtime-dev.app-parejas-realtime app-parejas-storage app-parejas-imgproxy \
           app-parejas-meta app-parejas-functions app-parejas-studio)
mapfile -t LINEAS < <(docker ps -a --filter "label=com.docker.compose.project=$COMPOSE_PROJECT" \
  --format '{{.Names}}|{{.State}}|{{.Status}}' | sort)
if ((${#LINEAS[@]} == 0)); then
  falla "Contenedores: no hay ningún contenedor del proyecto $COMPOSE_PROJECT"
else
  for esperado in "${ESPERADOS[@]}"; do
    printf '%s\n' "${LINEAS[@]}" | cut -d'|' -f1 | grep -qxF "$esperado" \
      || falla "Contenedor $esperado no existe"
  done
  for l in "${LINEAS[@]}"; do
    IFS='|' read -r nombre estado detalle <<<"$l"
    if [[ "$estado" != "running" ]]; then
      falla "Contenedor $nombre: $detalle"
    elif [[ "$detalle" == *"(unhealthy)"* ]]; then
      falla "Contenedor $nombre: $detalle"
    elif [[ "$detalle" == *"health: starting"* ]]; then
      warn "Contenedor $nombre aún arrancando: $detalle"
    else
      ok "Contenedor $nombre: $detalle"
    fi
  done
fi

# --- (b) Auth -----------------------------------------------------------------------------
api_request GET "$BASE/auth/v1/health" "$ANON_KEY"
espera_codigo 200 "Auth health (/auth/v1/health) -> 200" "Auth health"

# --- (c) PostgREST ------------------------------------------------------------------------
# En el compose oficial actual la raíz /rest/v1/ (OpenAPI) es solo para admin: se prueba con
# la service key. Con la anon key puede dar 200 (versiones anteriores) o 401/403 (actual).
api_request GET "$BASE/rest/v1/" "$SERVICE_ROLE_KEY"
espera_codigo 200 "PostgREST (/rest/v1/, service key) -> 200" "PostgREST (/rest/v1/, service key)"
api_request GET "$BASE/rest/v1/" "$ANON_KEY"
case "$HTTP_CODE" in
  200|401|403) ok "PostgREST con anon key responde $HTTP_CODE (gateway y apikey funcionan)" ;;
  *)           falla "PostgREST con anon key -> $HTTP_CODE (esperado 200/401/403)" ;;
esac
api_request GET "$BASE/rest/v1/" ""
espera_codigo 401 "Sin apikey el gateway rechaza (401)" "Sin apikey el gateway"

# --- (d) Storage --------------------------------------------------------------------------
api_request GET "$BASE/storage/v1/bucket" "$SERVICE_ROLE_KEY"
espera_codigo 200 "Storage (/storage/v1/bucket, service key) -> 200" "Storage (/storage/v1/bucket)"

# --- (e) Base de datos --------------------------------------------------------------------
if [[ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null || true)" == "true" ]]; then
  for t in profiles couples couple_members moods; do
    rls="$(psql_db -At -c "select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = '$t' and c.relkind in ('r','p')" 2>/dev/null || true)"
    case "$rls" in
      t) ok "Tabla public.$t existe con RLS activada" ;;
      f) falla "Tabla public.$t existe pero SIN RLS" ;;
      *) falla "Tabla public.$t no existe (¿faltan migraciones?)" ;;
    esac
  done
  nmig="$(psql_db -At -c 'select count(*) from supabase_migrations.schema_migrations' 2>/dev/null || true)"
  nfiles="$(find "$REPO_DIR/supabase/migrations" -maxdepth 1 -name '*.sql' 2>/dev/null | wc -l | tr -d ' ')"
  if [[ -z "$nmig" ]]; then
    falla "No existe supabase_migrations.schema_migrations (no se han aplicado migraciones)"
  elif ((nmig >= nfiles)); then
    ok "Migraciones registradas: $nmig (archivos en el repo: $nfiles)"
  else
    falla "Migraciones registradas: $nmig, pero el repo tiene $nfiles (corre deploy.sh)"
  fi
else
  falla "BD: el contenedor $DB_CONTAINER no está corriendo"
fi

# --- (f) Exposición de puertos ------------------------------------------------------------
# f1) Ningún contenedor del proyecto publica puertos en todas las interfaces.
EXPUESTOS="$(docker ps --filter "label=com.docker.compose.project=$COMPOSE_PROJECT" --format '{{.Names}}|{{.Ports}}' \
  | grep -E '(0\.0\.0\.0|\[::\]|:::)[0-9]*->' || true)"
if [[ -z "$EXPUESTOS" ]]; then
  ok "Ningún contenedor de $COMPOSE_PROJECT publica puertos en 0.0.0.0/[::]"
else
  falla "Contenedores de $COMPOSE_PROJECT con puertos públicos: $EXPUESTOS"
fi

# f2) El gateway no publica puertos en el host y está conectado a la red de Traefik.
PUB_GW="$(docker port app-parejas-gateway 2>/dev/null || true)"
if [[ -z "$PUB_GW" ]]; then
  ok "El gateway no publica puertos en el host"
else
  falla "El gateway publica puertos en el host: $PUB_GW"
fi
RED_TRAEFIK="${TRAEFIK_NETWORK:-n8n_default}"
if docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' app-parejas-gateway 2>/dev/null \
     | tr ' ' '\n' | grep -qxF "$RED_TRAEFIK"; then
  ok "El gateway está conectado a la red de Traefik ($RED_TRAEFIK)"
else
  falla "El gateway NO está conectado a la red $RED_TRAEFIK (Traefik no lo alcanza)"
fi

# f3) Listeners del host: 5432/6543 no deben escuchar fuera de loopback por culpa nuestra.
es_loopback() { [[ "$1" == 127.* || "$1" == "[::1]" ]]; }
if command -v ss >/dev/null 2>&1; then
  mapfile -t ESCUCHAS < <(ss -H -ltn | awk '{print $4}')
  ofensores_pg=""
  for dir in "${ESCUCHAS[@]}"; do
    puerto="${dir##*:}"
    addr="${dir%:*}"
    if [[ "$puerto" == "5432" || "$puerto" == "6543" ]] && ! es_loopback "$addr"; then
      ofensores_pg+=" $dir"
    fi
  done
  if [[ -z "$ofensores_pg" ]]; then
    ok "Nada escucha en 5432/6543 fuera de 127.0.0.1"
  elif [[ -z "$EXPUESTOS" ]]; then
    warn "5432/6543 escuchan fuera de loopback ($ofensores_pg ) pero NO son de $COMPOSE_PROJECT (otro proyecto del VPS)"
  else
    falla "Postgres/pooler expuesto:$ofensores_pg"
  fi
else
  warn "No existe el comando 'ss'; se omite la revisión de puertos del host"
fi

# --- (g) HTTPS ----------------------------------------------------------------------------
if ((LOCAL)); then
  warn "HTTPS omitido (--local)"
else
  if [[ "$BASE" != https://* ]]; then
    falla "SUPABASE_PUBLIC_URL no es https:// ($BASE)"
  else
    # Sin -k: si el certificado no es válido, curl falla (código 60) y HTTP_CODE queda 000.
    api_request GET "$BASE/auth/v1/health" "$ANON_KEY"
    if [[ "$HTTP_CODE" == "200" ]]; then
      ok "HTTPS con certificado válido ($BASE)"
    else
      falla "HTTPS: $BASE/auth/v1/health -> $HTTP_CODE (000 = certificado inválido o sin conexión; revisa el reverse proxy)"
    fi
    host="${BASE#https://}"; host="${host%%/*}"
    if command -v openssl >/dev/null 2>&1; then
      if echo | openssl s_client -servername "$host" -connect "$host:443" 2>/dev/null \
           | openssl x509 -noout -checkend $((14 * 86400)) >/dev/null 2>&1; then
        ok "El certificado de $host vence en más de 14 días"
      else
        warn "El certificado de $host vence en menos de 14 días (o no se pudo leer)"
      fi
    fi
    # La raíz del dominio no debe servir Studio ni nada fuera del API.
    api_request GET "$BASE/" ""
    if [[ "$HTTP_CODE" == "404" ]]; then
      ok "La raíz $BASE/ no está expuesta (404): Studio no sale a Internet"
    else
      falla "La raíz $BASE/ responde $HTTP_CODE (esperado 404). Revisa las labels de Traefik / limita el proxy a /auth|rest|realtime|storage|functions/v1/"
    fi
  fi
fi

printf '\n'
if ((FALLOS)); then
  printf '❌ Smoke test con %d fallo(s) y %d aviso(s)\n' "$FALLOS" "$AVISOS"
  exit 1
fi
printf '✅ Smoke test OK (%d aviso(s))\n' "$AVISOS"
