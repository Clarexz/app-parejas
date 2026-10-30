#!/usr/bin/env bash
# =====================================================================================
# test-push.sh - manda un push de prueba a una persona (se ejecuta EN el VPS).
#
#   test-push.sh <correo>
#
# Llama private.send_notification('test', ...) para el usuario con ese correo, imprime el
# id de la petición de pg_net y, tras unos segundos, el status HTTP que devolvió `notify`.
# =====================================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

CORREO=""
for arg in "$@"; do
  case "$arg" in
    -h|--help) sed -n '2,9p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) die "Opción desconocida: $arg" ;;
    *)  [[ -z "$CORREO" ]] || die "Solo se acepta un correo."; CORREO="$arg" ;;
  esac
done
[[ -n "$CORREO" ]] || die "Uso: test-push.sh <correo>"

cargar_env
requiere_db

# El correo va por stdin como variable de psql (sin interpolarlo en la línea de comandos).
SQL_USUARIO="select id from auth.users where lower(email) = lower(:'correo')"
USER_ID="$({ printf '\\set correo %s\n' "'${CORREO//\'/\'\'}'"; printf '%s;\n' "$SQL_USUARIO"; } | psql_db -At -q)"
[[ -n "$USER_ID" ]] || die "No hay ningún usuario con el correo $CORREO"

NTOKENS="$(psql_db -At -c "select count(*) from public.push_tokens where user_id = '$USER_ID'")"
log "Usuario $USER_ID con $NTOKENS token(s) registrados."
((NTOKENS > 0)) || aviso "No tiene tokens: abre la app en su celular y acepta los permisos de notificaciones."

REQ_ID="$(psql_db -At -q -c "select private.send_notification('test', null, '$USER_ID'::uuid, '{}'::jsonb)")"
if [[ -z "$REQ_ID" ]]; then
  die "No se encoló nada: ¿faltan notify_url/notify_secret (set-notify-config.sh)?"
fi
log "Petición de pg_net: $REQ_ID"

sleep 4
psql_db -x -q -c "select id, status_code, timed_out, error_msg, left(content, 200) as respuesta from net._http_response where id = $REQ_ID" \
  || true
log "Si no aparece fila, espera unos segundos y consulta net._http_response de nuevo (id $REQ_ID)."
