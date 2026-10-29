#!/usr/bin/env bash
# =====================================================================================
# deploy.sh - aplica en el VPS los cambios de una rama del repo (prompt S-deploy).
#
#   deploy.sh [RAMA] [--skip-backup] [--dry-run] [--local]
#
#   RAMA            rama a desplegar (por defecto, la rama actual del clon en el VPS)
#   --skip-backup   no hace el dump previo (NO recomendado)
#   --dry-run       no cambia nada: muestra qué haría (migraciones pendientes, rsync -n,
#                   buckets por crear)
#   --local         el smoke test final usa http://127.0.0.1:$KONG_HTTP_PORT (sin HTTPS)
#
# Pasos: (1) repo limpio + git fetch/checkout/pull  (2) backup.sh --pre-deploy
#        (3) scripts/apply-migrations.sh  (4) sincroniza supabase/functions -> stack/volumes/functions
#            y reinicia `functions`  (5) buckets de server/buckets.json  (6) smoke-test.sh
# =====================================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

RAMA=""
SALTAR_BACKUP=0
DRY_RUN=0
LOCAL=0
for arg in "$@"; do
  case "$arg" in
    --skip-backup) SALTAR_BACKUP=1 ;;
    --dry-run)     DRY_RUN=1 ;;
    --local)       LOCAL=1 ;;
    -h|--help)     sed -n '2,17p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*)            die "Opción desconocida: $arg" ;;
    *)             [[ -z "$RAMA" ]] || die "Solo se acepta una rama."; RAMA="$arg" ;;
  esac
done
export DRY_RUN LOCAL

requiere_cmd git docker curl jq rsync
cargar_env
validar_env
requiere_db
tomar_lock deploy
((DRY_RUN)) && log "== MODO DRY-RUN: no se cambia nada =="

[[ -d "$REPO_DIR/.git" ]] || die "$REPO_DIR no es un clon git."
git_repo() { git -C "$REPO_DIR" "$@"; }

# --- 1) Repo ------------------------------------------------------------------------------
log "1/6 Repositorio ($REPO_DIR)"
if [[ -n "$(git_repo status --porcelain)" ]]; then
  git_repo status --short >&2
  die "El clon tiene cambios locales. Nadie edita a mano en el VPS: revísalos (git stash / git checkout) y reintenta."
fi
if [[ -z "$RAMA" ]]; then
  RAMA="$(git_repo rev-parse --abbrev-ref HEAD)"
  [[ "$RAMA" != "HEAD" ]] || die "El clon está en HEAD desacoplado; indica la rama: deploy.sh <rama>"
fi
log "   rama: $RAMA"
git_repo fetch --prune origin
git_repo rev-parse --verify --quiet "origin/$RAMA" >/dev/null || die "La rama origin/$RAMA no existe."
if ((DRY_RUN)); then
  log "   [dry-run] commits nuevos en origin/$RAMA respecto a HEAD:"
  git_repo log --oneline "HEAD..origin/$RAMA" | sed 's/^/     /' || true
  log "   [dry-run] NO se hace checkout/pull; lo siguiente se evalúa con el contenido ACTUAL del clon."
else
  git_repo checkout "$RAMA"
  git_repo pull --ff-only origin "$RAMA"
fi
log "   HEAD: $(git_repo log -1 --format='%h %s')"

# Aviso si el override del stack quedó desactualizado respecto al repo (no se aplica solo).
for f in docker-compose.override.yml docker-compose.logs.override.yml; do
  if [[ -f "$REPO_DIR/server/$f" ]] && ! cmp -s "$REPO_DIR/server/$f" "$STACK_DIR/$f"; then
    aviso "server/$f del repo difiere de $STACK_DIR/$f. Revisa y copia si corresponde (cp) y luego 'compose up -d'."
  fi
done

# --- 2) Backup previo ---------------------------------------------------------------------
log "2/6 Respaldo previo"
if ((SALTAR_BACKUP)); then
  aviso "Se omite el respaldo (--skip-backup)."
elif ((DRY_RUN)); then
  log "   [dry-run] correría: backup.sh --pre-deploy"
else
  "$SCRIPT_DIR/backup.sh" --pre-deploy
fi

# --- 3) Migraciones -----------------------------------------------------------------------
log "3/6 Migraciones"
if ((DRY_RUN)); then
  aplicadas="$(psql_db -At -c 'select version from supabase_migrations.schema_migrations' 2>/dev/null || true)"
  pendientes=0
  shopt -s nullglob
  for f in "$REPO_DIR"/supabase/migrations/*.sql; do
    v="$(basename "$f" | cut -d_ -f1)"
    if ! grep -qx "$v" <<<"$aplicadas"; then
      log "   [dry-run] pendiente: $(basename "$f")"
      pendientes=$((pendientes + 1))
    fi
  done
  shopt -u nullglob
  log "   [dry-run] migraciones pendientes: $pendientes"
else
  PSQL="docker exec -i $DB_CONTAINER psql -U $DB_USER -d ${POSTGRES_DB:-$DB_NAME_DEFAULT}" \
    bash "$REPO_DIR/scripts/apply-migrations.sh"
fi

# --- 4) Edge Functions --------------------------------------------------------------------
log "4/6 Edge Functions"
FUNC_SRC="$REPO_DIR/supabase/functions"
FUNC_DST="$STACK_DIR/volumes/functions"
if [[ ! -d "$FUNC_SRC" ]]; then
  log "   No hay supabase/functions en el repo; se omite."
else
  mkdir -p "$FUNC_DST"
  [[ ! -e "$FUNC_SRC/main" ]] || aviso "supabase/functions/main se ignora: 'main' es el enrutador del edge-runtime oficial."
  # --delete borra del destino lo que ya no está en el repo, pero /main/ (excluido) se conserva.
  rs=(rsync -rlt --delete "--chmod=D755,F644" --itemize-changes
      --exclude='/main/' --exclude='.git' --exclude='.DS_Store' --exclude='*.test.ts')
  ((DRY_RUN)) && rs+=(--dry-run)
  cambios="$("${rs[@]}" "$FUNC_SRC/" "$FUNC_DST/")"
  if [[ -z "$cambios" ]]; then
    log "   Funciones sin cambios."
  else
    printf '%s\n' "$cambios" | sed 's/^/     /'
    if ((DRY_RUN)); then
      log "   [dry-run] se reiniciaría el servicio functions"
    else
      log "   Reiniciando el servicio functions"
      compose restart functions
    fi
  fi
fi

# --- 5) Buckets de Storage ----------------------------------------------------------------
log "5/6 Buckets de Storage"
BUCKETS_JSON="$REPO_DIR/server/buckets.json"
if [[ ! -f "$BUCKETS_JSON" ]]; then
  log "   No existe server/buckets.json; se omite."
else
  jq -e 'type == "array" and all(.[]; has("id"))' "$BUCKETS_JSON" >/dev/null \
    || die "server/buckets.json inválido: debe ser una lista de objetos con 'id' (ej. [{\"id\":\"avatars\",\"public\":false}])."
  BASE="$(url_base)"
  # Los buckets se gestionan con la API de Storage (service key). Si se llama por la URL pública
  # y el proxy aún no está listo, usa --local.
  api_request GET "$BASE/storage/v1/bucket" "$SERVICE_ROLE_KEY"
  [[ "$HTTP_CODE" == "200" ]] || die "No pude listar buckets ($BASE/storage/v1/bucket -> $HTTP_CODE). ¿Storage arriba? Prueba con --local."
  existentes="$(jq -r '.[].id' "$HTTP_BODY")"
  total="$(jq 'length' "$BUCKETS_JSON")"
  log "   Buckets declarados: $total"
  while IFS= read -r bucket; do
    id="$(jq -r '.id' <<<"$bucket")"
    # Cuerpo: id/name/public + opcionales file_size_limit y allowed_mime_types.
    cuerpo_crear="$(jq -c '{id: .id, name: (.name // .id), public: (.public // false),
                            file_size_limit: .file_size_limit, allowed_mime_types: .allowed_mime_types}
                           | with_entries(select(.value != null))' <<<"$bucket")"
    cuerpo_actualizar="$(jq -c '{public: (.public // false),
                                 file_size_limit: .file_size_limit, allowed_mime_types: .allowed_mime_types}
                                | with_entries(select(.value != null))' <<<"$bucket")"
    if grep -qxF "$id" <<<"$existentes"; then
      if ((DRY_RUN)); then
        log "   [dry-run] actualizaría bucket '$id'"
      else
        api_request PUT "$BASE/storage/v1/bucket/$id" "$SERVICE_ROLE_KEY" "$cuerpo_actualizar"
        [[ "$HTTP_CODE" == "200" ]] || die "No pude actualizar el bucket '$id' ($HTTP_CODE): $(cat "$HTTP_BODY")"
        log "   = bucket '$id' (ya existía; configuración sincronizada)"
      fi
    else
      if ((DRY_RUN)); then
        log "   [dry-run] crearía bucket '$id'"
      else
        api_request POST "$BASE/storage/v1/bucket" "$SERVICE_ROLE_KEY" "$cuerpo_crear"
        [[ "$HTTP_CODE" == "200" ]] || die "No pude crear el bucket '$id' ($HTTP_CODE): $(cat "$HTTP_BODY")"
        log "   + bucket '$id' creado"
      fi
    fi
  done < <(jq -c '.[]' "$BUCKETS_JSON")
fi

# --- 6) Smoke test ------------------------------------------------------------------------
log "6/6 Smoke test"
if ((DRY_RUN)); then
  log "   [dry-run] correría: smoke-test.sh$([[ $LOCAL == 1 ]] && echo ' --local')"
  log "== Fin del dry-run =="
else
  if ((LOCAL)); then
    "$SCRIPT_DIR/smoke-test.sh" --local
  else
    "$SCRIPT_DIR/smoke-test.sh"
  fi
  log "== Deploy terminado =="
fi
