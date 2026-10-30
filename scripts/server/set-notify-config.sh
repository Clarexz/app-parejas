#!/usr/bin/env bash
# =====================================================================================
# set-notify-config.sh - configura las notificaciones push en el VPS (Fase 4).
#
#   set-notify-config.sh [--dry-run]
#
#   --dry-run   no cambia nada: muestra qué haría
#   -h, --help  esta ayuda
#
# Variable opcional: NOTIFY_URL (por defecto http://functions:9000/notify).
#
# Pasos: (a) genera NOTIFY_SECRET en $SECRETS_DIR/functions.env si no existe (chmod 600)
#        (b) si existe $SECRETS_DIR/firebase-service-account.json, guarda su base64 en
#            FIREBASE_SERVICE_ACCOUNT_B64 (si no existe, avisa y sigue)
#        (c) upsert de notify_url y notify_secret en private.settings (el secreto va por stdin)
#        (d) recarga el servicio `functions` para que lea el entorno
# Nunca imprime secretos. Es idempotente.
# =====================================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help) sed -n '2,17p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "Opción desconocida: $arg" ;;
  esac
done
export DRY_RUN

requiere_cmd docker openssl base64
cargar_env
requiere_db
((DRY_RUN)) && log "== MODO DRY-RUN: no se cambia nada =="

FUNCTIONS_ENV="${FUNCTIONS_ENV_FILE:-$SECRETS_DIR/functions.env}"
SA_JSON="$SECRETS_DIR/firebase-service-account.json"
NOTIFY_URL="${NOTIFY_URL:-http://functions:9000/notify}"

# Lee el valor de una clave de functions.env (vacío si no existe).
leer_clave() {
  [[ -f "$FUNCTIONS_ENV" ]] || return 0
  grep -E "^$1=" "$FUNCTIONS_ENV" | tail -n 1 | cut -d= -f2- || true
}

# Escribe o actualiza CLAVE=VALOR en functions.env sin pasar el valor por argumentos de procesos.
poner_clave() {
  local clave="$1" valor="$2" tmp
  tmp="$(nuevo_temporal)"
  if [[ -f "$FUNCTIONS_ENV" ]]; then
    grep -v -E "^${clave}=" "$FUNCTIONS_ENV" > "$tmp" || true
  fi
  printf '%s=%s\n' "$clave" "$valor" >> "$tmp"
  cat "$tmp" > "$FUNCTIONS_ENV"
  chmod 600 "$FUNCTIONS_ENV"
}

# --- (a) NOTIFY_SECRET --------------------------------------------------------------------
SECRET="$(leer_clave NOTIFY_SECRET)"
if [[ -n "$SECRET" ]]; then
  log "NOTIFY_SECRET ya existe en $FUNCTIONS_ENV"
elif ((DRY_RUN)); then
  log "[dry-run] se generaría NOTIFY_SECRET en $FUNCTIONS_ENV"
  SECRET="dry-run"
else
  mkdir -p "$SECRETS_DIR"
  SECRET="$(openssl rand -hex 32)"
  poner_clave NOTIFY_SECRET "$SECRET"
  log "NOTIFY_SECRET generado en $FUNCTIONS_ENV"
fi

# --- (b) Cuenta de servicio de Firebase ---------------------------------------------------
if [[ -f "$SA_JSON" ]]; then
  if ((DRY_RUN)); then
    log "[dry-run] se guardaría FIREBASE_SERVICE_ACCOUNT_B64 desde $SA_JSON"
  else
    poner_clave FIREBASE_SERVICE_ACCOUNT_B64 "$(base64 -w0 "$SA_JSON")"
    log "FIREBASE_SERVICE_ACCOUNT_B64 actualizado desde $SA_JSON"
  fi
else
  aviso "No existe $SA_JSON: el push no saldrá hasta que subas la cuenta de servicio de Firebase y vuelvas a correr este script."
fi

# --- (c) private.settings -----------------------------------------------------------------
if ((DRY_RUN)); then
  log "[dry-run] upsert en private.settings: notify_url=$NOTIFY_URL y notify_secret=(oculto)"
else
  # El secreto y la URL viajan por stdin (como variables de psql), no por la línea de comandos.
  {
    printf '\\set notify_url %s\n' "'${NOTIFY_URL//\'/\'\'}'"
    printf '\\set notify_secret %s\n' "'$SECRET'"
    cat <<'SQL'
insert into private.settings (key, value) values ('notify_url', :'notify_url'), ('notify_secret', :'notify_secret')
on conflict (key) do update set value = excluded.value, updated_at = now();
SQL
  } | psql_db -q >/dev/null
  log "private.settings actualizado (notify_url=$NOTIFY_URL)"
fi

# --- (d) Recargar functions ---------------------------------------------------------------
if ((DRY_RUN)); then
  log "[dry-run] compose up -d functions"
else
  compose up -d functions
  log "Servicio functions recargado."
fi
log "Listo. Prueba con: scripts/server/test-push.sh <correo>"
