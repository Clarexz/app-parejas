-- Pruebas de la Fase 11B: lenguajes del amor, visitas y estadísticas
-- (migración 20261107000000_love_languages_visits_stats.sql).
-- Todo ocurre en una transacción que termina en ROLLBACK. Las peticiones de pg_net que se
-- encolan aquí nunca salen: el worker solo ve filas confirmadas.
--   psql -X -v ON_ERROR_STOP=1 -f supabase/tests/love_languages_visits_stats.sql

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


-- Respuestas válidas del test (30) a partir de un patrón de 5 lenguajes.
create function pg_temp.ll(p_first text) returns text[] language sql immutable as $$
  select array_agg(case when i <= 10 then p_first else (array['words','time','gifts','acts','touch'])[(i % 5) + 1] end order by i)
  from generate_series(1, 30) i;
$$;
grant execute on function pg_temp.ll(text) to authenticated, service_role;

-- =============================================================================
-- 1) Permisos y sesión
-- =============================================================================
set local role anon;
select pg_temp.expect_denied($q$select public.submit_love_language_test(array['words'])$q$);
select pg_temp.expect_denied($q$select public.get_love_languages()$q$);
select pg_temp.expect_denied($q$select public.save_visit(current_date, current_date)$q$);
select pg_temp.expect_denied($q$select public.delete_visit(gen_random_uuid())$q$);
select pg_temp.expect_denied($q$select public.get_relationship_stats()$q$);
select pg_temp.expect_denied('select * from public.love_language_results');
select pg_temp.expect_denied('select * from public.visits');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true);
select pg_temp.expect_error($q$select public.submit_love_language_test(pg_temp.ll('words'))$q$, 'not_authenticated');
select pg_temp.expect_error($q$select public.save_visit(current_date, current_date)$q$, 'not_authenticated');
select pg_temp.expect_error($q$select public.get_relationship_stats()$q$, 'not_authenticated');
-- Sin escritura directa.
select pg_temp.expect_denied($q$insert into public.visits (couple_id, created_by, start_date, end_date) values (gen_random_uuid(), gen_random_uuid(), current_date, current_date)$q$);
reset role;

-- Parejas: Ana + Beto (P1), Caro + Dani (P2). Eli sin pareja.
select pg_temp.as_user('A'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('B'); select public.join_couple(pg_temp.code_of(pg_temp.u('A')));
select pg_temp.as_user('C'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('D'); select public.join_couple(pg_temp.code_of(pg_temp.u('C')));
reset role;

select pg_temp.as_user('E');
select pg_temp.expect_error($q$select public.submit_love_language_test(pg_temp.ll('words'))$q$, 'no_couple');
select pg_temp.expect_error($q$select public.get_love_languages()$q$, 'no_couple');
select pg_temp.expect_error($q$select public.save_visit(current_date, current_date)$q$, 'no_couple');
select pg_temp.expect_error($q$select public.delete_visit(gen_random_uuid())$q$, 'no_couple');
select pg_temp.expect_error($q$select public.get_relationship_stats()$q$, 'no_couple');
reset role;

insert into public.push_tokens (token, user_id) values
  ('token-ana-celular-1-xxxxxxxxxxxx', pg_temp.u('A')),
  ('token-beto-celular-1-xxxxxxxxxxx', pg_temp.u('B'));
insert into private.settings (key, value) values
  ('notify_url', 'http://functions:9000/notify'), ('notify_secret', 'secreto-de-prueba');

-- =============================================================================
-- 2) Lenguajes del amor
-- =============================================================================
select pg_temp.as_user('A');
select pg_temp.expect_error($q$select public.submit_love_language_test(array['words'])$q$, 'invalid_love_language');
select pg_temp.expect_error($q$select public.submit_love_language_test(array_fill('kisses'::text, array[30]))$q$, 'invalid_love_language');
select pg_temp.expect_error($q$select public.submit_love_language_test(array_fill(null::text, array[30]))$q$, 'invalid_love_language');
select pg_temp.expect_error($q$select public.submit_love_language_test(null)$q$, 'invalid_love_language');
select pg_temp.expect_error($q$select public.submit_love_language_test(pg_temp.ll('words'), 0)$q$, 'invalid_love_language');
select pg_temp.assert(public.get_love_languages() = '{"mine": null, "partner": null, "partner_done": false}'::jsonb, 'nadie lo ha hecho');

select pg_temp.assert((public.submit_love_language_test(pg_temp.ll('words')) -> 'scores') =
  '{"words": 14, "time": 4, "gifts": 4, "acts": 4, "touch": 4}'::jsonb, 'puntajes de Ana');
reset role;
select pg_temp.assert((select count(*) from pg_temp.queued() e where e ->> 'kind' = 'love_language') = 1, 'push love_language a Beto');
select pg_temp.assert((select e -> 'data' from pg_temp.queued() e where e ->> 'kind' = 'love_language') =
  '{"event": "done", "recipient_done": false}'::jsonb, 'push sin resultado');
select pg_temp.assert((select e #>> '{recipient,id}' from pg_temp.queued() e where e ->> 'kind' = 'love_language') = pg_temp.u('B')::text, 'push para Beto');

-- Beto todavía no lo hace: no ve el de Ana, pero sabe que ya lo hizo.
select pg_temp.as_user('B');
select pg_temp.assert((select count(*) from public.love_language_results) = 0, 'Beto no ve el resultado de Ana');
select pg_temp.assert(public.get_love_languages() = '{"mine": null, "partner": null, "partner_done": true}'::jsonb, 'Beto: partner_done');
select public.submit_love_language_test(pg_temp.ll('touch'));
select pg_temp.assert((select count(*) from public.love_language_results) = 2, 'Beto ya ve los dos');
select pg_temp.assert((public.get_love_languages() #>> '{partner,scores,words}')::int = 14, 'Beto ve los puntajes de Ana');
reset role;
select pg_temp.assert((select e -> 'data' from pg_temp.queued() e where e ->> 'kind' = 'love_language' and e #>> '{recipient,id}' = pg_temp.u('A')::text) =
  '{"event": "done", "recipient_done": true}'::jsonb, 'push a Ana: ya pueden comparar');

-- Repetir el test reemplaza y no vuelve a avisar.
select pg_temp.as_user('A');
select pg_temp.assert((public.submit_love_language_test(pg_temp.ll('gifts')) #>> '{scores,gifts}')::int = 14, 'Ana repite el test');
select pg_temp.assert((select count(*) from public.love_language_results where user_id = pg_temp.u('A')) = 1, 'una fila por persona');
reset role;
select pg_temp.assert((select count(*) from pg_temp.queued() e where e ->> 'kind' = 'love_language') = 2, 'repetir no avisa');

-- Otra pareja no ve nada.
select pg_temp.as_user('C');
select pg_temp.assert((select count(*) from public.love_language_results) = 0, 'Caro no ve resultados ajenos');
select public.submit_love_language_test(pg_temp.ll('acts'));
select pg_temp.assert((select count(*) from public.love_language_results) = 1, 'Caro solo ve el suyo');
select pg_temp.assert(public.get_love_languages() ->> 'partner_done' = 'false', 'Dani no lo ha hecho');
reset role;

-- =============================================================================
-- 3) Visitas
-- =============================================================================
select pg_temp.as_user('A');
select pg_temp.expect_error($q$select public.save_visit(current_date + 10, current_date + 12)$q$, 'invalid_visit');
select pg_temp.expect_error($q$select public.save_visit(current_date - 1, current_date - 3)$q$, 'invalid_visit');
select pg_temp.expect_error($q$select public.save_visit(current_date - 500, current_date - 1)$q$, 'invalid_visit');
select pg_temp.expect_error($q$select public.save_visit(null, current_date)$q$, 'invalid_visit');
select pg_temp.expect_error($q$select public.save_visit(current_date - 3, current_date, repeat('x', 81))$q$, 'invalid_visit');
select pg_temp.expect_error($q$select public.save_visit(current_date - 3, current_date, null, null, gen_random_uuid())$q$, 'invalid_visit');
select pg_temp.expect_error($q$select public.save_visit(current_date - 3, current_date, null, null, null, gen_random_uuid())$q$, 'visit_not_found');

insert into t_ids select 'ev_visit', (public.save_event('Nos vemos', current_date - 20, 'visit')).id;
insert into t_ids select 'ev_custom', (public.save_event('Algo', current_date - 20)).id;
select pg_temp.expect_error($q$select public.save_visit(current_date - 20, current_date - 18, null, null, pg_temp.id('ev_custom'))$q$, 'invalid_visit');
insert into t_ids select 'v1', (public.save_visit(current_date - 20, current_date - 18, '  Monterrey ', '', pg_temp.id('ev_visit'))).id;
select pg_temp.assert((select place = 'Monterrey' and note is null and event_id = pg_temp.id('ev_visit') and created_by = pg_temp.u('A')
  from public.visits where id = pg_temp.id('v1')), 'visita 1 guardada y limpia');
-- La misma cuenta regresiva no se liga dos veces.
select pg_temp.expect_error($q$select public.save_visit(current_date - 10, current_date - 9, null, null, pg_temp.id('ev_visit'))$q$, 'invalid_visit');
-- Traslapes.
select pg_temp.expect_error($q$select public.save_visit(current_date - 18, current_date - 15)$q$, 'visit_overlap');
select pg_temp.expect_error($q$select public.save_visit(current_date - 25, current_date - 20)$q$, 'visit_overlap');
-- Visita en curso (termina en el futuro).
insert into t_ids select 'v2', (public.save_visit(current_date - 2, current_date + 3, null, 'Aquí andamos')).id;
reset role;
select pg_temp.assert((select count(*) from pg_temp.queued() e where e ->> 'kind' = 'visit') = 2, 'push visit por cada alta');
select pg_temp.assert((select e #>> '{data,place}' from pg_temp.queued() e where e ->> 'kind' = 'visit' and e #>> '{data,visit_id}' = pg_temp.id('v1')::text) = 'Monterrey', 'push con lugar');

-- Beto edita (cualquiera de los dos); editar no avisa y puede crecer sin traslaparse consigo misma.
select pg_temp.as_user('B');
select pg_temp.assert((select count(*) from public.visits) = 2, 'Beto ve las dos visitas');
select public.save_visit(current_date - 21, current_date - 18, 'Monterrey', 'Tacos', pg_temp.id('ev_visit'), pg_temp.id('v1'));
select pg_temp.expect_error($q$select public.save_visit(current_date - 21, current_date - 1, null, null, null, pg_temp.id('v1'))$q$, 'visit_overlap');
reset role;
select pg_temp.assert((select count(*) from pg_temp.queued() e where e ->> 'kind' = 'visit') = 2, 'editar no avisa');
select pg_temp.assert((select start_date = current_date - 21 and note = 'Tacos' from public.visits where id = pg_temp.id('v1')), 'editada');

-- Otra pareja no ve ni toca.
select pg_temp.as_user('C');
select pg_temp.assert((select count(*) from public.visits) = 0, 'Caro no ve visitas ajenas');
select pg_temp.expect_error($q$select public.delete_visit(pg_temp.id('v1'))$q$, 'visit_not_found');
select pg_temp.expect_error($q$select public.save_visit(current_date - 5, current_date - 4, null, null, null, pg_temp.id('v1'))$q$, 'visit_not_found');
select pg_temp.expect_error($q$select public.save_visit(current_date - 5, current_date - 4, null, null, pg_temp.id('ev_visit'))$q$, 'invalid_visit');
-- Sus fechas no chocan con las de otra pareja.
select public.save_visit(current_date - 20, current_date - 18);
reset role;

-- Borrar el evento suelta la liga; borrar la visita la quita.
select pg_temp.as_user('A');
select public.delete_event(pg_temp.id('ev_visit'));
select pg_temp.assert((select event_id is null from public.visits where id = pg_temp.id('v1')), 'evento borrado: liga en null');
select public.delete_visit(pg_temp.id('v2'));
select pg_temp.expect_error($q$select public.delete_visit(pg_temp.id('v2'))$q$, 'visit_not_found');
reset role;

-- =============================================================================
-- 4) Estadísticas
-- =============================================================================
select pg_temp.as_user('A');
create temp table t_stats as select public.get_relationship_stats() as s;
reset role;
select pg_temp.assert((select (s #>> '{visits,count}')::int = 1 and (s #>> '{visits,days}')::int = 4 from t_stats), 'stats: visitas');
select pg_temp.assert((select (s #>> '{questions,answered_me}')::int = 0 and (s #>> '{games,rounds}')::int = 0
  and s #> '{games,avg_pct}' = 'null'::jsonb and s #> '{games,by_game}' = '[]'::jsonb from t_stats), 'stats: vacías');
select pg_temp.assert((select s #> '{memories,by_month}' = '[]'::jsonb and (s #>> '{streak,best}')::int = 0
  and s ? 'since' and s ? 'today' and (s ->> 'stories')::int = 0 from t_stats), 'stats: forma');

-- Con datos: Ana y Beto contestan la pregunta del día y juegan una ronda.
select pg_temp.as_user('A');
insert into t_ids select 'q', (public.get_daily_question() #>> '{question,id}')::uuid;
reset role;
do $$
declare v_type text; v_opts int;
begin
  select q.type, coalesce(jsonb_array_length(q.options), 0) into v_type, v_opts from public.questions q where q.id = pg_temp.id('q');
  perform pg_temp.as_user('A');
  if v_type = 'choice' then perform public.submit_answer(pg_temp.id('q'), null, 0);
  else perform public.submit_answer(pg_temp.id('q'), 'Hola'); end if;
  perform pg_temp.as_user('B');
  if v_type = 'choice' then perform public.submit_answer(pg_temp.id('q'), null, 0);
  else perform public.submit_answer(pg_temp.id('q'), 'Hola'); end if;
  perform set_config('role', 'postgres', true);
end $$;
reset role;

select pg_temp.as_user('A');
insert into t_ids select 'r', (public.start_game_round('agree') ->> 'id')::uuid;
reset role;
do $$
declare v_q uuid;
begin
  for v_q in select unnest(item_ids) from public.game_rounds where id = pg_temp.id('r') loop
    perform pg_temp.as_user('A'); perform public.answer_game_item(pg_temp.id('r'), v_q, 1);
    perform pg_temp.as_user('B'); perform public.answer_game_item(pg_temp.id('r'), v_q, 1);
  end loop;
  perform set_config('role', 'postgres', true);
end $$;
reset role;

select pg_temp.as_user('B');
create temp table t_stats2 as select public.get_relationship_stats() as s;
reset role;
select pg_temp.assert((select (s #>> '{questions,answered_me}')::int = 1 and (s #>> '{questions,answered_partner}')::int = 1
  and (s #>> '{questions,answered_both}')::int = 1 and (s #>> '{questions,daily_complete}')::int = 1 from t_stats2), 'stats: preguntas');
select pg_temp.assert((select (s #>> '{streak,current}')::int = 1 and (s #>> '{streak,best}')::int = 1 from t_stats2), 'stats: racha');
select pg_temp.assert((select (s #>> '{games,rounds}')::int = 1 and (s #>> '{games,avg_pct}')::int = 100
  and (s #>> '{games,best_pct}')::int = 100 and s #> '{games,by_game}' = '[{"game": "agree", "rounds": 1, "avg_pct": 100}]'::jsonb
  from t_stats2), 'stats: juegos');

-- La otra pareja no cuenta nada de esto.
select pg_temp.as_user('C');
select pg_temp.assert((public.get_relationship_stats() #>> '{questions,answered_partner}')::int = 0, 'stats aisladas');
reset role;

-- Realtime.
do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    assert (select count(*) from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public'
        and tablename in ('love_language_results', 'visits')) = 2, 'Realtime: love_language_results y visits';
  end if;
end $$;

rollback;

select 'love_languages_visits_stats: OK' as resultado;
