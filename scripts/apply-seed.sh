#!/usr/bin/env bash
# Aplica en orden los seeds de supabase/seed/*.sql (generados desde content/, ver docs/CONTENT.md).
# Son idempotentes (upsert por slug), así que se pueden correr cuantas veces haga falta.
#
# Formas de conexión (una de las dos), igual que scripts/apply-migrations.sh:
#   1) DB_URL  -> usa el psql local contra esa URL.
#        DB_URL=postgresql://postgres:postgres@localhost:5432/postgres bash scripts/apply-seed.sh
#   2) PSQL    -> comando psql completo (se usa en el VPS con el Postgres en Docker).
#        PSQL="docker exec -i <contenedor> psql -U postgres" bash scripts/apply-seed.sh
#      El SQL se envía por stdin, así que el comando debe leer de stdin (docker exec -i).
#   Si están ambas, gana PSQL.
#
# Variables opcionales:
#   SEED_DIR  directorio de seeds (por defecto supabase/seed del repo).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SEED_DIR="${SEED_DIR:-$ROOT/supabase/seed}"

if [[ -n "${PSQL:-}" ]]; then
  read -r -a PSQL_CMD <<<"$PSQL"
elif [[ -n "${DB_URL:-}" ]]; then
  PSQL_CMD=(psql "$DB_URL")
else
  echo "Error: define DB_URL o PSQL (ver el encabezado de este script)." >&2
  exit 1
fi
PSQL_CMD+=(-X -q -v ON_ERROR_STOP=1)

shopt -s nullglob
files=("$SEED_DIR"/*.sql)
if ((${#files[@]})); then
  mapfile -t files < <(printf '%s\n' "${files[@]}" | LC_ALL=C sort)
fi

count=0
for file in "${files[@]}"; do
  echo "+ seed $(basename "$file")"
  # Por stdin para que funcione también con "docker exec -i". Cada seed trae su begin/commit.
  "${PSQL_CMD[@]}" -f - <"$file"
  count=$((count + 1))
done

echo "Seeds: $count aplicados."
