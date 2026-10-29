#!/usr/bin/env bash
# Regenera src/types/database.ts con el CLI de Supabase contra un Postgres que ya
# tenga las migraciones aplicadas (ver scripts/apply-migrations.sh).
#
# Uso:
#   DB_URL=postgresql://postgres:postgres@localhost:5432/postgres bash scripts/gen-db-types.sh
#
# Sin DB_URL usa el Postgres del servicio de CI (localhost:5432, password postgres).
# La salida cruda del CLI no viene formateada: se pasa por Prettier para que sea determinista
# y el CI pueda compararla con git diff.

set -euo pipefail

# Versión fija del CLI para que la salida sea reproducible. Subirla es un cambio explícito.
SUPABASE_CLI_VERSION="2.122.0"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_URL="${DB_URL:-postgresql://postgres:postgres@localhost:5432/postgres}"
# El CLI intenta TLS por defecto; el Postgres efímero del CI no lo soporta.
case "$DB_URL" in
  *sslmode=*) ;;
  *\?*) DB_URL="${DB_URL}&sslmode=disable" ;;
  *) DB_URL="${DB_URL}?sslmode=disable" ;;
esac
OUT="$ROOT/src/types/database.ts"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# Se escribe primero a un temporal para no dejar el archivo vacío si el CLI falla.
npx --yes "supabase@${SUPABASE_CLI_VERSION}" gen types typescript --db-url "$DB_URL" --schema public >"$TMP"
mv "$TMP" "$OUT"
# La salida cruda del CLI no viene formateada; Prettier la vuelve determinista y legible.
npx prettier --write "$OUT" >/dev/null
trap - EXIT
echo "Tipos generados en src/types/database.ts"
