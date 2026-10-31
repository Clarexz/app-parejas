-- =============================================================================
-- 20261104000000_memories.sql
-- Fase 7: memorias (recuerdos de la pareja con fotos, texto, fecha y lugar).
--   * Tablas memories y memory_photos. Se escriben solo con RPC (create_memory,
--     update_memory, delete_memory); se leen con RLS: las memorias son de la
--     PAREJA, así que las ven, editan y borran los miembros ACTUALES
--     (couple_id = my_couple_id()), sin importar quién la creó. created_by queda
--     como autor.
--   * 1..10 fotos por memoria; en update_memory la lista reemplaza a la anterior
--     (el orden es la position 0..n-1). Borrar una memoria es hard delete (cascade
--     a las fotos); los archivos quedan huérfanos en Storage.
--   * Bucket privado `memories` (lo crea deploy.sh desde server/buckets.json):
--     <couple_id>/<user_id>/<uuid>.jpg y <uuid>_thumb.jpg. Políticas de
--     storage.objects: subir solo a tu carpeta; leer todo lo que esté bajo la
--     carpeta de tu pareja; sin update/delete.
--   * Limpieza: Storage protege storage.objects, así que los archivos huérfanos
--     (más de 24 h sin fila en memory_photos) los lista memories_cleanup_batch() y
--     los borra la Edge Function `stories-cleanup` (mismo job horario de pg_cron)
--     con la API de Storage.
--   * Push: notification_prefs.memories y trigger de memory (solo al insertar)
--     sobre el mecanismo de la Fase 4 (private.notification_event se redefine
--     completa).
--   * Realtime en las dos tablas.
-- Errores (P0001): not_authenticated, no_couple, invalid_memory, invalid_photos,
--   memory_not_found.
-- =============================================================================

alter table public.notification_prefs add column if not exists memories boolean not null default true;

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  title text not null
    constraint memories_title_length check (char_length(btrim(title)) between 1 and 80),
  body text
    constraint memories_body_length check (body is null or char_length(body) between 1 and 2000),
  happened_on date not null,
  lat double precision
    constraint memories_lat_range check (lat is null or lat between -90 and 90),
  lng double precision
    constraint memories_lng_range check (lng is null or lng between -180 and 180),
  place_name text
    constraint memories_place_name_length check (place_name is null or char_length(btrim(place_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memories_lat_lng_pair check ((lat is null) = (lng is null))
);
comment on table public.memories is 'Memorias de la pareja (las ven y editan los dos). Se escriben con create_memory()/update_memory().';

create index if not exists memories_couple_happened_idx on public.memories (couple_id, happened_on desc);

-- couple_id va antes que memory_id: las llaves foráneas quedan en orden alfabético.
create table if not exists public.memory_photos (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  memory_id uuid not null references public.memories (id) on delete cascade,
  path text not null unique,
  thumb_path text not null unique,
  position smallint not null
    constraint memory_photos_position_range check (position between 0 and 9),
  width integer constraint memory_photos_width_positive check (width is null or width > 0),
  height integer constraint memory_photos_height_positive check (height is null or height > 0),
  created_at timestamptz not null default now(),
  unique (memory_id, position) deferrable initially deferred
);
comment on table public.memory_photos is 'Fotos de una memoria (rutas dentro del bucket `memories`). Se escriben con las RPC de memorias.';

-- -----------------------------------------------------------------------------
-- RLS: lectura para la pareja actual; sin escritura directa (solo las RPC).
-- -----------------------------------------------------------------------------

alter table public.memories enable row level security;
alter table public.memory_photos enable row level security;

drop policy if exists memories_select on public.memories;
create policy memories_select on public.memories
  for select to authenticated
  using (couple_id = (select public.my_couple_id()));

drop policy if exists memory_photos_select on public.memory_photos;
create policy memory_photos_select on public.memory_photos
  for select to authenticated
  using (couple_id = (select public.my_couple_id()));

revoke all on public.memories, public.memory_photos from anon, authenticated;
grant select on public.memories, public.memory_photos to authenticated;
grant all on public.memories, public.memory_photos to service_role;

-- -----------------------------------------------------------------------------
-- RPC
-- -----------------------------------------------------------------------------

-- Reemplaza las fotos de una memoria por p_photos (en ese orden = position 0..n-1).
-- Valida la lista completa: 1..10 elementos {path, thumb_path, width, height}, rutas
-- <pareja>/<usuario>/<archivo>.jpg sin "..", sin repetidos, y que cada foto o ya sea
-- de ESTA memoria (path y thumb_path iguales) o sea nueva bajo <p_couple_id>/<p_uid>/
-- y no la use ninguna otra memoria. Cualquier problema: invalid_photos.
create or replace function private.memory_set_photos(
  p_memory_id uuid,
  p_couple_id uuid,
  p_uid uuid,
  p_photos jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_prefix text := p_couple_id::text || '/' || p_uid::text || '/';
  v_count integer;
  v_all text[] := '{}';
  v_item jsonb;
  v_idx integer := 0;
  v_path text;
  v_thumb text;
  v_width integer;
  v_height integer;
  v_existing uuid;
  v_keep uuid[] := '{}';
begin
  if p_photos is null or jsonb_typeof(p_photos) <> 'array' then
    raise exception 'invalid_photos' using errcode = 'P0001';
  end if;
  v_count := jsonb_array_length(p_photos);
  if v_count < 1 or v_count > 10 then
    raise exception 'invalid_photos' using errcode = 'P0001';
  end if;

  -- Primera pasada: forma, rutas y repetidos (antes de tocar nada).
  for v_item in select e from jsonb_array_elements(p_photos) e loop
    if jsonb_typeof(v_item) <> 'object'
      or jsonb_typeof(v_item -> 'path') is distinct from 'string'
      or jsonb_typeof(v_item -> 'thumb_path') is distinct from 'string'
      or coalesce(jsonb_typeof(v_item -> 'width'), 'null') not in ('null', 'number')
      or coalesce(jsonb_typeof(v_item -> 'height'), 'null') not in ('null', 'number')
    then
      raise exception 'invalid_photos' using errcode = 'P0001';
    end if;
    v_path := v_item ->> 'path';
    v_thumb := v_item ->> 'thumb_path';
    if v_path !~ '^[^/]+/[^/]+/[^/]+\.jpg$'
      or v_thumb !~ '^[^/]+/[^/]+/[^/]+\.jpg$'
      or position('..' in v_path) > 0
      or position('..' in v_thumb) > 0
      or v_path = v_thumb
    then
      raise exception 'invalid_photos' using errcode = 'P0001';
    end if;
    if jsonb_typeof(v_item -> 'width') = 'number' and (v_item ->> 'width') !~ '^[1-9][0-9]{0,8}$' then
      raise exception 'invalid_photos' using errcode = 'P0001';
    end if;
    if jsonb_typeof(v_item -> 'height') = 'number' and (v_item ->> 'height') !~ '^[1-9][0-9]{0,8}$' then
      raise exception 'invalid_photos' using errcode = 'P0001';
    end if;
    if v_path = any (v_all) or v_thumb = any (v_all) then
      raise exception 'invalid_photos' using errcode = 'P0001';
    end if;
    v_all := v_all || v_path || v_thumb;
  end loop;

  -- Segunda pasada: pertenencia. Las que ya son de esta memoria se conservan.
  for v_item in select e from jsonb_array_elements(p_photos) e loop
    v_path := v_item ->> 'path';
    v_thumb := v_item ->> 'thumb_path';
    select mp.id into v_existing
    from public.memory_photos mp
    where mp.memory_id = p_memory_id and mp.path = v_path and mp.thumb_path = v_thumb;
    if v_existing is not null then
      v_keep := v_keep || v_existing;
    else
      if left(v_path, char_length(v_prefix)) <> v_prefix
        or left(v_thumb, char_length(v_prefix)) <> v_prefix
        or exists (
          select 1 from public.memory_photos mp
          where mp.path in (v_path, v_thumb) or mp.thumb_path in (v_path, v_thumb)
        )
      then
        raise exception 'invalid_photos' using errcode = 'P0001';
      end if;
    end if;
    v_existing := null;
  end loop;

  -- Fuera las que ya no vienen (sus archivos los limpia la Edge Function).
  delete from public.memory_photos mp
  where mp.memory_id = p_memory_id and not (mp.id = any (v_keep));

  -- Altas y orden. La unicidad de (memory_id, position) se revisa al final.
  for v_item in select e from jsonb_array_elements(p_photos) e loop
    v_path := v_item ->> 'path';
    v_thumb := v_item ->> 'thumb_path';
    v_width := (v_item ->> 'width')::integer;
    v_height := (v_item ->> 'height')::integer;
    update public.memory_photos mp
    set position = v_idx
    where mp.memory_id = p_memory_id and mp.path = v_path and mp.thumb_path = v_thumb;
    if not found then
      insert into public.memory_photos (couple_id, memory_id, path, thumb_path, position, width, height)
      values (p_couple_id, p_memory_id, v_path, v_thumb, v_idx, v_width, v_height);
    end if;
    v_idx := v_idx + 1;
  end loop;
exception when check_violation or unique_violation then
  raise exception 'invalid_photos' using errcode = 'P0001';
end;
$$;
comment on function private.memory_set_photos(uuid, uuid, uuid, jsonb) is 'Valida y reemplaza las fotos de una memoria (uso interno de create_memory/update_memory).';

-- Crea una memoria de la pareja de auth.uid() con sus fotos.
create or replace function public.create_memory(
  p_title text,
  p_happened_on date,
  p_body text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_place_name text default null,
  p_photos jsonb default '[]'::jsonb
)
returns public.memories
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid;
  v_today date;
  v_memory public.memories;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select cm.couple_id into v_couple_id from public.couple_members cm where cm.user_id = v_uid;
  if v_couple_id is null then
    raise exception 'no_couple' using errcode = 'P0001';
  end if;

  v_today := public.couple_today(v_couple_id);
  if p_happened_on is null or p_happened_on < date '1900-01-01' or p_happened_on > v_today + 1 then
    raise exception 'invalid_memory' using errcode = 'P0001';
  end if;

  begin
    insert into public.memories (couple_id, created_by, title, body, happened_on, lat, lng, place_name)
    values (
      v_couple_id, v_uid, btrim(coalesce(p_title, '')),
      nullif(btrim(coalesce(p_body, '')), ''), p_happened_on, p_lat, p_lng,
      nullif(btrim(coalesce(p_place_name, '')), '')
    )
    returning * into v_memory;
  exception when check_violation then
    raise exception 'invalid_memory' using errcode = 'P0001';
  end;

  -- Si las fotos no son válidas se deshace también la memoria (misma transacción).
  perform private.memory_set_photos(v_memory.id, v_couple_id, v_uid, p_photos);

  return v_memory;
end;
$$;
comment on function public.create_memory(text, date, text, double precision, double precision, text, jsonb) is 'Crea una memoria de la pareja de auth.uid() con 1..10 fotos.';

-- Edita una memoria de tu pareja: reemplaza todos los campos y la lista de fotos.
create or replace function public.update_memory(
  p_memory_id uuid,
  p_title text,
  p_happened_on date,
  p_body text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_place_name text default null,
  p_photos jsonb default '[]'::jsonb
)
returns public.memories
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid;
  v_today date;
  v_memory public.memories;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select cm.couple_id into v_couple_id from public.couple_members cm where cm.user_id = v_uid;
  if v_couple_id is null then
    raise exception 'no_couple' using errcode = 'P0001';
  end if;

  perform 1 from public.memories m
  where m.id = p_memory_id and m.couple_id = v_couple_id
  for update;
  if not found then
    raise exception 'memory_not_found' using errcode = 'P0001';
  end if;

  v_today := public.couple_today(v_couple_id);
  if p_happened_on is null or p_happened_on < date '1900-01-01' or p_happened_on > v_today + 1 then
    raise exception 'invalid_memory' using errcode = 'P0001';
  end if;

  begin
    update public.memories m
    set title = btrim(coalesce(p_title, '')),
        body = nullif(btrim(coalesce(p_body, '')), ''),
        happened_on = p_happened_on,
        lat = p_lat,
        lng = p_lng,
        place_name = nullif(btrim(coalesce(p_place_name, '')), ''),
        updated_at = now()
    where m.id = p_memory_id
    returning * into v_memory;
  exception when check_violation then
    raise exception 'invalid_memory' using errcode = 'P0001';
  end;

  perform private.memory_set_photos(p_memory_id, v_couple_id, v_uid, p_photos);

  return v_memory;
end;
$$;
comment on function public.update_memory(uuid, text, date, text, double precision, double precision, text, jsonb) is 'Edita una memoria de la pareja de auth.uid() (campos y fotos).';

-- Borra (hard delete) una memoria de tu pareja; las fotos caen en cascade y sus
-- archivos los limpia la Edge Function.
create or replace function public.delete_memory(p_memory_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  select cm.couple_id into v_couple_id from public.couple_members cm where cm.user_id = v_uid;
  if v_couple_id is null then
    raise exception 'no_couple' using errcode = 'P0001';
  end if;
  delete from public.memories m where m.id = p_memory_id and m.couple_id = v_couple_id;
  if not found then
    raise exception 'memory_not_found' using errcode = 'P0001';
  end if;
end;
$$;
comment on function public.delete_memory(uuid) is 'Borra una memoria de la pareja de auth.uid().';

-- -----------------------------------------------------------------------------
-- Limpieza (solo service_role; la llama la Edge Function stories-cleanup)
-- -----------------------------------------------------------------------------

-- Archivos huérfanos del bucket `memories`: más de 24 h sin fila en memory_photos
-- (ni como path ni como thumb_path). Devuelve { paths: [..] }. Sin storage.objects: [].
create or replace function public.memories_cleanup_batch(p_limit integer default 200)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 200), 1000));
  v_orphans text[] := '{}';
begin
  if to_regclass('storage.objects') is not null then
    select coalesce(array_agg(o.name), '{}'::text[]) into v_orphans
    from (
      select obj.name
      from storage.objects obj
      where obj.bucket_id = 'memories'
        and obj.created_at < now() - interval '24 hours'
        and not exists (
          select 1 from public.memory_photos mp where mp.path = obj.name or mp.thumb_path = obj.name
        )
      order by obj.created_at
      limit v_limit
    ) o;
  end if;

  return jsonb_build_object('paths', to_jsonb(v_orphans));
end;
$$;
comment on function public.memories_cleanup_batch(integer) is 'Archivos huérfanos del bucket memories por borrar (solo service_role, lo usa stories-cleanup).';

-- -----------------------------------------------------------------------------
-- Push: evento de memory (solo al insertar, no al editar)
-- -----------------------------------------------------------------------------

drop trigger if exists memories_notify on public.memories;
create trigger memories_notify
  after insert on public.memories
  for each row execute function private.notify_on_insert('memory', 'created_by');

-- Arma el evento que recibe la función notify (ver la versión de stories). Se redefine
-- completa; la única novedad es la rama `memory` y prefs.memories.
-- Forma: { kind, couple_id, actor: {id, name}, recipient: {id, name},
--          tokens: [..], prefs: {answers, comments, moods, nudges, stories, memories}, data: {...} }
-- data por tipo (claves estables que interpreta supabase/functions/notify):
--   answer:      question_id, day, question_text, recipient_answered
--   comment:     question_id, comment_id, day, question_text, recipient_answered,
--                body (solo si el destinatario ya contestó: si no, null)
--   mood:        mood_id, emoji, note
--   nudge:       nudge_id, nudge_kind, day
--   story:       story_id, story_kind, text (solo si story_kind = 'text')
--   story_reply: story_id, reply_id, body, story_author_id
--   memory:      memory_id, title, happened_on, place_name
--   test:        (vacío; el destinatario es el propio actor)
create or replace function private.notification_event(
  p_kind text,
  p_couple_id uuid,
  p_actor uuid,
  p_row jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_recipient uuid;
  v_tokens jsonb;
  v_prefs public.notification_prefs;
  v_data jsonb := '{}'::jsonb;
  v_question_id uuid;
  v_day date;
  v_answered boolean;
begin
  if p_kind = 'test' then
    v_recipient := p_actor;
  else
    select cm.user_id into v_recipient
    from public.couple_members cm
    where cm.couple_id = p_couple_id and cm.user_id <> p_actor
    limit 1;
    -- El actor debe seguir en la pareja (filas viejas o de otra pareja no avisan).
    if v_recipient is null or not exists (
      select 1 from public.couple_members cm where cm.couple_id = p_couple_id and cm.user_id = p_actor
    ) then
      return null;
    end if;
  end if;

  select coalesce(jsonb_agg(pt.token order by pt.updated_at desc), '[]'::jsonb) into v_tokens
  from public.push_tokens pt where pt.user_id = v_recipient;
  if jsonb_array_length(v_tokens) = 0 then
    return null;
  end if;

  select * into v_prefs from public.notification_prefs np where np.user_id = v_recipient;

  if p_kind in ('answer', 'comment') then
    v_question_id := (p_row ->> 'question_id')::uuid;
    select max(dq.day) into v_day
    from public.daily_questions dq
    where dq.couple_id = p_couple_id and dq.question_id = v_question_id;
    v_answered := exists (
      select 1 from public.answers a
      where a.couple_id = p_couple_id and a.question_id = v_question_id and a.user_id = v_recipient
    );
    v_data := jsonb_build_object(
      'question_id', v_question_id,
      'day', v_day,
      'question_text', (select q.text from public.questions q where q.id = v_question_id),
      'recipient_answered', v_answered
    );
    if p_kind = 'comment' then
      v_data := v_data || jsonb_build_object(
        'comment_id', p_row ->> 'id',
        'body', case when v_answered then p_row ->> 'body' end
      );
    end if;
  elsif p_kind = 'mood' then
    v_data := jsonb_build_object('mood_id', p_row ->> 'id', 'emoji', p_row ->> 'emoji', 'note', p_row ->> 'note');
  elsif p_kind = 'nudge' then
    v_data := jsonb_build_object(
      'nudge_id', p_row ->> 'id',
      'nudge_kind', p_row ->> 'kind',
      'day', public.couple_today(p_couple_id)
    );
  elsif p_kind = 'story' then
    v_data := jsonb_build_object(
      'story_id', p_row ->> 'id',
      'story_kind', p_row ->> 'kind',
      'text', case when p_row ->> 'kind' = 'text' then p_row ->> 'text' end
    );
  elsif p_kind = 'memory' then
    v_data := jsonb_build_object(
      'memory_id', p_row ->> 'id',
      'title', p_row ->> 'title',
      'happened_on', p_row ->> 'happened_on',
      'place_name', p_row ->> 'place_name'
    );
  elsif p_kind = 'story_reply' then
    v_data := jsonb_build_object(
      'story_id', p_row ->> 'story_id',
      'reply_id', p_row ->> 'id',
      'body', p_row ->> 'body',
      'story_author_id', (select s.user_id from public.stories s where s.id = (p_row ->> 'story_id')::uuid)
    );
  elsif p_kind <> 'test' then
    return null;
  end if;

  return jsonb_build_object(
    'kind', p_kind,
    'couple_id', p_couple_id,
    'actor', jsonb_build_object('id', p_actor, 'name', private.person_name(p_actor)),
    'recipient', jsonb_build_object('id', v_recipient, 'name', private.person_name(v_recipient)),
    'tokens', v_tokens,
    'prefs', jsonb_build_object(
      'answers', coalesce(v_prefs.answers, true),
      'comments', coalesce(v_prefs.comments, true),
      'moods', coalesce(v_prefs.moods, true),
      'nudges', coalesce(v_prefs.nudges, true),
      'stories', coalesce(v_prefs.stories, true),
      'memories', coalesce(v_prefs.memories, true)
    ),
    'data', v_data
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Storage: bucket privado `memories` (lo crea deploy.sh desde server/buckets.json;
-- aquí solo van las políticas). Como en stories, se omiten si no existe
-- storage.objects (el CI crea un stub para probarlas).
-- -----------------------------------------------------------------------------

-- Ruta propia: <mi pareja>/<yo>/<archivo>, sin "..".
create or replace function public.memory_path_writable(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    auth.uid() is not null
    and p_name is not null
    and position('..' in p_name) = 0
    and array_length(string_to_array(p_name, '/'), 1) = 3
    and split_part(p_name, '/', 1) = coalesce(public.my_couple_id()::text, '-')
    and split_part(p_name, '/', 2) = auth.uid()::text,
    false
  );
$$;
comment on function public.memory_path_writable(text) is 'true si la ruta del bucket memories está en <tu pareja>/<tú>/.';

-- Legible: cualquier archivo bajo la carpeta de tu pareja actual.
create or replace function public.memory_path_readable(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    auth.uid() is not null
    and p_name is not null
    and position('..' in p_name) = 0
    and array_length(string_to_array(p_name, '/'), 1) = 3
    and split_part(p_name, '/', 1) = coalesce(public.my_couple_id()::text, '-'),
    false
  );
$$;
comment on function public.memory_path_readable(text) is 'true si la ruta del bucket memories está bajo la carpeta de tu pareja.';

do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'No existe storage.objects; se omiten las políticas del bucket memories.';
    return;
  end if;

  drop policy if exists memories_storage_select on storage.objects;
  create policy memories_storage_select on storage.objects
    for select to authenticated
    using (bucket_id = 'memories' and public.memory_path_readable(name));

  drop policy if exists memories_storage_insert on storage.objects;
  create policy memories_storage_insert on storage.objects
    for insert to authenticated
    with check (bucket_id = 'memories' and public.memory_path_writable(name));

  -- Sin políticas de update/delete: solo service_role (la limpieza) toca los archivos.
  drop policy if exists memories_storage_update on storage.objects;
  drop policy if exists memories_storage_delete on storage.objects;
end;
$$;

-- -----------------------------------------------------------------------------
-- Permisos de funciones
-- -----------------------------------------------------------------------------

revoke all on function private.memory_set_photos(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.create_memory(text, date, text, double precision, double precision, text, jsonb) from public, anon;
revoke all on function public.update_memory(uuid, text, date, text, double precision, double precision, text, jsonb) from public, anon;
revoke all on function public.delete_memory(uuid) from public, anon;
revoke all on function public.memory_path_writable(text) from public, anon;
revoke all on function public.memory_path_readable(text) from public, anon;
revoke all on function public.memories_cleanup_batch(integer) from public, anon, authenticated;
revoke all on function private.notification_event(text, uuid, uuid, jsonb) from public, anon, authenticated;

grant execute on function public.create_memory(text, date, text, double precision, double precision, text, jsonb) to authenticated, service_role;
grant execute on function public.update_memory(uuid, text, date, text, double precision, double precision, text, jsonb) to authenticated, service_role;
grant execute on function public.delete_memory(uuid) to authenticated, service_role;
grant execute on function public.memory_path_writable(text) to authenticated, service_role;
grant execute on function public.memory_path_readable(text) to authenticated, service_role;
grant execute on function public.memories_cleanup_batch(integer) to service_role;

-- -----------------------------------------------------------------------------
-- Realtime (respeta la RLS de select)
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    raise notice 'No existe la publicación supabase_realtime; se omite Realtime.';
    return;
  end if;
  foreach t in array array['memories', 'memory_photos'] loop
    if not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
