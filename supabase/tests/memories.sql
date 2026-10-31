-- Pruebas de la Fase 7: memorias (RPC, RLS, políticas de Storage, limpieza y eventos de push)
-- (migración 20261104000000_memories.sql).
-- Requiere el stub de Storage (supabase/tests/fixtures/storage_stub.sql) aplicado ANTES.
-- Todo ocurre en una transacción que termina en ROLLBACK. Las peticiones de pg_net que se
-- encolan aquí nunca salen: el worker solo ve filas confirmadas.
--   psql -X -v ON_ERROR_STOP=1 -f supabase/tests/memories.sql

begin;

insert into storage.buckets (id, name, public) values ('memories', 'memories', false), ('stories', 'stories', false)
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

-- Id de la pareja de una persona de la prueba.
create function pg_temp.cid(p_letter text) returns uuid language sql security definer as $$
  select cm.couple_id from public.couple_members cm where cm.user_id = pg_temp.u(p_letter);
$$;

-- Un elemento de p_photos: <pareja de p_letter>/<p_letter>/<tag>.jpg y <tag>_thumb.jpg.
create function pg_temp.ph(p_letter text, p_tag text) returns jsonb language sql security definer as $$
  select jsonb_build_object(
    'path', pg_temp.cid(p_letter)::text || '/' || pg_temp.u(p_letter)::text || '/' || p_tag || '.jpg',
    'thumb_path', pg_temp.cid(p_letter)::text || '/' || pg_temp.u(p_letter)::text || '/' || p_tag || '_thumb.jpg',
    'width', 1200, 'height', 900
  );
$$;

grant execute on function pg_temp.u(text), pg_temp.as_user(text), pg_temp.expect_error(text, text),
  pg_temp.expect_denied(text), pg_temp.assert(boolean, text), pg_temp.code_of(uuid),
  pg_temp.cid(text), pg_temp.ph(text, text)
  to authenticated, anon, service_role;

-- Hoy de la pareja de una persona (couple_today no se le da a authenticated).
create function pg_temp.today(p_letter text) returns date language sql security definer as $$
  select public.couple_today(pg_temp.cid(p_letter));
$$;
grant execute on function pg_temp.today(text) to authenticated, service_role;

-- Ids de las memorias de la prueba por nombre.
create temp table t_ids (k text primary key, id uuid);
grant all on t_ids to authenticated, service_role;
create function pg_temp.mid(p_key text) returns uuid language sql as $$
  select id from t_ids where k = p_key;
$$;
grant execute on function pg_temp.mid(text) to authenticated, service_role;

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
select pg_temp.expect_denied($q$select public.create_memory('hola', current_date)$q$);
select pg_temp.expect_denied($q$select public.update_memory(gen_random_uuid(), 'hola', current_date)$q$);
select pg_temp.expect_denied($q$select public.delete_memory(gen_random_uuid())$q$);
select pg_temp.expect_denied('select * from public.memories');
select pg_temp.expect_denied('select * from public.memory_photos');
reset role;

-- Sin sesión (rol authenticated sin sub).
set local role authenticated;
select set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true);
select pg_temp.expect_error($q$select public.create_memory('hola', current_date, null, null, null, null, '[]')$q$, 'not_authenticated');
select pg_temp.expect_error($q$select public.update_memory(gen_random_uuid(), 'hola', current_date)$q$, 'not_authenticated');
select pg_temp.expect_error($q$select public.delete_memory(gen_random_uuid())$q$, 'not_authenticated');
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

-- Los usuarios autenticados no pueden ejecutar la limpieza ni las funciones privadas.
select pg_temp.as_user('A');
select pg_temp.expect_denied($q$select public.memories_cleanup_batch()$q$);
select pg_temp.expect_denied($q$select private.memory_set_photos(gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), '[]')$q$);
select pg_temp.expect_denied($q$select private.notification_event('memory', gen_random_uuid(), gen_random_uuid(), '{}')$q$);
-- Sin escritura directa en las tablas.
select pg_temp.expect_denied($q$insert into public.memories (couple_id, created_by, title, happened_on)
  values (public.my_couple_id(), auth.uid(), 'directa', current_date)$q$);
select pg_temp.expect_denied($q$update public.memories set title = 'x'$q$);
select pg_temp.expect_denied($q$delete from public.memories$q$);
select pg_temp.expect_denied($q$delete from public.memory_photos$q$);
reset role;

-- =============================================================================
-- 2) create_memory: sin pareja
-- =============================================================================
select pg_temp.as_user('E');
select pg_temp.expect_error($q$select public.create_memory('hola', current_date, null, null, null, null,
  jsonb_build_array(pg_temp.ph('E', 'x')))$q$, 'no_couple');
select pg_temp.expect_error($q$select public.update_memory(gen_random_uuid(), 'hola', current_date)$q$, 'no_couple');
select pg_temp.expect_error($q$select public.delete_memory(gen_random_uuid())$q$, 'no_couple');
reset role;

-- =============================================================================
-- 3) create_memory: caso feliz
-- =============================================================================
select pg_temp.as_user('A');
create temp table t_m1 as
  select * from public.create_memory(
    '  Playa en Mazatlán  ', current_date - 30, '  Nos tocó un atardecer increíble.  ', 23.2494, -106.4111, '  Malecón  ',
    jsonb_build_array(pg_temp.ph('A', 'p1'), pg_temp.ph('A', 'p2'), pg_temp.ph('A', 'p3') - 'width' - 'height'));
grant select on t_m1 to authenticated, service_role;
reset role;
insert into t_ids select 'm1', id from t_m1;
select pg_temp.assert((select title from t_m1) = 'Playa en Mazatlán', 'título recortado');
select pg_temp.assert((select body from t_m1) = 'Nos tocó un atardecer increíble.', 'texto recortado');
select pg_temp.assert((select place_name from t_m1) = 'Malecón', 'lugar recortado');
select pg_temp.assert((select created_by from t_m1) = pg_temp.u('A'), 'autora');
select pg_temp.assert((select couple_id from t_m1) = (select id from t_couple), 'pareja');
select pg_temp.assert((select happened_on from t_m1) = current_date - 30 or (select happened_on from t_m1) = (now() at time zone 'America/Mexico_City')::date - 30, 'fecha');
select pg_temp.assert((select lat from t_m1) = 23.2494 and (select lng from t_m1) = -106.4111, 'lat/lng');
select pg_temp.assert((select count(*) from public.memory_photos where memory_id = pg_temp.mid('m1')) = 3, '3 fotos');
select pg_temp.assert((select array_agg(position order by position) from public.memory_photos where memory_id = pg_temp.mid('m1')) = array[0, 1, 2]::smallint[], 'posiciones 0..2');
select pg_temp.assert((select path from public.memory_photos where memory_id = pg_temp.mid('m1') and position = 1)
  = (select pg_temp.ph('A', 'p2') ->> 'path'), 'la foto 2 va en la posición 1');
select pg_temp.assert((select width from public.memory_photos where memory_id = pg_temp.mid('m1') and position = 0) = 1200, 'ancho guardado');
select pg_temp.assert((select width is null and height is null from public.memory_photos where memory_id = pg_temp.mid('m1') and position = 2), 'sin medidas = null');
select pg_temp.assert((select bool_and(couple_id = (select id from t_couple)) from public.memory_photos where memory_id = pg_temp.mid('m1')), 'fotos con la pareja');

-- Mínimos: sin texto, sin lugar, una foto; vacíos -> null; fechas límite.
select pg_temp.as_user('A');
create temp table t_m2 as
  select * from public.create_memory('Primera cita', date '1900-01-01', '   ', null, null, '  ',
    jsonb_build_array(pg_temp.ph('A', 'q1')));
grant select on t_m2 to authenticated, service_role;
reset role;
insert into t_ids select 'm2', id from t_m2;
select pg_temp.assert((select body is null and place_name is null and lat is null and lng is null from t_m2), 'vacíos son null');
select pg_temp.assert((select happened_on from t_m2) = date '1900-01-01', 'fecha mínima 1900-01-01');

-- Mañana (hoy de la pareja + 1) todavía vale; pasado mañana no.
select pg_temp.as_user('A');
select public.create_memory('Mañana', pg_temp.today('A') + 1, null, null, null, null,
  jsonb_build_array(pg_temp.ph('A', 'r1')));
select pg_temp.expect_error(format($q$select public.create_memory('Muy pronto', %L::date, null, null, null, null, %L::jsonb)$q$,
  pg_temp.today('A') + 2, jsonb_build_array(pg_temp.ph('A', 'r2'))), 'invalid_memory');
reset role;

-- =============================================================================
-- 4) create_memory: validaciones
-- =============================================================================
select pg_temp.as_user('A');
create temp table t_count as select count(*) as n from public.memories;
create temp table t_pcount as select count(*) as n from public.memory_photos;
grant select on t_count, t_pcount to authenticated;

-- Campos (invalid_memory).
select pg_temp.expect_error($q$select public.create_memory('', current_date, null, null, null, null, jsonb_build_array(pg_temp.ph('A', 'v1')))$q$, 'invalid_memory');
select pg_temp.expect_error($q$select public.create_memory('   ', current_date, null, null, null, null, jsonb_build_array(pg_temp.ph('A', 'v1')))$q$, 'invalid_memory');
select pg_temp.expect_error($q$select public.create_memory(null, current_date, null, null, null, null, jsonb_build_array(pg_temp.ph('A', 'v1')))$q$, 'invalid_memory');
select pg_temp.expect_error($q$select public.create_memory(repeat('a', 81), current_date, null, null, null, null, jsonb_build_array(pg_temp.ph('A', 'v1')))$q$, 'invalid_memory');
select public.create_memory(repeat('a', 80), current_date - 1, repeat('b', 2000), null, null, repeat('c', 80), jsonb_build_array(pg_temp.ph('A', 'v0')));
select pg_temp.expect_error($q$select public.create_memory('t', current_date, repeat('b', 2001), null, null, null, jsonb_build_array(pg_temp.ph('A', 'v1')))$q$, 'invalid_memory');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, repeat('c', 81), jsonb_build_array(pg_temp.ph('A', 'v1')))$q$, 'invalid_memory');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, 10, null, null, jsonb_build_array(pg_temp.ph('A', 'v1')))$q$, 'invalid_memory');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, 10, null, jsonb_build_array(pg_temp.ph('A', 'v1')))$q$, 'invalid_memory');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, 91, 10, null, jsonb_build_array(pg_temp.ph('A', 'v1')))$q$, 'invalid_memory');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, -91, 10, null, jsonb_build_array(pg_temp.ph('A', 'v1')))$q$, 'invalid_memory');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, 10, 181, null, jsonb_build_array(pg_temp.ph('A', 'v1')))$q$, 'invalid_memory');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, 10, -181, null, jsonb_build_array(pg_temp.ph('A', 'v1')))$q$, 'invalid_memory');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, 'NaN', 10, null, jsonb_build_array(pg_temp.ph('A', 'v1')))$q$, 'invalid_memory');
select pg_temp.expect_error($q$select public.create_memory('t', null, null, null, null, null, jsonb_build_array(pg_temp.ph('A', 'v1')))$q$, 'invalid_memory');
select pg_temp.expect_error($q$select public.create_memory('t', date '1899-12-31', null, null, null, null, jsonb_build_array(pg_temp.ph('A', 'v1')))$q$, 'invalid_memory');
select pg_temp.expect_error($q$select public.create_memory('t', current_date + 5, null, null, null, null, jsonb_build_array(pg_temp.ph('A', 'v1')))$q$, 'invalid_memory');

-- Fotos (invalid_photos).
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null)$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null, '[]')$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null, null)$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null, '{}')$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null, '"x"')$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null, '[1]')$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null, '[{}]')$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  (select jsonb_agg(pg_temp.ph('A', 'n' || g)) from generate_series(1, 11) g))$q$, 'invalid_photos');
-- 10 sí caben.
select public.create_memory('Diez', current_date, null, null, null, null,
  (select jsonb_agg(pg_temp.ph('A', 'ten' || g)) from generate_series(1, 10) g));
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(pg_temp.ph('A', 'x') - 'thumb_path'))$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(jsonb_set(pg_temp.ph('A', 'x'), '{path}', '123')))$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(jsonb_set(pg_temp.ph('A', 'x'), '{path}', to_jsonb(public.my_couple_id()::text || '/' || auth.uid()::text || '/x.png'))))$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(jsonb_set(pg_temp.ph('A', 'x'), '{thumb_path}', to_jsonb(public.my_couple_id()::text || '/' || auth.uid()::text || '/x_thumb.jpeg'))))$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(jsonb_set(pg_temp.ph('A', 'x'), '{path}', to_jsonb(public.my_couple_id()::text || '/' || auth.uid()::text || '/a/x.jpg'))))$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(jsonb_set(pg_temp.ph('A', 'x'), '{path}', to_jsonb(public.my_couple_id()::text || '/..' || '/x.jpg'))))$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(jsonb_set(pg_temp.ph('A', 'x'), '{path}', to_jsonb(public.my_couple_id()::text || '/' || auth.uid()::text || '/a..b.jpg'))))$q$, 'invalid_photos');
-- Carpeta de otra persona, de otra pareja.
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(pg_temp.ph('B', 'x')))$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(pg_temp.ph('C', 'x')))$q$, 'invalid_photos');
-- Una buena y una mala.
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(pg_temp.ph('A', 'ok'), pg_temp.ph('C', 'x')))$q$, 'invalid_photos');
-- Repetidos: la misma foto dos veces, path igual a thumb de otra, path = thumb.
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(pg_temp.ph('A', 'dup'), pg_temp.ph('A', 'dup')))$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(pg_temp.ph('A', 'dup'), jsonb_set(pg_temp.ph('A', 'dup2'), '{thumb_path}', pg_temp.ph('A', 'dup') -> 'thumb_path')))$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(jsonb_set(pg_temp.ph('A', 'dup'), '{thumb_path}', pg_temp.ph('A', 'dup') -> 'path')))$q$, 'invalid_photos');
-- Medidas inválidas.
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(jsonb_set(pg_temp.ph('A', 'w'), '{width}', '0')))$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(jsonb_set(pg_temp.ph('A', 'w'), '{height}', '-5')))$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(jsonb_set(pg_temp.ph('A', 'w'), '{width}', '12.5')))$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(jsonb_set(pg_temp.ph('A', 'w'), '{width}', '"12"')))$q$, 'invalid_photos');
-- Una ruta que ya usa otra memoria (como path, como thumb, y cruzada).
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(pg_temp.ph('A', 'p1')))$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(jsonb_set(pg_temp.ph('A', 'fresca'), '{thumb_path}', pg_temp.ph('A', 'p1') -> 'thumb_path')))$q$, 'invalid_photos');
select pg_temp.expect_error($q$select public.create_memory('t', current_date, null, null, null, null,
  jsonb_build_array(jsonb_set(pg_temp.ph('A', 'fresca'), '{path}', pg_temp.ph('A', 'p1') -> 'thumb_path')))$q$, 'invalid_photos');
reset role;

-- Nada de lo inválido dejó rastro: solo m1, m2, "Mañana", los de 80/2000 y "Diez".
select pg_temp.assert((select count(*) from public.memories) = 5, 'solo 5 memorias, hay ' || (select count(*) from public.memories));
select pg_temp.assert((select count(*) from public.memory_photos) = 3 + 1 + 1 + 1 + 10, 'solo 16 fotos, hay ' || (select count(*) from public.memory_photos));

-- =============================================================================
-- 5) RLS de lectura y escritura directa
-- =============================================================================
-- Caro (otra pareja) crea la suya.
select pg_temp.as_user('C');
create temp table t_mc as
  select * from public.create_memory('De Caro', current_date, null, null, null, null,
    jsonb_build_array(pg_temp.ph('C', 'c1')));
grant select on t_mc to authenticated, service_role;
reset role;
insert into t_ids select 'caro', id from t_mc;

select pg_temp.as_user('B');
select pg_temp.assert((select count(*) from public.memories) = 5, 'Beto ve las 5 memorias de su pareja');
select pg_temp.assert((select count(*) from public.memory_photos) = 16, 'Beto ve las 16 fotos');
select pg_temp.assert(exists (select 1 from public.memories where id = pg_temp.mid('m1')), 'Beto ve la memoria de Ana');
select pg_temp.assert(not exists (select 1 from public.memories where id = pg_temp.mid('caro')), 'Beto no ve la de Caro');
select pg_temp.assert(not exists (select 1 from public.memory_photos where couple_id = (select id from t_couple2)), 'Beto no ve fotos de Caro');
reset role;

select pg_temp.as_user('C');
select pg_temp.assert((select count(*) from public.memories) = 1, 'Caro solo ve la suya');
select pg_temp.assert((select count(*) from public.memory_photos) = 1, 'Caro solo ve su foto');
select pg_temp.assert(not exists (select 1 from public.memories where id = pg_temp.mid('m1')), 'Caro no ve la de Ana');
reset role;

select pg_temp.as_user('E');
select pg_temp.assert((select count(*) from public.memories) = 0, 'Eli sin pareja no ve nada');
reset role;

-- =============================================================================
-- 6) update_memory
-- =============================================================================
-- Fotos de m1 en el orden original: p1, p2, p3. Beto (la pareja) las reordena, quita una y agrega la suya.
update public.memories set updated_at = now() - interval '1 day' where id = pg_temp.mid('m1');

select pg_temp.as_user('B');
create temp table t_u1 as
  select * from public.update_memory(pg_temp.mid('m1'), '  Atardecer  ', current_date - 31, '', null, null, '   ',
    jsonb_build_array(pg_temp.ph('A', 'p3') - 'width' - 'height', pg_temp.ph('B', 'nueva'), pg_temp.ph('A', 'p1')));
set constraints all immediate;
set constraints all deferred;
grant select on t_u1 to authenticated, service_role;
reset role;
select pg_temp.assert((select title from t_u1) = 'Atardecer', 'update: título recortado');
select pg_temp.assert((select body is null and place_name is null and lat is null and lng is null from t_u1), 'update: reemplaza todo (vacíos y ubicación fuera)');
select pg_temp.assert((select created_by from t_u1) = pg_temp.u('A'), 'update: el autor sigue siendo Ana');
select pg_temp.assert((select updated_at > now() - interval '1 hour' from t_u1), 'update: toca updated_at');
select pg_temp.assert((select created_at < now() from t_u1) is not null, 'update: created_at intacto');
select pg_temp.assert((select array_agg(path order by position) from public.memory_photos where memory_id = pg_temp.mid('m1'))
  = array[pg_temp.ph('A', 'p3') ->> 'path', pg_temp.ph('B', 'nueva') ->> 'path', pg_temp.ph('A', 'p1') ->> 'path'], 'update: nuevo orden');
select pg_temp.assert((select array_agg(position order by position) from public.memory_photos where memory_id = pg_temp.mid('m1')) = array[0, 1, 2]::smallint[], 'update: posiciones 0..2');
select pg_temp.assert(not exists (select 1 from public.memory_photos where path = (select pg_temp.ph('A', 'p2') ->> 'path')), 'update: la foto quitada se borró');
select pg_temp.assert((select width from public.memory_photos where path = (select pg_temp.ph('A', 'p1') ->> 'path')) = 1200, 'update: la existente conserva sus medidas');
select pg_temp.assert((select count(*) from public.memory_photos where memory_id = pg_temp.mid('m1')) = 3, 'update: 3 fotos');

-- Una ruta quitada puede volver a usarse (ya no pertenece a nadie)... en la misma memoria como nueva de su carpeta.
select pg_temp.as_user('A');
select public.update_memory(pg_temp.mid('m1'), 'Atardecer', current_date - 31, 'con texto', 10, 20, 'Playa',
  jsonb_build_array(pg_temp.ph('A', 'p3'), pg_temp.ph('B', 'nueva'), pg_temp.ph('A', 'p2')));
reset role;
select pg_temp.assert((select count(*) from public.memory_photos where memory_id = pg_temp.mid('m1')) = 3, 'update 2: 3 fotos');
select pg_temp.assert((select body from public.memories where id = pg_temp.mid('m1')) = 'con texto', 'update 2: texto');
select pg_temp.assert((select lat from public.memories where id = pg_temp.mid('m1')) = 10, 'update 2: lat');

-- Errores de update_memory. Todo es atómico: la memoria no cambia.
select pg_temp.as_user('B');
create temp table t_before as select title, happened_on, body, updated_at from public.memories where id = pg_temp.mid('m1');
grant select on t_before to authenticated;
-- No existe / de otra pareja.
select pg_temp.expect_error($q$select public.update_memory(gen_random_uuid(), 'x', current_date, null, null, null, null,
  jsonb_build_array(pg_temp.ph('B', 'u1')))$q$, 'memory_not_found');
select pg_temp.expect_error(format($q$select public.update_memory(%L, 'x', current_date, null, null, null, null, %L::jsonb)$q$,
  pg_temp.mid('caro'), jsonb_build_array(pg_temp.ph('B', 'u1'))), 'memory_not_found');
-- Campos.
select pg_temp.expect_error(format($q$select public.update_memory(%L, '', current_date, null, null, null, null, %L::jsonb)$q$,
  pg_temp.mid('m1'), jsonb_build_array(pg_temp.ph('A', 'p3'))), 'invalid_memory');
select pg_temp.expect_error(format($q$select public.update_memory(%L, 'x', current_date + 9, null, null, null, null, %L::jsonb)$q$,
  pg_temp.mid('m1'), jsonb_build_array(pg_temp.ph('A', 'p3'))), 'invalid_memory');
select pg_temp.expect_error(format($q$select public.update_memory(%L, 'x', current_date, null, 5, null, null, %L::jsonb)$q$,
  pg_temp.mid('m1'), jsonb_build_array(pg_temp.ph('A', 'p3'))), 'invalid_memory');
select pg_temp.expect_error(format($q$select public.update_memory(%L, repeat('a', 81), current_date, null, null, null, null, %L::jsonb)$q$,
  pg_temp.mid('m1'), jsonb_build_array(pg_temp.ph('A', 'p3'))), 'invalid_memory');
-- Fotos: lista vacía o inválida.
select pg_temp.expect_error(format($q$select public.update_memory(%L, 'x', current_date, null, null, null, null, '[]')$q$, pg_temp.mid('m1')), 'invalid_photos');
select pg_temp.expect_error(format($q$select public.update_memory(%L, 'x', current_date, null, null, null, null)$q$, pg_temp.mid('m1')), 'invalid_photos');
-- Una foto de OTRA memoria (de la misma pareja) no se puede meter.
select pg_temp.expect_error(format($q$select public.update_memory(%L, 'x', current_date, null, null, null, null, %L::jsonb)$q$,
  pg_temp.mid('m1'), jsonb_build_array(pg_temp.ph('A', 'p3'), pg_temp.ph('A', 'q1'))), 'invalid_photos');
-- Una foto nueva en la carpeta de Ana (Beto no puede subir ahí).
select pg_temp.expect_error(format($q$select public.update_memory(%L, 'x', current_date, null, null, null, null, %L::jsonb)$q$,
  pg_temp.mid('m1'), jsonb_build_array(pg_temp.ph('A', 'p3'), pg_temp.ph('A', 'ajena'))), 'invalid_photos');
-- De otra pareja.
select pg_temp.expect_error(format($q$select public.update_memory(%L, 'x', current_date, null, null, null, null, %L::jsonb)$q$,
  pg_temp.mid('m1'), jsonb_build_array(pg_temp.ph('A', 'p3'), pg_temp.ph('C', 'c1'))), 'invalid_photos');
-- Existente con otra miniatura.
select pg_temp.expect_error(format($q$select public.update_memory(%L, 'x', current_date, null, null, null, null, %L::jsonb)$q$,
  pg_temp.mid('m1'), jsonb_build_array(jsonb_set(pg_temp.ph('A', 'p3'), '{thumb_path}', pg_temp.ph('B', 'zzz') -> 'thumb_path'))), 'invalid_photos');
-- Repetida y de más de 10.
select pg_temp.expect_error(format($q$select public.update_memory(%L, 'x', current_date, null, null, null, null, %L::jsonb)$q$,
  pg_temp.mid('m1'), jsonb_build_array(pg_temp.ph('A', 'p3'), pg_temp.ph('A', 'p3'))), 'invalid_photos');
select pg_temp.expect_error(format($q$select public.update_memory(%L, 'x', current_date, null, null, null, null, %L::jsonb)$q$,
  pg_temp.mid('m1'), (select jsonb_agg(pg_temp.ph('B', 'k' || g)) from generate_series(1, 11) g)), 'invalid_photos');
-- 10 fotos nuevas de Beto: sí.
select public.update_memory(pg_temp.mid('m2'), 'Primera cita', date '1900-01-01', null, null, null, null,
  (select jsonb_agg(pg_temp.ph('B', 'k' || g)) from generate_series(1, 10) g));
reset role;
select pg_temp.assert((select count(*) from public.memory_photos where memory_id = pg_temp.mid('m2')) = 10, 'm2 con 10 fotos');
select pg_temp.assert((select count(*) from public.memory_photos where path = (select pg_temp.ph('A', 'q1') ->> 'path')) = 0, 'm2: la foto anterior se borró');
select pg_temp.assert((select m.title = t.title and m.happened_on = t.happened_on and m.body is not distinct from t.body and m.updated_at = t.updated_at
  from public.memories m, t_before t where m.id = pg_temp.mid('m1')), 'los errores no cambiaron la memoria');
select pg_temp.assert((select count(*) from public.memory_photos where memory_id = pg_temp.mid('m1')) = 3, 'los errores no cambiaron las fotos');

-- Caro no edita la de Ana ni la borra (aunque tenga el id).
select pg_temp.as_user('C');
select pg_temp.expect_error(format($q$select public.update_memory(%L, 'hackeo', current_date, null, null, null, null, %L::jsonb)$q$,
  pg_temp.mid('m1'), jsonb_build_array(pg_temp.ph('C', 'h1'))), 'memory_not_found');
select pg_temp.expect_error(format($q$select public.delete_memory(%L)$q$, pg_temp.mid('m1')), 'memory_not_found');
reset role;
select pg_temp.assert((select title from public.memories where id = pg_temp.mid('m1')) = 'Atardecer', 'la memoria de Ana sigue igual');

-- =============================================================================
-- 7) Políticas de Storage
-- =============================================================================
create temp table t_paths as select
  (select id from t_couple) || '/' || pg_temp.u('A') || '/s1.jpg' as a_file,
  (select id from t_couple) || '/' || pg_temp.u('A') || '/s2.jpg' as a_file2,
  (select id from t_couple) || '/' || pg_temp.u('B') || '/s3.jpg' as b_file;
grant select on t_paths to authenticated, service_role;

select pg_temp.as_user('A');
do $$
declare
  p t_paths;
  v_couple uuid := public.my_couple_id();
begin
  select * into p from t_paths;
  insert into storage.objects (bucket_id, name, owner) values ('memories', p.a_file, auth.uid());
  insert into storage.objects (bucket_id, name, owner) values ('memories', p.a_file2, auth.uid());
  -- carpeta de otra persona, de otra pareja, profundidad incorrecta, "..", sin pareja
  perform pg_temp.expect_denied(format('insert into storage.objects (bucket_id, name) values (%L, %L)',
    'memories', p.b_file));
  perform pg_temp.expect_denied(format('insert into storage.objects (bucket_id, name) values (%L, %L)',
    'memories', (select id from t_couple2) || '/' || pg_temp.u('A') || '/x.jpg'));
  perform pg_temp.expect_denied(format('insert into storage.objects (bucket_id, name) values (%L, %L)',
    'memories', v_couple || '/' || auth.uid() || '/sub/x.jpg'));
  perform pg_temp.expect_denied(format('insert into storage.objects (bucket_id, name) values (%L, %L)',
    'memories', v_couple || '/' || auth.uid() || '.jpg'));
  perform pg_temp.expect_denied(format('insert into storage.objects (bucket_id, name) values (%L, %L)',
    'memories', v_couple || '/' || auth.uid() || '/..x.jpg'));
  assert (select count(*) from storage.objects where bucket_id = 'memories') = 2, 'Ana ve lo suyo';
  -- sin update ni delete para clientes
  update storage.objects set name = name || 'x' where bucket_id = 'memories';
  assert (select count(*) from storage.objects where bucket_id = 'memories' and name like '%x') = 0, 'nadie renombra archivos';
  delete from storage.objects where bucket_id = 'memories';
  assert (select count(*) from storage.objects where bucket_id = 'memories') = 2, 'Ana no borra archivos con SQL';
end;
$$;
reset role;

-- Beto lee todo lo que está bajo la carpeta de su pareja (aunque no esté en una memoria) y sube a la suya.
select pg_temp.as_user('B');
do $$
declare
  p t_paths;
begin
  select * into p from t_paths;
  assert (select count(*) from storage.objects where bucket_id = 'memories') = 2, 'Beto ve los archivos de Ana';
  insert into storage.objects (bucket_id, name, owner) values ('memories', p.b_file, auth.uid());
  assert (select count(*) from storage.objects where bucket_id = 'memories') = 3, 'Beto ve y sube';
  perform pg_temp.expect_denied(format('insert into storage.objects (bucket_id, name) values (%L, %L)',
    'memories', p.a_file || 'z'));
end;
$$;
reset role;

select pg_temp.as_user('C');
select pg_temp.assert((select count(*) from storage.objects where bucket_id = 'memories') = 0, 'Caro (otra pareja) no ve archivos');
select pg_temp.assert(not public.memory_path_readable((select a_file from t_paths)), 'Caro no puede leer la ruta de Ana');
select pg_temp.assert(not public.memory_path_writable((select a_file from t_paths)), 'Caro no puede escribir en la de Ana');
reset role;

select pg_temp.as_user('E');
select pg_temp.assert((select count(*) from storage.objects where bucket_id = 'memories') = 0, 'Eli sin pareja no ve archivos');
select pg_temp.assert(not public.memory_path_writable('a/b/c.jpg') and not public.memory_path_readable('a/b/c.jpg'), 'Eli sin pareja: nada');
select pg_temp.expect_denied(format('insert into storage.objects (bucket_id, name) values (%L, %L)',
  'memories', (select id from t_couple) || '/' || pg_temp.u('E') || '/x.jpg'));
reset role;

-- =============================================================================
-- 8) Limpieza: memories_cleanup_batch
-- =============================================================================
-- Archivos viejos de memorias vivas (path y thumb) no se tocan; el huérfano viejo sí; el reciente no.
insert into storage.objects (bucket_id, name, created_at) values
  ('memories', (select pg_temp.ph('A', 'p3') ->> 'path'), now() - interval '48 hours'),
  ('memories', (select pg_temp.ph('A', 'p3') ->> 'thumb_path'), now() - interval '48 hours'),
  ('memories', (select id from t_couple) || '/' || pg_temp.u('A') || '/huerfano.jpg', now() - interval '30 hours'),
  ('memories', (select id from t_couple) || '/' || pg_temp.u('A') || '/reciente.jpg', now() - interval '1 hour'),
  ('stories', (select id from t_couple) || '/' || pg_temp.u('A') || '/otro-bucket.jpg', now() - interval '30 hours');
update storage.objects set created_at = now() - interval '48 hours' where name = (select a_file2 from t_paths);

set local role service_role;
create temp table t_batch as select public.memories_cleanup_batch() as b;
reset role;
select pg_temp.assert((select b ? 'paths' from t_batch), 'batch: tiene paths');
select pg_temp.assert((select b -> 'paths' ? (select (id || '/' || pg_temp.u('A') || '/huerfano.jpg') from t_couple) from t_batch), 'batch incluye el huérfano viejo');
select pg_temp.assert((select b -> 'paths' ? (select a_file2 from t_paths) from t_batch), 'batch incluye el archivo suelto viejo');
select pg_temp.assert(not (select b -> 'paths' ? (select (id || '/' || pg_temp.u('A') || '/reciente.jpg') from t_couple) from t_batch), 'batch no incluye el reciente');
select pg_temp.assert(not (select b -> 'paths' ? (select pg_temp.ph('A', 'p3') ->> 'path') from t_batch), 'batch no incluye la foto de una memoria');
select pg_temp.assert(not (select b -> 'paths' ? (select pg_temp.ph('A', 'p3') ->> 'thumb_path') from t_batch), 'batch no incluye la miniatura de una memoria');
select pg_temp.assert(not (select b -> 'paths' ? (select (id || '/' || pg_temp.u('A') || '/otro-bucket.jpg') from t_couple) from t_batch), 'batch ignora otros buckets');
select pg_temp.assert((select jsonb_array_length(b -> 'paths') from t_batch) = 2, 'batch: solo 2 huérfanos, hay ' || (select jsonb_array_length(b -> 'paths') from t_batch));

-- p_limit se respeta.
set local role service_role;
select pg_temp.assert((select jsonb_array_length(public.memories_cleanup_batch(1) -> 'paths')) = 1, 'p_limit = 1');
reset role;

-- Una foto quitada al editar deja su archivo huérfano (cuando ya es viejo).
insert into storage.objects (bucket_id, name, created_at) values
  ('memories', (select pg_temp.ph('A', 'p1') ->> 'path'), now() - interval '48 hours');
-- p1 ya no está en m1 (la segunda edición la quitó).
set local role service_role;
select pg_temp.assert((select public.memories_cleanup_batch() -> 'paths' ? (select pg_temp.ph('A', 'p1') ->> 'path')), 'la foto quitada al editar es huérfana');
reset role;

-- =============================================================================
-- 9) Borrar memoria
-- =============================================================================
select pg_temp.as_user('B');
select public.delete_memory(pg_temp.mid('m1'));
select pg_temp.expect_error(format($q$select public.delete_memory(%L)$q$, pg_temp.mid('m1')), 'memory_not_found');
select pg_temp.assert(not exists (select 1 from public.memories where id = pg_temp.mid('m1')), 'borrada');
reset role;
select pg_temp.assert(not exists (select 1 from public.memory_photos where memory_id = pg_temp.mid('m1')), 'las fotos caen en cascade');
select pg_temp.assert(exists (select 1 from public.memories where id = pg_temp.mid('m2')), 'las demás siguen');

-- Los archivos de la borrada quedan huérfanos para la limpieza (cuando son viejos).
update storage.objects set created_at = now() - interval '48 hours' where name = (select pg_temp.ph('A', 'p3') ->> 'path');
set local role service_role;
select pg_temp.assert((select public.memories_cleanup_batch() -> 'paths' ? (select pg_temp.ph('A', 'p3') ->> 'path')), 'archivos de la memoria borrada son huérfanos');
reset role;

-- =============================================================================
-- 10) Eventos de notificación
-- =============================================================================
insert into public.push_tokens (token, user_id) values
  ('token-ana-celular-1-xxxxxxxxxxxx', pg_temp.u('A')),
  ('token-beto-celular-1-xxxxxxxxxxx', pg_temp.u('B'));
update public.profiles set nickname = 'Betito' where id = pg_temp.u('B');

create temp table t_ev as select private.notification_event('memory', (select id from t_couple), pg_temp.u('A'),
  (select to_jsonb(m) from public.memories m where m.title = 'Mañana')) as e;
select pg_temp.assert((select e ->> 'kind' from t_ev) = 'memory', 'kind memory');
select pg_temp.assert((select (e -> 'recipient' ->> 'id')::uuid from t_ev) = pg_temp.u('B'), 'memory: destinatario Beto');
select pg_temp.assert((select e -> 'actor' ->> 'name' from t_ev) = 'Ana', 'memory: actora Ana');
select pg_temp.assert((select e -> 'data' ->> 'memory_id' from t_ev) = (select id::text from public.memories where title = 'Mañana'), 'memory_id');
select pg_temp.assert((select e -> 'data' ->> 'title' from t_ev) = 'Mañana', 'title');
select pg_temp.assert((select e -> 'data' ->> 'happened_on' from t_ev) = (select happened_on::text from public.memories where title = 'Mañana'), 'happened_on');
select pg_temp.assert((select e -> 'data' -> 'place_name' from t_ev) = 'null'::jsonb, 'place_name null');
select pg_temp.assert((select (e -> 'prefs' ->> 'memories')::boolean from t_ev), 'prefs.memories por omisión');
select pg_temp.assert((select (e -> 'prefs' ->> 'stories')::boolean from t_ev), 'prefs.stories sigue');
select pg_temp.assert((select jsonb_array_length(e -> 'tokens') from t_ev) = 1, 'solo los tokens del destinatario');
select pg_temp.assert((select private.notification_event('memory', (select id from t_couple), pg_temp.u('A'),
  (select to_jsonb(m) from public.memories m where m.id = pg_temp.mid('m2'))) -> 'data' ->> 'title') = 'Primera cita', 'title de otra memoria');
-- Con lugar.
select pg_temp.assert((select private.notification_event('memory', (select id from t_couple), pg_temp.u('A'),
  (select to_jsonb(m) from public.memories m where m.title = repeat('a', 80))) -> 'data' ->> 'place_name') = repeat('c', 80), 'place_name');

-- Las otras clases de evento siguen funcionando (la función se redefinió completa).
select pg_temp.assert((select private.notification_event('test', (select id from t_couple), pg_temp.u('A'), '{}') -> 'recipient' ->> 'name') = 'Ana', 'test: el destinatario es el actor');
select pg_temp.assert(private.notification_event('desconocido', (select id from t_couple), pg_temp.u('A'), '{}') is null, 'tipo desconocido: null');

-- Preferencia apagada: viaja en prefs (la decide notify).
insert into public.notification_prefs (user_id, memories) values (pg_temp.u('B'), false);
select pg_temp.assert(not (select (private.notification_event('memory', (select id from t_couple), pg_temp.u('A'),
  (select to_jsonb(m) from public.memories m where m.title = 'Mañana')) -> 'prefs' ->> 'memories')::boolean),
  'prefs.memories apagado');
select pg_temp.assert((select (private.notification_event('memory', (select id from t_couple), pg_temp.u('A'),
  (select to_jsonb(m) from public.memories m where m.title = 'Mañana')) -> 'prefs' ->> 'stories')::boolean),
  'apagar memories no apaga stories');
delete from public.notification_prefs where user_id = pg_temp.u('B');

-- Sin tokens del destinatario: no hay evento.
delete from public.push_tokens where user_id = pg_temp.u('B');
select pg_temp.assert(private.notification_event('memory', (select id from t_couple), pg_temp.u('A'),
  (select to_jsonb(m) from public.memories m where m.title = 'Mañana')) is null, 'sin tokens no hay evento');
insert into public.push_tokens (token, user_id) values ('token-beto-celular-1-xxxxxxxxxxx', pg_temp.u('B'));

-- Trigger + pg_net con configuración: al crear se encola; al editar no.
select pg_temp.assert((select count(*) from pg_temp.queued()) = 0, 'sin configuración no hay peticiones');
insert into private.settings (key, value) values
  ('notify_url', 'http://functions:9000/notify'), ('notify_secret', 'secreto-de-prueba');

select pg_temp.as_user('A');
create temp table t_m3 as
  select * from public.create_memory('Cumpleaños', current_date, null, null, null, 'Casa', jsonb_build_array(pg_temp.ph('A', 'z1')));
grant select on t_m3 to authenticated;
reset role;
select pg_temp.assert((select count(*) from pg_temp.queued()) = 1, 'crear encola 1 aviso, hay ' || (select count(*) from pg_temp.queued()));
select pg_temp.assert((select e ->> 'kind' from pg_temp.queued() e) = 'memory', 'tipo encolado: memory');
select pg_temp.assert((select e -> 'recipient' ->> 'name' from pg_temp.queued() e) = 'Betito', 'destinatario del aviso');
select pg_temp.assert((select e -> 'data' ->> 'title' from pg_temp.queued() e) = 'Cumpleaños', 'título del aviso');
select pg_temp.assert((select e -> 'data' ->> 'memory_id' from pg_temp.queued() e) = (select id::text from t_m3), 'memory_id del aviso');

select pg_temp.as_user('B');
select public.update_memory((select id from t_m3), 'Cumpleaños de Ana', current_date, null, null, null, 'Casa', jsonb_build_array(pg_temp.ph('A', 'z1')));
-- Una creación inválida tampoco avisa (se deshace entera).
select pg_temp.expect_error($q$select public.create_memory('mala', current_date, null, null, null, null, '[]')$q$, 'invalid_photos');
reset role;
select pg_temp.assert((select count(*) from pg_temp.queued()) = 1, 'editar o fallar no encola avisos, hay ' || (select count(*) from pg_temp.queued()));

-- =============================================================================
-- 11) Sale de la pareja: pierde acceso a las memorias; la otra persona las conserva
-- =============================================================================
select pg_temp.as_user('A');
select public.leave_couple();
select pg_temp.assert((select count(*) from public.memories) = 0, 'Ana sin pareja no ve memorias');
select pg_temp.assert((select count(*) from public.memory_photos) = 0, 'Ana sin pareja no ve fotos');
select pg_temp.assert((select count(*) from storage.objects where bucket_id = 'memories') = 0, 'Ana sin pareja no ve archivos');
select pg_temp.as_user('B');
select pg_temp.assert((select count(*) from public.memories) = 5, 'Beto conserva las memorias de la pareja, hay ' || (select count(*) from public.memories));
select pg_temp.assert(exists (select 1 from public.memories where created_by = pg_temp.u('A')), 'incluidas las que creó Ana');
select pg_temp.assert((select title from public.update_memory((select id from t_m3), 'Sigue editable', current_date, null, null, null, null,
  (select jsonb_agg(jsonb_build_object('path', mp.path, 'thumb_path', mp.thumb_path) order by mp.position)
   from public.memory_photos mp where mp.memory_id = (select id from t_m3)))) = 'Sigue editable', 'Beto edita una memoria de Ana');
reset role;

rollback;
