-- Pruebas de la Fase 4: tokens push, preferencias, eventos de notificación y triggers
-- (migración 20261102000000_notifications.sql).
-- Todo ocurre en una transacción que termina en ROLLBACK. Las peticiones de pg_net que se
-- encolan aquí nunca salen: el worker solo ve filas confirmadas.
--   psql -X -v ON_ERROR_STOP=1 -f supabase/tests/notifications.sql

begin;

lock table public.questions in share row exclusive mode;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local', '{"display_name":"Ana"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.local', '{"display_name":"Beto"}'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@test.local', '{"display_name":"Caro"}'),
  ('00000000-0000-0000-0000-0000000000d4', 'd@test.local', '{"display_name":"Dani"}');

create function pg_temp.u(p_letter text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000000' ||
    (array['a1','b2','c3','d4'])[ascii(upper(p_letter)) - 64])::uuid;
$$;

create function pg_temp.as_user(p_letter text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', pg_temp.u(p_letter), 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', pg_temp.u(p_letter)::text, true);
end;
$$;

create function pg_temp.expect_error(p_sql text, p_message text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm = p_message then
      return;
    end if;
    raise exception 'ASSERT: % falló con "%" (se esperaba "%")', p_sql, sqlerrm, p_message;
  end;
  raise exception 'ASSERT: % debía fallar con "%"', p_sql, p_message;
end;
$$;

create function pg_temp.expect_denied(p_sql text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception
    when insufficient_privilege then
      return;
  end;
  raise exception 'ASSERT: % debía ser rechazado', p_sql;
end;
$$;

create function pg_temp.assert(p_ok boolean, p_what text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then
    raise exception 'ASSERT: %', p_what;
  end if;
end;
$$;

create function pg_temp.code_of(p_user uuid) returns text language sql security definer as $$
  select c.invite_code from public.couples c
  join public.couple_members cm on cm.couple_id = c.id where cm.user_id = p_user;
$$;

grant execute on function pg_temp.u(text), pg_temp.as_user(text), pg_temp.expect_error(text, text),
  pg_temp.expect_denied(text), pg_temp.assert(boolean, text), pg_temp.code_of(uuid)
  to authenticated, anon;

create temp table t_ids (k text primary key, id uuid);
grant all on t_ids to authenticated;

-- Peticiones encoladas en pg_net por esta transacción (las de antes no cuentan).
create temp table t_base as select coalesce(max(id), 0) as id from net.http_request_queue;
create function pg_temp.queued() returns setof jsonb language sql as $$
  select convert_from(q.body, 'utf8')::jsonb from net.http_request_queue q
  where q.id > (select id from t_base) order by q.id;
$$;

-- =============================================================================
-- 1) Permisos
-- =============================================================================
set local role anon;
select pg_temp.expect_denied($q$select public.register_push_token('x')$q$);
select pg_temp.expect_denied($q$select public.unregister_push_token('x')$q$);
select pg_temp.expect_denied($q$select public.send_test_notification()$q$);
select pg_temp.expect_denied($q$select public.delete_push_tokens(array['x'])$q$);
select pg_temp.expect_denied('select * from public.push_tokens');
select pg_temp.expect_denied('select * from public.notification_prefs');
reset role;

select pg_temp.as_user('A');
select pg_temp.expect_denied('select * from public.push_tokens');
select pg_temp.expect_denied($q$insert into public.push_tokens (token, user_id) values (repeat('x', 30), auth.uid())$q$);
select pg_temp.expect_denied($q$select public.delete_push_tokens(array['x'])$q$);
select pg_temp.expect_denied('select * from private.settings');
select pg_temp.expect_denied($q$select private.notification_event('test', null, auth.uid(), '{}')$q$);
select pg_temp.expect_denied($q$select private.send_notification('test', null, auth.uid(), '{}')$q$);
reset role;

-- =============================================================================
-- 2) Parejas y tokens
-- =============================================================================
select pg_temp.as_user('A'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('B'); select public.join_couple(pg_temp.code_of(pg_temp.u('A')));
select pg_temp.as_user('C'); select public.create_couple(null, 'America/Mexico_City');
reset role;
update public.profiles set nickname = 'Betito' where id = pg_temp.u('B');

select pg_temp.as_user('A');
select pg_temp.expect_error($q$select public.register_push_token('corto')$q$, 'invalid_token');
select pg_temp.expect_error($q$select public.register_push_token('con espacios en medio del token')$q$, 'invalid_token');
select public.register_push_token('token-ana-celular-1-xxxxxxxxxxxx');
select public.register_push_token('token-ana-celular-1-xxxxxxxxxxxx'); -- idempotente
select pg_temp.as_user('B');
select public.register_push_token('token-beto-celular-1-xxxxxxxxxxx');
select public.register_push_token('token-beto-celular-2-xxxxxxxxxxx');
-- Caro registra un celular que antes era de Beto: se reasigna.
select pg_temp.as_user('C');
select public.register_push_token('token-beto-celular-2-xxxxxxxxxxx');
-- Unregister solo borra los míos.
select pg_temp.as_user('A');
select public.unregister_push_token('token-beto-celular-1-xxxxxxxxxxx');
reset role;

select pg_temp.assert((select count(*) from public.push_tokens where user_id = pg_temp.u('A')) = 1, 'Ana tiene 1 token');
select pg_temp.assert((select count(*) from public.push_tokens where user_id = pg_temp.u('B')) = 1, 'Beto tiene 1 token (el 2 pasó a Caro)');
select pg_temp.assert((select user_id from public.push_tokens where token = 'token-beto-celular-2-xxxxxxxxxxx') = pg_temp.u('C'),
  'el token reasignado es de Caro');

-- Máximo 5 tokens por persona: quedan los más recientes.
select pg_temp.as_user('D');
select public.register_push_token('token-dani-' || i || '-xxxxxxxxxxxxxxxxxxxx') from generate_series(1, 7) i;
reset role;
select pg_temp.assert((select count(*) from public.push_tokens where user_id = pg_temp.u('D')) = 5, 'Dani conserva 5 tokens');

-- delete_push_tokens solo para service_role.
set local role service_role;
select pg_temp.assert(public.delete_push_tokens(array(
  select token from public.push_tokens where user_id = pg_temp.u('D'))) = 5, 'service_role borra tokens');
reset role;

-- =============================================================================
-- 3) Preferencias (RLS: cada quien la suya)
-- =============================================================================
select pg_temp.as_user('B');
insert into public.notification_prefs (user_id, moods, reminder_time) values (auth.uid(), false, '22:30');
select pg_temp.expect_denied($q$insert into public.notification_prefs (user_id) values (pg_temp.u('A'))$q$);
select pg_temp.as_user('A');
select pg_temp.assert((select count(*) from public.notification_prefs) = 0, 'Ana no ve las preferencias de Beto');
update public.notification_prefs set moods = true where user_id = pg_temp.u('B');
reset role;
select pg_temp.assert((select not moods from public.notification_prefs where user_id = pg_temp.u('B')),
  'Ana no puede cambiar las preferencias de Beto');
select pg_temp.expect_error($q$insert into public.notification_prefs (user_id, reminder_time) values (pg_temp.u('C'), '21:00:30')$q$,
  'new row for relation "notification_prefs" violates check constraint "notification_prefs_reminder_minute"');

-- =============================================================================
-- 4) Eventos
-- =============================================================================
create temp table t_q as
  select id from public.questions where type = 'open' and is_active and intensity <> 'picante' limit 1;
insert into t_ids select 'q', id from t_q;
create temp table t_couple as select couple_id as id from public.couple_members where user_id = pg_temp.u('A');

-- Mood de Ana -> evento para Beto con sus preferencias.
create temp table t_ev as select private.notification_event('mood', (select id from t_couple), pg_temp.u('A'),
  jsonb_build_object('id', gen_random_uuid(), 'emoji', '🥰', 'note', 'te extraño')) as e;
select pg_temp.assert((select e ->> 'kind' from t_ev) = 'mood', 'kind');
select pg_temp.assert((select (e -> 'recipient' ->> 'id')::uuid from t_ev) = pg_temp.u('B'), 'destinatario Beto');
select pg_temp.assert((select e -> 'recipient' ->> 'name' from t_ev) = 'Betito', 'apodo del destinatario');
select pg_temp.assert((select e -> 'actor' ->> 'name' from t_ev) = 'Ana', 'nombre del actor');
select pg_temp.assert((select e -> 'tokens' from t_ev) = '["token-beto-celular-1-xxxxxxxxxxx"]', 'tokens de Beto');
select pg_temp.assert((select e -> 'prefs' from t_ev) = '{"answers": true, "comments": true, "memories": true, "moods": false, "nudges": true, "stories": true}',
  'preferencias de Beto');
select pg_temp.assert((select e -> 'data' ->> 'emoji' from t_ev) = '🥰', 'emoji del mood');

-- Sin pareja (Caro sola) o sin tokens del destinatario: no hay evento.
select pg_temp.assert(private.notification_event('mood', (select couple_id from public.couple_members where user_id = pg_temp.u('C')),
  pg_temp.u('C'), '{}') is null, 'sin pareja no hay evento');
select pg_temp.assert(private.notification_event('mood', (select id from t_couple), pg_temp.u('B'), '{}') is not null, 'Ana tiene token');
delete from public.push_tokens where user_id = pg_temp.u('A');
select pg_temp.assert(private.notification_event('mood', (select id from t_couple), pg_temp.u('B'), '{}') is null, 'sin tokens no hay evento');
-- Un actor que no es de la pareja no genera evento.
select pg_temp.assert(private.notification_event('mood', (select id from t_couple), pg_temp.u('C'), '{}') is null, 'actor ajeno');
-- Tipo desconocido.
select pg_temp.assert(private.notification_event('nada', (select id from t_couple), pg_temp.u('A'), '{}') is null, 'tipo desconocido');

-- Comentario: el cuerpo solo viaja si el destinatario ya contestó.
select pg_temp.assert((select private.notification_event('comment', (select id from t_couple), pg_temp.u('A'),
  jsonb_build_object('id', gen_random_uuid(), 'question_id', (select id from t_q), 'body', 'secreto')) -> 'data' -> 'body')
  = 'null'::jsonb, 'sin contestar no se revela el comentario');
select pg_temp.as_user('B');
select public.submit_answer((select id from t_ids where k = 'q'), 'mi respuesta');
reset role;
create temp table t_ev2 as select private.notification_event('comment', (select id from t_couple), pg_temp.u('A'),
  jsonb_build_object('id', gen_random_uuid(), 'question_id', (select id from t_q), 'body', 'secreto')) as e;
select pg_temp.assert((select e -> 'data' ->> 'body' from t_ev2) = 'secreto', 'ya contestó: se manda el comentario');
select pg_temp.assert((select (e -> 'data' ->> 'recipient_answered')::boolean from t_ev2), 'recipient_answered');
select pg_temp.assert((select e -> 'data' ->> 'question_text' from t_ev2) is not null, 'texto de la pregunta');

-- =============================================================================
-- 5) Triggers y pg_net
-- =============================================================================
-- Sin configuración no se encola nada, pero la escritura funciona.
select pg_temp.as_user('A');
select public.set_mood('🙂');
select pg_temp.assert(public.send_test_notification() = false, 'sin configuración la prueba no sale');
reset role;
select pg_temp.assert((select count(*) from pg_temp.queued()) = 0, 'sin configuración no hay peticiones');

insert into private.settings (key, value) values
  ('notify_url', 'http://functions:9000/notify'), ('notify_secret', 'secreto-de-prueba');

-- Ana vuelve a tener token; Beto contesta, comenta, cambia mood y manda toque.
select pg_temp.as_user('A');
select public.register_push_token('token-ana-celular-1-xxxxxxxxxxxx');
select pg_temp.as_user('B');
select public.set_mood('😴', 'cansado');
select public.add_comment((select id from t_ids where k = 'q'), 'hola');
select public.submit_answer((select id from t_ids where k = 'q'), 'edito mi respuesta'); -- update: no avisa
select public.send_nudge();
select pg_temp.as_user('A');
select public.submit_answer((select id from t_ids where k = 'q'), 'la de Ana');
select pg_temp.assert(public.send_test_notification(), 'prueba encolada');
reset role;

select pg_temp.assert((select array_agg(e ->> 'kind') from pg_temp.queued() e)
  = array['mood', 'comment', 'nudge', 'answer', 'test'],
  'tipos encolados: ' || (select array_agg(e ->> 'kind')::text from pg_temp.queued() e));
select pg_temp.assert((select array_agg(e -> 'recipient' ->> 'name') from pg_temp.queued() e)
  = array['Ana', 'Ana', 'Ana', 'Betito', 'Ana'], 'destinatarios');
select pg_temp.assert((select (e -> 'data' ->> 'recipient_answered')::boolean from pg_temp.queued() e where e ->> 'kind' = 'answer'),
  'Beto ya había contestado');
select pg_temp.assert((select e -> 'data' ->> 'day' from pg_temp.queued() e where e ->> 'kind' = 'nudge')
  = public.couple_today((select id from t_couple))::text, 'el toque lleva el día de hoy');
select pg_temp.assert((select count(*) from net.http_request_queue q where q.id > (select id from t_base)
  and q.headers ->> 'x-notify-secret' = 'secreto-de-prueba' and q.url = 'http://functions:9000/notify') = 5,
  'peticiones con URL y secreto');

-- Un fallo al encolar no rompe la escritura (URL inválida para pg_net).
update private.settings set value = 'no es una url' where key = 'notify_url';
select pg_temp.as_user('B');
select public.set_mood('🥳');
reset role;

rollback;
