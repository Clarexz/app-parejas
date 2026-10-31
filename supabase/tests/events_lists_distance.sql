-- Pruebas de la Fase 8: eventos, listas y distancia (RPC, RLS, trigger y push de datos)
-- (migración 20261105000000_events_lists_distance.sql).
-- Todo ocurre en una transacción que termina en ROLLBACK. Las peticiones de pg_net que se
-- encolan aquí nunca salen: el worker solo ve filas confirmadas.
--   psql -X -v ON_ERROR_STOP=1 -f supabase/tests/events_lists_distance.sql

begin;

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

grant execute on function pg_temp.u(text), pg_temp.as_user(text), pg_temp.expect_error(text, text),
  pg_temp.expect_denied(text), pg_temp.assert(boolean, text), pg_temp.code_of(uuid),
  pg_temp.cid(text)
  to authenticated, anon, service_role;


-- Ids guardados por nombre.
create temp table t_ids (k text primary key, id uuid);
grant all on t_ids to authenticated, service_role;
create function pg_temp.id(p_key text) returns uuid language sql as $$
  select id from t_ids where k = p_key;
$$;
grant execute on function pg_temp.id(text) to authenticated, service_role;

-- Peticiones encoladas en pg_net por esta transacción (las de antes no cuentan).
create temp table t_base as select coalesce(max(id), 0) as id from net.http_request_queue;
create function pg_temp.queued() returns setof jsonb language sql as $$
  select convert_from(q.body, 'utf8')::jsonb from net.http_request_queue q
  where q.id > (select id from t_base) order by q.id;
$$;

-- =============================================================================
-- 1) Permisos y sesión
-- =============================================================================
set local role anon;
select pg_temp.expect_denied($q$select public.save_event('x', current_date)$q$);
select pg_temp.expect_denied($q$select public.delete_event(gen_random_uuid())$q$);
select pg_temp.expect_denied($q$select public.save_list('x')$q$);
select pg_temp.expect_denied($q$select public.add_list_item(gen_random_uuid(), 'x')$q$);
select pg_temp.expect_denied($q$select public.set_my_location(1, 1)$q$);
select pg_temp.expect_denied($q$select public.clear_my_location()$q$);
select pg_temp.expect_denied('select * from public.events');
select pg_temp.expect_denied('select * from public.lists');
select pg_temp.expect_denied('select * from public.list_items');
select pg_temp.expect_denied('select * from public.locations');
reset role;

-- Sin sesión (rol authenticated sin sub).
set local role authenticated;
select set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true);
select pg_temp.expect_error($q$select public.save_event('x', current_date)$q$, 'not_authenticated');
select pg_temp.expect_error($q$select public.delete_event(gen_random_uuid())$q$, 'not_authenticated');
select pg_temp.expect_error($q$select public.save_list('x')$q$, 'not_authenticated');
select pg_temp.expect_error($q$select public.delete_list(gen_random_uuid())$q$, 'not_authenticated');
select pg_temp.expect_error($q$select public.add_list_item(gen_random_uuid(), 'x')$q$, 'not_authenticated');
select pg_temp.expect_error($q$select public.reorder_list_items(gen_random_uuid(), array[]::uuid[])$q$, 'not_authenticated');
select pg_temp.expect_error($q$select public.set_my_location(1, 1)$q$, 'not_authenticated');
select pg_temp.expect_error($q$select public.clear_my_location()$q$, 'not_authenticated');
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

-- Sin pareja.
select pg_temp.as_user('E');
select pg_temp.expect_error($q$select public.save_event('x', current_date)$q$, 'no_couple');
select pg_temp.expect_error($q$select public.delete_event(gen_random_uuid())$q$, 'no_couple');
select pg_temp.expect_error($q$select public.save_list('x')$q$, 'no_couple');
select pg_temp.expect_error($q$select public.delete_list(gen_random_uuid())$q$, 'no_couple');
select pg_temp.expect_error($q$select public.add_list_item(gen_random_uuid(), 'x')$q$, 'no_couple');
select pg_temp.expect_error($q$select public.update_list_item(gen_random_uuid(), 'x')$q$, 'no_couple');
select pg_temp.expect_error($q$select public.set_list_item_done(gen_random_uuid(), true)$q$, 'no_couple');
select pg_temp.expect_error($q$select public.delete_list_item(gen_random_uuid())$q$, 'no_couple');
select pg_temp.expect_error($q$select public.clear_done_list_items(gen_random_uuid())$q$, 'no_couple');
select pg_temp.expect_error($q$select public.reorder_list_items(gen_random_uuid(), array[]::uuid[])$q$, 'no_couple');
select pg_temp.expect_error($q$select public.set_my_location(1, 1)$q$, 'no_couple');
-- clear_my_location sin fila es un no-op.
select public.clear_my_location();
reset role;

-- Sin escritura directa ni funciones privadas.
select pg_temp.as_user('A');
select pg_temp.expect_denied($q$insert into public.events (couple_id, created_by, title, date)
  values (public.my_couple_id(), auth.uid(), 'directo', current_date)$q$);
select pg_temp.expect_denied($q$update public.events set title = 'x'$q$);
select pg_temp.expect_denied($q$delete from public.events$q$);
select pg_temp.expect_denied($q$insert into public.lists (couple_id, created_by, title)
  values (public.my_couple_id(), auth.uid(), 'directa')$q$);
select pg_temp.expect_denied($q$update public.lists set title = 'x'$q$);
select pg_temp.expect_denied($q$delete from public.lists$q$);
select pg_temp.expect_denied($q$insert into public.list_items (couple_id, created_by, list_id, text)
  values (public.my_couple_id(), auth.uid(), gen_random_uuid(), 'directo')$q$);
select pg_temp.expect_denied($q$update public.list_items set text = 'x'$q$);
select pg_temp.expect_denied($q$delete from public.list_items$q$);
select pg_temp.expect_denied($q$insert into public.locations (user_id, couple_id, lat, lng)
  values (auth.uid(), public.my_couple_id(), 1, 1)$q$);
select pg_temp.expect_denied($q$update public.locations set lat = 1$q$);
select pg_temp.expect_denied($q$delete from public.locations$q$);
select pg_temp.expect_denied($q$select private.require_couple()$q$);
select pg_temp.expect_denied($q$select private.send_widget_push(gen_random_uuid(), gen_random_uuid(), 'events')$q$);
select pg_temp.expect_denied($q$select private.touch_list(gen_random_uuid(), gen_random_uuid())$q$);
reset role;

-- =============================================================================
-- 2) Eventos
-- =============================================================================
select pg_temp.as_user('A');
create temp table t_e1 as
  select * from public.save_event('  Aniversario del viaje  ', date '2027-03-10', 'custom', '   ', true, '  ');
create temp table t_e2 as
  select * from public.save_event('Ver a Beto', date '2027-02-01', 'visit', ' ✈️ ', false, ' Llega en la tarde ');
create temp table t_e3 as select * from public.save_event('Por omisión', date '2027-05-05');
grant select on t_e1, t_e2, t_e3 to authenticated, service_role;
reset role;
insert into t_ids select 'e1', id from t_e1;
insert into t_ids select 'e2', id from t_e2;
insert into t_ids select 'e3', id from t_e3;
select pg_temp.assert((select title from t_e1) = 'Aniversario del viaje', 'evento: título recortado');
select pg_temp.assert((select emoji is null and note is null from t_e1), 'evento: emoji y nota vacíos son null');
select pg_temp.assert((select kind = 'custom' and recurring_yearly and date = date '2027-03-10' from t_e1), 'evento custom anual');
select pg_temp.assert((select created_by = pg_temp.u('A') and couple_id = (select id from t_couple) from t_e1), 'evento: autora y pareja');
select pg_temp.assert((select kind = 'visit' and emoji = '✈️' and note = 'Llega en la tarde' and not recurring_yearly from t_e2), 'visita: emoji y nota recortados');
select pg_temp.assert((select kind = 'custom' and not recurring_yearly and emoji is null from t_e3), 'valores por omisión');

-- Editar con p_id (Beto edita el de Ana).
select pg_temp.as_user('B');
create temp table t_e1b as
  select * from public.save_event(' Aniv. nuevo ', date '2027-03-11', 'custom', '🎉', false, 'nota', pg_temp.id('e1'));
grant select on t_e1b to authenticated, service_role;
reset role;
select pg_temp.assert((select id from t_e1b) = pg_temp.id('e1'), 'edita el mismo id');
select pg_temp.assert((select title = 'Aniv. nuevo' and emoji = '🎉' and note = 'nota' and date = date '2027-03-11' and not recurring_yearly from t_e1b), 'edición aplicada');
select pg_temp.assert((select created_by from t_e1b) = pg_temp.u('A'), 'editar conserva created_by');
select pg_temp.assert((select count(*) from public.events where couple_id = (select id from t_couple)) = 3, 'sigue habiendo 3 eventos');
-- Editar un custom a visit y de vuelta.
select pg_temp.as_user('A');
select pg_temp.assert((select kind from public.save_event('Aniv. nuevo', date '2027-03-11', 'visit', null, false, null, pg_temp.id('e1'))) = 'visit', 'custom pasa a visit');

-- Validaciones.
select pg_temp.expect_error($q$select public.save_event('', current_date)$q$, 'invalid_event');
select pg_temp.expect_error($q$select public.save_event('   ', current_date)$q$, 'invalid_event');
select pg_temp.expect_error($q$select public.save_event(null, current_date)$q$, 'invalid_event');
select pg_temp.expect_error($q$select public.save_event(repeat('a', 61), current_date)$q$, 'invalid_event');
select public.save_event(repeat('a', 60), current_date);
select pg_temp.expect_error($q$select public.save_event('x', current_date, 'otro')$q$, 'invalid_event');
select pg_temp.expect_error($q$select public.save_event('x', current_date, null)$q$, 'invalid_event');
select pg_temp.expect_error($q$select public.save_event('x', null)$q$, 'invalid_event');
select pg_temp.expect_error($q$select public.save_event('x', date '1899-12-31')$q$, 'invalid_event');
select pg_temp.expect_error($q$select public.save_event('x', date '2201-01-01')$q$, 'invalid_event');
select public.save_event('x', date '1900-01-01');
select public.save_event('x', date '2200-12-31');
select pg_temp.expect_error($q$select public.save_event('x', current_date, 'visit', null, true)$q$, 'invalid_event');
select pg_temp.expect_error(format($q$select public.save_event('x', current_date, 'visit', null, true, null, %L)$q$, pg_temp.id('e2')), 'invalid_event');
select pg_temp.expect_error($q$select public.save_event('x', current_date, 'custom', repeat('e', 17))$q$, 'invalid_event');
select pg_temp.expect_error($q$select public.save_event('x', current_date, 'custom', null, false, repeat('n', 281))$q$, 'invalid_event');
select public.save_event('x', current_date, 'custom', repeat('e', 16), false, repeat('n', 280));
-- Editar un id inexistente.
select pg_temp.expect_error($q$select public.save_event('x', current_date, 'custom', null, false, null, gen_random_uuid())$q$, 'event_not_found');
select pg_temp.expect_error($q$select public.delete_event(gen_random_uuid())$q$, 'event_not_found');
reset role;
select pg_temp.assert((select count(*) from public.events where couple_id = (select id from t_couple)) = 7, 'solo los válidos dejaron rastro, hay ' || (select count(*) from public.events));

-- Evento de otra pareja: Caro lo crea; Ana no lo ve, edita ni borra.
select pg_temp.as_user('C');
insert into t_ids select 'caro_e', (public.save_event('De Caro', date '2027-01-01')).id;
select pg_temp.assert((select count(*) from public.events) = 1, 'Caro solo ve el suyo');
select pg_temp.expect_error(format($q$select public.save_event('hackeo', current_date, 'custom', null, false, null, %L)$q$, pg_temp.id('e2')), 'event_not_found');
select pg_temp.expect_error(format($q$select public.delete_event(%L)$q$, pg_temp.id('e2')), 'event_not_found');
reset role;
select pg_temp.as_user('A');
select pg_temp.assert((select count(*) from public.events) = 7, 'Ana ve los 7 de su pareja');
select pg_temp.assert(not exists (select 1 from public.events where id = pg_temp.id('caro_e')), 'Ana no ve el de Caro');
select pg_temp.expect_error(format($q$select public.save_event('hackeo', current_date, 'custom', null, false, null, %L)$q$, pg_temp.id('caro_e')), 'event_not_found');
select pg_temp.expect_error(format($q$select public.delete_event(%L)$q$, pg_temp.id('caro_e')), 'event_not_found');
reset role;
select pg_temp.assert((select title from public.events where id = pg_temp.id('caro_e')) = 'De Caro', 'el de Caro sigue intacto');
select pg_temp.as_user('E');
select pg_temp.assert((select count(*) from public.events) = 0, 'Eli no ve eventos');
reset role;

-- Borrar (Beto borra el de Ana).
select pg_temp.as_user('B');
select public.delete_event(pg_temp.id('e3'));
select pg_temp.expect_error(format($q$select public.delete_event(%L)$q$, pg_temp.id('e3')), 'event_not_found');
reset role;
select pg_temp.assert(not exists (select 1 from public.events where id = pg_temp.id('e3')), 'evento borrado');

-- =============================================================================
-- 3) Listas
-- =============================================================================
select pg_temp.as_user('A');
create temp table t_l1 as select * from public.save_list('  Viaje a Oaxaca  ', 'trip', '  ', null);
create temp table t_l2 as select * from public.save_list('Súper');
grant select on t_l1, t_l2 to authenticated, service_role;
reset role;
insert into t_ids select 'l1', id from t_l1;
insert into t_ids select 'l2', id from t_l2;
select pg_temp.assert((select title = 'Viaje a Oaxaca' and kind = 'trip' and emoji is null and created_by = pg_temp.u('A') from t_l1), 'lista: recortada, tipo y autora');
select pg_temp.assert((select kind = 'other' from t_l2), 'lista: tipo por omisión other');

-- Editar (Beto).
select pg_temp.as_user('B');
select pg_temp.assert((select title || '|' || kind || '|' || emoji from public.save_list(' Oaxaca 2027 ', 'bucket', '🌮', pg_temp.id('l1'))) = 'Oaxaca 2027|bucket|🌮', 'lista editada');
select pg_temp.expect_error($q$select public.save_list('')$q$, 'invalid_list');
select pg_temp.expect_error($q$select public.save_list('   ')$q$, 'invalid_list');
select pg_temp.expect_error($q$select public.save_list(null)$q$, 'invalid_list');
select pg_temp.expect_error($q$select public.save_list(repeat('a', 61))$q$, 'invalid_list');
select pg_temp.expect_error($q$select public.save_list('x', 'raro')$q$, 'invalid_list');
select pg_temp.expect_error($q$select public.save_list('x', 'other', repeat('e', 17))$q$, 'invalid_list');
select pg_temp.expect_error($q$select public.save_list('', 'other', null, gen_random_uuid())$q$, 'list_not_found');
select pg_temp.expect_error($q$select public.save_list('x', 'other', null, gen_random_uuid())$q$, 'list_not_found');
select pg_temp.expect_error(format($q$select public.save_list('', 'other', null, %L)$q$, pg_temp.id('l1')), 'invalid_list');
reset role;
select pg_temp.assert((select title from public.lists where id = pg_temp.id('l1')) = 'Oaxaca 2027', 'los errores no cambiaron la lista');

-- Ítems: posiciones 0,1,2...
select pg_temp.as_user('A');
insert into t_ids select 'i1', (public.add_list_item(pg_temp.id('l1'), '  Boletos  ')).id;
insert into t_ids select 'i2', (public.add_list_item(pg_temp.id('l1'), 'Hotel')).id;
insert into t_ids select 'i3', (public.add_list_item(pg_temp.id('l1'), 'Mezcal')).id;
reset role;
select pg_temp.assert((select array_agg(text order by position) from public.list_items where list_id = pg_temp.id('l1')) = array['Boletos', 'Hotel', 'Mezcal'], 'ítems en orden y recortados');
select pg_temp.assert((select array_agg(position order by position) from public.list_items where list_id = pg_temp.id('l1')) = array[0, 1, 2], 'posiciones 0,1,2');
select pg_temp.assert((select bool_and(not done and done_by is null and done_at is null and couple_id = (select id from t_couple) and created_by = pg_temp.u('A')) from public.list_items where list_id = pg_temp.id('l1')), 'ítems nuevos: sin marcar, de la pareja');

-- Validaciones de ítems.
select pg_temp.as_user('A');
select pg_temp.expect_error(format($q$select public.add_list_item(%L, '')$q$, pg_temp.id('l1')), 'invalid_item');
select pg_temp.expect_error(format($q$select public.add_list_item(%L, '  ')$q$, pg_temp.id('l1')), 'invalid_item');
select pg_temp.expect_error(format($q$select public.add_list_item(%L, null)$q$, pg_temp.id('l1')), 'invalid_item');
select pg_temp.expect_error(format($q$select public.add_list_item(%L, repeat('a', 201))$q$, pg_temp.id('l1')), 'invalid_item');
select public.add_list_item(pg_temp.id('l1'), repeat('a', 200));
select pg_temp.expect_error($q$select public.add_list_item(gen_random_uuid(), 'x')$q$, 'list_not_found');
select pg_temp.expect_error(format($q$select public.update_list_item(%L, '')$q$, pg_temp.id('i1')), 'invalid_item');
select pg_temp.expect_error($q$select public.update_list_item(gen_random_uuid(), 'x')$q$, 'item_not_found');
select pg_temp.expect_error($q$select public.set_list_item_done(gen_random_uuid(), true)$q$, 'item_not_found');
select pg_temp.expect_error($q$select public.delete_list_item(gen_random_uuid())$q$, 'item_not_found');
select pg_temp.expect_error($q$select public.clear_done_list_items(gen_random_uuid())$q$, 'list_not_found');
reset role;
select pg_temp.assert((select count(*) from public.list_items where list_id = pg_temp.id('l1')) = 4, 'los errores no agregaron ítems');
-- Borramos el de 200 para dejar la lista como estaba.
delete from public.list_items where list_id = pg_temp.id('l1') and char_length(text) = 200;

-- Límite de 500 ítems por lista (sembrados directo como superusuario).
insert into public.list_items (couple_id, created_by, list_id, text, position)
  select (select id from t_couple), pg_temp.u('A'), pg_temp.id('l2'), 's' || g, g from generate_series(0, 499) g;
select pg_temp.as_user('A');
select pg_temp.expect_error(format($q$select public.add_list_item(%L, 'uno más')$q$, pg_temp.id('l2')), 'invalid_item');
reset role;
delete from public.list_items where list_id = pg_temp.id('l2');

-- update_list_item
select pg_temp.as_user('B');
select pg_temp.assert((select text from public.update_list_item(pg_temp.id('i2'), '  Hotel boutique ')) = 'Hotel boutique', 'update_list_item recorta');
reset role;

-- set_list_item_done: quién y cuándo.
select pg_temp.as_user('B');
create temp table t_d1 as select * from public.set_list_item_done(pg_temp.id('i1'), true);
grant select on t_d1 to authenticated, service_role;
reset role;
select pg_temp.assert((select done and done_by = pg_temp.u('B') and done_at is not null from t_d1), 'marcado por Beto con fecha');
select pg_temp.as_user('A');
select pg_temp.assert((select not done and done_by is null and done_at is null from public.set_list_item_done(pg_temp.id('i1'), false)), 'desmarcar limpia done_by y done_at');
select pg_temp.assert((select done_by = pg_temp.u('A') and done_at is not null from public.set_list_item_done(pg_temp.id('i1'), true)), 'marcado por Ana');
select public.set_list_item_done(pg_temp.id('i3'), true);
-- null se trata como false
select pg_temp.assert((select not done and done_by is null from public.set_list_item_done(pg_temp.id('i3'), null)), 'p_done null desmarca');
select public.set_list_item_done(pg_temp.id('i3'), true);
reset role;

-- updated_at de la lista cambia al tocar ítems.
update public.lists set updated_at = now() - interval '1 day' where id = pg_temp.id('l1');
select pg_temp.as_user('A');
select public.add_list_item(pg_temp.id('l1'), 'Extra');
reset role;
select pg_temp.assert((select updated_at > now() - interval '1 hour' from public.lists where id = pg_temp.id('l1')), 'add_list_item toca lists.updated_at');
update public.lists set updated_at = now() - interval '1 day' where id = pg_temp.id('l1');
select pg_temp.as_user('A');
select public.update_list_item(pg_temp.id('i2'), 'Hotel');
reset role;
select pg_temp.assert((select updated_at > now() - interval '1 hour' from public.lists where id = pg_temp.id('l1')), 'update_list_item toca lists.updated_at');
update public.lists set updated_at = now() - interval '1 day' where id = pg_temp.id('l1');
select pg_temp.as_user('A');
select public.set_list_item_done(pg_temp.id('i2'), true);
reset role;
select pg_temp.assert((select updated_at > now() - interval '1 hour' from public.lists where id = pg_temp.id('l1')), 'set_list_item_done toca lists.updated_at');

-- delete_list_item
insert into t_ids select 'i_extra', id from public.list_items where list_id = pg_temp.id('l1') and text = 'Extra';
update public.lists set updated_at = now() - interval '1 day' where id = pg_temp.id('l1');
select pg_temp.as_user('A');
select public.delete_list_item(pg_temp.id('i_extra'));
select pg_temp.expect_error(format($q$select public.delete_list_item(%L)$q$, pg_temp.id('i_extra')), 'item_not_found');
reset role;
select pg_temp.assert((select updated_at > now() - interval '1 hour' from public.lists where id = pg_temp.id('l1')), 'delete_list_item toca lists.updated_at');
select pg_temp.assert((select count(*) from public.list_items where list_id = pg_temp.id('l1')) = 3, 'quedan 3 ítems');

-- clear_done_list_items: i1, i2 e i3 están marcados -> desmarcamos i3 y borramos 2.
select pg_temp.as_user('A');
select public.set_list_item_done(pg_temp.id('i3'), false);
select pg_temp.assert(public.clear_done_list_items(pg_temp.id('l1')) = 2, 'clear_done devuelve 2');
select pg_temp.assert(public.clear_done_list_items(pg_temp.id('l1')) = 0, 'clear_done otra vez devuelve 0');
reset role;
select pg_temp.assert((select array_agg(text) from public.list_items where list_id = pg_temp.id('l1')) = array['Mezcal'], 'solo queda Mezcal');

-- reorder_list_items
select pg_temp.as_user('A');
insert into t_ids select 'r1', (public.add_list_item(pg_temp.id('l1'), 'R1')).id;
insert into t_ids select 'r2', (public.add_list_item(pg_temp.id('l1'), 'R2')).id;
insert into t_ids select 'r3', (public.add_list_item(pg_temp.id('l1'), 'R3')).id;
insert into t_ids select 'o1', (public.add_list_item(pg_temp.id('l2'), 'Otra lista')).id;
reset role;
-- Mezcal (i3) tiene position 2 (las posiciones no se compactan al borrar) y los nuevos 3,4,5.
select pg_temp.as_user('B');
select public.reorder_list_items(pg_temp.id('l1'), array[pg_temp.id('r3'), pg_temp.id('i3'), pg_temp.id('r1'), pg_temp.id('r2')]);
reset role;
select pg_temp.assert((select array_agg(text order by position) from public.list_items where list_id = pg_temp.id('l1')) = array['R3', 'Mezcal', 'R1', 'R2'], 'nuevo orden');
select pg_temp.assert((select array_agg(position order by position) from public.list_items where list_id = pg_temp.id('l1')) = array[0, 1, 2, 3], 'posiciones 0..n-1');
select pg_temp.as_user('A');
-- Faltante, repetido, ajeno, de otra lista, null.
select pg_temp.expect_error(format($q$select public.reorder_list_items(%L, %L::uuid[])$q$, pg_temp.id('l1'),
  array[pg_temp.id('r3'), pg_temp.id('i3'), pg_temp.id('r1')]), 'invalid_order');
select pg_temp.expect_error(format($q$select public.reorder_list_items(%L, %L::uuid[])$q$, pg_temp.id('l1'),
  array[pg_temp.id('r3'), pg_temp.id('r3'), pg_temp.id('r1'), pg_temp.id('r2')]), 'invalid_order');
select pg_temp.expect_error(format($q$select public.reorder_list_items(%L, %L::uuid[])$q$, pg_temp.id('l1'),
  array[pg_temp.id('r3'), pg_temp.id('i3'), pg_temp.id('r1'), pg_temp.id('r2'), pg_temp.id('r2')]), 'invalid_order');
select pg_temp.expect_error(format($q$select public.reorder_list_items(%L, %L::uuid[])$q$, pg_temp.id('l1'),
  array[pg_temp.id('r3'), pg_temp.id('i3'), pg_temp.id('r1'), pg_temp.id('o1')]), 'invalid_order');
select pg_temp.expect_error(format($q$select public.reorder_list_items(%L, %L::uuid[])$q$, pg_temp.id('l1'),
  array[pg_temp.id('r3'), pg_temp.id('i3'), pg_temp.id('r1'), gen_random_uuid()]), 'invalid_order');
select pg_temp.expect_error(format($q$select public.reorder_list_items(%L, null)$q$, pg_temp.id('l1')), 'invalid_order');
select pg_temp.expect_error(format($q$select public.reorder_list_items(%L, array[]::uuid[])$q$, pg_temp.id('l1')), 'invalid_order');
select pg_temp.expect_error($q$select public.reorder_list_items(gen_random_uuid(), array[]::uuid[])$q$, 'list_not_found');
reset role;
select pg_temp.assert((select array_agg(text order by position) from public.list_items where list_id = pg_temp.id('l1')) = array['R3', 'Mezcal', 'R1', 'R2'], 'los errores no cambiaron el orden');

-- RLS cruzada: Caro/Dani no ven nada de Ana y Beto, ni lo tocan.
select pg_temp.as_user('C');
select pg_temp.assert((select count(*) from public.lists) = 0, 'Caro no ve listas ajenas');
select pg_temp.assert((select count(*) from public.list_items) = 0, 'Caro no ve ítems ajenos');
select pg_temp.expect_error(format($q$select public.save_list('hackeo', 'other', null, %L)$q$, pg_temp.id('l1')), 'list_not_found');
select pg_temp.expect_error(format($q$select public.delete_list(%L)$q$, pg_temp.id('l1')), 'list_not_found');
select pg_temp.expect_error(format($q$select public.add_list_item(%L, 'colado')$q$, pg_temp.id('l1')), 'list_not_found');
select pg_temp.expect_error(format($q$select public.update_list_item(%L, 'hackeo')$q$, pg_temp.id('r1')), 'item_not_found');
select pg_temp.expect_error(format($q$select public.set_list_item_done(%L, true)$q$, pg_temp.id('r1')), 'item_not_found');
select pg_temp.expect_error(format($q$select public.delete_list_item(%L)$q$, pg_temp.id('r1')), 'item_not_found');
select pg_temp.expect_error(format($q$select public.clear_done_list_items(%L)$q$, pg_temp.id('l1')), 'list_not_found');
select pg_temp.expect_error(format($q$select public.reorder_list_items(%L, array[%L]::uuid[])$q$, pg_temp.id('l1'), pg_temp.id('r1')), 'list_not_found');
reset role;
select pg_temp.assert((select count(*) from public.list_items where list_id = pg_temp.id('l1')) = 4, 'nada cambió tras los intentos de Caro');
select pg_temp.assert((select title from public.lists where id = pg_temp.id('l1')) = 'Oaxaca 2027', 'la lista de Ana sigue igual');
select pg_temp.as_user('B');
select pg_temp.assert((select count(*) from public.lists) = 2, 'Beto ve las 2 listas');
select pg_temp.assert((select count(*) from public.list_items) = 5, 'Beto ve los 5 ítems');
reset role;
select pg_temp.as_user('E');
select pg_temp.assert((select count(*) from public.lists) = 0 and (select count(*) from public.list_items) = 0, 'Eli no ve listas');
reset role;

-- delete_list en cascada.
select pg_temp.as_user('B');
select public.delete_list(pg_temp.id('l1'));
select pg_temp.expect_error(format($q$select public.delete_list(%L)$q$, pg_temp.id('l1')), 'list_not_found');
reset role;
select pg_temp.assert(not exists (select 1 from public.lists where id = pg_temp.id('l1')), 'lista borrada');
select pg_temp.assert(not exists (select 1 from public.list_items where list_id = pg_temp.id('l1')), 'ítems borrados en cascada');
select pg_temp.assert(exists (select 1 from public.list_items where list_id = pg_temp.id('l2')), 'los de otra lista siguen');

-- =============================================================================
-- 4) Ubicaciones
-- =============================================================================
select pg_temp.as_user('A');
create temp table t_loc1 as select * from public.set_my_location(19.43261, -99.13321, ' CDMX ');
grant select on t_loc1 to authenticated, service_role;
reset role;
select pg_temp.assert((select lat = 19.43 and lng = -99.13 and city = 'CDMX' and user_id = pg_temp.u('A') and couple_id = (select id from t_couple) from t_loc1), 'redondeo a 2 decimales y ciudad recortada');
select pg_temp.as_user('A');
select pg_temp.assert((select lat = 25.69 and lng = -100.32 and city is null from public.set_my_location(25.6866, -100.3161, '   ')), 'segunda llamada actualiza (ciudad vacía = null)');
reset role;
select pg_temp.assert((select count(*) from public.locations where user_id = pg_temp.u('A')) = 1, 'una sola fila por usuario');
select pg_temp.as_user('A');
select pg_temp.assert((select lat = -90 and lng = 180 and city = repeat('c', 80) from public.set_my_location(-90, 180, repeat('c', 80))), 'extremos válidos y ciudad de 80');
select public.set_my_location(19.43261, -99.13321, 'CDMX');

-- Inválidas.
select pg_temp.expect_error($q$select public.set_my_location(91, 0, 'x')$q$, 'invalid_location');
select pg_temp.expect_error($q$select public.set_my_location(-91, 0, 'x')$q$, 'invalid_location');
select pg_temp.expect_error($q$select public.set_my_location(0, 181, 'x')$q$, 'invalid_location');
select pg_temp.expect_error($q$select public.set_my_location(0, -181, 'x')$q$, 'invalid_location');
select pg_temp.expect_error($q$select public.set_my_location(0, -181.5, 'x')$q$, 'invalid_location');
select pg_temp.expect_error($q$select public.set_my_location('NaN'::double precision, 0, 'x')$q$, 'invalid_location');
select pg_temp.expect_error($q$select public.set_my_location(0, 'NaN'::double precision, 'x')$q$, 'invalid_location');
select pg_temp.expect_error($q$select public.set_my_location(null, 0, 'x')$q$, 'invalid_location');
select pg_temp.expect_error($q$select public.set_my_location(0, null, 'x')$q$, 'invalid_location');
select pg_temp.expect_error($q$select public.set_my_location(0, 0, repeat('c', 81))$q$, 'invalid_location');
reset role;
select pg_temp.assert((select lat = 19.43 and lng = -99.13 and city = 'CDMX' from public.locations where user_id = pg_temp.u('A')), 'las inválidas no cambiaron la fila');

-- Visibilidad: Beto ve la de Ana; Caro no; Ana no ve la de Beto hasta que la comparta.
select pg_temp.as_user('B');
select pg_temp.assert((select count(*) from public.locations) = 1, 'Beto ve la fila de Ana');
select pg_temp.assert((select user_id from public.locations) = pg_temp.u('A'), 'es la de Ana');
select public.set_my_location(40.4168, -3.7038, 'Madrid');
select pg_temp.assert((select count(*) from public.locations) = 2, 'Beto ve las dos');
reset role;
select pg_temp.as_user('C');
select pg_temp.assert((select count(*) from public.locations) = 0, 'Caro no ve ubicaciones ajenas');
reset role;
select pg_temp.as_user('E');
select pg_temp.assert((select count(*) from public.locations) = 0, 'Eli no ve ubicaciones');
reset role;

-- Dani comparte (otra pareja) y Ana no la ve.
select pg_temp.as_user('D'); select public.set_my_location(10, 10, 'Lejos'); reset role;
select pg_temp.as_user('A');
select pg_temp.assert((select count(*) from public.locations) = 2, 'Ana ve solo la suya y la de Beto');
select pg_temp.assert(not exists (select 1 from public.locations where user_id = pg_temp.u('D')), 'Ana no ve la de Dani');

-- clear_my_location
select public.clear_my_location();
select pg_temp.assert((select count(*) from public.locations where user_id = pg_temp.u('A')) = 0, 'clear_my_location borra la fila');
select public.clear_my_location();
reset role;
select pg_temp.assert(exists (select 1 from public.locations where user_id = pg_temp.u('B')), 'la de Beto sigue');

-- =============================================================================
-- 5) Push de datos (private.send_widget_push) con configuración
-- =============================================================================
select pg_temp.assert((select count(*) from pg_temp.queued()) = 0, 'sin configuración no hay peticiones, hay ' || (select count(*) from pg_temp.queued()));

insert into public.push_tokens (token, user_id) values
  ('token-ana-celular-1-xxxxxxxxxxxx', pg_temp.u('A')),
  ('token-beto-celular-1-xxxxxxxxxxx', pg_temp.u('B'));

-- Sin configuración la RPC no encola ni falla.
select pg_temp.as_user('A'); select public.save_event('Sin config', date '2027-06-06'); reset role;
select pg_temp.assert((select count(*) from pg_temp.queued()) = 0, 'sin notify_url no se encola');

insert into private.settings (key, value) values
  ('notify_url', 'http://functions:9000/notify'), ('notify_secret', 'secreto-de-prueba');

-- save_event encola un push de datos para Beto.
select pg_temp.as_user('A'); select public.save_event('Con config', date '2027-06-07'); reset role;
select pg_temp.assert((select count(*) from pg_temp.queued()) = 1, 'save_event encola 1, hay ' || (select count(*) from pg_temp.queued()));
select pg_temp.assert((select e ->> 'kind' from pg_temp.queued() e) = 'widget', 'kind widget');
select pg_temp.assert((select e -> 'data' ->> 'scope' from pg_temp.queued() e) = 'events', 'scope events');
select pg_temp.assert((select (e -> 'recipient' ->> 'id')::uuid from pg_temp.queued() e) = pg_temp.u('B'), 'destinatario Beto');
select pg_temp.assert((select (e -> 'actor' ->> 'id')::uuid from pg_temp.queued() e) = pg_temp.u('A'), 'actora Ana');
select pg_temp.assert((select e -> 'tokens' from pg_temp.queued() e) = '["token-beto-celular-1-xxxxxxxxxxx"]'::jsonb, 'solo los tokens de Beto');
select pg_temp.assert((select (e ->> 'couple_id')::uuid from pg_temp.queued() e) = (select id from t_couple), 'couple_id');

-- delete_event también.
select pg_temp.as_user('A'); select public.delete_event((select id from public.events where title = 'Con config')); reset role;
select pg_temp.assert((select count(*) from pg_temp.queued()) = 2, 'delete_event encola otro');
select pg_temp.assert((select e -> 'data' ->> 'scope' from pg_temp.queued() e offset 1) = 'events', 'delete_event: scope events');

-- Un evento inválido no encola.
select pg_temp.as_user('A');
select pg_temp.expect_error($q$select public.save_event('', current_date)$q$, 'invalid_event');
reset role;
select pg_temp.assert((select count(*) from pg_temp.queued()) = 2, 'un evento inválido no encola');

-- Ubicación: primera vez encola (scope distance); sin cambios no vuelve a encolar.
create temp table t_n as select count(*) as n from pg_temp.queued();
select pg_temp.as_user('A'); select public.set_my_location(19.43261, -99.13321, 'CDMX'); reset role;
select pg_temp.assert((select count(*) from pg_temp.queued()) = (select n from t_n) + 1, 'primera ubicación encola');
select pg_temp.assert((select e ->> 'kind' || ':' || (e -> 'data' ->> 'scope') from pg_temp.queued() e offset 2) = 'widget:distance', 'ubicación: widget/distance');

select pg_temp.as_user('A'); select public.set_my_location(19.43299, -99.13301, ' CDMX '); reset role;
select pg_temp.assert((select count(*) from pg_temp.queued()) = (select n from t_n) + 1, 'mismo redondeo y ciudad: no vuelve a encolar');

select pg_temp.as_user('A'); select public.set_my_location(19.44, -99.13, 'CDMX'); reset role;
select pg_temp.assert((select count(*) from pg_temp.queued()) = (select n from t_n) + 2, 'cambia lo redondeado: encola');

select pg_temp.as_user('A'); select public.set_my_location(19.44, -99.13, 'Ciudad de México'); reset role;
select pg_temp.assert((select count(*) from pg_temp.queued()) = (select n from t_n) + 3, 'cambia la ciudad: encola');

select pg_temp.as_user('A'); select public.set_my_location(19.44, -99.13, 'Ciudad de México'); reset role;
select pg_temp.assert((select count(*) from pg_temp.queued()) = (select n from t_n) + 3, 'sin cambios: no encola');

-- clear_my_location avisa; de nuevo (ya sin fila) no.
select pg_temp.as_user('A'); select public.clear_my_location(); reset role;
select pg_temp.assert((select count(*) from pg_temp.queued()) = (select n from t_n) + 4, 'clear_my_location encola');
select pg_temp.as_user('A'); select public.clear_my_location(); reset role;
select pg_temp.assert((select count(*) from pg_temp.queued()) = (select n from t_n) + 4, 'clear sin fila no encola');

-- Si el otro miembro no tiene tokens, no se encola.
delete from public.push_tokens where user_id = pg_temp.u('B');
select pg_temp.as_user('A'); select public.save_event('Sin tokens', date '2027-06-08'); reset role;
select pg_temp.assert((select count(*) from pg_temp.queued()) = (select n from t_n) + 4, 'sin tokens del otro no encola');

-- Las listas no mandan push de datos.
select pg_temp.as_user('A'); select public.save_list('Sin push'); reset role;
select pg_temp.assert((select count(*) from pg_temp.queued()) = (select n from t_n) + 4, 'las listas no encolan');

-- =============================================================================
-- 6) Salir de la pareja borra la ubicación (trigger)
-- =============================================================================
select pg_temp.as_user('B');
select pg_temp.assert(exists (select 1 from public.locations where user_id = pg_temp.u('B')), 'Beto comparte antes de salir');
select public.leave_couple();
reset role;
select pg_temp.assert(not exists (select 1 from public.locations where user_id = pg_temp.u('B')), 'al salir de la pareja se borra la ubicación');
select pg_temp.assert(exists (select 1 from public.locations where user_id = pg_temp.u('D')), 'la de otra pareja no se toca');
select pg_temp.as_user('B');
select pg_temp.assert((select count(*) from public.events) = 0 and (select count(*) from public.lists) = 0, 'Beto sin pareja no ve eventos ni listas');
select pg_temp.expect_error($q$select public.set_my_location(1, 1)$q$, 'no_couple');
reset role;
-- Ana (que sigue en la pareja) conserva sus eventos y listas.
select pg_temp.as_user('A');
select pg_temp.assert((select count(*) from public.events) > 0 and (select count(*) from public.lists) > 0, 'Ana conserva eventos y listas');
reset role;

rollback;
