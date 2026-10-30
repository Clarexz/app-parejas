#!/usr/bin/env bash
# =====================================================================================
# reset-password.sh - restablece la contraseña de una cuenta de la app.
#
#   reset-password.sh CORREO [--local]
#
# El stack no tiene SMTP, así que "olvidé mi contraseña" no puede mandar correo: la app
# le pide a la persona que te avise y tú corres esto en el VPS. Genera una contraseña
# temporal, la muestra UNA vez (pásasela por WhatsApp) y la persona la cambia después
# desde Ajustes. Usa la API de administración de Auth con la service key.
#
#   --local   habla con el gateway por la red interna (sin Traefik ni HTTPS)
# =====================================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

CORREO=""
LOCAL=0
for arg in "$@"; do
  case "$arg" in
    --local)    LOCAL=1 ;;
    -h|--help)  sed -n '2,14p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*)         die "Opción desconocida: $arg" ;;
    *)          [[ -z "$CORREO" ]] || die "Solo se acepta un correo."; CORREO="$arg" ;;
  esac
done
[[ -n "$CORREO" ]] || die "Uso: reset-password.sh CORREO [--local]"
export LOCAL

requiere_cmd docker curl jq openssl
cargar_env
validar_env
requiere_db

# El correo va como variable de psql (:'correo'), nunca interpolado en el SQL.
USER_ID="$(psql_db -At -v correo="$CORREO" <<'SQL'
select id from auth.users where lower(email) = lower(:'correo') and deleted_at is null;
SQL
)"
[[ -n "$USER_ID" ]] || die "No existe ninguna cuenta con el correo $CORREO."

# 12 caracteres sin ambiguos (fáciles de dictar).
TEMPORAL="$(openssl rand -base64 48 | tr -dc 'abcdefghjkmnpqrstuvwxyz23456789' | head -c 12)"
[[ ${#TEMPORAL} -eq 12 ]] || die "No pude generar la contraseña temporal."

BASE="$(url_base)"
cuerpo="$(jq -cn --arg p "$TEMPORAL" '{password: $p}')"
api_request PUT "$BASE/auth/v1/admin/users/$USER_ID" "$SERVICE_ROLE_KEY" "$cuerpo"
[[ "$HTTP_CODE" == "200" ]] || die "Auth rechazó el cambio ($HTTP_CODE): $(cat "$HTTP_BODY")"

log "Contraseña de $CORREO restablecida."
printf '\n  Contraseña temporal: %s\n\n' "$TEMPORAL"
log "Pásasela a la persona; puede cambiarla en la app (Más > Mi perfil > Cambiar contraseña)."
