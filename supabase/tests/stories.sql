-- Pruebas de la Fase 6: stories (RPC, RLS, políticas de Storage, limpieza y eventos de push)
-- (migración 20261103000000_stories.sql).
-- Requiere el stub de Storage (supabase/tests/fixtures/storage_stub.sql) aplicado ANTES.
-- Todo ocurre en una transacción que termina en ROLLBACK. Las peticiones de pg_net que se
-- encolan aquí nunca salen: el worker solo ve filas confirmadas.
--   psql -X -v ON_ERROR_STOP=1 -f supabase/tests/stories.sql

begin;

insert into storage.buckets (id, name, public) values ('stories', 'stories', false)
on conflict (id) do nothing;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local', '{"display_name":"Ana"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.local', '{"display_name":"Beto"}'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@test.local', '{"display_name":"Caro"}'),
  ('00000000-0000-0000-0000-0000000000d4', 'd@test.local', '{"display_name":"Dani"}'),
  ('00000000-0000-0000-0000-0000000000e5', 'e@test.local', '{"display_name":"Eli"}');

create function pg_temp.u(p_letter text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000000' ||
    (array['a1','b2','c3','d4','e5'])[ascii(upper(p_letter)) - 64])::uuid;
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
  to authenticated, anon, service_role;

-- Ids de las stories de la prueba por nombre.
create temp table t_ids (k text primary key, id uuid);
grant all on t_ids to authenticated, service_role;
create function pg_temp.sid(p_key text) returns uuid language sql as $$
  select id from t_ids where k = p_key;
$$;
grant execute on function pg_temp.sid(text) to authenticated, service_role;

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
select pg_temp.expect_denied($q$select public.create_story('text', null, null, 'hola', 'paper', 'hand')$q$);
select pg_temp.expect_denied($q$select public.delete_story(gen_random_uuid())$q$);
select pg_temp.expect_denied($q$select public.mark_story_seen(gen_random_uuid())$q$);
select pg_temp.expect_denied($q$select public.react_to_story(gen_random_uuid(), '❤️')$q$);
select pg_temp.expect_denied($q$select public.reply_to_story(gen_random_uuid(), 'hola')$q$);
select pg_temp.expect_denied($q$select public.set_story_archive(false)$q$);
select pg_temp.expect_denied('select * from public.stories');
select pg_temp.expect_denied('select * from public.story_views');
select pg_temp.expect_denied('select * from public.story_reactions');
select pg_temp.expect_denied('select * from public.story_replies');
reset role;

-- Parejas: Ana + Beto (P1), Caro + Dani (P2). Eli sin pareja.
select pg_temp.as_user('A'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('B'); select public.join_couple(pg_temp.code_of(pg_temp.u('A')));
select pg_temp.as_user('C'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('D'); select public.join_couple(pg_temp.code_of(pg_temp.u('C')));
reset role;
create temp table t_couple as select couple_id as id from public.couple_members where user_id = pg_temp.u('A');
create temp table t_couple2 as select couple_id as id from public.couple_members where user_id = pg_temp.u('C');
grant select on t_couple, t_couple2 to authenticated, service_role;

-- Los usuarios autenticados no pueden ejecutar la limpieza ni la función privada.
select pg_temp.as_user('A');
select pg_temp.expect_denied($q$select public.stories_cleanup_batch()$q$);
select pg_temp.expect_denied($q$select public.stories_cleanup_commit(array[gen_random_uuid()])$q$);
select pg_temp.expect_denied($q$select private.run_stories_cleanup()$q$);
-- Y no escriben directo.
select pg_temp.expect_denied($q$insert into public.stories (couple_id, user_id, kind, text, bg, font)
  values (public.my_couple_id(), auth.uid(), 'text', 'x', 'paper', 'hand')$q$);
select pg_temp.expect_denied($q$update public.stories set deleted_at = now()$q$);
select pg_temp.expect_denied($q$delete from public.stories$q$);
reset role;

-- =============================================================================
-- 2) create_story: errores y validaciones
-- =============================================================================
-- Sin sesión (rol con permiso pero sin claims del JWT).
select set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true);
select pg_temp.expect_error($q$select public.create_story('text', null, null, 'hola', 'paper', 'hand')$q$, 'not_authenticated');

select pg_temp.as_user('E');
select pg_temp.expect_error($q$select public.create_story('text', null, null, 'hola', 'paper', 'hand')$q$, 'no_couple');

select pg_temp.as_user('A');
-- texto
select pg_temp.expect_error($q$select public.create_story('video')$q$, 'invalid_story');
select pg_temp.expect_error($q$select public.create_story(null)$q$, 'invalid_story');
select pg_temp.expect_error($q$select public.create_story('text', null, null, '   ', 'paper', 'hand')$q$, 'invalid_story');
select pg_temp.expect_error(format('select public.create_story(%L, null, null, %L, %L, %L)', 'text', repeat('x', 281), 'paper', 'hand'), 'invalid_story');
select pg_temp.expect_error($q$select public.create_story('text', null, null, 'hola', null, 'hand')$q$, 'invalid_story');
select pg_temp.expect_error($q$select public.create_story('text', null, null, 'hola', 'rosa', 'hand')$q$, 'invalid_story');
select pg_temp.expect_error($q$select public.create_story('text', null, null, 'hola', 'paper', null)$q$, 'invalid_story');
select pg_temp.expect_error($q$select public.create_story('text', null, null, 'hola', 'paper', 'comic')$q$, 'invalid_story');
-- dibujo
select pg_temp.expect_error($q$select public.create_story('drawing', null, null, null, 'paper')$q$, 'invalid_story');
select pg_temp.expect_error($q$select public.create_story('drawing', null, null, null, 'paper', null, '[]')$q$, 'invalid_story');
select pg_temp.expect_error($q$select public.create_story('drawing', null, null, null, 'paper', null, '{"a":1}')$q$, 'invalid_story');
select pg_temp.expect_error($q$select public.create_story('drawing', null, null, null, null, null, '[{"c":"ink","w":8,"p":[1,2]}]')$q$, 'invalid_story');
select pg_temp.expect_error($q$select public.create_story('drawing', null, null, 'texto', 'paper', null, '[{"c":"ink","w":8,"p":[1,2]}]')$q$, 'invalid_story');
select pg_temp.expect_error(format('select public.create_story(%L, null, null, null, %L, null, %L::jsonb)', 'drawing', 'paper',
  (select jsonb_agg(jsonb_build_object('c', 'ink', 'w', 8, 'p', jsonb_build_array(1, 2)))::text from generate_series(1, 301))), 'invalid_story');
select pg_temp.expect_error(format('select public.create_story(%L, null, null, null, %L, null, %L::jsonb)', 'drawing', 'paper',
  jsonb_build_array(jsonb_build_object('c', 'ink', 'w', 8, 'p', (select jsonb_agg(1) from generate_series(1, 140000))))::text), 'invalid_story');
-- stickers
select pg_temp.expect_error($q$select public.create_story('text', null, null, 'hola', 'paper', 'hand', null, '{"e":"x"}')$q$, 'invalid_story');
select pg_temp.expect_error(format('select public.create_story(%L, null, null, %L, %L, %L, null, %L::jsonb)', 'text', 'hola', 'paper', 'hand',
  (select jsonb_agg(jsonb_build_object('e', '😀', 'x', 0.5, 'y', 0.5, 's', 1, 'r', 0))::text from generate_series(1, 11))), 'invalid_story');
-- foto: rutas
select pg_temp.expect_error($q$select public.create_story('photo')$q$, 'invalid_story');
select pg_temp.expect_error(format('select public.create_story(%L, %L, %L)', 'photo',
  (select id from t_couple) || '/' || pg_temp.u('A') || '/m.jpg', null), 'invalid_story');
select pg_temp.expect_error(format('select public.create_story(%L, %L, %L)', 'photo',
  (select id from t_couple) || '/' || pg_temp.u('B') || '/m.jpg',
  (select id from t_couple) || '/' || pg_temp.u('B') || '/m_thumb.jpg'), 'invalid_story');
select pg_temp.expect_error(format('select public.create_story(%L, %L, %L)', 'photo',
  (select id from t_couple2) || '/' || pg_temp.u('A') || '/m.jpg',
  (select id from t_couple2) || '/' || pg_temp.u('A') || '/m_thumb.jpg'), 'invalid_story');
select pg_temp.expect_error(format('select public.create_story(%L, %L, %L)', 'photo',
  (select id from t_couple) || '/' || pg_temp.u('A') || '/m.png',
  (select id from t_couple) || '/' || pg_temp.u('A') || '/m_thumb.jpg'), 'invalid_story');
select pg_temp.expect_error(format('select public.create_story(%L, %L, %L)', 'photo',
  (select id from t_couple) || '/' || pg_temp.u('A') || '/../x.jpg',
  (select id from t_couple) || '/' || pg_temp.u('A') || '/m_thumb.jpg'), 'invalid_story');
select pg_temp.expect_error(format('select public.create_story(%L, %L, %L)', 'photo',
  (select id from t_couple) || '/' || pg_temp.u('A') || '/sub/m.jpg',
  (select id from t_couple) || '/' || pg_temp.u('A') || '/m_thumb.jpg'), 'invalid_story');
select pg_temp.expect_error(format('select public.create_story(%L, %L, %L, %L, %L)', 'photo',
  (select id from t_couple) || '/' || pg_temp.u('A') || '/m.jpg',
  (select id from t_couple) || '/' || pg_temp.u('A') || '/m_thumb.jpg', repeat('x', 141), 'paper'), 'invalid_story');
reset role;
select pg_temp.assert((select count(*) from public.stories) = 0, 'ningún intento inválido dejó filas');

-- =============================================================================
-- 3) Crear stories válidas
-- =============================================================================
select pg_temp.as_user('A');
do $$
declare
  v_couple uuid := public.my_couple_id();
  v_me uuid := auth.uid();
  s public.stories;
begin
  s := public.create_story('text', null, null, '  hola mundo  ', 'jamaica', 'hand');
  assert s.user_id = v_me and s.couple_id = v_couple, 'pareja y autor del servidor';
  assert s.text = 'hola mundo', 'texto recortado';
  assert s.stickers = '[]'::jsonb, 'stickers vacío por omisión';
  assert s.expires_at > now() + interval '23 hours' and s.expires_at < now() + interval '25 hours', 'caduca a las 24 h';
  assert s.deleted_at is null, 'sin borrar';
  insert into t_ids values ('text', s.id);

  s := public.create_story('drawing', null, null, null, 'paper', null,
    '[{"c":"ink","w":8,"p":[10,10,20,20]},{"c":"chile","w":18,"o":0.4,"p":[5,5]}]',
    '[{"e":"🌮","x":0.5,"y":0.5,"s":1,"r":0}]');
  assert jsonb_array_length(s.strokes) = 2 and jsonb_array_length(s.stickers) = 1, 'dibujo con stickers';
  insert into t_ids values ('drawing', s.id);

  s := public.create_story('photo', v_couple || '/' || v_me || '/f1.jpg', v_couple || '/' || v_me || '/f1_thumb.jpg', ' pie ');
  assert s.text = 'pie' and s.media_path like '%/f1.jpg', 'foto con pie';
  insert into t_ids values ('photo', s.id);

  s := public.create_story('photo', v_couple || '/' || v_me || '/f2.jpg', v_couple || '/' || v_me || '/f2_thumb.jpg');
  assert s.text is null, 'foto sin pie';
  insert into t_ids values ('photo2', s.id);
end $$;

-- Límite de 30 activas por autor (ya hay 4).
do $$
begin
  for i in 1..26 loop
    perform public.create_story('text', null, null, 'relleno ' || i, 'paper', 'body');
  end loop;
end $$;
select pg_temp.expect_error($q$select public.create_story('text', null, null, 'una más', 'paper', 'body')$q$, 'too_many_stories');
reset role;
-- Las borradas o caducadas no cuentan: se caducan 26 y entonces sí cabe otra.
update public.stories set expires_at = now() - interval '1 minute' where text like 'relleno %';
select pg_temp.as_user('A');
select public.create_story('text', null, null, 'ahora sí', 'paper', 'body');
reset role;
delete from public.stories where text in ('ahora sí') or text like 'relleno %';

-- =============================================================================
-- 4) RLS de lectura
-- =============================================================================
select pg_temp.as_user('A');
select pg_temp.assert((select count(*) from public.stories) = 4, 'Ana ve sus 4 stories');
select pg_temp.as_user('B');
select pg_temp.assert((select count(*) from public.stories) = 4, 'Beto ve las 4 activas de Ana');
select pg_temp.assert(public.story_visible(pg_temp.sid('text')), 'story_visible para la pareja');
select pg_temp.as_user('C');
select pg_temp.assert((select count(*) from public.stories) = 0, 'Caro (otra pareja) no ve nada');
select pg_temp.assert(not public.story_visible(pg_temp.sid('text')), 'story_visible falso para otra pareja');
select pg_temp.as_user('E');
select pg_temp.assert((select count(*) from public.stories) = 0, 'Eli (sin pareja) no ve nada');

-- Caduca una: Beto deja de verla, Ana la conserva (archivo).
reset role;
update public.stories set expires_at = now() - interval '1 hour' where id = pg_temp.sid('photo2');
select pg_temp.as_user('B');
select pg_temp.assert((select count(*) from public.stories) = 3, 'Beto ya no ve la caducada');
select pg_temp.assert(not public.story_visible(pg_temp.sid('photo2')), 'caducada no visible para Beto');
select pg_temp.as_user('A');
select pg_temp.assert((select count(*) from public.stories) = 4, 'Ana conserva la caducada en su archivo');
select pg_temp.assert(public.story_visible(pg_temp.sid('photo2')), 'caducada visible para su autora');
-- Eli entra a la pareja de Ana... no hay lugar (máx. 2): se prueba con Beto fuera abajo.

-- =============================================================================
-- 5) delete_story
-- =============================================================================
select pg_temp.as_user('B');
select pg_temp.expect_error(format('select public.delete_story(%L)', pg_temp.sid('text')), 'story_not_found');
select pg_temp.expect_error($q$select public.delete_story(gen_random_uuid())$q$, 'story_not_found');
select pg_temp.as_user('A');
select public.create_story('text', null, null, 'para borrar', 'nopal', 'stamp');
do $$
declare
  v_id uuid := (select id from public.stories where text = 'para borrar');
begin
  perform public.delete_story(v_id);
  assert not exists (select 1 from public.stories where id = v_id), 'borrada: ni su autora la ve';
  perform pg_temp.expect_error(format('select public.delete_story(%L)', v_id), 'story_not_found');
end $$;
reset role;
select pg_temp.assert((select deleted_at is not null from public.stories where text = 'para borrar'), 'soft delete (la fila sigue)');

-- =============================================================================
-- 6) Vistos
-- =============================================================================
select pg_temp.as_user('A');
select public.mark_story_seen(pg_temp.sid('text')); -- autora: no hace nada
select pg_temp.assert((select count(*) from public.story_views) = 0, 'la autora no cuenta como vista');
select pg_temp.as_user('B');
select public.mark_story_seen(pg_temp.sid('text'));
create temp table t_seen as select seen_at from public.story_views where story_id = pg_temp.sid('text') and user_id = pg_temp.u('B');
grant select on t_seen to authenticated;
select pg_temp.assert((select count(*) from t_seen) = 1, 'Beto vio la story');
select public.mark_story_seen(pg_temp.sid('text')); -- repetida: no cambia seen_at
select pg_temp.assert((select seen_at from public.story_views where story_id = pg_temp.sid('text')) = (select seen_at from t_seen),
  'seen_at no cambia');
select public.mark_story_seen(pg_temp.sid('photo2')); -- caducada: no la ve, no hace nada
select public.mark_story_seen(gen_random_uuid()); -- no existe: no hace nada
select pg_temp.assert((select count(*) from public.story_views) = 1, 'solo una vista');
select pg_temp.as_user('A');
select pg_temp.assert((select count(*) from public.story_views) = 1, 'Ana ve quién la vio');
select pg_temp.as_user('C');
select pg_temp.assert((select count(*) from public.story_views) = 0, 'Caro no ve vistas ajenas');
select public.mark_story_seen(pg_temp.sid('text')); -- otra pareja: no hace nada
reset role;
select pg_temp.assert((select count(*) from public.story_views) = 1, 'otra pareja no registra vistas');

-- =============================================================================
-- 7) Reacciones
-- =============================================================================
select pg_temp.as_user('A');
select pg_temp.expect_error(format('select public.react_to_story(%L, %L)', pg_temp.sid('text'), '❤️'), 'invalid_reaction');
select pg_temp.as_user('C');
select pg_temp.expect_error(format('select public.react_to_story(%L, %L)', pg_temp.sid('text'), '❤️'), 'story_not_found');
select pg_temp.as_user('B');
select pg_temp.expect_error(format('select public.react_to_story(%L, %L)', pg_temp.sid('photo2'), '❤️'), 'story_not_found');
select pg_temp.expect_error($q$select public.react_to_story(gen_random_uuid(), '❤️')$q$, 'story_not_found');
select pg_temp.expect_error(format('select public.react_to_story(%L, %L)', pg_temp.sid('text'), '❤️ ❤️'), 'invalid_reaction');
select pg_temp.expect_error(format('select public.react_to_story(%L, %L)', pg_temp.sid('text'), 'abcdefghijklmnopq'), 'invalid_reaction');
select public.react_to_story(pg_temp.sid('text'), ' ❤️ ');
select public.react_to_story(pg_temp.sid('text'), '😂'); -- una por persona: reemplaza
select pg_temp.assert((select count(*) from public.story_reactions) = 1, 'una reacción por persona');
select pg_temp.assert((select emoji from public.story_reactions) = '😂', 'la reacción se reemplazó');
select pg_temp.as_user('A');
select pg_temp.assert((select emoji from public.story_reactions where user_id = pg_temp.u('B')) = '😂', 'Ana ve la reacción de Beto');
select pg_temp.as_user('B');
select public.react_to_story(pg_temp.sid('text'), null);
select pg_temp.assert((select count(*) from public.story_reactions) = 0, 'null quita la reacción');
select public.react_to_story(pg_temp.sid('text'), '🔥');
select public.react_to_story(pg_temp.sid('text'), '');
select pg_temp.assert((select count(*) from public.story_reactions) = 0, 'vacío quita la reacción');
select pg_temp.expect_denied($q$insert into public.story_reactions (story_id, user_id, emoji) values (gen_random_uuid(), auth.uid(), 'x')$q$);
reset role;

-- =============================================================================
-- 8) Respuestas
-- =============================================================================
select pg_temp.as_user('B');
select pg_temp.expect_error(format('select public.reply_to_story(%L, %L)', pg_temp.sid('text'), '   '), 'invalid_reply');
select pg_temp.expect_error(format('select public.reply_to_story(%L, %L)', pg_temp.sid('text'), repeat('x', 501)), 'invalid_reply');
select pg_temp.expect_error(format('select public.reply_to_story(%L, %L)', pg_temp.sid('photo2'), 'hola'), 'story_not_found');
select pg_temp.expect_error($q$select public.reply_to_story(gen_random_uuid(), 'hola')$q$, 'story_not_found');
do $$
declare
  r public.story_replies;
begin
  r := public.reply_to_story(pg_temp.sid('text'), '  qué bonito  ');
  assert r.body = 'qué bonito' and r.user_id = auth.uid() and r.couple_id = public.my_couple_id(), 'respuesta de Beto';
end $$;
select pg_temp.as_user('A');
select public.reply_to_story(pg_temp.sid('text'), 'gracias'); -- la autora también puede
-- Ana no puede responder a su story caducada (archivo).
select pg_temp.expect_error(format('select public.reply_to_story(%L, %L)', pg_temp.sid('photo2'), 'hola'), 'story_not_found');
select pg_temp.assert((select count(*) from public.story_replies) = 2, 'Ana ve las dos respuestas');
select pg_temp.as_user('C');
select pg_temp.assert((select count(*) from public.story_replies) = 0, 'Caro no ve respuestas ajenas');
select pg_temp.expect_error(format('select public.reply_to_story(%L, %L)', pg_temp.sid('text'), 'hola'), 'story_not_found');
select pg_temp.as_user('B');
select pg_temp.expect_denied($q$insert into public.story_replies (couple_id, story_id, user_id, body)
  values (public.my_couple_id(), gen_random_uuid(), auth.uid(), 'x')$q$);
select pg_temp.expect_denied($q$delete from public.story_replies$q$);
reset role;

-- =============================================================================
-- 9) Archivo (profiles.story_archive)
-- =============================================================================
select pg_temp.assert((select story_archive from public.profiles where id = pg_temp.u('A')), 'archivo encendido por omisión');
select pg_temp.as_user('A');
select public.set_story_archive(false);
select pg_temp.assert(not (select story_archive from public.profiles where id = pg_temp.u('A')), 'archivo apagado');
select public.set_story_archive(true);
update public.profiles set story_archive = false where id = auth.uid(); -- grant por columna
select pg_temp.assert(not (select story_archive from public.profiles where id = pg_temp.u('A')), 'update directo de la columna');
select pg_temp.as_user('B');
update public.profiles set story_archive = true where id = pg_temp.u('A');
reset role;
select pg_temp.assert(not (select story_archive from public.profiles where id = pg_temp.u('A')), 'Beto no cambia el perfil de Ana');

-- =============================================================================
-- 10) Storage
-- =============================================================================
create temp table t_paths as select
  (select id from t_couple) || '/' || pg_temp.u('A') || '/f1.jpg' as a_media,
  (select id from t_couple) || '/' || pg_temp.u('A') || '/f1_thumb.jpg' as a_thumb,
  (select id from t_couple) || '/' || pg_temp.u('A') || '/f2.jpg' as a_media2,
  (select id from t_couple) || '/' || pg_temp.u('A') || '/suelto.jpg' as a_loose;
grant select on t_paths to authenticated, service_role;

select pg_temp.as_user('A');
do $$
declare
  p t_paths;
  v_couple uuid := public.my_couple_id();
begin
  select * into p from t_paths;
  insert into storage.objects (bucket_id, name, owner) values ('stories', p.a_media, auth.uid());
  insert into storage.objects (bucket_id, name, owner) values ('stories', p.a_thumb, auth.uid());
  insert into storage.objects (bucket_id, name, owner) values ('stories', p.a_media2, auth.uid());
  insert into storage.objects (bucket_id, name, owner) values ('stories', p.a_loose, auth.uid());
  -- carpeta de otra persona, de otra pareja, profundidad incorrecta, "..", otro bucket
  perform pg_temp.expect_denied(format('insert into storage.objects (bucket_id, name) values (%L, %L)',
    'stories', v_couple || '/' || pg_temp.u('B') || '/x.jpg'));
  perform pg_temp.expect_denied(format('insert into storage.objects (bucket_id, name) values (%L, %L)',
    'stories', (select id from t_couple2) || '/' || auth.uid() || '/x.jpg'));
  perform pg_temp.expect_denied(format('insert into storage.objects (bucket_id, name) values (%L, %L)',
    'stories', v_couple || '/' || auth.uid() || '/a/x.jpg'));
  perform pg_temp.expect_denied(format('insert into storage.objects (bucket_id, name) values (%L, %L)',
    'stories', v_couple || '/' || auth.uid() || '/../x.jpg'));
  perform pg_temp.expect_denied(format('insert into storage.objects (bucket_id, name) values (%L, %L)',
    'stories', auth.uid() || '/x.jpg'));
  assert (select count(*) from storage.objects where bucket_id = 'stories') = 4, 'Ana ve lo suyo';
  -- sin update ni delete
  update storage.objects set name = name || 'x' where bucket_id = 'stories';
  assert (select count(*) from storage.objects where bucket_id = 'stories' and name like '%x') = 0, 'nadie renombra archivos';
  delete from storage.objects where bucket_id = 'stories';
  assert (select count(*) from storage.objects where bucket_id = 'stories') = 4, 'la autora no borra archivos con SQL';
end $$;

-- Las rutas de las stories fotográficas ya creadas (f1, f2) coinciden con las subidas.
select pg_temp.as_user('B');
do $$
declare
  p t_paths;
begin
  select * into p from t_paths;
  -- f1: story activa de Ana -> Beto ve media y miniatura; f2 caducó; suelto no tiene story.
  assert (select count(*) from storage.objects where bucket_id = 'stories') = 2, 'Beto ve solo media y miniatura de la story activa';
  assert exists (select 1 from storage.objects where name = p.a_media), 'Beto ve la foto';
  assert exists (select 1 from storage.objects where name = p.a_thumb), 'Beto ve la miniatura';
  assert not exists (select 1 from storage.objects where name = p.a_media2), 'Beto no ve la foto caducada';
  assert not exists (select 1 from storage.objects where name = p.a_loose), 'Beto no ve archivos sin story';
  -- Beto sube en su carpeta, no en la de Ana
  insert into storage.objects (bucket_id, name, owner)
    values ('stories', public.my_couple_id() || '/' || auth.uid() || '/b1.jpg', auth.uid());
  perform pg_temp.expect_denied(format('insert into storage.objects (bucket_id, name) values (%L, %L)',
    'stories', p.a_media || 'x'));
end $$;
select pg_temp.as_user('C');
select pg_temp.assert((select count(*) from storage.objects where bucket_id = 'stories') = 0, 'Caro (otra pareja) no ve archivos');
reset role;

-- Borrar la story quita el acceso de la pareja (la media sigue hasta la limpieza).
update public.stories set deleted_at = now() where id = pg_temp.sid('photo');
select pg_temp.as_user('B');
select pg_temp.assert((select count(*) from storage.objects where bucket_id = 'stories' and name like '%f1%') = 0,
  'story borrada: Beto ya no ve su media');
select pg_temp.as_user('A');
select pg_temp.assert((select count(*) from storage.objects where bucket_id = 'stories' and name like '%f1%') = 2,
  'la autora aún ve su media hasta la limpieza');
reset role;
update public.stories set deleted_at = null where id = pg_temp.sid('photo');

-- =============================================================================
-- 11) Limpieza (batch + commit)
-- =============================================================================
-- Estado: text (activa), drawing (activa), photo (activa, f1), photo2 (caducada, f2) y
-- "para borrar" (borrada). Ana tiene el archivo apagado -> photo2 es limpiable.
-- Beto tiene el archivo encendido: su caducada NO se limpia.
select pg_temp.as_user('B');
select public.create_story('text', null, null, 'de Beto', 'ink', 'body');
select public.create_story('photo', public.my_couple_id() || '/' || auth.uid() || '/b2.jpg', public.my_couple_id() || '/' || auth.uid() || '/b2_thumb.jpg');
reset role;
update public.stories set expires_at = now() - interval '2 hours' where text = 'de Beto' or media_path like '%/b2.jpg';
insert into t_ids select 'beto_text', id from public.stories where text = 'de Beto';
insert into t_ids select 'beto_photo', id from public.stories where media_path like '%/b2.jpg';
-- Un huérfano viejo (>24 h, sin story) y uno reciente (no se toca).
insert into storage.objects (bucket_id, name, created_at) values
  ('stories', (select id from t_couple) || '/' || pg_temp.u('A') || '/huerfano.jpg', now() - interval '30 hours'),
  ('stories', (select id from t_couple) || '/' || pg_temp.u('A') || '/reciente.jpg', now() - interval '1 hour');
update storage.objects set created_at = now() - interval '48 hours'
  where name = (select a_loose from t_paths); -- el "suelto" de Ana también quedó huérfano

set local role service_role;
create temp table t_batch as select public.stories_cleanup_batch() as b;
reset role;
select pg_temp.assert((select jsonb_array_length(b -> 'story_ids') from t_batch) = 2,
  'batch: la borrada y la caducada sin archivo -> ' || (select b ->> 'story_ids' from t_batch));
select pg_temp.assert((select (b -> 'story_ids') ? pg_temp.sid('photo2')::text from t_batch), 'batch incluye la caducada sin archivo');
select pg_temp.assert(not (select (b -> 'story_ids') ? pg_temp.sid('beto_text')::text from t_batch), 'batch no incluye la caducada con archivo');
select pg_temp.assert(not (select (b -> 'story_ids') ? pg_temp.sid('beto_photo')::text from t_batch), 'batch no incluye la foto caducada con archivo');
select pg_temp.assert(not (select (b -> 'story_ids') ? pg_temp.sid('text')::text from t_batch), 'batch no incluye activas');
select pg_temp.assert((select b -> 'paths' ? (select a_media2 from t_paths) from t_batch), 'batch incluye la media de la caducada');
select pg_temp.assert(not (select b -> 'paths' ? (select (id || '/' || pg_temp.u('B') || '/b2.jpg') from t_couple) from t_batch),
  'batch no incluye la media archivada');
select pg_temp.assert((select b -> 'paths' ? (select a_loose from t_paths) from t_batch), 'batch incluye el huérfano viejo (suelto)');
select pg_temp.assert((select b -> 'paths' ? (select (id || '/' || pg_temp.u('A') || '/huerfano.jpg') from t_couple) from t_batch), 'batch incluye el huérfano');
select pg_temp.assert(not (select b -> 'paths' ? (select (id || '/' || pg_temp.u('A') || '/reciente.jpg') from t_couple) from t_batch),
  'batch no incluye el archivo reciente');
select pg_temp.assert((select b -> 'paths' ? (select a_media from t_paths) from t_batch) is false, 'batch no incluye la media de una story activa');
-- items liga cada story con sus archivos.
select pg_temp.assert((select count(*) from t_batch, jsonb_array_elements(b -> 'items') i
  where (i ->> 'id')::uuid = pg_temp.sid('photo2') and jsonb_array_length(i -> 'paths') = 2) = 1, 'items de la caducada (media y miniatura)');
select pg_temp.assert((select count(*) from t_batch, jsonb_array_elements(b -> 'items') i
  where jsonb_array_length(i -> 'paths') = 0) = 1, 'la borrada de texto no tiene archivos');

-- p_limit se respeta.
set local role service_role;
select pg_temp.assert((select jsonb_array_length(public.stories_cleanup_batch(1) -> 'story_ids')) = 1, 'p_limit = 1');
reset role;

-- commit: borra solo las limpiables, aunque se le pasen ids de más.
set local role service_role;
select pg_temp.assert(public.stories_cleanup_commit(array[
  pg_temp.sid('photo2'), pg_temp.sid('text'), pg_temp.sid('beto_text'),
  (select id from public.stories where text = 'para borrar'), gen_random_uuid()]) = 2,
  'commit borra solo la borrada y la caducada sin archivo');
select pg_temp.assert(public.stories_cleanup_commit(null) = 0, 'commit con null');
select pg_temp.assert(public.stories_cleanup_commit('{}') = 0, 'commit vacío');
reset role;
select pg_temp.assert((select count(*) from public.stories) = 5, 'quedan 3 de Ana (text, drawing, photo) y 2 de Beto');
select pg_temp.assert(not exists (select 1 from public.stories where id = pg_temp.sid('photo2')), 'la caducada sin archivo se fue');
select pg_temp.assert(exists (select 1 from public.stories where id = pg_temp.sid('beto_text')), 'la archivada se queda');
-- Las filas hijas se van con la story (cascade).
select pg_temp.assert(not exists (select 1 from public.story_views v where not exists (select 1 from public.stories s where s.id = v.story_id)), 'sin vistas huérfanas');

-- =============================================================================
-- 12) Eventos de notificación
-- =============================================================================
reset role;
insert into public.push_tokens (token, user_id) values
  ('token-ana-celular-1-xxxxxxxxxxxx', pg_temp.u('A')),
  ('token-beto-celular-1-xxxxxxxxxxx', pg_temp.u('B'));
update public.profiles set nickname = 'Betito' where id = pg_temp.u('B');

create temp table t_ev as select private.notification_event('story', (select id from t_couple), pg_temp.u('A'),
  (select to_jsonb(s) from public.stories s where s.id = pg_temp.sid('text'))) as e;
select pg_temp.assert((select e ->> 'kind' from t_ev) = 'story', 'kind story');
select pg_temp.assert((select (e -> 'recipient' ->> 'id')::uuid from t_ev) = pg_temp.u('B'), 'story: destinatario Beto');
select pg_temp.assert((select e -> 'actor' ->> 'name' from t_ev) = 'Ana', 'story: actora Ana');
select pg_temp.assert((select e -> 'data' ->> 'story_id' from t_ev) = pg_temp.sid('text')::text, 'story_id');
select pg_temp.assert((select e -> 'data' ->> 'story_kind' from t_ev) = 'text', 'story_kind');
select pg_temp.assert((select e -> 'data' ->> 'text' from t_ev) = 'hola mundo', 'texto de la story de texto');
select pg_temp.assert((select (e -> 'prefs' ->> 'stories')::boolean from t_ev), 'prefs.stories por omisión');

-- Foto: no lleva texto (el pie no viaja).
select pg_temp.assert((select private.notification_event('story', (select id from t_couple), pg_temp.u('A'),
  (select to_jsonb(s) from public.stories s where s.id = pg_temp.sid('photo'))) -> 'data' -> 'text') = 'null'::jsonb,
  'foto: sin texto en el evento');
select pg_temp.assert((select private.notification_event('story', (select id from t_couple), pg_temp.u('A'),
  (select to_jsonb(s) from public.stories s where s.id = pg_temp.sid('photo'))) -> 'data' ->> 'story_kind') = 'photo', 'story_kind photo');

-- Respuesta de Beto a la story de Ana -> para Ana, con el autor de la story.
create temp table t_ev2 as select private.notification_event('story_reply', (select id from t_couple), pg_temp.u('B'),
  (select to_jsonb(r) from public.story_replies r where r.user_id = pg_temp.u('B') limit 1)) as e;
select pg_temp.assert((select (e -> 'recipient' ->> 'id')::uuid from t_ev2) = pg_temp.u('A'), 'reply: destinatario Ana');
select pg_temp.assert((select e -> 'data' ->> 'body' from t_ev2) = 'qué bonito', 'reply: cuerpo');
select pg_temp.assert((select e -> 'data' ->> 'story_id' from t_ev2) = pg_temp.sid('text')::text, 'reply: story_id');
select pg_temp.assert((select (e -> 'data' ->> 'story_author_id')::uuid from t_ev2) = pg_temp.u('A'), 'reply: autora de la story');
select pg_temp.assert((select e -> 'data' ->> 'reply_id' from t_ev2) is not null, 'reply: reply_id');

-- Preferencia apagada: viaja en prefs.
insert into public.notification_prefs (user_id, stories) values (pg_temp.u('B'), false);
select pg_temp.assert(not (select (private.notification_event('story', (select id from t_couple), pg_temp.u('A'),
  (select to_jsonb(s) from public.stories s where s.id = pg_temp.sid('text'))) -> 'prefs' ->> 'stories')::boolean),
  'prefs.stories apagado');
delete from public.notification_prefs where user_id = pg_temp.u('B');

-- Triggers + pg_net con configuración.
select pg_temp.assert((select count(*) from pg_temp.queued()) = 0, 'sin configuración no hay peticiones');
select pg_temp.assert(private.run_stories_cleanup() is null, 'run_stories_cleanup sin configuración no hace nada');
insert into private.settings (key, value) values
  ('notify_url', 'http://functions:9000/notify'), ('notify_secret', 'secreto-de-prueba');

select pg_temp.as_user('A');
select public.create_story('text', null, null, 'otra de Ana', 'postit', 'stamp');
select pg_temp.as_user('B');
select public.reply_to_story(pg_temp.sid('text'), 'otra respuesta');
reset role;
select pg_temp.assert((select array_agg(e ->> 'kind') from pg_temp.queued() e) = array['story', 'story_reply'],
  'tipos encolados: ' || coalesce((select array_agg(e ->> 'kind')::text from pg_temp.queued() e), 'ninguno'));
select pg_temp.assert((select array_agg(e -> 'recipient' ->> 'name') from pg_temp.queued() e) = array['Betito', 'Ana'], 'destinatarios');

-- run_stories_cleanup deriva la URL de notify_url y manda el secreto.
select pg_temp.assert(private.run_stories_cleanup() is not null, 'run_stories_cleanup encola');
select pg_temp.assert((select count(*) from net.http_request_queue q where q.id > (select id from t_base)
  and q.url = 'http://functions:9000/stories-cleanup' and q.headers ->> 'x-notify-secret' = 'secreto-de-prueba') = 1,
  'URL derivada y secreto');
insert into private.settings (key, value) values ('stories_cleanup_url', 'http://otro:9000/limpia');
select pg_temp.assert(private.run_stories_cleanup() is not null, 'run_stories_cleanup con URL propia');
select pg_temp.assert((select count(*) from net.http_request_queue q where q.id > (select id from t_base)
  and q.url = 'http://otro:9000/limpia') = 1, 'stories_cleanup_url manda sobre notify_url');

-- El job de pg_cron existe (si la extensión está disponible).
do $$
begin
  if to_regclass('cron.job') is not null then
    assert exists (select 1 from cron.job where jobname = 'app-parejas-stories-cleanup' and schedule = '23 * * * *'),
      'job de pg_cron programado';
  else
    raise notice 'pg_cron no está instalado: se omite la prueba del job.';
  end if;
end $$;

-- =============================================================================
-- 13) Sale de la pareja: lo que publicó deja de verse
-- =============================================================================
select pg_temp.as_user('A');
select public.leave_couple();
select pg_temp.assert((select count(*) from public.stories) = 0, 'Ana sin pareja no ve stories');
select pg_temp.as_user('B');
select pg_temp.assert((select count(*) from public.stories where user_id = pg_temp.u('A')) = 0, 'Beto ya no ve las stories de Ana');
reset role;

rollback;

select 'stories: OK' as resultado;
