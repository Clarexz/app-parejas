#!/usr/bin/env bash
# =====================================================================================
# restore.sh - restaura un dump de App Parejas (prompt S-restore). Se ejecuta EN el VPS.
#
# USO
#   restore.sh ARCHIVO.dump
#       Restaura en una BD TEMPORAL `app_parejas_restore_test` (la recrea si existe) y
#       muestra comprobaciones. NO toca la BD real. Es la prueba de restauración.
#   restore.sh --drop-test
#       Borra la BD temporal `app_parejas_restore_test`.
#   restore.sh ARCHIVO.dump --into-production --yes-i-am-sure
#       Restaura SOBRE la BD real (`postgres`). Antes hace un dump de seguridad
#       (backups/db/pre-restore-app-parejas-*.dump), detiene los servicios que usan la BD,
#       restaura con --clean --if-exists y vuelve a levantarlos.
#
# Nota: el dump se hizo con backup.sh (pg_dump -Fc). pg_restore puede mostrar errores
# benignos (extensiones/roles ya existentes); en la prueba se cuentan y se muestran.
# Para recuperación total en un VPS nuevo: levantar el stack vacío (S1), luego
# `restore.sh ARCHIVO.dump --into-production --yes-i-am-sure`, restaurar el tar.gz de
# Storage en stack/volumes/storage y correr smoke-test.sh. Ver docs/SERVIDOR.md.
# =====================================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

DB_TEST="app_parejas_restore_test"
DUMP=""
A_PRODUCCION=0
SEGURO=0
SOLO_BORRAR_TEST=0

for arg in "$@"; do
  case "$arg" in
    --into-production) A_PRODUCCION=1 ;;
    --yes-i-am-sure)   SEGURO=1 ;;
    --drop-test)       SOLO_BORRAR_TEST=1 ;;
    -h|--help)         sed -n '2,21p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*)                die "Opción desconocida: $arg" ;;
    *)                 [[ -z "$DUMP" ]] || die "Solo se acepta un archivo de dump."; DUMP="$arg" ;;
  esac
done

cargar_env
requiere_db

# Ejecuta SQL de administración (supabase_admin) contra la BD `postgres` del contenedor.
sql_admin() {
  docker exec -i "$DB_CONTAINER" psql -U "$DB_DUMP_USER" -d "$DB_NAME_DEFAULT" -X -v ON_ERROR_STOP=1 "$@"
}

borrar_bd_test() {
  log "Borrando BD temporal $DB_TEST (si existe)"
  sql_admin -q -c "drop database if exists $DB_TEST with (force)"
}

if ((SOLO_BORRAR_TEST)); then
  borrar_bd_test
  log "Listo."
  exit 0
fi

[[ -n "$DUMP" ]] || die "Falta el archivo de dump. Uso: restore.sh ARCHIVO.dump  (ver --help)"
[[ -r "$DUMP" ]] || die "No puedo leer el dump: $DUMP"
[[ -s "$DUMP" ]] || die "El dump está vacío: $DUMP"

log "Validando el dump con pg_restore -l"
docker exec -i "$DB_CONTAINER" pg_restore -l < "$DUMP" > /dev/null \
  || die "pg_restore no puede leer $DUMP (¿no es un dump en formato custom?)."

# --- Modo prueba (por defecto) ------------------------------------------------------------
if ((!A_PRODUCCION)); then
  ((!SEGURO)) || die "--yes-i-am-sure solo tiene sentido con --into-production."
  borrar_bd_test
  log "Creando BD temporal $DB_TEST"
  sql_admin -q -c "create database $DB_TEST template template0"

  ERRLOG="$(nuevo_temporal)"
  log "Restaurando $DUMP en $DB_TEST (puede tardar)"
  set +e
  docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_DUMP_USER" -d "$DB_TEST" --no-owner --no-acl < "$DUMP" 2> "$ERRLOG"
  rc=$?
  set -e
  nerr="$(grep -c 'error:' "$ERRLOG" || true)"
  if ((rc != 0)); then
    aviso "pg_restore terminó con código $rc y $nerr error(es). Primeras líneas:"
    grep 'error:' "$ERRLOG" | head -n 15 >&2 || true
  else
    log "pg_restore terminó sin errores."
  fi

  log "Comprobaciones en $DB_TEST:"
  docker exec -i "$DB_CONTAINER" psql -U "$DB_DUMP_USER" -d "$DB_TEST" -X -At <<'SQL' || true
select 'tablas en public: ' || count(*) from pg_tables where schemaname = 'public';
select 'usuarios en auth.users: ' || count(*) from auth.users;
select 'migraciones registradas: ' || count(*) from supabase_migrations.schema_migrations;
select 'última migración: ' || coalesce(max(version), '(ninguna)') from supabase_migrations.schema_migrations;
SQL
  log "La BD temporal queda para que la inspecciones:"
  log "  docker exec -it $DB_CONTAINER psql -U $DB_DUMP_USER -d $DB_TEST"
  log "Cuando termines:  $0 --drop-test"
  ((rc == 0)) || exit 2
  exit 0
fi

# --- Modo producción ----------------------------------------------------------------------
((SEGURO)) || die "Restaurar sobre producción exige también --yes-i-am-sure."
tomar_lock deploy

log "ATENCIÓN: se restaurará $DUMP sobre la BD real '${POSTGRES_DB:-$DB_NAME_DEFAULT}'."
log "1/4 Dump de seguridad previo"
mkdir -p "$BACKUPS_DIR/db"
SEGURIDAD="$BACKUPS_DIR/db/pre-restore-app-parejas-$(date +%Y%m%d-%H%M%S).dump"
( umask 077; docker exec "$DB_CONTAINER" pg_dump -U "$DB_DUMP_USER" -d "${POSTGRES_DB:-$DB_NAME_DEFAULT}" -Fc -Z 6 > "$SEGURIDAD" ) \
  || { rm -f "$SEGURIDAD"; die "No se pudo hacer el dump de seguridad; no se restaura nada."; }
[[ -s "$SEGURIDAD" ]] || { rm -f "$SEGURIDAD"; die "El dump de seguridad quedó vacío; no se restaura nada."; }
log "   guardado en $SEGURIDAD"

log "2/4 Deteniendo servicios que usan la BD (solo del proyecto $COMPOSE_PROJECT)"
compose stop api-gw functions studio auth rest realtime storage meta

log "3/4 Restaurando (pg_restore --clean --if-exists)"
set +e
docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_DUMP_USER" -d "${POSTGRES_DB:-$DB_NAME_DEFAULT}" \
  --clean --if-exists --no-owner --no-acl < "$DUMP"
rc=$?
set -e
((rc == 0)) || aviso "pg_restore terminó con código $rc (suele ser por objetos de extensiones ya existentes). Revisa lo anterior y corre el smoke test."

log "4/4 Levantando servicios"
compose up -d
log "Listo. Verifica con:  $SCRIPT_DIR/smoke-test.sh"
log "Si algo salió mal, el dump de seguridad está en $SEGURIDAD"
