-- =============================================================================
-- 20261111000000_audio_answers.sql
-- Fase 12 (parte 2): respuestas en audio para preguntas abiertas.
--   * answers.audio_path / audio_ms (audio_path ya existía como columna reservada).
--     Ambos null o ambos con valor; 500 ms .. 2 min; la ruta tiene la forma
--     <couple_id>/<user_id>/<question_id>/<uuid>.m4a y coincide con la fila.
--     answers_has_content: texto, opción o audio.
--   * submit_answer(p_question_id, p_text, p_choice, p_audio_path, p_audio_ms). Se
--     borra la firma de 3 argumentos para que PostgREST no tenga dos candidatas;
--     las llamadas viejas de 3 argumentos siguen funcionando con los defaults.
--     Audio solo en preguntas `open`; si existe storage.objects, el archivo debe
--     existir en el bucket. Editar sin audio deja audio_path/audio_ms en null (el
--     archivo viejo queda huérfano y lo limpia la Edge Function).
--   * answer_json incluye audio_path y audio_ms. question_card no cambia: ya oculta la
--     respuesta de tu pareja hasta que contestas, y con ella su audio.
--   * Bucket privado `answer-audio` (lo crea deploy.sh desde server/buckets.json):
--     <couple_id>/<user_id>/<question_id>/<uuid>.m4a. Políticas de storage.objects:
--     subir solo a tu carpeta; leer lo tuyo o, si ya contestaste esa pregunta, lo de tu
--     pareja; sin update/delete.
--   * Limpieza: answer_audio_cleanup_batch() lista los archivos con más de 24 h que
--     ninguna respuesta referencia; los borra la Edge Function `stories-cleanup`.
--   * Push: la notificación de respuesta no usa el texto, no cambia.
-- Errores (P0001): los de submit_answer (invalid_answer, question_not_found, ...).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla
-- -----------------------------------------------------------------------------

alter table public.answers add column if not exists audio_path text;
alter table public.answers add column if not exists audio_ms integer;
comment on column public.answers.audio_path is 'Ruta del audio en el bucket answer-audio: <couple_id>/<user_id>/<question_id>/<uuid>.m4a (solo preguntas open).';
comment on column public.answers.audio_ms is 'Duración del audio en milisegundos (500..120000).';

alter table public.answers drop constraint if exists answers_has_content;
alter table public.answers
  add constraint answers_has_content check (text is not null or choice is not null or audio_path is not null);

alter table public.answers drop constraint if exists answers_audio_pair;
alter table public.answers
  add constraint answers_audio_pair check ((audio_path is null) = (audio_ms is null));

alter table public.answers drop constraint if exists answers_audio_ms_range;
alter table public.answers
  add constraint answers_audio_ms_range check (audio_ms is null or audio_ms between 500 and 120000);

alter table public.answers drop constraint if exists answers_audio_path_shape;
alter table public.answers
  add constraint answers_audio_path_shape check (
    audio_path is null
    or audio_path ~ (
      '^' || couple_id::text || '/' || user_id::text || '/' || question_id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.m4a$'
    )
  );

-- -----------------------------------------------------------------------------
-- JSON de respuesta (con audio)
-- -----------------------------------------------------------------------------

create or replace function public.answer_json(p_answer public.answers)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when p_answer.id is null then null else jsonb_build_object(
    'id', p_answer.id,
    'user_id', p_answer.user_id,
    'text', p_answer.text,
    'choice', p_answer.choice,
    'audio_path', p_answer.audio_path,
    'audio_ms', p_answer.audio_ms,
    'created_at', p_answer.created_at,
    'updated_at', p_answer.updated_at
  ) end;
$$;

-- -----------------------------------------------------------------------------
-- submit_answer con audio
-- -----------------------------------------------------------------------------

drop function if exists public.submit_answer(uuid, text, integer);

-- Guarda (o edita) la respuesta de auth.uid().
--   open: texto (1..2000) o audio (o ambos); p_choice debe ser null.
--   choice: índice de opción (0..n-1) con nota opcional (≤ 500), o -1 = "Otra" con el
--     texto obligatorio (1..500); sin audio.
-- Audio: p_audio_path y p_audio_ms van juntos; la ruta debe ser
-- <mi pareja>/<yo>/<pregunta>/<uuid>.m4a y, si hay Storage, el archivo debe existir.
create or replace function public.submit_answer(
  p_question_id uuid,
  p_text text default null,
  p_choice integer default null,
  p_audio_path text default null,
  p_audio_ms integer default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := public.require_couple();
  v_question public.questions;
  v_text text := nullif(btrim(coalesce(p_text, '')), '');
  v_day date;
  v_prefix text;
  v_exists boolean := true;
begin
  select * into v_question from public.questions q where q.id = p_question_id;
  if not found or not public.question_visible(v_question) then
    raise exception 'question_not_found' using errcode = 'P0001';
  end if;

  -- Audio: ambos datos o ninguno; solo en preguntas abiertas.
  if (p_audio_path is null) <> (p_audio_ms is null) then
    raise exception 'invalid_answer' using errcode = 'P0001';
  end if;
  if p_audio_path is not null then
    v_prefix := v_couple_id::text || '/' || v_uid::text || '/' || p_question_id::text || '/';
    if v_question.type <> 'open'
      or p_audio_ms < 500 or p_audio_ms > 120000
      or left(p_audio_path, char_length(v_prefix)) <> v_prefix
      or p_audio_path !~ '\.m4a$'
      or substr(p_audio_path, char_length(v_prefix) + 1)
        !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.m4a$'
    then
      raise exception 'invalid_answer' using errcode = 'P0001';
    end if;
    if to_regclass('storage.objects') is not null then
      select exists (
        select 1 from storage.objects o
        where o.bucket_id = 'answer-audio' and o.name = p_audio_path
      ) into v_exists;
      if not v_exists then
        raise exception 'invalid_answer' using errcode = 'P0001';
      end if;
    end if;
  end if;

  if v_question.type = 'open' then
    if (v_text is null and p_audio_path is null)
      or (v_text is not null and char_length(v_text) > 2000)
      or p_choice is not null
    then
      raise exception 'invalid_answer' using errcode = 'P0001';
    end if;
  elsif v_question.type = 'choice' then
    if p_choice is null or p_choice < -1 or p_choice >= jsonb_array_length(v_question.options)
      or (p_choice = -1 and v_text is null)
      or (v_text is not null and char_length(v_text) > 500)
    then
      raise exception 'invalid_answer' using errcode = 'P0001';
    end if;
  else
    -- Los tipos de juegos (Fase 9) no se contestan aquí.
    raise exception 'invalid_answer' using errcode = 'P0001';
  end if;

  select max(dq.day) into v_day
  from public.daily_questions dq where dq.couple_id = v_couple_id and dq.question_id = p_question_id;

  begin
    insert into public.answers (couple_id, question_id, user_id, day, text, choice, audio_path, audio_ms)
    values (v_couple_id, p_question_id, v_uid, v_day, v_text, p_choice::smallint, p_audio_path, p_audio_ms)
    on conflict (couple_id, question_id, user_id) do update
      set text = excluded.text, choice = excluded.choice,
          audio_path = excluded.audio_path, audio_ms = excluded.audio_ms, updated_at = now();
  exception when check_violation then
    raise exception 'invalid_answer' using errcode = 'P0001';
  end;

  return public.question_card(v_couple_id, p_question_id, v_day);
end;
$$;
comment on function public.submit_answer(uuid, text, integer, text, integer) is 'Guarda o edita la respuesta de auth.uid() (texto, opción o audio en preguntas abiertas) y devuelve la tarjeta actualizada.';

revoke all on function public.submit_answer(uuid, text, integer, text, integer) from public, anon;
grant execute on function public.submit_answer(uuid, text, integer, text, integer) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Storage: bucket privado `answer-audio` (lo crea deploy.sh desde server/buckets.json;
-- aquí solo van las políticas). Se omiten si no existe storage.objects.
-- -----------------------------------------------------------------------------

-- Ruta propia: <mi pareja>/<yo>/<pregunta>/<archivo>, sin "..".
create or replace function public.answer_audio_path_writable(p_name text)
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
    and array_length(string_to_array(p_name, '/'), 1) = 4
    and split_part(p_name, '/', 1) = coalesce(public.my_couple_id()::text, '-')
    and split_part(p_name, '/', 2) = auth.uid()::text,
    false
  );
$$;
comment on function public.answer_audio_path_writable(text) is 'true si la ruta del bucket answer-audio está en <tu pareja>/<tú>/.';

-- Legible: lo tuyo, o lo de tu pareja actual si ya contestaste esa pregunta
-- (el tercer segmento es el id de la pregunta).
create or replace function public.answer_audio_path_readable(p_name text)
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
    and array_length(string_to_array(p_name, '/'), 1) = 4
    and split_part(p_name, '/', 1) = coalesce(public.my_couple_id()::text, '-')
    and (
      split_part(p_name, '/', 2) = auth.uid()::text
      or (
        exists (
          select 1 from public.couple_members cm
          where cm.couple_id = public.my_couple_id() and cm.user_id::text = split_part(p_name, '/', 2)
        )
        and exists (
          select 1 from public.answers a
          where a.couple_id = public.my_couple_id()
            and a.user_id = auth.uid()
            and a.question_id::text = split_part(p_name, '/', 3)
        )
      )
    ),
    false
  );
$$;
comment on function public.answer_audio_path_readable(text) is 'true si el audio es tuyo o de tu pareja y ya contestaste esa pregunta.';

do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'No existe storage.objects; se omiten las políticas del bucket answer-audio.';
    return;
  end if;

  drop policy if exists answer_audio_storage_select on storage.objects;
  create policy answer_audio_storage_select on storage.objects
    for select to authenticated
    using (bucket_id = 'answer-audio' and public.answer_audio_path_readable(name));

  drop policy if exists answer_audio_storage_insert on storage.objects;
  create policy answer_audio_storage_insert on storage.objects
    for insert to authenticated
    with check (bucket_id = 'answer-audio' and public.answer_audio_path_writable(name));

  -- Sin políticas de update/delete: solo service_role (la limpieza) toca los archivos.
  drop policy if exists answer_audio_storage_update on storage.objects;
  drop policy if exists answer_audio_storage_delete on storage.objects;
end;
$$;

revoke all on function public.answer_audio_path_writable(text) from public, anon;
revoke all on function public.answer_audio_path_readable(text) from public, anon;
grant execute on function public.answer_audio_path_writable(text) to authenticated, service_role;
grant execute on function public.answer_audio_path_readable(text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Limpieza (solo service_role; la llama la Edge Function stories-cleanup)
-- -----------------------------------------------------------------------------

-- Archivos huérfanos del bucket `answer-audio`: más de 24 h sin respuesta que los
-- referencie. Devuelve { paths: [..] }. Sin storage.objects: [].
create or replace function public.answer_audio_cleanup_batch(p_limit integer default 200)
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
      where obj.bucket_id = 'answer-audio'
        and obj.created_at < now() - interval '24 hours'
        and not exists (select 1 from public.answers a where a.audio_path = obj.name)
      order by obj.created_at
      limit v_limit
    ) o;
  end if;

  return jsonb_build_object('paths', to_jsonb(v_orphans));
end;
$$;
comment on function public.answer_audio_cleanup_batch(integer) is 'Audios huérfanos (más de 24 h sin respuesta) del bucket answer-audio; los borra la Edge Function stories-cleanup.';

revoke all on function public.answer_audio_cleanup_batch(integer) from public, anon, authenticated;
grant execute on function public.answer_audio_cleanup_batch(integer) to service_role;
