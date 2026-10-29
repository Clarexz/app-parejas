# shellcheck shell=bash
# =====================================================================================
# lib.sh - helpers comunes de los scripts de servidor de App Parejas.
# Se usa con:   source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
# Estos scripts se ejecutan EN el VPS. No contiene secretos: las llaves se leen de
# /opt/app-parejas/secrets/.env cuando hacen falta.
#
# Seguridad en un VPS compartido: todo lo que toca Docker va por el proyecto compose
# `app-parejas` o por el contenedor `app-parejas-db`. Nada de prune ni de tocar
# contenedores, redes o volúmenes de otros proyectos.
# =====================================================================================

# Variables que otros scripts (los que hacen `source`) usan; shellcheck no lo ve.
# shellcheck disable=SC2034

# --- Rutas (APP_ROOT se puede sobrescribir: APP_ROOT=/otra/ruta ./deploy.sh) -----------
APP_ROOT="${APP_ROOT:-/opt/app-parejas}"
REPO_DIR="${REPO_DIR:-$APP_ROOT/repo}"
STACK_DIR="${STACK_DIR:-$APP_ROOT/stack}"
SECRETS_DIR="${SECRETS_DIR:-$APP_ROOT/secrets}"
BACKUPS_DIR="${BACKUPS_DIR:-$APP_ROOT/backups}"
ENV_FILE="${ENV_FILE:-$SECRETS_DIR/.env}"

# --- Docker / base de datos -------------------------------------------------------------
COMPOSE_PROJECT="app-parejas"
DB_CONTAINER="${DB_CONTAINER:-app-parejas-db}"
STORAGE_CONTAINER="${STORAGE_CONTAINER:-app-parejas-storage}"
DB_NAME_DEFAULT="postgres"
# Usuario para migraciones y consultas (el mismo que usa el CLI de Supabase).
DB_USER="${DB_USER:-postgres}"
# Usuario para pg_dump / pg_restore (superusuario del stack: ve y restaura todo).
DB_DUMP_USER="${DB_DUMP_USER:-supabase_admin}"

# Colores solo si la salida es una terminal.
if [[ -t 1 ]]; then
  C_ROJO=$'\033[31m'; C_VERDE=$'\033[32m'; C_AMARILLO=$'\033[33m'; C_FIN=$'\033[0m'
else
  C_ROJO=""; C_VERDE=""; C_AMARILLO=""; C_FIN=""
fi

log()   { printf '[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }
aviso() { printf '%s[%s] AVISO: %s%s\n' "$C_AMARILLO" "$(date +%H:%M:%S)" "$*" "$C_FIN" >&2; }
error() { printf '%s[%s] ERROR: %s%s\n' "$C_ROJO" "$(date +%H:%M:%S)" "$*" "$C_FIN" >&2; }
die()   { error "$*"; exit 1; }

# Ejecuta el comando, o solo lo muestra si DRY_RUN=1.
ejecutar() {
  if [[ "${DRY_RUN:-0}" == "1" ]]; then
    log "[dry-run] $*"
  else
    "$@"
  fi
}

requiere_cmd() {
  local c
  for c in "$@"; do
    command -v "$c" >/dev/null 2>&1 || die "Falta el comando '$c'. Instálalo (p. ej. apt install $c) y reintenta."
  done
}

# --- Entorno (.env del stack) -------------------------------------------------------------
# Lee KEY=VALOR sin ejecutar el archivo (el .env de Docker permite espacios sin comillas,
# que bash no soportaría con `source`). Las variables quedan exportadas.
cargar_env() {
  [[ -r "$ENV_FILE" ]] || die "No puedo leer $ENV_FILE. ¿Se ejecutó ya la instalación del stack (S1)?"
  local linea clave valor
  local re_asig='^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=(.*)$'
  local re_dobles='^"(.*)"$'
  local re_simples="^'(.*)'\$"
  while IFS= read -r linea || [[ -n "$linea" ]]; do
    linea="${linea%$'\r'}"
    [[ "$linea" =~ ^[[:space:]]*# ]] && continue
    [[ "$linea" =~ $re_asig ]] || continue
    clave="${BASH_REMATCH[1]}"
    valor="${BASH_REMATCH[2]}"
    if [[ "$valor" =~ $re_dobles ]] || [[ "$valor" =~ $re_simples ]]; then
      valor="${BASH_REMATCH[1]}"
    fi
    export "$clave=$valor"
  done < "$ENV_FILE"
  _ENV_CARGADO=1
}

# Verifica que las variables imprescindibles existan y no sean placeholders (CAMBIAR_...).
validar_env() {
  local k v malas=()
  for k in POSTGRES_PASSWORD JWT_SECRET ANON_KEY SERVICE_ROLE_KEY SUPABASE_PUBLIC_URL \
           PAREJAS_API_HOST DASHBOARD_PASSWORD; do
    v="${!k:-}"
    if [[ -z "$v" || "$v" == *CAMBIAR* ]]; then malas+=("$k"); fi
  done
  if ((${#malas[@]})); then
    die "Faltan o siguen con placeholder en $ENV_FILE: ${malas[*]}"
  fi
}

# --- Docker Compose -----------------------------------------------------------------------
# Wrapper: proyecto app-parejas + compose oficial + overrides. Uso: compose ps | compose logs -f auth
compose() {
  requiere_cmd docker
  [[ "${_ENV_CARGADO:-0}" == "1" ]] || cargar_env
  [[ -f "$STACK_DIR/docker-compose.yml" ]] || die "No existe $STACK_DIR/docker-compose.yml (S1 debe copiar el docker/ oficial)."
  [[ -f "$STACK_DIR/docker-compose.override.yml" ]] || die "No existe $STACK_DIR/docker-compose.override.yml (cópialo de server/ del repo)."
  local -a archivos=(-f "$STACK_DIR/docker-compose.yml")
  local -a perfiles=()
  if [[ "${STACK_GATEWAY:-envoy}" == "kong" ]]; then
    archivos+=(-f "$STACK_DIR/docker-compose.kong.yml")
  fi
  if [[ "${STACK_LOGS:-false}" == "true" ]]; then
    archivos+=(-f "$STACK_DIR/docker-compose.logs.yml")
  fi
  archivos+=(-f "$STACK_DIR/docker-compose.override.yml")
  if [[ "${STACK_LOGS:-false}" == "true" ]]; then
    archivos+=(-f "$STACK_DIR/docker-compose.logs.override.yml")
  fi
  if [[ "${STACK_POOLER:-false}" == "true" ]]; then
    perfiles+=(--profile pooler)
  fi
  docker compose -p "$COMPOSE_PROJECT" --project-directory "$STACK_DIR" \
    --env-file "$ENV_FILE" "${archivos[@]}" ${perfiles[@]+"${perfiles[@]}"} "$@"
}

# psql dentro del contenedor de la BD. Uso: psql_db -At -c "select 1"   (SQL por stdin también vale)
psql_db() {
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "${POSTGRES_DB:-$DB_NAME_DEFAULT}" -X -v ON_ERROR_STOP=1 "$@"
}

# Falla con mensaje claro si el contenedor de la BD no está corriendo.
requiere_db() {
  requiere_cmd docker
  local estado
  estado="$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null || true)"
  [[ "$estado" == "true" ]] || die "El contenedor $DB_CONTAINER no está corriendo. Revisa: docker ps -a --filter name=app-parejas"
}

# Candado para que no corran a la vez dos operaciones peligrosas (deploy/restore).
tomar_lock() {
  mkdir -p "$APP_ROOT"
  if command -v flock >/dev/null 2>&1; then
    exec 9>"$APP_ROOT/.lock-${1:-deploy}"
    flock -n 9 || die "Hay otra operación ('${1:-deploy}') en curso. Espera a que termine."
  fi
}

# --- HTTP con llaves sin exponerlas en `ps` -----------------------------------------------
# api_request METODO URL [LLAVE] [JSON]  ->  deja el código en HTTP_CODE y el cuerpo en HTTP_BODY.
# La llave se pasa por un archivo temporal (chmod 600), no por la línea de comandos.
_TMP_FILES=()
limpiar_temporales() {
  if ((${#_TMP_FILES[@]})); then rm -f "${_TMP_FILES[@]}"; fi
}
trap limpiar_temporales EXIT

nuevo_temporal() {
  local t
  t="$(mktemp)"
  chmod 600 "$t"
  _TMP_FILES+=("$t")
  printf '%s' "$t"
}

HTTP_CODE=""
HTTP_BODY=""
api_request() {
  local metodo="$1" url="$2" llave="${3:-}" cuerpo="${4:-}"
  [[ -n "$HTTP_BODY" ]] || HTTP_BODY="$(nuevo_temporal)"
  local hdr
  hdr="$(nuevo_temporal)"
  : > "$HTTP_BODY"
  local -a args=(-sS -o "$HTTP_BODY" -w '%{http_code}' --max-time 20 -X "$metodo")
  if [[ -n "$llave" ]]; then
    printf 'apikey: %s\nAuthorization: Bearer %s\n' "$llave" "$llave" > "$hdr"
    args+=(-H "@$hdr")
  fi
  if [[ -n "$cuerpo" ]]; then
    args+=(-H 'Content-Type: application/json' --data-binary "$cuerpo")
  fi
  HTTP_CODE="$(curl "${args[@]}" "$url" 2>/dev/null)" || HTTP_CODE="000"
  [[ -n "$HTTP_CODE" ]] || HTTP_CODE="000"
}

# IP del gateway dentro de app-parejas-net (el gateway no publica puertos en el host; como
# root en el VPS se llega directo a la IP del contenedor).
gateway_ip() {
  docker inspect -f '{{with index .NetworkSettings.Networks "app-parejas-net"}}{{.IPAddress}}{{end}}' \
    app-parejas-gateway 2>/dev/null || true
}

# URL base del API (sin barra final). Con --local (LOCAL=1) va directo al contenedor del
# gateway por la red del stack (sin Traefik ni HTTPS).
url_base() {
  if [[ "${LOCAL:-0}" == "1" ]]; then
    local ip
    ip="$(gateway_ip)"
    [[ -n "$ip" ]] || die "No encuentro la IP de app-parejas-gateway en app-parejas-net (¿está corriendo?)."
    printf 'http://%s:8000' "$ip"
  else
    printf '%s' "${SUPABASE_PUBLIC_URL%/}"
  fi
}
