-- =============================================================================
-- 20261103000000_stories.sql
-- Fase 6: stories (fotos, textos y dibujos que caducan a las 24 h).
--   * Tablas stories, story_views, story_reactions y story_replies. Se escriben
--     solo con RPC (create_story, delete_story, mark_story_seen, react_to_story,
--     reply_to_story); se leen con RLS: tu pareja ve las stories activas (no
--     caducadas ni borradas) de los miembros ACTUALES; el autor ve también las
--     caducadas, que son su archivo personal.
--   * profiles.story_archive: si se apaga, las stories caducadas se borran.
--     La app la cambia con la RPC set_story_archive (también hay grant de
--     update por columna, por si se necesita desde un cliente directo).
--   * Bucket privado `stories` (lo crea deploy.sh desde server/buckets.json):
--     <couple_id>/<user_id>/<uuid>.jpg y <uuid>_thumb.jpg. Políticas de
--     storage.objects: subir solo a tu carpeta; leer lo tuyo o la media de una
--     story de tu pareja que sea visible ahora; sin update/delete.
--   * Limpieza: Storage protege storage.objects (no se borra con SQL), así que un
--     job de pg_cron cada hora llama por pg_net a la Edge Function
--     `stories-cleanup`, que con service role pide stories_cleanup_batch(),
--     borra los archivos con la API de Storage y confirma con
--     stories_cleanup_commit(), que borra las filas.
--   * Push: notification_prefs.stories y triggers de story / story_reply sobre el
--     mecanismo de la Fase 4 (private.notification_event se redefine completa).
--   * Realtime en las cuatro tablas.
-- Errores (P0001): not_authenticated, no_couple, invalid_story, too_many_stories,
--   story_not_found, invalid_reaction, invalid_reply.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Perfil y preferencias
-- -----------------------------------------------------------------------------

alter table public.profiles add column if not exists story_archive boolean not null default true;
comment on column public.profiles.story_archive is 'true = las stories caducadas se conservan en el archivo personal de su autor.';
grant update (story_archive) on public.profiles to authenticated;

alter table public.notification_prefs add column if not exists stories boolean not null default true;

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null constraint stories_kind check (kind in ('photo', 'text', 'drawing')),
  -- photo: obligatorios (rutas dentro del bucket `stories`).
  media_path text,
  thumb_path text,
  -- text: 1..280 (obligatorio); photo: pie de foto 1..140 opcional; drawing: null.
  text text,
  bg text constraint stories_bg check (bg is null or bg in ('paper', 'postit', 'jamaica', 'cempasuchil', 'nopal', 'ink')),
  font text constraint stories_font check (font is null or font in ('hand', 'body', 'stamp')),
  -- drawing: array de trazos {c,w,o?,p}. La BD valida solo la forma básica; el formato lo valida la app.
  strokes jsonb,
  -- Emojis encima: array de {e,x,y,s,r}, máximo 10.
  stickers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  deleted_at timestamptz,
  constraint stories_stickers_shape check (
    jsonb_typeof(stickers) = 'array' and jsonb_array_length(stickers) <= 10
  ),
  constraint stories_shape check (
    case kind
      when 'photo' then
        media_path is not null and thumb_path is not null
        and bg is null and font is null and strokes is null
        and (text is null or char_length(text) between 1 and 140)
      when 'text' then
        media_path is null and thumb_path is null
        and text is not null and char_length(text) between 1 and 280
        and bg is not null and font is not null and strokes is null
      when 'drawing' then
        media_path is null and thumb_path is null
        and text is null and font is null and bg is not null
        and strokes is not null
        and case
          when jsonb_typeof(strokes) = 'array'
            then jsonb_array_length(strokes) between 1 and 300 and octet_length(strokes::text) <= 262144
          else false
        end
      else false
    end
  )
);
comment on table public.stories is 'Stories de 24 h (foto, texto o dibujo). Se escriben con create_story(); el autor conserva las caducadas en su archivo.';

create index if not exists stories_couple_created_idx on public.stories (couple_id, created_at desc);
create index if not exists stories_user_created_idx on public.stories (user_id, created_at desc);
create index if not exists stories_expires_idx on public.stories (expires_at);
create index if not exists stories_deleted_idx on public.stories (deleted_at) where deleted_at is not null;
create index if not exists stories_media_path_idx on public.stories (media_path) where media_path is not null;
create index if not exists stories_thumb_path_idx on public.stories (thumb_path) where thumb_path is not null;

create table if not exists public.story_views (
  story_id uuid not null references public.stories (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (story_id, user_id)
);
comment on table public.story_views is 'Quién vio cada story (solo quien no es el autor). Se escribe con mark_story_seen().';

create table if not exists public.story_reactions (
  story_id uuid not null references public.stories (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null
    constraint story_reactions_emoji_length check (char_length(emoji) between 1 and 16 and emoji !~ '[[:space:]]'),
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);
comment on table public.story_reactions is 'Una reacción por persona (solo quien no es el autor). Se escribe con react_to_story().';

-- couple_id va antes que story_id: las llaves foráneas quedan en orden alfabético.
create table if not exists public.story_replies (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  story_id uuid not null references public.stories (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null
    constraint story_replies_body_length check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
comment on table public.story_replies is 'Respuestas a una story (no es un chat general). Se escribe con reply_to_story().';

create index if not exists story_replies_story_created_idx on public.story_replies (story_id, created_at);

-- -----------------------------------------------------------------------------
-- Visibilidad (helper de RLS)
-- -----------------------------------------------------------------------------

-- ¿auth.uid() puede ver esta story ahora? Pareja actual, no borrada, autor aún
-- en la pareja y (es mía o no ha caducado).
create or replace function public.story_visible(p_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.stories s
    where s.id = p_story_id
      and s.couple_id = public.my_couple_id()
      and s.deleted_at is null
      and (s.user_id = auth.uid() or s.expires_at > now())
      and exists (
        select 1 from public.couple_members cm
        where cm.couple_id = s.couple_id and cm.user_id = s.user_id
      )
  );
$$;
comment on function public.story_visible(uuid) is 'true si auth.uid() puede ver la story ahora (tu pareja: activas; el autor: también las caducadas). Helper de RLS.';

-- -----------------------------------------------------------------------------
-- RLS: lectura; sin escritura directa (solo las RPC).
-- -----------------------------------------------------------------------------

alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.story_reactions enable row level security;
alter table public.story_replies enable row level security;

drop policy if exists stories_select on public.stories;
create policy stories_select on public.stories
  for select to authenticated
  using (
    couple_id = (select public.my_couple_id())
    and deleted_at is null
    and user_id in (
      select cm.user_id
      from public.couple_members cm
      where cm.couple_id = (select public.my_couple_id())
    )
    and (user_id = (select auth.uid()) or expires_at > now())
  );

drop policy if exists story_views_select on public.story_views;
create policy story_views_select on public.story_views
  for select to authenticated using (public.story_visible(story_id));

drop policy if exists story_reactions_select on public.story_reactions;
create policy story_reactions_select on public.story_reactions
  for select to authenticated using (public.story_visible(story_id));

drop policy if exists story_replies_select on public.story_replies;
create policy story_replies_select on public.story_replies
  for select to authenticated using (public.story_visible(story_id));

revoke all on public.stories, public.story_views, public.story_reactions, public.story_replies
  from anon, authenticated;
grant select on public.stories, public.story_views, public.story_reactions, public.story_replies
  to authenticated;
grant all on public.stories, public.story_views, public.story_reactions, public.story_replies
  to service_role;

-- -----------------------------------------------------------------------------
-- RPC
-- -----------------------------------------------------------------------------

-- Publica una story de auth.uid() en su pareja. Las rutas de la foto deben estar
-- en <couple_id>/<auth.uid()>/ y terminar en .jpg. Máximo 30 activas por autor.
create or replace function public.create_story(
  p_kind text,
  p_media_path text default null,
  p_thumb_path text default null,
  p_text text default null,
  p_bg text default null,
  p_font text default null,
  p_strokes jsonb default null,
  p_stickers jsonb default '[]'::jsonb
)
returns public.stories
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid;
  v_prefix text;
  v_text text := nullif(btrim(coalesce(p_text, '')), '');
  v_story public.stories;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select cm.couple_id into v_couple_id from public.couple_members cm where cm.user_id = v_uid;
  if v_couple_id is null then
    raise exception 'no_couple' using errcode = 'P0001';
  end if;

  if p_kind = 'photo' then
    v_prefix := v_couple_id::text || '/' || v_uid::text || '/';
    if p_media_path is null or p_thumb_path is null
      or left(p_media_path, char_length(v_prefix)) <> v_prefix
      or left(p_thumb_path, char_length(v_prefix)) <> v_prefix
      or p_media_path !~ '^[^/]+/[^/]+/[^/]+\.jpg$'
      or p_thumb_path !~ '^[^/]+/[^/]+/[^/]+\.jpg$'
      or position('..' in p_media_path) > 0
      or position('..' in p_thumb_path) > 0
    then
      raise exception 'invalid_story' using errcode = 'P0001';
    end if;
  end if;

  if (
    select count(*) from public.stories s
    where s.user_id = v_uid and s.deleted_at is null and s.expires_at > now()
  ) >= 30 then
    raise exception 'too_many_stories' using errcode = 'P0001';
  end if;

  begin
    insert into public.stories (
      couple_id, user_id, kind, media_path, thumb_path, text, bg, font, strokes, stickers
    )
    values (
      v_couple_id, v_uid, coalesce(p_kind, ''), p_media_path, p_thumb_path, v_text,
      nullif(btrim(coalesce(p_bg, '')), ''), nullif(btrim(coalesce(p_font, '')), ''),
      p_strokes, coalesce(p_stickers, '[]'::jsonb)
    )
    returning * into v_story;
  exception when check_violation then
    raise exception 'invalid_story' using errcode = 'P0001';
  end;

  return v_story;
end;
$$;
comment on function public.create_story(text, text, text, text, text, text, jsonb, jsonb) is 'Publica una story de auth.uid() en su pareja.';

-- "Arrancar" una story: solo su autor; soft delete (la media se limpia después).
create or replace function public.delete_story(p_story_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  update public.stories s
  set deleted_at = now()
  where s.id = p_story_id and s.user_id = auth.uid() and s.deleted_at is null;
  if not found then
    raise exception 'story_not_found' using errcode = 'P0001';
  end if;
end;
$$;
comment on function public.delete_story(uuid) is 'Borra (soft delete) una story propia.';

-- Marca la story como vista por auth.uid(). El autor no cuenta; si no la puedes
-- ver no hace nada. No cambia seen_at si ya existía.
create or replace function public.mark_story_seen(p_story_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if not public.story_visible(p_story_id) then
    return;
  end if;
  if exists (select 1 from public.stories s where s.id = p_story_id and s.user_id = v_uid) then
    return;
  end if;
  insert into public.story_views (story_id, user_id)
  values (p_story_id, v_uid)
  on conflict (story_id, user_id) do nothing;
end;
$$;
comment on function public.mark_story_seen(uuid) is 'Registra que auth.uid() vio la story de su pareja.';

-- Una reacción por persona. Solo quien NO es el autor y solo con la story activa.
-- Emoji null o vacío = quitar la reacción. Un autor que intenta reaccionar a su
-- propia story recibe invalid_reaction.
create or replace function public.react_to_story(p_story_id uuid, p_emoji text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_author uuid;
  v_emoji text := btrim(coalesce(p_emoji, ''));
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select s.user_id into v_author
  from public.stories s
  where s.id = p_story_id and public.story_visible(s.id) and s.expires_at > now();
  if v_author is null then
    raise exception 'story_not_found' using errcode = 'P0001';
  end if;
  if v_author = v_uid then
    raise exception 'invalid_reaction' using errcode = 'P0001';
  end if;

  if v_emoji = '' then
    delete from public.story_reactions r where r.story_id = p_story_id and r.user_id = v_uid;
    return;
  end if;
  if char_length(v_emoji) not between 1 and 16 or v_emoji ~ '[[:space:]]' then
    raise exception 'invalid_reaction' using errcode = 'P0001';
  end if;

  insert into public.story_reactions (story_id, user_id, emoji)
  values (p_story_id, v_uid, v_emoji)
  on conflict (story_id, user_id) do update set emoji = excluded.emoji, created_at = now();
end;
$$;
comment on function public.react_to_story(uuid, text) is 'Reacciona (o quita la reacción) a la story activa de tu pareja.';

-- Responde a una story activa (ambos miembros pueden escribir).
create or replace function public.reply_to_story(p_story_id uuid, p_body text)
returns public.story_replies
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
  v_reply public.story_replies;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select s.couple_id into v_couple_id
  from public.stories s
  where s.id = p_story_id and public.story_visible(s.id) and s.expires_at > now();
  if v_couple_id is null then
    raise exception 'story_not_found' using errcode = 'P0001';
  end if;

  if char_length(v_body) not between 1 and 500 then
    raise exception 'invalid_reply' using errcode = 'P0001';
  end if;

  insert into public.story_replies (couple_id, story_id, user_id, body)
  values (v_couple_id, p_story_id, v_uid, v_body)
  returning * into v_reply;
  return v_reply;
end;
$$;
comment on function public.reply_to_story(uuid, text) is 'Responde a una story activa de la pareja.';

-- Enciende o apaga "Guardar mis stories en mi archivo".
create or replace function public.set_story_archive(p_enabled boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  update public.profiles p set story_archive = coalesce(p_enabled, true) where p.id = auth.uid();
end;
$$;
comment on function public.set_story_archive(boolean) is 'Cambia profiles.story_archive de auth.uid().';

-- -----------------------------------------------------------------------------
-- Limpieza (solo service_role; la llama la Edge Function stories-cleanup)
-- -----------------------------------------------------------------------------

-- Qué se puede borrar: stories borradas y caducadas cuyo autor apagó su archivo, más
-- los archivos huérfanos del bucket (más de 24 h sin story). Devuelve
--   { story_ids: [..], paths: [..], items: [{ id, paths: [..] }] }
-- `items` liga cada story con sus archivos para confirmar solo las que se borraron bien.
create or replace function public.stories_cleanup_batch(p_limit integer default 200)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 200), 1000));
  v_items jsonb;
  v_ids jsonb;
  v_paths text[];
  v_orphans text[] := '{}';
begin
  with picked as (
    select s.id, s.media_path, s.thumb_path, s.created_at
    from public.stories s
    left join public.profiles p on p.id = s.user_id
    where s.deleted_at is not null
      or (s.expires_at <= now() and coalesce(p.story_archive, true) = false)
    order by s.created_at
    limit v_limit
  )
  select
    coalesce(jsonb_agg(to_jsonb(x.id) order by x.created_at), '[]'::jsonb),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', x.id,
          'paths', to_jsonb(array_remove(array[x.media_path, x.thumb_path], null))
        ) order by x.created_at
      ),
      '[]'::jsonb
    ),
    coalesce(array_remove(array_agg(x.media_path) || array_agg(x.thumb_path), null), '{}'::text[])
  into v_ids, v_items, v_paths
  from picked x;

  if to_regclass('storage.objects') is not null then
    select coalesce(array_agg(o.name), '{}'::text[]) into v_orphans
    from (
      select obj.name
      from storage.objects obj
      where obj.bucket_id = 'stories'
        and obj.created_at < now() - interval '24 hours'
        and not exists (
          select 1 from public.stories s where s.media_path = obj.name or s.thumb_path = obj.name
        )
      order by obj.created_at
      limit v_limit
    ) o;
  end if;

  return jsonb_build_object(
    'story_ids', v_ids,
    'paths', to_jsonb(v_paths || v_orphans),
    'items', v_items
  );
end;
$$;
comment on function public.stories_cleanup_batch(integer) is 'Stories y archivos por limpiar (solo service_role, lo usa stories-cleanup).';

-- Borra las filas de las stories cuyos archivos ya se borraron. Vuelve a comprobar
-- que sean borrables: una llamada equivocada no puede tocar stories vivas.
create or replace function public.stories_cleanup_commit(p_story_ids uuid[])
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.stories s
  where s.id = any (coalesce(p_story_ids, '{}'))
    and (
      s.deleted_at is not null
      or (
        s.expires_at <= now()
        and coalesce((select p.story_archive from public.profiles p where p.id = s.user_id), true) = false
      )
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
comment on function public.stories_cleanup_commit(uuid[]) is 'Borra las filas de stories ya limpiadas del bucket (solo service_role).';

-- Encola el POST a stories-cleanup con pg_net. Usa private.settings.stories_cleanup_url
-- o, si no existe, notify_url cambiando /notify por /stories-cleanup. Sin
-- configuración no hace nada. Devuelve el id de la petición, o null.
create or replace function private.run_stories_cleanup()
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_request_id bigint;
begin
  select s.value into v_url from private.settings s where s.key = 'stories_cleanup_url';
  if v_url is null then
    select regexp_replace(s.value, '/notify/?$', '/stories-cleanup') into v_url
    from private.settings s where s.key = 'notify_url';
  end if;
  select s.value into v_secret from private.settings s where s.key = 'notify_secret';
  if v_url is null or v_secret is null then
    return null;
  end if;

  select net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_secret),
    timeout_milliseconds := 60000
  ) into v_request_id;
  return v_request_id;
exception when others then
  raise warning 'run_stories_cleanup: %', sqlerrm;
  return null;
end;
$$;
comment on function private.run_stories_cleanup() is 'Dispara la Edge Function stories-cleanup (la llama pg_cron cada hora).';

-- Job horario. Si pg_cron no está disponible (p. ej. un Postgres sin la extensión)
-- se avisa y la migración sigue.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'app-parejas-stories-cleanup',
    '23 * * * *',
    'select private.run_stories_cleanup()'
  );
exception when others then
  raise notice 'pg_cron no está disponible (%); no se programó la limpieza de stories. Usa private.run_stories_cleanup() a mano.', sqlerrm;
end;
$$;

-- -----------------------------------------------------------------------------
-- Push: eventos de story y story_reply
-- -----------------------------------------------------------------------------

drop trigger if exists stories_notify on public.stories;
create trigger stories_notify
  after insert on public.stories
  for each row execute function private.notify_on_insert('story', 'user_id');

drop trigger if exists story_replies_notify on public.story_replies;
create trigger story_replies_notify
  after insert on public.story_replies
  for each row execute function private.notify_on_insert('story_reply', 'user_id');

-- Arma el evento que recibe la función notify, o null si no hay a quién avisar
-- (sin pareja o sin tokens). p_row es la fila que disparó el aviso (to_jsonb).
-- Forma: { kind, couple_id, actor: {id, name}, recipient: {id, name},
--          tokens: [..], prefs: {answers, comments, moods, nudges, stories}, data: {...} }
-- data por tipo (claves estables que interpreta supabase/functions/notify):
--   answer:      question_id, day, question_text, recipient_answered
--   comment:     question_id, comment_id, day, question_text, recipient_answered,
--                body (solo si el destinatario ya contestó: si no, null)
--   mood:        mood_id, emoji, note
--   nudge:       nudge_id, nudge_kind, day
--   story:       story_id, story_kind, text (solo si story_kind = 'text')
--   story_reply: story_id, reply_id, body, story_author_id
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
      'stories', coalesce(v_prefs.stories, true)
    ),
    'data', v_data
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Storage: bucket privado `stories` (lo crea deploy.sh desde server/buckets.json;
-- aquí solo van las políticas). Como en avatars, se omiten si no existe
-- storage.objects (el CI crea un stub para probarlas).
-- -----------------------------------------------------------------------------

-- Ruta propia: <mi pareja>/<yo>/<archivo>, sin "..".
create or replace function public.story_path_writable(p_name text)
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
comment on function public.story_path_writable(text) is 'true si la ruta del bucket stories está en <tu pareja>/<tú>/.';

-- Legible: lo tuyo, o la media/miniatura de una story que puedes ver ahora.
create or replace function public.story_path_readable(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.story_path_writable(p_name)
    or exists (
      select 1
      from public.stories s
      where (s.media_path = p_name or s.thumb_path = p_name)
        and public.story_visible(s.id)
    );
$$;
comment on function public.story_path_readable(text) is 'true si la ruta del bucket stories es tuya o de una story de tu pareja visible ahora.';

do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'No existe storage.objects; se omiten las políticas del bucket stories.';
    return;
  end if;

  drop policy if exists stories_storage_select on storage.objects;
  create policy stories_storage_select on storage.objects
    for select to authenticated
    using (bucket_id = 'stories' and public.story_path_readable(name));

  drop policy if exists stories_storage_insert on storage.objects;
  create policy stories_storage_insert on storage.objects
    for insert to authenticated
    with check (bucket_id = 'stories' and public.story_path_writable(name));

  -- Sin políticas de update/delete: solo service_role (la limpieza) toca los archivos.
  drop policy if exists stories_storage_update on storage.objects;
  drop policy if exists stories_storage_delete on storage.objects;
end;
$$;

-- -----------------------------------------------------------------------------
-- Permisos de funciones
-- -----------------------------------------------------------------------------

revoke all on function public.story_visible(uuid) from public, anon;
revoke all on function public.create_story(text, text, text, text, text, text, jsonb, jsonb) from public, anon;
revoke all on function public.delete_story(uuid) from public, anon;
revoke all on function public.mark_story_seen(uuid) from public, anon;
revoke all on function public.react_to_story(uuid, text) from public, anon;
revoke all on function public.reply_to_story(uuid, text) from public, anon;
revoke all on function public.set_story_archive(boolean) from public, anon;
revoke all on function public.story_path_writable(text) from public, anon;
revoke all on function public.story_path_readable(text) from public, anon;
revoke all on function public.stories_cleanup_batch(integer) from public, anon, authenticated;
revoke all on function public.stories_cleanup_commit(uuid[]) from public, anon, authenticated;
revoke all on function private.run_stories_cleanup() from public, anon, authenticated;
revoke all on function private.notification_event(text, uuid, uuid, jsonb) from public, anon, authenticated;

grant execute on function public.story_visible(uuid) to authenticated, service_role;
grant execute on function public.create_story(text, text, text, text, text, text, jsonb, jsonb) to authenticated, service_role;
grant execute on function public.delete_story(uuid) to authenticated, service_role;
grant execute on function public.mark_story_seen(uuid) to authenticated, service_role;
grant execute on function public.react_to_story(uuid, text) to authenticated, service_role;
grant execute on function public.reply_to_story(uuid, text) to authenticated, service_role;
grant execute on function public.set_story_archive(boolean) to authenticated, service_role;
grant execute on function public.story_path_writable(text) to authenticated, service_role;
grant execute on function public.story_path_readable(text) to authenticated, service_role;
grant execute on function public.stories_cleanup_batch(integer) to service_role;
grant execute on function public.stories_cleanup_commit(uuid[]) to service_role;

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
  foreach t in array array['stories', 'story_views', 'story_reactions', 'story_replies'] loop
    if not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
