-- Pruebas de la Fase 9: juegos de pareja y reto de dibujo (RPC, RLS, secreto de la palabra y push)
-- (migración 20261106000000_games.sql).
-- Todo ocurre en una transacción que termina en ROLLBACK. Las peticiones de pg_net que se
-- encolan aquí nunca salen: el worker solo ve filas confirmadas.
--   psql -X -v ON_ERROR_STOP=1 -f supabase/tests/games.sql

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local', '{"display_name":"Ana"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.local', '{"display_name":"Beto"}'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@test.local', '{"display_name":"Caro"}'),
  ('00000000-0000-0000-0000-0000000000d4', 'd@test.local', '{"display_name":"Dani"}'),
  ('00000000-0000-0000-0000-0000000000e5', 'e@test.local', '{"display_name":"Eli"}'),
  ('00000000-0000-0000-0000-0000000000f6', 'f@test.local', '{"display_name":"Fer"}');

create function pg_temp.u(p_letter text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000000' ||
    (array['a1','b2','c3','d4','e5','f6'])[ascii(upper(p_letter)) - 64])::uuid;
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

-- JSON guardado por nombre (rondas y retos de la prueba).
create temp table t_json (k text primary key, j jsonb);
grant all on t_json to authenticated, service_role;
create function pg_temp.j(p_key text) returns jsonb language sql as $$
  select j from t_json where k = p_key;
$$;
create function pg_temp.jid(p_key text) returns uuid language sql as $$
  select (j ->> 'id')::uuid from t_json where k = p_key;
$$;
create function pg_temp.keep(p_key text, p_json jsonb) returns void language sql as $$
  insert into t_json (k, j) values (p_key, p_json)
  on conflict (k) do update set j = excluded.j;
$$;

-- Ids de los ítems de una ronda en orden.
create function pg_temp.item_ids(p_round jsonb) returns uuid[] language sql as $$
  select array_agg((e ->> 'id')::uuid order by (e ->> 'position')::int)
  from jsonb_array_elements(p_round -> 'items') e;
$$;

-- Contesta, como el usuario dado, todos los ítems de la ronda: choice(i) = p_choices[i] (1-based,
-- se repite el último si faltan). Devuelve la ronda tras la última respuesta.
create function pg_temp.answer_all(p_letter text, p_round_id uuid, p_choices int[]) returns jsonb language plpgsql as $$
declare
  v_ids uuid[];
  v_r jsonb;
  i int;
begin
  perform pg_temp.as_user(p_letter);
  v_ids := pg_temp.item_ids(public.get_game_round(p_round_id));
  for i in 1 .. cardinality(v_ids) loop
    v_r := public.answer_game_item(p_round_id, v_ids[i], p_choices[least(i, cardinality(p_choices))]);
  end loop;
  return v_r;
end;
$$;

grant execute on function pg_temp.u(text), pg_temp.as_user(text), pg_temp.expect_error(text, text),
  pg_temp.expect_denied(text), pg_temp.assert(boolean, text), pg_temp.code_of(uuid),
  pg_temp.j(text), pg_temp.jid(text), pg_temp.keep(text, jsonb), pg_temp.item_ids(jsonb),
  pg_temp.answer_all(text, uuid, int[])
  to authenticated, anon, service_role;

-- Peticiones encoladas en pg_net por esta transacción (las de antes no cuentan).
create temp table t_base as select coalesce(max(id), 0) as id from net.http_request_queue;
create function pg_temp.queued() returns setof jsonb language sql as $$
  select convert_from(q.body, 'utf8')::jsonb from net.http_request_queue q
  where q.id > (select id from t_base) order by q.id;
$$;

-- Contenido propio de la prueba: se apaga el del seed para controlar qué sale.
update public.questions set is_active = false where type in ('wyr', 'nhie', 'most_likely', 'agree');
update public.drawing_words set is_active = false;
insert into public.question_categories (slug, name, emoji, intensity, position, kind)
values ('juegos', 'Juegos', '🎲', 'ligera', 99, 'games')
on conflict (slug) do nothing;

insert into public.questions (slug, category, type, text, options, intensity)
select 'tg-wyr-' || n, 'juegos', 'wyr', 'Prueba wyr ' || n || ' ¿cuál prefieres?',
       '["Izquierda","Derecha"]'::jsonb, case when n > 12 then 'picante' else 'ligera' end
from generate_series(1, 15) n;
insert into public.questions (slug, category, type, text, intensity)
select 'tg-nhie-' || n, 'juegos', 'nhie', 'Yo nunca he hecho la prueba ' || n, 'ligera'
from generate_series(1, 3) n;
insert into public.questions (slug, category, type, text, intensity)
select 'tg-ml-' || n, 'juegos', 'most_likely', '¿Quién es más probable que haga la prueba ' || n || '?', 'ligera'
from generate_series(1, 10) n;
insert into public.questions (slug, category, type, text, intensity)
select 'tg-agree-' || n, 'juegos', 'agree', 'La prueba ' || n || ' está bien hecha',
       case when n > 6 then 'picante' else 'ligera' end
from generate_series(1, 12) n;

insert into public.drawing_words (slug, word, alternates, intensity) values
  ('tg-pinata', 'Piñata', array['pinata de picos'], 'ligera'),
  ('tg-tacos', 'Tacos al pastor', '{}', 'ligera'),
  ('tg-angel', 'El Ángel', array['angel de la independencia'], 'profunda');

-- =============================================================================
-- 1) Permisos
-- =============================================================================
set local role anon;
select pg_temp.expect_denied($q$select public.start_game_round('wyr')$q$);
select pg_temp.expect_denied($q$select public.get_game_round(gen_random_uuid())$q$);
select pg_temp.expect_denied($q$select public.answer_game_item(gen_random_uuid(), gen_random_uuid(), 0)$q$);
select pg_temp.expect_denied($q$select public.delete_game_round(gen_random_uuid())$q$);
select pg_temp.expect_denied($q$select public.get_game_overview()$q$);
select pg_temp.expect_denied($q$select public.start_drawing()$q$);
select pg_temp.expect_denied($q$select public.reroll_drawing_word(gen_random_uuid())$q$);
select pg_temp.expect_denied($q$select public.submit_drawing(gen_random_uuid(), '[]')$q$);
select pg_temp.expect_denied($q$select public.guess_drawing(gen_random_uuid(), 'x')$q$);
select pg_temp.expect_denied($q$select public.give_up_drawing(gen_random_uuid())$q$);
select pg_temp.expect_denied($q$select public.delete_drawing(gen_random_uuid())$q$);
select pg_temp.expect_denied($q$select public.get_drawing(gen_random_uuid())$q$);
select pg_temp.expect_denied('select * from public.game_rounds');
select pg_temp.expect_denied('select * from public.game_answers');
select pg_temp.expect_denied('select * from public.drawing_challenges');
select pg_temp.expect_denied('select * from public.drawing_secrets');
select pg_temp.expect_denied('select * from public.drawing_words');
reset role;

-- Parejas: Ana + Beto (P1), Caro + Dani (P2). Eli sin pareja. Fer sola en su pareja.
select pg_temp.as_user('A'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('B'); select public.join_couple(pg_temp.code_of(pg_temp.u('A')));
select pg_temp.as_user('C'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('D'); select public.join_couple(pg_temp.code_of(pg_temp.u('C')));
select pg_temp.as_user('F'); select public.create_couple(null, 'America/Mexico_City');
reset role;
create temp table t_couple as select couple_id as id from public.couple_members where user_id = pg_temp.u('A');
grant select on t_couple to authenticated, service_role;

-- Las tablas son de solo lectura y los helpers privados no se ejecutan desde la app.
select pg_temp.as_user('A');
select pg_temp.expect_denied($q$insert into public.game_rounds (couple_id, game, created_by, item_ids)
  values (public.my_couple_id(), 'wyr', auth.uid(), array[gen_random_uuid()])$q$);
select pg_temp.expect_denied($q$update public.game_rounds set status = 'finished'$q$);
select pg_temp.expect_denied($q$delete from public.game_rounds$q$);
select pg_temp.expect_denied($q$insert into public.game_answers (round_id, couple_id, question_id, user_id, choice)
  values (gen_random_uuid(), public.my_couple_id(), gen_random_uuid(), auth.uid(), 0)$q$);
select pg_temp.expect_denied($q$insert into public.drawing_challenges (couple_id, drawer_id, guesser_id)
  values (public.my_couple_id(), auth.uid(), auth.uid())$q$);
select pg_temp.expect_denied($q$update public.drawing_challenges set status = 'solved'$q$);
select pg_temp.expect_denied($q$delete from public.drawing_challenges$q$);
select pg_temp.expect_denied('select * from public.drawing_secrets');
select pg_temp.expect_denied('select * from public.drawing_words');
select pg_temp.expect_denied($q$insert into public.drawing_words (slug, word, intensity) values ('x-y', 'xy', 'ligera')$q$);
select pg_temp.expect_denied($q$select private.game_round_json(r) from public.game_rounds r$q$);
select pg_temp.expect_denied($q$select private.drawing_json(c) from public.drawing_challenges c$q$);
select pg_temp.expect_denied($q$select private.pick_drawing_word(public.my_couple_id())$q$);
reset role;

-- =============================================================================
-- 2) Errores de entrada (sin sesión, sin pareja, sin compañero, juego inválido)
-- =============================================================================
select set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true);
select pg_temp.expect_error($q$select public.start_game_round('wyr')$q$, 'not_authenticated');
select pg_temp.expect_error($q$select public.get_game_overview()$q$, 'not_authenticated');
select pg_temp.expect_error($q$select public.start_drawing()$q$, 'not_authenticated');

select pg_temp.as_user('E');
select pg_temp.expect_error($q$select public.start_game_round('wyr')$q$, 'no_couple');
select pg_temp.expect_error($q$select public.get_game_round(gen_random_uuid())$q$, 'no_couple');
select pg_temp.expect_error($q$select public.get_game_overview()$q$, 'no_couple');
select pg_temp.expect_error($q$select public.start_drawing()$q$, 'no_couple');
select pg_temp.expect_error($q$select public.get_drawing(gen_random_uuid())$q$, 'no_couple');

select pg_temp.as_user('F');
select pg_temp.expect_error($q$select public.start_game_round('wyr')$q$, 'no_partner');
select pg_temp.expect_error($q$select public.start_drawing()$q$, 'no_partner');

select pg_temp.as_user('A');
select pg_temp.expect_error($q$select public.start_game_round('drawing')$q$, 'invalid_game');
select pg_temp.expect_error($q$select public.start_game_round('open')$q$, 'invalid_game');
select pg_temp.expect_error($q$select public.start_game_round(null)$q$, 'invalid_game');
select pg_temp.expect_error($q$select public.start_game_round('wyr', true)$q$, 'spicy_not_active');
reset role;

-- Tokens y configuración de push para comprobar los avisos.
insert into public.push_tokens (token, user_id) values
  ('token-ana-celular-1-xxxxxxxxxxxx', pg_temp.u('A')),
  ('token-beto-celular-1-xxxxxxxxxxx', pg_temp.u('B'));
insert into private.settings (key, value) values
  ('notify_url', 'http://functions:9000/notify'), ('notify_secret', 'secreto-de-prueba');

-- =============================================================================
-- 3) Ronda de wyr: inicio idempotente, ítems sin picantes, aislamiento
-- =============================================================================
select pg_temp.as_user('A');
select pg_temp.keep('wyr1', public.start_game_round('wyr'));
select pg_temp.assert(pg_temp.j('wyr1') ->> 'status' = 'playing', 'wyr: playing');
select pg_temp.assert((pg_temp.j('wyr1') ->> 'total')::int = 10 and jsonb_array_length(pg_temp.j('wyr1') -> 'items') = 10,
  'wyr: 10 ítems');
select pg_temp.assert(pg_temp.j('wyr1') ->> 'game' = 'wyr' and (pg_temp.j('wyr1') ->> 'spicy')::boolean = false, 'wyr: juego y spicy');
select pg_temp.assert(pg_temp.j('wyr1') -> 'partner' = 'null'::jsonb and pg_temp.j('wyr1') -> 'match' = 'null'::jsonb
  and pg_temp.j('wyr1') -> 'finished_at' = 'null'::jsonb, 'wyr: sin partner ni match');
select pg_temp.assert(pg_temp.j('wyr1') -> 'mine' = '{}'::jsonb and (pg_temp.j('wyr1') ->> 'my_count')::int = 0
  and (pg_temp.j('wyr1') ->> 'partner_count')::int = 0, 'wyr: nadie ha contestado');
select pg_temp.assert(pg_temp.j('wyr1') -> 'items' -> 0 -> 'options' = '["Izquierda","Derecha"]'::jsonb, 'wyr: options del ítem');
select pg_temp.assert(not exists (
  select 1 from public.questions q where q.id = any (pg_temp.item_ids(pg_temp.j('wyr1'))) and q.intensity = 'picante'),
  'ronda normal sin ítems picantes');
-- Idempotente: otra llamada (de A o de B) devuelve la misma ronda.
select pg_temp.assert(public.start_game_round('wyr') ->> 'id' = pg_temp.j('wyr1') ->> 'id', 'start idempotente (A)');
select pg_temp.as_user('B');
select pg_temp.assert(public.start_game_round('wyr') ->> 'id' = pg_temp.j('wyr1') ->> 'id', 'start idempotente (B)');
select pg_temp.assert(public.get_game_round(pg_temp.jid('wyr1')) ->> 'id' = pg_temp.j('wyr1') ->> 'id', 'get_game_round de la pareja');
reset role;
select pg_temp.assert((select count(*) from public.game_rounds where couple_id = (select id from t_couple) and game = 'wyr') = 1,
  'una sola ronda wyr abierta');
-- Push de inicio: Ana -> Beto, kind game.
select pg_temp.assert((select count(*) from pg_temp.queued() e where e ->> 'kind' = 'game'
  and e -> 'data' ->> 'event' = 'started' and e -> 'data' ->> 'round_id' = pg_temp.j('wyr1') ->> 'id'
  and (e -> 'recipient' ->> 'id')::uuid = pg_temp.u('B') and (e -> 'actor' ->> 'id')::uuid = pg_temp.u('A')
  and e -> 'data' ->> 'game' = 'wyr' and (e -> 'prefs' ->> 'games')::boolean) = 1,
  'push game started una sola vez (el start repetido no avisa)');

-- El tercero (otra pareja) y quien no tiene pareja no ven nada.
select pg_temp.as_user('C');
select pg_temp.expect_error(format($q$select public.get_game_round(%L)$q$, pg_temp.jid('wyr1')), 'round_not_found');
select pg_temp.expect_error(format($q$select public.answer_game_item(%L, %L, 0)$q$, pg_temp.jid('wyr1'),
  (pg_temp.item_ids(pg_temp.j('wyr1')))[1]), 'round_not_found');
select pg_temp.expect_error(format($q$select public.delete_game_round(%L)$q$, pg_temp.jid('wyr1')), 'round_not_found');
select pg_temp.assert((select count(*) from public.game_rounds) = 0, 'C no ve rondas ajenas');
select pg_temp.assert((select count(*) from public.game_answers) = 0, 'C no ve respuestas ajenas');
-- Y su propia ronda es otra (no la de Ana y Beto).
select pg_temp.assert(public.start_game_round('wyr') ->> 'id' <> pg_temp.j('wyr1') ->> 'id', 'C inicia su propia ronda');
select pg_temp.assert((select count(*) from public.game_rounds) = 1, 'C solo ve su ronda');
select pg_temp.as_user('A');
select pg_temp.assert((select count(*) from public.game_rounds) = 1, 'A solo ve la suya');
reset role;

-- =============================================================================
-- 4) Responder: validaciones, no editar, partner oculto hasta terminar
-- =============================================================================
select pg_temp.as_user('A');
select pg_temp.expect_error(format($q$select public.answer_game_item(%L, %L, 2)$q$, pg_temp.jid('wyr1'),
  (pg_temp.item_ids(pg_temp.j('wyr1')))[1]), 'invalid_choice');
select pg_temp.expect_error(format($q$select public.answer_game_item(%L, %L, -1)$q$, pg_temp.jid('wyr1'),
  (pg_temp.item_ids(pg_temp.j('wyr1')))[1]), 'invalid_choice');
select pg_temp.expect_error(format($q$select public.answer_game_item(%L, %L, null)$q$, pg_temp.jid('wyr1'),
  (pg_temp.item_ids(pg_temp.j('wyr1')))[1]), 'invalid_choice');
select pg_temp.expect_error(format($q$select public.answer_game_item(%L, %L, 0)$q$, pg_temp.jid('wyr1'),
  (select q.id from public.questions q where q.slug = 'tg-nhie-1')), 'item_not_in_round');
select pg_temp.expect_error(format($q$select public.answer_game_item(%L, gen_random_uuid(), 0)$q$, pg_temp.jid('wyr1')),
  'item_not_in_round');
select pg_temp.expect_error($q$select public.answer_game_item(gen_random_uuid(), gen_random_uuid(), 0)$q$, 'round_not_found');

-- Ana contesta los 10 con la opción 0.
select pg_temp.keep('wyr1', pg_temp.answer_all('A', pg_temp.jid('wyr1'), array[0]));
select pg_temp.assert((pg_temp.j('wyr1') ->> 'my_count')::int = 10 and pg_temp.j('wyr1') ->> 'status' = 'playing',
  'Ana contestó todo, la ronda sigue');
select pg_temp.assert(pg_temp.j('wyr1') -> 'partner' = 'null'::jsonb and pg_temp.j('wyr1') -> 'match' = 'null'::jsonb,
  'partner null antes de terminar');
-- No se edita: contestar otra vez con otra opción no cambia nada.
select pg_temp.assert(public.answer_game_item(pg_temp.jid('wyr1'), (pg_temp.item_ids(pg_temp.j('wyr1')))[1], 1)
  -> 'mine' ->> ((pg_temp.item_ids(pg_temp.j('wyr1')))[1])::text = '0', 'respuesta repetida no edita');
select pg_temp.assert((select count(*) from public.game_answers where user_id = pg_temp.u('A')) = 10, 'sigue habiendo 10 respuestas de Ana');

-- Beto contesta 4: ve su avance, no las de Ana; Ana ve que Beto lleva 4 pero no cuáles.
select pg_temp.as_user('B');
do $$
declare
  v_ids uuid[] := pg_temp.item_ids(public.get_game_round(pg_temp.jid('wyr1')));
  i int;
begin
  for i in 1 .. 4 loop
    perform public.answer_game_item(pg_temp.jid('wyr1'), v_ids[i], 0);
  end loop;
end $$;
select pg_temp.keep('wyr1_b', public.get_game_round(pg_temp.jid('wyr1')));
select pg_temp.assert((pg_temp.j('wyr1_b') ->> 'my_count')::int = 4 and (pg_temp.j('wyr1_b') ->> 'partner_count')::int = 10,
  'Beto ve su avance y el de Ana');
select pg_temp.assert(pg_temp.j('wyr1_b') -> 'partner' = 'null'::jsonb and pg_temp.j('wyr1_b') -> 'match' = 'null'::jsonb,
  'Beto no ve las respuestas de Ana antes de terminar');
-- RLS: antes de terminar cada quien solo ve las suyas, aunque ya haya contestado el mismo ítem.
select pg_temp.assert((select count(*) from public.game_answers where round_id = pg_temp.jid('wyr1')) = 4
  and not exists (select 1 from public.game_answers where round_id = pg_temp.jid('wyr1') and user_id <> auth.uid()),
  'RLS: Beto solo ve sus 4 respuestas');
select pg_temp.as_user('A');
select pg_temp.assert((select count(*) from public.game_answers where round_id = pg_temp.jid('wyr1')) = 10
  and not exists (select 1 from public.game_answers where round_id = pg_temp.jid('wyr1') and user_id <> auth.uid()),
  'RLS: Ana solo ve sus 10 respuestas');
select pg_temp.assert((public.get_game_round(pg_temp.jid('wyr1')) ->> 'partner_count')::int = 4
  and public.get_game_round(pg_temp.jid('wyr1')) -> 'partner' = 'null'::jsonb, 'Ana ve cuántas lleva Beto, no cuáles');
reset role;
select pg_temp.assert((select count(*) from pg_temp.queued() e where e ->> 'kind' = 'game' and e -> 'data' ->> 'event' = 'finished') = 0,
  'sin push finished mientras falten respuestas');

-- Beto termina: 7 iguales (opción 0) y 3 distintas (opción 1) -> 70 %.
select pg_temp.as_user('B');
do $$
declare
  v_ids uuid[] := pg_temp.item_ids(public.get_game_round(pg_temp.jid('wyr1')));
  i int;
  v_r jsonb;
begin
  for i in 5 .. 10 loop
    v_r := public.answer_game_item(pg_temp.jid('wyr1'), v_ids[i], case when i >= 8 then 1 else 0 end);
  end loop;
  perform pg_temp.keep('wyr1_b', v_r);
end $$;
select pg_temp.assert(pg_temp.j('wyr1_b') ->> 'status' = 'finished' and pg_temp.j('wyr1_b') ->> 'finished_at' is not null,
  'la ronda termina al contestar los dos');
select pg_temp.assert(pg_temp.j('wyr1_b') -> 'match' = '{"matches":7,"total":10,"pct":70}'::jsonb, 'match 70 %');
select pg_temp.assert((select count(*) from jsonb_object_keys(pg_temp.j('wyr1_b') -> 'partner')) = 10, 'Beto ve las 10 de Ana');
select pg_temp.as_user('A');
select pg_temp.keep('wyr1', public.get_game_round(pg_temp.jid('wyr1')));
select pg_temp.assert(pg_temp.j('wyr1') -> 'match' = '{"matches":7,"total":10,"pct":70}'::jsonb
  and (select count(*) from jsonb_object_keys(pg_temp.j('wyr1') -> 'partner')) = 10, 'Ana también ve el resultado');
-- RLS: ya terminada, cada quien ve las 20 respuestas.
select pg_temp.assert((select count(*) from public.game_answers where round_id = pg_temp.jid('wyr1')) = 20,
  'RLS: terminada, Ana ve las 20 respuestas');
-- Terminada: ya contestado = no-op; el tercero sigue sin ver nada.
select pg_temp.assert(public.answer_game_item(pg_temp.jid('wyr1'), (pg_temp.item_ids(pg_temp.j('wyr1')))[1], 1) ->> 'status' = 'finished',
  'responder de nuevo una ronda terminada no hace nada');
select pg_temp.as_user('C');
select pg_temp.expect_error(format($q$select public.get_game_round(%L)$q$, pg_temp.jid('wyr1')), 'round_not_found');
select pg_temp.assert((select count(*) from public.game_answers where round_id = pg_temp.jid('wyr1')) = 0, 'C no ve respuestas de la ronda terminada');
reset role;
select pg_temp.assert((select count(*) from pg_temp.queued() e where e ->> 'kind' = 'game' and e -> 'data' ->> 'event' = 'finished'
  and (e -> 'data' ->> 'match_pct')::int = 70 and (e -> 'recipient' ->> 'id')::uuid = pg_temp.u('A')
  and (e -> 'actor' ->> 'id')::uuid = pg_temp.u('B') and e -> 'data' ->> 'round_id' = pg_temp.j('wyr1') ->> 'id') = 1,
  'push game finished con match_pct 70 para Ana');

-- Segunda ronda de wyr: los ítems menos usados (los 2 que no salieron) van incluidos.
select pg_temp.as_user('B');
select pg_temp.keep('wyr2', public.start_game_round('wyr'));
select pg_temp.assert(pg_temp.jid('wyr2') <> pg_temp.jid('wyr1'), 'wyr: ronda nueva tras terminar la anterior');
reset role;
select pg_temp.assert((select count(*) from public.questions q
  where q.slug like 'tg-wyr-%' and q.intensity <> 'picante' and q.id = any (pg_temp.item_ids(pg_temp.j('wyr2')))
    and q.id <> all (pg_temp.item_ids(pg_temp.j('wyr1')))) = 2, 'wyr2 incluye los 2 ítems nunca usados');
select pg_temp.assert(not exists (select 1 from public.questions q where q.id = any (pg_temp.item_ids(pg_temp.j('wyr2')))
  and q.intensity = 'picante'), 'wyr2 sin picantes');

-- =============================================================================
-- 5) nhie con pocos ítems y redondeo; most_likely con la regla inversa
-- =============================================================================
select pg_temp.as_user('A');
select pg_temp.keep('nhie', public.start_game_round('nhie'));
select pg_temp.assert((pg_temp.j('nhie') ->> 'total')::int = 3, 'nhie: solo hay 3 ítems');
select pg_temp.assert(pg_temp.j('nhie') -> 'items' -> 0 -> 'options' = 'null'::jsonb, 'nhie: sin options');
select pg_temp.answer_all('A', pg_temp.jid('nhie'), array[0, 1, 1]);
select pg_temp.answer_all('B', pg_temp.jid('nhie'), array[0, 1, 0]);
select pg_temp.as_user('A');
select pg_temp.assert(public.get_game_round(pg_temp.jid('nhie')) -> 'match' = '{"matches":2,"total":3,"pct":67}'::jsonb,
  'nhie: 2 de 3 = 67 %');

select pg_temp.keep('ml', public.start_game_round('most_likely'));
select pg_temp.assert((pg_temp.j('ml') ->> 'total')::int = 10, 'most_likely: 10 ítems');
-- Ana: todos "Yo" (0). Beto: "Mi pareja" (1) en los primeros 4 y "Yo" (0) en los otros 6.
select pg_temp.answer_all('A', pg_temp.jid('ml'), array[0]);
select pg_temp.answer_all('B', pg_temp.jid('ml'), array[1, 1, 1, 1, 0]);
select pg_temp.as_user('A');
select pg_temp.assert(public.get_game_round(pg_temp.jid('ml')) -> 'match' = '{"matches":4,"total":10,"pct":40}'::jsonb,
  'most_likely: coincide cuando las respuestas son distintas (4 de 10)');
-- Los dos eligen lo mismo (ambos "Yo") no es coincidencia.
select pg_temp.keep('ml_done', public.get_game_round(pg_temp.jid('ml')));
select pg_temp.assert((select count(*) from jsonb_each(pg_temp.j('ml_done') -> 'mine') m
  join jsonb_each(pg_temp.j('ml_done') -> 'partner') p using (key) where m.value = p.value) = 6, 'most_likely: 6 iguales no cuentan');

-- =============================================================================
-- 6) Picantes: spicy_not_active, activación y orden
-- =============================================================================
select pg_temp.keep('agree', public.start_game_round('agree'));
select pg_temp.assert(not exists (select 1 from public.questions q where q.id = any (pg_temp.item_ids(pg_temp.j('agree')))
  and q.intensity = 'picante'), 'agree normal: sin picantes');
select pg_temp.expect_error($q$select public.start_game_round('agree', true)$q$, 'spicy_not_active');
-- Solo uno activa picantes: sigue sin estar activo.
select public.set_spicy_opt_in(true);
select pg_temp.expect_error($q$select public.start_game_round('agree', true)$q$, 'spicy_not_active');
select pg_temp.as_user('B'); select public.set_spicy_opt_in(true);
-- Con la ronda normal abierta, el start (aun picante) devuelve la abierta.
select pg_temp.assert(public.start_game_round('agree', true) ->> 'id' = pg_temp.j('agree') ->> 'id', 'start devuelve la ronda abierta');
select public.delete_game_round(pg_temp.jid('agree'));
select pg_temp.keep('agree_spicy', public.start_game_round('agree', true));
reset role;
select pg_temp.assert((pg_temp.j('agree_spicy') ->> 'spicy')::boolean, 'ronda picante marcada');
select pg_temp.assert((select count(*) from public.questions q where q.id = any (pg_temp.item_ids(pg_temp.j('agree_spicy')))
  and q.intensity = 'picante') = 6, 'ronda picante: las 6 picantes primero');
select pg_temp.assert((select count(*) from public.questions q where q.id = any (pg_temp.item_ids(pg_temp.j('agree_spicy')))
  and q.intensity <> 'picante') = 4 and (pg_temp.j('agree_spicy') ->> 'total')::int = 10, 'ronda picante: se rellena con no picantes');

-- delete_game_round: cualquiera de los dos; la otra pareja no.
select pg_temp.as_user('C');
select pg_temp.expect_error(format($q$select public.delete_game_round(%L)$q$, pg_temp.jid('agree_spicy')), 'round_not_found');
select pg_temp.as_user('A');
select public.delete_game_round(pg_temp.jid('agree_spicy'));
select pg_temp.expect_error(format($q$select public.get_game_round(%L)$q$, pg_temp.jid('agree_spicy')), 'round_not_found');
select pg_temp.expect_error(format($q$select public.delete_game_round(%L)$q$, pg_temp.jid('agree_spicy')), 'round_not_found');
reset role;
select pg_temp.assert((select count(*) from public.game_answers where round_id = pg_temp.jid('agree_spicy')) = 0, 'borrar cascada respuestas');

-- =============================================================================
-- 7) Resumen (hub)
-- =============================================================================
select pg_temp.as_user('A');
select pg_temp.keep('ov', public.get_game_overview());
select pg_temp.assert((select array_agg(g ->> 'game') from jsonb_array_elements(pg_temp.j('ov') -> 'games') g)
  = array['wyr', 'nhie', 'most_likely', 'agree'], 'overview: 4 juegos en orden');
select pg_temp.assert(pg_temp.j('ov') -> 'games' -> 0 ->> 'finished_count' = '1' and pg_temp.j('ov') -> 'games' -> 0 ->> 'avg_pct' = '70'
  and pg_temp.j('ov') -> 'games' -> 0 ->> 'last_pct' = '70', 'overview wyr: 1 terminada, 70 %');
select pg_temp.assert(pg_temp.j('ov') -> 'games' -> 0 -> 'open_round' ->> 'id' = pg_temp.j('wyr2') ->> 'id'
  and pg_temp.j('ov') -> 'games' -> 0 -> 'open_round' ->> 'my_count' = '0'
  and pg_temp.j('ov') -> 'games' -> 0 -> 'open_round' ->> 'total' = '10', 'overview wyr: ronda abierta');
select pg_temp.assert(pg_temp.j('ov') -> 'games' -> 1 ->> 'avg_pct' = '67' and pg_temp.j('ov') -> 'games' -> 1 -> 'open_round' = 'null'::jsonb,
  'overview nhie: 67 %, sin ronda abierta');
select pg_temp.assert(pg_temp.j('ov') -> 'games' -> 3 ->> 'avg_pct' is null and pg_temp.j('ov') -> 'games' -> 3 ->> 'finished_count' = '0'
  and pg_temp.j('ov') -> 'games' -> 3 -> 'open_round' = 'null'::jsonb, 'overview agree: sin terminadas ni ronda abierta');
select pg_temp.assert(jsonb_array_length(pg_temp.j('ov') -> 'recent') = 3
  and pg_temp.j('ov') -> 'recent' -> 0 ->> 'pct' is not null, 'overview: 3 rondas recientes');
select pg_temp.assert(pg_temp.j('ov') -> 'drawings' = '{"active":[],"recent":[]}'::jsonb, 'overview: sin dibujos aún');
-- La otra pareja no tiene nada de esto.
select pg_temp.as_user('C');
select pg_temp.assert(public.get_game_overview() -> 'games' -> 0 ->> 'finished_count' = '0'
  and jsonb_array_length(public.get_game_overview() -> 'recent') = 0, 'overview de C vacío');
reset role;

-- =============================================================================
-- 8) Reto de dibujo: inicio, palabra secreta, rerolls
-- =============================================================================
-- Nada de lo que se guarda en drawing_challenges trae la palabra.
select pg_temp.as_user('A');
select pg_temp.keep('d1', public.start_drawing());
select pg_temp.assert(pg_temp.j('d1') ->> 'status' = 'drawing' and (pg_temp.j('d1') ->> 'drawer_id')::uuid = pg_temp.u('A')
  and (pg_temp.j('d1') ->> 'guesser_id')::uuid = pg_temp.u('B'), 'dibujo: Ana dibuja, Beto adivina');
select pg_temp.assert(pg_temp.j('d1') ->> 'word' is not null and pg_temp.j('d1') ->> 'hint' ~ '^[_ ]+$'
  and (pg_temp.j('d1') ->> 'rerolls_left')::int = 3 and pg_temp.j('d1') -> 'strokes' = 'null'::jsonb
  and pg_temp.j('d1') -> 'guesses' = '[]'::jsonb, 'dibujo: quien dibuja ve su palabra y la pista');
select pg_temp.assert((pg_temp.j('d1') ->> 'word_length')::int = char_length(replace(pg_temp.j('d1') ->> 'word', ' ', '')),
  'dibujo: word_length');
select pg_temp.assert(public.start_drawing() ->> 'id' = pg_temp.j('d1') ->> 'id', 'start_drawing idempotente');

select pg_temp.as_user('B');
select pg_temp.assert(public.start_drawing() ->> 'id' <> pg_temp.j('d1') ->> 'id', 'Beto puede iniciar su propio reto');
select public.delete_drawing((public.start_drawing() ->> 'id')::uuid);
select pg_temp.keep('d1_b', public.get_drawing(pg_temp.jid('d1')));
select pg_temp.assert(pg_temp.j('d1_b') -> 'word' = 'null'::jsonb, 'quien adivina NO ve la palabra');
select pg_temp.assert(pg_temp.j('d1_b') ->> 'hint' = pg_temp.j('d1') ->> 'hint' and pg_temp.j('d1_b') -> 'strokes' = 'null'::jsonb,
  'quien adivina ve la pista y no hay trazos aún');
-- Ninguna vía de lectura directa lleva la palabra.
select pg_temp.expect_denied('select * from public.drawing_secrets');
select pg_temp.expect_denied('select * from public.drawing_words');
select pg_temp.expect_denied('select word_slug from public.drawing_secrets');
select pg_temp.assert((select count(*) from public.drawing_challenges) = 1, 'Beto ve el reto de Ana en la tabla');
select pg_temp.assert((select to_jsonb(c) ? 'word' or to_jsonb(c) ? 'word_slug' from public.drawing_challenges c limit 1) = false,
  'la fila de drawing_challenges no tiene columna con la palabra');
select pg_temp.assert(pg_temp.j('d1_b') ->> 'word' is null and public.get_game_overview() -> 'drawings' -> 'active' = '[]'::jsonb,
  'overview: mientras dibuja, Beto no lo ve como activo');
select pg_temp.expect_error(format($q$select public.reroll_drawing_word(%L)$q$, pg_temp.jid('d1')), 'not_drawer');
select pg_temp.expect_error(format($q$select public.submit_drawing(%L, '[{"c":"ink","w":3,"p":[1,2]}]')$q$, pg_temp.jid('d1')), 'not_drawer');
select pg_temp.expect_error(format($q$select public.guess_drawing(%L, 'pinata')$q$, pg_temp.jid('d1')), 'invalid_drawing_state');
select pg_temp.expect_error(format($q$select public.give_up_drawing(%L)$q$, pg_temp.jid('d1')), 'invalid_drawing_state');
select pg_temp.expect_error(format($q$select public.delete_drawing(%L)$q$, pg_temp.jid('d1')), 'not_drawer');

-- El tercero no ve nada del reto.
select pg_temp.as_user('C');
select pg_temp.expect_error(format($q$select public.get_drawing(%L)$q$, pg_temp.jid('d1')), 'drawing_not_found');
select pg_temp.expect_error(format($q$select public.reroll_drawing_word(%L)$q$, pg_temp.jid('d1')), 'drawing_not_found');
select pg_temp.expect_error(format($q$select public.guess_drawing(%L, 'x')$q$, pg_temp.jid('d1')), 'drawing_not_found');
select pg_temp.expect_error(format($q$select public.give_up_drawing(%L)$q$, pg_temp.jid('d1')), 'drawing_not_found');
select pg_temp.expect_error(format($q$select public.submit_drawing(%L, '[{"c":"ink"}]')$q$, pg_temp.jid('d1')), 'drawing_not_found');
select pg_temp.expect_error(format($q$select public.delete_drawing(%L)$q$, pg_temp.jid('d1')), 'drawing_not_found');
select pg_temp.assert((select count(*) from public.drawing_challenges) = 0, 'C no ve retos ajenos');
select pg_temp.expect_error($q$select public.get_drawing(gen_random_uuid())$q$, 'drawing_not_found');

-- Rerolls: máx. 3, cada uno cambia la palabra.
select pg_temp.as_user('A');
do $$
declare
  v_before text;
  v_after text;
  v_left int;
  i int;
begin
  for i in 1 .. 3 loop
    v_before := public.get_drawing(pg_temp.jid('d1')) ->> 'word';
    v_after := public.reroll_drawing_word(pg_temp.jid('d1')) ->> 'word';
    v_left := (public.get_drawing(pg_temp.jid('d1')) ->> 'rerolls_left')::int;
    assert v_before is distinct from v_after, 'reroll cambia la palabra';
    assert v_left = 3 - i, 'rerolls_left baja';
  end loop;
end $$;
select pg_temp.expect_error(format($q$select public.reroll_drawing_word(%L)$q$, pg_temp.jid('d1')), 'no_rerolls');

-- =============================================================================
-- 9) submit_drawing: validaciones
-- =============================================================================
select pg_temp.expect_error(format($q$select public.submit_drawing(%L, null)$q$, pg_temp.jid('d1')), 'invalid_drawing');
select pg_temp.expect_error(format($q$select public.submit_drawing(%L, '[]')$q$, pg_temp.jid('d1')), 'invalid_drawing');
select pg_temp.expect_error(format($q$select public.submit_drawing(%L, '{"c":"ink"}')$q$, pg_temp.jid('d1')), 'invalid_drawing');
select pg_temp.expect_error(format($q$select public.submit_drawing(%L, '[1,2]')$q$, pg_temp.jid('d1')), 'invalid_drawing');
select pg_temp.expect_error(format($q$select public.submit_drawing(%L, %L)$q$, pg_temp.jid('d1'),
  (select jsonb_agg('{"c":"ink","w":3,"p":[1,2]}'::jsonb) from generate_series(1, 301))), 'invalid_drawing');
select pg_temp.expect_error(format($q$select public.submit_drawing(%L, %L)$q$, pg_temp.jid('d1'),
  jsonb_build_array(jsonb_build_object('c', 'ink', 'w', 3, 'p', (select jsonb_agg(n) from generate_series(1, 90000) n)))),
  'invalid_drawing');
select pg_temp.assert(public.get_drawing(pg_temp.jid('d1')) ->> 'status' = 'drawing', 'sigue en drawing tras los inválidos');

select pg_temp.assert(public.submit_drawing(pg_temp.jid('d1'), '[{"c":"ink","w":3,"p":[1,2,3,4]}]') ->> 'status' = 'guessing', 'dibujo enviado');
select pg_temp.expect_error(format($q$select public.submit_drawing(%L, '[{"c":"ink","w":3,"p":[1,2]}]')$q$, pg_temp.jid('d1')), 'invalid_drawing_state');
select pg_temp.expect_error(format($q$select public.reroll_drawing_word(%L)$q$, pg_temp.jid('d1')), 'invalid_drawing_state');
select pg_temp.expect_error(format($q$select public.guess_drawing(%L, 'pinata')$q$, pg_temp.jid('d1')), 'not_guesser');
select pg_temp.expect_error(format($q$select public.give_up_drawing(%L)$q$, pg_temp.jid('d1')), 'not_guesser');
-- start_drawing devuelve el reto abierto (ya en guessing).
select pg_temp.assert(public.start_drawing() ->> 'id' = pg_temp.j('d1') ->> 'id', 'start_drawing devuelve el de guessing');
reset role;
-- Push ready: Ana -> Beto, sin palabra.
select pg_temp.assert((select count(*) from pg_temp.queued() e where e ->> 'kind' = 'drawing' and e -> 'data' ->> 'event' = 'ready'
  and (e -> 'recipient' ->> 'id')::uuid = pg_temp.u('B') and e -> 'data' ->> 'drawing_id' = pg_temp.j('d1') ->> 'id'
  and e -> 'data' -> 'word' = 'null'::jsonb) = 1, 'push drawing ready sin palabra');

-- Fijamos la palabra del reto (como service_role) para probar los aciertos.
update public.drawing_secrets set word_slug = 'tg-tacos' where challenge_id = pg_temp.jid('d1');

select pg_temp.as_user('B');
select pg_temp.keep('d1_b', public.get_drawing(pg_temp.jid('d1')));
select pg_temp.assert(pg_temp.j('d1_b') -> 'word' = 'null'::jsonb and jsonb_array_length(pg_temp.j('d1_b') -> 'strokes') = 1
  and pg_temp.j('d1_b') ->> 'hint' = '_ _ _ _ _   _ _   _ _ _ _ _ _' and (pg_temp.j('d1_b') ->> 'word_length')::int = 13,
  'quien adivina ve los trazos y la pista (13 letras) sin la palabra');
select pg_temp.assert(pg_temp.j('d1_b') ->> 'status' = 'guessing', 'estado guessing');
select pg_temp.assert(jsonb_array_length(public.get_game_overview() -> 'drawings' -> 'active') = 1
  and public.get_game_overview() -> 'drawings' -> 'active' -> 0 -> 'word' = 'null'::jsonb, 'overview: activo para Beto sin palabra');
select pg_temp.expect_error(format($q$select public.guess_drawing(%L, '')$q$, pg_temp.jid('d1')), 'invalid_guess');
select pg_temp.expect_error(format($q$select public.guess_drawing(%L, '   ')$q$, pg_temp.jid('d1')), 'invalid_guess');
select pg_temp.expect_error(format($q$select public.guess_drawing(%L, null)$q$, pg_temp.jid('d1')), 'invalid_guess');
select pg_temp.expect_error(format($q$select public.guess_drawing(%L, %L)$q$, pg_temp.jid('d1'), repeat('a', 61)), 'invalid_guess');
select pg_temp.expect_error(format($q$select public.delete_drawing(%L)$q$, pg_temp.jid('d1')), 'not_drawer');

-- Intento incorrecto: se guarda, no revela nada.
select pg_temp.keep('g1', public.guess_drawing(pg_temp.jid('d1'), '  Tacos de pastor '));
select pg_temp.assert((pg_temp.j('g1') ->> 'correct')::boolean = false and pg_temp.j('g1') -> 'drawing' ->> 'status' = 'guessing'
  and jsonb_array_length(pg_temp.j('g1') -> 'drawing' -> 'guesses') = 1
  and pg_temp.j('g1') -> 'drawing' -> 'guesses' -> 0 ->> 'text' = 'Tacos de pastor'
  and pg_temp.j('g1') -> 'drawing' -> 'word' = 'null'::jsonb and (pg_temp.j('g1') -> 'drawing' ->> 'guess_count')::int = 1,
  'intento incorrecto guardado');
-- Correcto: mayúsculas y espacios no importan.
select pg_temp.keep('g2', public.guess_drawing(pg_temp.jid('d1'), 'TACOS   al   Pastor'));
select pg_temp.assert((pg_temp.j('g2') ->> 'correct')::boolean and pg_temp.j('g2') -> 'drawing' ->> 'status' = 'solved'
  and pg_temp.j('g2') -> 'drawing' ->> 'word' = 'Tacos al pastor' and pg_temp.j('g2') -> 'drawing' ->> 'finished_at' is not null,
  'intento correcto: solved y se revela la palabra');
select pg_temp.expect_error(format($q$select public.guess_drawing(%L, 'tacos')$q$, pg_temp.jid('d1')), 'invalid_drawing_state');
select pg_temp.assert(public.get_drawing(pg_temp.jid('d1')) ->> 'word' = 'Tacos al pastor', 'terminado: Beto ve la palabra');
reset role;
select pg_temp.assert((select count(*) from pg_temp.queued() e where e ->> 'kind' = 'drawing' and e -> 'data' ->> 'event' = 'solved'
  and e -> 'data' ->> 'word' = 'Tacos al pastor' and (e -> 'recipient' ->> 'id')::uuid = pg_temp.u('A')
  and (e -> 'actor' ->> 'id')::uuid = pg_temp.u('B')) = 1, 'push drawing solved con la palabra para Ana');

-- Borrar: quien adivina puede borrar un reto ya terminado; el tercero no.
select pg_temp.as_user('C');
select pg_temp.expect_error(format($q$select public.delete_drawing(%L)$q$, pg_temp.jid('d1')), 'drawing_not_found');
select pg_temp.as_user('A');
select pg_temp.assert(public.get_game_overview() -> 'drawings' -> 'recent' -> 0 ->> 'word' = 'Tacos al pastor', 'overview: reciente con palabra');
select pg_temp.as_user('B');
select public.delete_drawing(pg_temp.jid('d1'));
select pg_temp.expect_error(format($q$select public.get_drawing(%L)$q$, pg_temp.jid('d1')), 'drawing_not_found');
reset role;
select pg_temp.assert(not exists (select 1 from public.drawing_secrets where challenge_id = pg_temp.jid('d1')), 'borrar elimina el secreto');

-- =============================================================================
-- 10) Aciertos con acentos, artículos y alternates
-- =============================================================================
-- Crea un reto ya enviado cuya palabra es p_slug y deja a Beto como sesión.
create function pg_temp.mk(p_word_slug text) returns uuid language plpgsql as $$
declare
  v_id uuid;
begin
  perform pg_temp.as_user('A');
  v_id := (public.start_drawing() ->> 'id')::uuid;
  perform public.submit_drawing(v_id, '[{"c":"ink","w":3,"p":[1,2,3,4]}]');
  perform set_config('role', session_user, true);
  update public.drawing_secrets set word_slug = p_word_slug where challenge_id = v_id;
  perform pg_temp.as_user('B');
  return v_id;
end;
$$;
grant execute on function pg_temp.mk(text) to authenticated, service_role;

create function pg_temp.guess_ok(p_id uuid, p_guess text) returns boolean language sql as $$
  select (public.guess_drawing(p_id, p_guess) ->> 'correct')::boolean;
$$;
grant execute on function pg_temp.guess_ok(uuid, text) to authenticated, service_role;

-- "Piñata": sin tilde, con artículo, con signos y alternate (con artículo).
select pg_temp.keep('p1', jsonb_build_object('id', pg_temp.mk('tg-pinata')));
select pg_temp.assert(pg_temp.guess_ok(pg_temp.jid('p1'), 'pinata'), 'sin tilde (ñ -> n)');
select pg_temp.assert(not exists (select 1 from public.drawing_challenges where id = pg_temp.jid('p1') and status <> 'solved'), 'quedó solved');
select pg_temp.as_user('A'); select public.delete_drawing(pg_temp.jid('p1'));
select pg_temp.keep('p2', jsonb_build_object('id', pg_temp.mk('tg-pinata')));
select pg_temp.assert(pg_temp.guess_ok(pg_temp.jid('p2'), 'La Piñata!!'), 'con artículo inicial y signos');
select pg_temp.as_user('A'); select public.delete_drawing(pg_temp.jid('p2'));
select pg_temp.keep('p3', jsonb_build_object('id', pg_temp.mk('tg-pinata')));
select pg_temp.assert(not pg_temp.guess_ok(pg_temp.jid('p3'), 'piñatas'), 'plural no cuenta');
select pg_temp.assert(not pg_temp.guess_ok(pg_temp.jid('p3'), 'la'), 'solo un artículo no cuenta');
select pg_temp.assert(not pg_temp.guess_ok(pg_temp.jid('p3'), '¡¡!!'), 'solo signos no cuenta');
select pg_temp.assert(pg_temp.guess_ok(pg_temp.jid('p3'), 'Una piñata de picos'), 'alternate con artículo y tilde');
select pg_temp.as_user('A'); select public.delete_drawing(pg_temp.jid('p3'));
-- "El Ángel": sin el artículo del contenido; alternate sin tilde.
select pg_temp.keep('p4', jsonb_build_object('id', pg_temp.mk('tg-angel')));
select pg_temp.assert(pg_temp.guess_ok(pg_temp.jid('p4'), 'angel'), 'palabra con artículo, adivinada sin él ni tilde');
select pg_temp.as_user('A'); select public.delete_drawing(pg_temp.jid('p4'));
select pg_temp.keep('p5', jsonb_build_object('id', pg_temp.mk('tg-angel')));
select pg_temp.assert(pg_temp.guess_ok(pg_temp.jid('p5'), 'El ángel de la independencia'), 'alternate con artículo');
select pg_temp.as_user('A'); select public.delete_drawing(pg_temp.jid('p5'));

-- =============================================================================
-- 11) 10 intentos fallidos -> gave_up; rendirse; borrar
-- =============================================================================
select pg_temp.keep('t10', jsonb_build_object('id', pg_temp.mk('tg-tacos')));
do $$
declare
  v_r jsonb;
  i int;
begin
  for i in 1 .. 9 loop
    v_r := public.guess_drawing(pg_temp.jid('t10'), 'intento ' || i);
    assert (v_r ->> 'correct')::boolean = false and v_r -> 'drawing' ->> 'status' = 'guessing', 'intento ' || i || ' sigue en guessing';
  end loop;
  v_r := public.guess_drawing(pg_temp.jid('t10'), 'intento 10');
  assert (v_r ->> 'correct')::boolean = false and v_r -> 'drawing' ->> 'status' = 'gave_up', 'el décimo fallo es gave_up';
  assert v_r -> 'drawing' ->> 'word' = 'Tacos al pastor', 'gave_up revela la palabra';
  assert jsonb_array_length(v_r -> 'drawing' -> 'guesses') = 10, '10 intentos guardados';
end $$;
select pg_temp.expect_error(format($q$select public.guess_drawing(%L, 'tacos al pastor')$q$, pg_temp.jid('t10')), 'invalid_drawing_state');
reset role;
select pg_temp.assert((select count(*) from pg_temp.queued() e where e ->> 'kind' = 'drawing' and e -> 'data' ->> 'event' = 'gave_up'
  and e -> 'data' ->> 'word' = 'Tacos al pastor' and (e -> 'recipient' ->> 'id')::uuid = pg_temp.u('A')) = 1, 'push gave_up (10 intentos)');
select pg_temp.as_user('A');
select public.delete_drawing(pg_temp.jid('t10'));

select pg_temp.keep('gu', jsonb_build_object('id', pg_temp.mk('tg-pinata')));
-- mk deja a Beto (quien adivina) como sesión: Ana no puede rendirse por él.
select pg_temp.as_user('A');
select pg_temp.expect_error(format($q$select public.give_up_drawing(%L)$q$, pg_temp.jid('gu')), 'not_guesser');
select pg_temp.as_user('B');
select pg_temp.keep('gu_r', public.give_up_drawing(pg_temp.jid('gu')));
select pg_temp.assert(pg_temp.j('gu_r') ->> 'status' = 'gave_up' and pg_temp.j('gu_r') ->> 'word' = 'Piñata'
  and pg_temp.j('gu_r') ->> 'finished_at' is not null, 'give_up_drawing -> gave_up con la palabra');
select pg_temp.expect_error(format($q$select public.give_up_drawing(%L)$q$, pg_temp.jid('gu')), 'invalid_drawing_state');
select pg_temp.expect_error(format($q$select public.guess_drawing(%L, 'pinata')$q$, pg_temp.jid('gu')), 'invalid_drawing_state');
select pg_temp.assert(jsonb_array_length(public.get_game_overview() -> 'drawings' -> 'recent') = 1
  and public.get_game_overview() -> 'drawings' -> 'recent' -> 0 ->> 'status' = 'gave_up', 'overview: reto reciente rendido');
reset role;
select pg_temp.assert((select count(*) from pg_temp.queued() e where e ->> 'kind' = 'drawing' and e -> 'data' ->> 'event' = 'gave_up'
  and e -> 'data' ->> 'word' = 'Piñata') = 1, 'push gave_up al rendirse');

-- Quien dibuja puede borrar un reto activo; la palabra se va con él.
select pg_temp.as_user('A');
select pg_temp.keep('act', public.start_drawing());
select public.delete_drawing(pg_temp.jid('act'));
select pg_temp.expect_error(format($q$select public.get_drawing(%L)$q$, pg_temp.jid('act')), 'drawing_not_found');
reset role;

-- Sin palabras activas no se puede iniciar un reto.
update public.drawing_words set is_active = false;
select pg_temp.as_user('A');
select pg_temp.expect_error($q$select public.start_drawing()$q$, 'no_words');
reset role;

-- =============================================================================
-- 12) Sin ítems, preferencias del push y Realtime
-- =============================================================================
update public.questions set is_active = false where type = 'nhie';
select pg_temp.as_user('A');
select public.delete_game_round(pg_temp.jid('nhie'));
select pg_temp.expect_error($q$select public.start_game_round('nhie')$q$, 'no_questions');
reset role;

insert into public.notification_prefs (user_id, games) values (pg_temp.u('B'), false);
select pg_temp.assert(not (private.notification_event('game', (select id from t_couple), pg_temp.u('A'),
  jsonb_build_object('round_id', gen_random_uuid(), 'game', 'wyr', 'event', 'started')) -> 'prefs' ->> 'games')::boolean,
  'prefs.games apagado viaja en el evento');
select pg_temp.assert(private.notification_event('drawing', (select id from t_couple), pg_temp.u('A'),
  jsonb_build_object('drawing_id', gen_random_uuid(), 'event', 'ready', 'word', 'secreta')) -> 'data' -> 'word' = 'null'::jsonb,
  'el evento ready nunca lleva la palabra');
select pg_temp.assert(private.notification_event('drawing', (select id from t_couple), pg_temp.u('A'),
  jsonb_build_object('drawing_id', gen_random_uuid(), 'event', 'solved', 'word', 'Piñata')) -> 'data' ->> 'word' = 'Piñata',
  'el evento solved lleva la palabra');
select pg_temp.assert(private.notification_event('game', (select id from t_couple), pg_temp.u('C'),
  jsonb_build_object('round_id', gen_random_uuid(), 'event', 'started')) is null, 'el actor ajeno a la pareja no avisa');
delete from public.notification_prefs where user_id = pg_temp.u('B');

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    assert (select count(*) from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public'
        and tablename in ('game_rounds', 'drawing_challenges')) = 2, 'Realtime: game_rounds y drawing_challenges';
    assert not exists (select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public'
        and tablename in ('game_answers', 'drawing_secrets', 'drawing_words')), 'Realtime: sin tablas con secretos';
  else
    raise notice 'No existe la publicación supabase_realtime; se omite la prueba de Realtime.';
  end if;
end $$;

-- La categoría de juegos no se mezcla con la pregunta del día.
select pg_temp.as_user('A');
select pg_temp.assert(public.get_daily_question()::text not like '%tg-%', 'la pregunta del día no sale de los juegos');
reset role;

rollback;

select 'games: OK' as resultado;
