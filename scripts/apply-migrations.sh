#!/usr/bin/env bash
# Aplica en orden las migraciones de supabase/migrations/*.sql y las registra en
# supabase_migrations.schema_migrations (version text pk, name text, statements text[]).
# Las ya registradas se saltan (idempotente). Cada migración corre en su propia
# transacción junto con su registro: o se aplica y registra completa, o no queda nada.
#
# Formas de conexión (una de las dos):
#   1) DB_URL  -> usa el psql local contra esa URL.
#        DB_URL=postgresql://postgres:postgres@localhost:5432/postgres bash scripts/apply-migrations.sh
#   2) PSQL    -> comando psql completo (se usa en el VPS con el Postgres en Docker).
#        PSQL="docker exec -i <contenedor> psql -U postgres" bash scripts/apply-migrations.sh
#      El SQL se envía por stdin, así que el comando debe leer de stdin (docker exec -i).
#   Si están ambas, gana PSQL.
#
# Variables opcionales:
#   MIGRATIONS_DIR  directorio de migraciones (por defecto supabase/migrations del repo).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$ROOT/supabase/migrations}"

# Arma el comando psql como arreglo.
if [[ -n "${PSQL:-}" ]]; then
  read -r -a PSQL_CMD <<<"$PSQL"
elif [[ -n "${DB_URL:-}" ]]; then
  PSQL_CMD=(psql "$DB_URL")
else
  echo "Error: define DB_URL o PSQL (ver el encabezado de este script)." >&2
  exit 1
fi
PSQL_CMD+=(-X -q -v ON_ERROR_STOP=1)

# Tabla de control (misma forma que usa el CLI de Supabase).
"${PSQL_CMD[@]}" <<'SQL'
set client_min_messages = warning;
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  name text,
  statements text[]
);
SQL

applied="$("${PSQL_CMD[@]}" -At -c 'select version from supabase_migrations.schema_migrations')"

count_new=0
count_skip=0
shopt -s nullglob
files=("$MIGRATIONS_DIR"/*.sql)
if ((${#files[@]})); then
  mapfile -t files < <(printf '%s\n' "${files[@]}" | LC_ALL=C sort)
fi

for file in "${files[@]}"; do
  base="$(basename "$file" .sql)"
  if [[ ! "$base" =~ ^([0-9]{14})_([a-z0-9_]+)$ ]]; then
    echo "Error: nombre de migración inválido: $base.sql (esperado YYYYMMDDHHMMSS_descripcion.sql)" >&2
    exit 1
  fi
  version="${BASH_REMATCH[1]}"
  name="${BASH_REMATCH[2]}"

  if grep -qx "$version" <<<"$applied"; then
    echo "= $version $name (ya aplicada)"
    count_skip=$((count_skip + 1))
    continue
  fi

  echo "+ $version $name"
  # Migración + registro en una sola transacción (--single-transaction).
  {
    cat "$file"
    printf '\n;\ninsert into supabase_migrations.schema_migrations (version, name, statements)\n'
    printf "values ('%s', '%s', array[\$__mig__\$" "$version" "$name"
    cat "$file"
    printf '$__mig__$]);\n'
  } | "${PSQL_CMD[@]}" --single-transaction -f -
  count_new=$((count_new + 1))
done

echo "Migraciones: $count_new aplicadas, $count_skip ya existentes."
