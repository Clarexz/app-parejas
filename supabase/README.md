# supabase/

Fuente de verdad del backend (ver `docs/PLAN.md` §7). Nadie modifica la BD "a mano".

- `migrations/`: esquema SQL versionado.
- `functions/`: Edge Functions (p. ej. `notify`).
- `seed/`: datos iniciales idempotentes.
- `tests/`: SQL de prueba que corre el CI (`rls_smoke.sql`).

## Migraciones

- Nombre: `YYYYMMDDHHMMSS_descripcion.sql` (UTC, descripción en `snake_case`), p. ej.
  `20261029000000_init.sql`. El orden de aplicación es el orden alfabético.
- **Una migración ya aplicada nunca se edita.** Para cambiar algo se crea una migración nueva.
- Deben ser lo más idempotentes que sea razonable (`if not exists`, `create or replace`, `drop ... if exists`).
- Cada migración se ejecuta en su propia transacción junto con su registro.

## Cómo se aplican

Siempre con `scripts/apply-migrations.sh`, que registra cada versión en
`supabase_migrations.schema_migrations` y salta las ya aplicadas:

- **VPS:** lo ejecuta `scripts/server/deploy.sh` (con `PSQL="docker exec -i <contenedor> psql -U postgres"`).
- **CI:** el job `db` lo corre contra un Postgres efímero (`supabase/postgres`), dos veces para
  comprobar idempotencia, y luego corre `tests/rls_smoke.sql`.
- **Local con un Postgres propio:** `DB_URL=postgresql://... bash scripts/apply-migrations.sh`.

## Tipos de TypeScript

`npm run db:types` regenera `src/types/database.ts` (versión fija del CLI de Supabase). El CI lo
regenera y falla si difiere del commiteado; en ese caso sube el archivo correcto como artifact
`database-types`.
