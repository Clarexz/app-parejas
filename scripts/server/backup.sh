#!/usr/bin/env bash
# =====================================================================================
# backup.sh - respaldos de App Parejas (se ejecuta EN el VPS).
#
#   backup.sh                 pg_dump (formato custom, comprimido) de la BD
#                             -> /opt/app-parejas/backups/db/app-parejas-YYYYmmdd-HHMMSS.dump
#                             Retención: 14 días.
#   backup.sh --storage       tar.gz del volumen de Storage (fotos, audios, ...)
#                             -> /opt/app-parejas/backups/storage/app-parejas-storage-YYYYmmdd-HHMMSS.tar.gz
#                             Retención: 4 semanas (28 días). NO incluye la BD.
#   backup.sh --pre-deploy    dump previo a un deploy
#                             -> backups/db/pre-deploy-app-parejas-YYYYmmdd-HHMMSS.dump
#                             Retención propia: los últimos 10.
#
# Cron sugerido (crontab -e del usuario que administra Docker):
#   30 3 * * * /opt/app-parejas/repo/scripts/server/backup.sh >> /opt/app-parejas/backups/backup.log 2>&1
#   0 4 * * 0  /opt/app-parejas/repo/scripts/server/backup.sh --storage >> /opt/app-parejas/backups/backup.log 2>&1
#
# Nunca incluye /opt/app-parejas/secrets/ en los respaldos. Si copias los respaldos fuera
# del VPS, no copies los secretos junto al dump.
# =====================================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

MODO="db"
PREFIJO=""
for arg in "$@"; do
  case "$arg" in
    --storage)    MODO="storage" ;;
    --pre-deploy) PREFIJO="pre-deploy-" ;;
    -h|--help)    sed -n '2,22p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "Opción desconocida: $arg (usa --storage, --pre-deploy)" ;;
  esac
done

SELLO="$(date +%Y%m%d-%H%M%S)"
umask 077

# Deja solo los N archivos más recientes que coincidan con el patrón en el directorio.
conservar_ultimos() {
  local dir="$1" patron="$2" n="$3" f
  local -a viejos=()
  mapfile -t viejos < <(find "$dir" -maxdepth 1 -type f -name "$patron" -printf '%T@ %p\n' \
    | sort -rn | tail -n +"$((n + 1))" | cut -d' ' -f2-)
  for f in "${viejos[@]}"; do
    log "Retención: borro $f"
    rm -f -- "$f"
  done
}

# Borra los archivos con ese patrón más antiguos que N días.
borrar_mas_viejos_que() {
  local dir="$1" patron="$2" dias="$3"
  find "$dir" -maxdepth 1 -type f -name "$patron" -mtime "+$dias" -print -delete \
    | while IFS= read -r f; do log "Retención: borré $f"; done
}

respaldo_db() {
  requiere_db
  local dir="$BACKUPS_DIR/db"
  mkdir -p "$dir"
  local destino="$dir/${PREFIJO}app-parejas-${SELLO}.dump"
  local parcial="$destino.partial"
  cargar_env

  log "pg_dump de '${POSTGRES_DB:-$DB_NAME_DEFAULT}' -> $destino"
  # -Fc = formato custom (ya comprimido); -Z 6 nivel de compresión.
  if ! docker exec "$DB_CONTAINER" pg_dump -U "$DB_DUMP_USER" -d "${POSTGRES_DB:-$DB_NAME_DEFAULT}" \
       -Fc -Z 6 > "$parcial"; then
    rm -f "$parcial"
    die "pg_dump falló; no se dejó ningún archivo a medias."
  fi

  # Verificación: pg_restore debe poder leer el índice del dump y no debe estar vacío.
  if [[ ! -s "$parcial" ]] || ! docker exec -i "$DB_CONTAINER" pg_restore -l < "$parcial" >/dev/null 2>&1; then
    rm -f "$parcial"
    die "El dump generado está vacío o no es legible; se descartó."
  fi
  mv -- "$parcial" "$destino"
  log "Listo: $(du -h "$destino" | cut -f1) en $destino"

  if [[ -n "$PREFIJO" ]]; then
    conservar_ultimos "$dir" "pre-deploy-app-parejas-*.dump" 10
  else
    borrar_mas_viejos_que "$dir" "app-parejas-*.dump" 14
  fi
}

respaldo_storage() {
  requiere_cmd docker
  local dir="$BACKUPS_DIR/storage"
  mkdir -p "$dir"
  local destino="$dir/app-parejas-storage-${SELLO}.tar.gz"
  local parcial="$destino.partial"

  local corriendo
  corriendo="$(docker inspect -f '{{.State.Running}}' "$STORAGE_CONTAINER" 2>/dev/null || true)"
  [[ "$corriendo" == "true" ]] || die "El contenedor $STORAGE_CONTAINER no está corriendo."

  log "tar.gz del volumen de Storage -> $destino"
  # Se empaqueta desde dentro del contenedor (evita problemas de permisos del host).
  if ! docker exec "$STORAGE_CONTAINER" tar -czf - -C /var/lib/storage . > "$parcial"; then
    rm -f "$parcial"
    die "tar del volumen de Storage falló; no se dejó ningún archivo a medias."
  fi
  if ! tar -tzf "$parcial" >/dev/null 2>&1; then
    rm -f "$parcial"
    die "El tar.gz generado no es legible; se descartó."
  fi
  mv -- "$parcial" "$destino"
  log "Listo: $(du -h "$destino" | cut -f1) en $destino"
  borrar_mas_viejos_que "$dir" "app-parejas-storage-*.tar.gz" 28
}

case "$MODO" in
  db)      respaldo_db ;;
  storage) respaldo_storage ;;
esac
