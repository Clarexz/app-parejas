#!/usr/bin/env bash
# Regenera src/types/database.ts con el CLI de Supabase contra un Postgres que ya
# tenga las migraciones aplicadas (ver scripts/apply-migrations.sh).
#
# Uso:
#   DB_URL=postgresql://postgres:postgres@localhost:5432/postgres bash scripts/gen-db-types.sh
#
# Sin DB_URL usa el Postgres del servicio de CI (localhost:5432, password postgres).
# El archivo NO se formatea con prettier a propósito (está en .prettierignore): debe
# quedar idéntico a la salida del CLI para que el CI pueda comparar con git diff.

set -euo pipefail

# Versión fija del CLI para que la salida sea reproducible. Subirla es un cambio explícito.
SUPABASE_CLI_VERSION="2.122.0"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_URL="${DB_URL:-postgresql://postgres:postgres@localhost:5432/postgres}"
OUT="$ROOT/src/types/database.ts"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# Se escribe primero a un temporal para no dejar el archivo vacío si el CLI falla.
npx --yes "supabase@${SUPABASE_CLI_VERSION}" gen types typescript --db-url "$DB_URL" --schema public >"$TMP"
mv "$TMP" "$OUT"
trap - EXIT
echo "Tipos generados en src/types/database.ts"
