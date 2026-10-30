-- =============================================================================
-- 20261102000000_notifications.sql
-- Fase 4: notificaciones push.
--   * push_tokens: tokens FCM de cada celular (se escriben solo por RPC).
--   * notification_prefs: qué avisos quiere cada quien y su recordatorio diario
--     (el recordatorio es local: lo programa la app con esta hora).
--   * Mecanismo genérico: un trigger AFTER INSERT (private.notify_on_insert) arma
--     el "evento" (destinatario, tokens, preferencias y datos de la fila) con
--     private.notification_event y lo manda con pg_net a la Edge Function
--     `notify`, que decide el texto y lo envía por FCM HTTP v1. Conectado a
--     answers, answer_comments, moods y nudges; para stories, story_replies o
--     memories basta con un trigger nuevo y una rama en notification_event.
--   * Configuración en private.settings (fuera del API): notify_url y
--     notify_secret. Sin ellas no se manda nada (CI, servidor sin Firebase).
--     La cargan scripts/server/set-notify-config.sh en el VPS.
--   * Nunca rompe la escritura del usuario: cualquier error al encolar el push
--     se convierte en WARNING.
-- Errores (P0001): not_authenticated, invalid_token.
-- =============================================================================

create extension if not exists pg_net with schema extensions;

-- -----------------------------------------------------------------------------
-- Configuración privada (sin acceso desde el API)
-- -----------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
comment on table private.settings is 'Configuración del servidor (notify_url, notify_secret). Solo la leen funciones security definer.';
revoke all on private.settings from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

create table if not exists public.push_tokens (
  token text primary key
    constraint push_tokens_token_format check (char_length(token) between 20 and 4096 and token !~ '[[:space:]]'),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null default 'android' constraint push_tokens_platform check (platform in ('android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.push_tokens is 'Tokens FCM por celular. Se escriben con register_push_token/unregister_push_token; notify borra los inválidos.';

create index if not exists push_tokens_user_idx on public.push_tokens (user_id, updated_at desc);

create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  answers boolean not null default true,
  comments boolean not null default true,
  moods boolean not null default true,
  nudges boolean not null default true,
  reminder_enabled boolean not null default true,
  -- Hora local del celular para el recordatorio diario (lo programa la app).
  reminder_time time not null default '21:00'
    constraint notification_prefs_reminder_minute check (date_part('second', reminder_time) = 0),
  updated_at timestamptz not null default now()
);
comment on table public.notification_prefs is 'Preferencias de avisos por persona. Sin fila = todo encendido y recordatorio a las 21:00.';

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table public.push_tokens enable row level security;
alter table public.notification_prefs enable row level security;

-- push_tokens: nadie lo lee ni escribe directo desde la app.
revoke all on public.push_tokens from anon, authenticated;
grant all on public.push_tokens to service_role;

drop policy if exists notification_prefs_select_own on public.notification_prefs;
create policy notification_prefs_select_own on public.notification_prefs
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists notification_prefs_insert_own on public.notification_prefs;
create policy notification_prefs_insert_own on public.notification_prefs
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists notification_prefs_update_own on public.notification_prefs;
create policy notification_prefs_update_own on public.notification_prefs
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.notification_prefs from anon, authenticated;
grant select, insert, update on public.notification_prefs to authenticated;
grant all on public.notification_prefs to service_role;

create or replace function public.touch_notification_prefs()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists notification_prefs_touch on public.notification_prefs;
create trigger notification_prefs_touch
  before update on public.notification_prefs
  for each row execute function public.touch_notification_prefs();

-- -----------------------------------------------------------------------------
-- RPC de tokens
-- -----------------------------------------------------------------------------

-- Registra (o reasigna, si el celular cambió de cuenta) el token de auth.uid().
-- Se conservan los 5 tokens más recientes por persona.
create or replace function public.register_push_token(p_token text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_token text := btrim(coalesce(p_token, ''));
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if char_length(v_token) not between 20 and 4096 or v_token ~ '[[:space:]]' then
    raise exception 'invalid_token' using errcode = 'P0001';
  end if;

  insert into public.push_tokens (token, user_id)
  values (v_token, v_uid)
  on conflict (token) do update set user_id = excluded.user_id, updated_at = now();

  delete from public.push_tokens pt
  where pt.user_id = v_uid
    and pt.token not in (
      select t.token from public.push_tokens t
      where t.user_id = v_uid
      order by t.updated_at desc
      limit 5
    );
end;
$$;
comment on function public.register_push_token(text) is 'Guarda el token FCM del celular para auth.uid().';

-- Quita el token de este celular (al cerrar sesión o apagar los avisos).
create or replace function public.unregister_push_token(p_token text)
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
  delete from public.push_tokens pt where pt.token = p_token and pt.user_id = auth.uid();
end;
$$;
comment on function public.unregister_push_token(text) is 'Borra el token FCM de auth.uid() en este celular.';

-- Solo para la Edge Function (service_role): borra los tokens que FCM rechazó.
create or replace function public.delete_push_tokens(p_tokens text[])
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.push_tokens pt where pt.token = any (coalesce(p_tokens, '{}'));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
comment on function public.delete_push_tokens(text[]) is 'Borra tokens inválidos (solo service_role, lo usa la función notify).';

-- -----------------------------------------------------------------------------
-- Eventos de notificación
-- -----------------------------------------------------------------------------

-- Nombre con el que se muestra a una persona: apodo o nombre.
create or replace function private.person_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(btrim(p.nickname), ''), nullif(btrim(p.display_name), ''), 'Tu pareja')
  from public.profiles p where p.id = p_user_id;
$$;

-- Arma el evento que recibe la función notify, o null si no hay a quién avisar
-- (sin pareja o sin tokens). p_row es la fila que disparó el aviso (to_jsonb).
-- Forma: { kind, couple_id, actor: {id, name}, recipient: {id, name},
--          tokens: [..], prefs: {answers, comments, moods, nudges}, data: {...} }
-- data por tipo (claves estables que interpreta supabase/functions/notify):
--   answer:  question_id, day, question_text, recipient_answered
--   comment: question_id, comment_id, day, question_text, recipient_answered,
--            body (solo si el destinatario ya contestó: si no, null)
--   mood:    mood_id, emoji, note
--   nudge:   nudge_id, nudge_kind, day
--   test:    (vacío; el destinatario es el propio actor)
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
      'nudges', coalesce(v_prefs.nudges, true)
    ),
    'data', v_data
  );
end;
$$;

-- Encola el POST a notify con pg_net (asíncrono: sale después del commit).
-- Devuelve el id de la petición de pg_net, o null si no se mandó nada.
create or replace function private.send_notification(
  p_kind text,
  p_couple_id uuid,
  p_actor uuid,
  p_row jsonb
)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_event jsonb;
  v_request_id bigint;
begin
  select s.value into v_url from private.settings s where s.key = 'notify_url';
  select s.value into v_secret from private.settings s where s.key = 'notify_secret';
  if v_url is null or v_secret is null then
    return null;
  end if;

  v_event := private.notification_event(p_kind, p_couple_id, p_actor, p_row);
  if v_event is null then
    return null;
  end if;

  select net.http_post(
    url := v_url,
    body := v_event,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_secret),
    timeout_milliseconds := 10000
  ) into v_request_id;
  return v_request_id;
exception when others then
  raise warning 'send_notification(%): %', p_kind, sqlerrm;
  return null;
end;
$$;

-- Trigger genérico: notify_on_insert('<kind>', '<columna del actor>').
-- La fila debe tener couple_id.
create or replace function private.notify_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(new);
begin
  perform private.send_notification(
    tg_argv[0],
    (v_row ->> 'couple_id')::uuid,
    (v_row ->> tg_argv[1])::uuid,
    v_row
  );
  return null;
exception when others then
  raise warning 'notify_on_insert(%): %', tg_argv[0], sqlerrm;
  return null;
end;
$$;

drop trigger if exists answers_notify on public.answers;
create trigger answers_notify
  after insert on public.answers
  for each row execute function private.notify_on_insert('answer', 'user_id');

drop trigger if exists answer_comments_notify on public.answer_comments;
create trigger answer_comments_notify
  after insert on public.answer_comments
  for each row execute function private.notify_on_insert('comment', 'user_id');

drop trigger if exists moods_notify on public.moods;
create trigger moods_notify
  after insert on public.moods
  for each row execute function private.notify_on_insert('mood', 'user_id');

drop trigger if exists nudges_notify on public.nudges;
create trigger nudges_notify
  after insert on public.nudges
  for each row execute function private.notify_on_insert('nudge', 'from_user');

-- Notificación de prueba a mis propios celulares (pantalla de ajustes).
-- Devuelve false si no se pudo encolar (servidor sin configurar o sin tokens).
create or replace function public.send_test_notification()
returns boolean
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
  return private.send_notification('test', public.my_couple_id(), v_uid, '{}'::jsonb) is not null;
end;
$$;
comment on function public.send_test_notification() is 'Manda un push de prueba a los celulares de auth.uid().';

-- -----------------------------------------------------------------------------
-- Permisos de funciones
-- -----------------------------------------------------------------------------

revoke all on function public.touch_notification_prefs() from public, anon, authenticated;
revoke all on function public.register_push_token(text) from public, anon;
revoke all on function public.unregister_push_token(text) from public, anon;
revoke all on function public.send_test_notification() from public, anon;
revoke all on function public.delete_push_tokens(text[]) from public, anon, authenticated;
revoke all on function private.person_name(uuid) from public, anon, authenticated;
revoke all on function private.notification_event(text, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.send_notification(text, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.notify_on_insert() from public, anon, authenticated;

grant execute on function public.register_push_token(text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;
grant execute on function public.send_test_notification() to authenticated;
grant execute on function public.delete_push_tokens(text[]) to service_role;
