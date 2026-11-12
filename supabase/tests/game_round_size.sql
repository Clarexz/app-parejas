-- Pruebas de rondas de juegos de 10, 15 o 20 ítems (migración 20261112000001_game_round_size.sql).
-- Todo ocurre en una transacción que termina en ROLLBACK. Apaga los ítems de juegos del seed
-- y crea los suyos.
--   psql -X -v ON_ERROR_STOP=1 -f supabase/tests/game_round_size.sql

begin;

-- Congela el catálogo para que un seed concurrente no altere el banco mientras corre la prueba.
lock table public.questions in share row exclusive mode;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local', '{"display_name":"Ana"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.local', '{"display_name":"Beto"}'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@test.local', '{"display_name":"Caro"}'),
  ('00000000-0000-0000-0000-0000000000d4', 'd@test.local', '{"display_name":"Dani"}'),
  ('00000000-0000-0000-0000-0000000000e5', 'e@test.local', '{"display_name":"Eli"}');

-- Letra -> usuario: A Ana, B Beto, C Caro, D Dani, E Eli (sin pareja).
create function pg_temp.u(p_letter text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000000' ||
    (array['a1','b2','c3','d4','e5','f6','a7','b8','c9','d0','e1','f2','a3','b4'])[ascii(upper(p_letter)) - 64])::uuid;
$$;

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
end;
$$;

create function pg_temp.as_user(p_letter text) returns void language sql as $$
  select pg_temp.act_as(pg_temp.u(p_letter));
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

-- Hoy en la zona de las parejas de la prueba (todas usan America/Mexico_City).
create function pg_temp.today() returns date language sql stable as $$
  select (now() at time zone 'America/Mexico_City')::date;
$$;

-- Mediodía local de un día (para fijar created_at de respuestas).
create function pg_temp.at(p_day date) returns timestamptz language sql immutable as $$
  select (p_day::timestamp + interval '12 hours') at time zone 'America/Mexico_City';
$$;

-- ¿Es null (SQL o JSON)?
create function pg_temp.isnull(p_value jsonb) returns boolean language sql immutable as $$
  select p_value is null or jsonb_typeof(p_value) = 'null';
$$;

-- Helpers que leen tablas sin RLS (security definer: funcionan aunque el rol activo sea authenticated).
create function pg_temp.qid(p_slug text) returns uuid language sql security definer as $$
  select id from public.questions where slug = p_slug;
$$;
create function pg_temp.cid(p_user uuid) returns uuid language sql security definer as $$
  select couple_id from public.couple_members where user_id = p_user;
$$;
create function pg_temp.code_of(p_user uuid) returns text language sql security definer as $$
  select c.invite_code from public.couples c
  join public.couple_members cm on cm.couple_id = c.id where cm.user_id = p_user;
$$;
create function pg_temp.spicy(p_user uuid) returns boolean language sql security definer as $$
  select c.spicy_enabled from public.couples c
  join public.couple_members cm on cm.couple_id = c.id where cm.user_id = p_user;
$$;

grant execute on function pg_temp.u(text), pg_temp.act_as(uuid), pg_temp.as_user(text),
  pg_temp.expect_error(text, text), pg_temp.expect_denied(text), pg_temp.today(),
  pg_temp.at(date), pg_temp.isnull(jsonb), pg_temp.qid(text), pg_temp.cid(uuid),
  pg_temp.code_of(uuid), pg_temp.spicy(uuid) to authenticated, anon;

-- Contesta una pregunta open o choice según su tipo (la del día es al azar).
create function pg_temp.answer_any(p_question_id uuid, p_text text) returns jsonb language plpgsql as $$
begin
  if (select type from public.questions where id = p_question_id) = 'open' then
    return public.submit_answer(p_question_id, p_text);
  end if;
  return public.submit_answer(p_question_id, p_text, 1);
end;
$$;
grant execute on function pg_temp.answer_any(uuid, text) to authenticated;

-- Ids que se guardan entre bloques (comentarios, etc.).
create temp table t_ids (k text primary key, id uuid);
grant all on t_ids to authenticated;
-- Banco propio: 25 wyr, 3 nhie, 0 de los demás.
update public.questions set is_active = false where type in ('wyr', 'nhie', 'most_likely', 'agree');
insert into public.question_categories (slug, name, emoji, intensity, position, kind)
values ('juegos', 'Juegos', '🎲', 'ligera', 99, 'games')
on conflict (slug) do nothing;
insert into public.questions (slug, category, type, text, options, intensity, is_active)
select 'test-wyr-' || n, 'juegos', 'wyr', 'Preferirías la opción numero ' || n || ' de prueba', '["Uno","Dos"]', 'ligera', true
from generate_series(1, 25) n;
insert into public.questions (slug, category, type, text, intensity, is_active)
select 'test-nhie-' || n, 'juegos', 'nhie', 'Yo nunca he hecho la cosa numero ' || n, 'ligera', true
from generate_series(1, 3) n;

-- Permisos y errores previos al tamaño.
set local role anon;
select pg_temp.expect_denied($q$select public.start_game_round('wyr', false, 10)$q$);
reset role;

select pg_temp.as_user('A'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('B'); select public.join_couple(pg_temp.code_of(pg_temp.u('A')));
select pg_temp.as_user('E');
select pg_temp.expect_error($q$select public.start_game_round('wyr', false, 10)$q$, 'no_couple');
select pg_temp.as_user('A');
select pg_temp.expect_error($q$select public.start_game_round('wyr', false, 5)$q$, 'invalid_round_size');
select pg_temp.expect_error($q$select public.start_game_round('wyr', false, 0)$q$, 'invalid_round_size');
select pg_temp.expect_error($q$select public.start_game_round('wyr', false, 11)$q$, 'invalid_round_size');
select pg_temp.expect_error($q$select public.start_game_round('wyr', false, 25)$q$, 'invalid_round_size');
select pg_temp.expect_error($q$select public.start_game_round('wyr', false, -10)$q$, 'invalid_round_size');
select pg_temp.expect_error($q$select public.start_game_round('drawing', false, 10)$q$, 'invalid_game');
select pg_temp.expect_error($q$select public.start_game_round('wyr', true, 10)$q$, 'spicy_not_active');
select pg_temp.expect_error($q$select public.start_game_round('agree', false, 10)$q$, 'no_questions');
reset role;
do $$
begin
  assert (select count(*) from public.game_rounds) = 0, 'los errores no crean rondas';
end $$;

-- Por omisión (y con la llamada vieja de 2 argumentos): 10 ítems.
select pg_temp.as_user('A');
do $$
declare
  r jsonb := public.start_game_round('wyr');
begin
  assert (r->>'total')::int = 10 and jsonb_array_length(r->'items') = 10, 'por omisión: 10 ítems';
  insert into t_ids values ('r10', (r->>'id')::uuid);
  -- Ronda abierta: se devuelve la misma sin importar el tamaño (incluso inválido no se alcanza a ver).
  assert public.start_game_round('wyr', false, 20)->>'id' = r->>'id', 'abierta: misma ronda aunque pidan 20';
  assert (public.start_game_round('wyr', false, 20)->>'total')::int = 10, 'abierta: conserva su tamaño';
  assert public.start_game_round('wyr', false)->>'id' = r->>'id', 'forma de 2 argumentos sigue funcionando';
end $$;
select pg_temp.as_user('B');
do $$
begin
  assert public.start_game_round('wyr', false, 15)->>'id' = (select id::text from t_ids where k = 'r10'),
    'la pareja comparte la ronda abierta';
end $$;
reset role;
update public.game_rounds set status = 'finished', finished_at = now();

-- 15 ítems, sin repetir y los menos usados primero (los 10 ya usados quedan al final).
select pg_temp.as_user('A');
do $$
declare
  r jsonb := public.start_game_round('wyr', false, 15);
  ids uuid[];
  used uuid[] := (select item_ids from public.game_rounds where id = (select id from t_ids where k = 'r10'));
begin
  assert (r->>'total')::int = 15 and jsonb_array_length(r->'items') = 15, '15 ítems';
  select array_agg((e->>'id')::uuid) into ids from jsonb_array_elements(r->'items') e;
  assert (select count(distinct x) from unnest(ids) x) = 15, 'sin repetidos';
  -- 25 - 10 usados = 15 sin usar: salen exactamente esos.
  assert not (ids && used), 'los 15 son los que no se habían usado';
  insert into t_ids values ('r15', (r->>'id')::uuid);
end $$;
reset role;
update public.game_rounds set status = 'finished', finished_at = now() where status = 'playing';

select pg_temp.as_user('A');
do $$
declare
  r jsonb := public.start_game_round('wyr', false, 20);
begin
  assert (r->>'total')::int = 20 and jsonb_array_length(r->'items') = 20, '20 ítems';
  assert (select cardinality(item_ids) from public.game_rounds where id = (r->>'id')::uuid) = 20, 'se guardan 20 (check hasta 20)';
end $$;
-- Se puede contestar un ítem de una ronda de 20 y el avance cuenta sobre 20.
do $$
declare
  rid uuid := (select id from public.game_rounds where status = 'playing' and game = 'wyr');
  r jsonb;
begin
  r := public.answer_game_item(rid, (select item_ids[20] from public.game_rounds where id = rid), 1);
  assert (r->>'my_count')::int = 1 and (r->>'total')::int = 20, 'avance 1 de 20';
end $$;
reset role;
update public.game_rounds set status = 'finished', finished_at = now() where status = 'playing';

-- Banco chico: menos ítems que p_size -> los que haya.
select pg_temp.as_user('A');
do $$
declare
  r jsonb := public.start_game_round('nhie', false, 20);
begin
  assert (r->>'total')::int = 3 and jsonb_array_length(r->'items') = 3, 'banco de 3 con p_size 20 -> 3 ítems';
end $$;
-- El check de la tabla rechaza más de 20 ítems.
reset role;
do $$
begin
  begin
    insert into public.game_rounds (couple_id, game, created_by, item_ids, status, finished_at)
    select (select id from public.couples limit 1), 'agree', pg_temp.u('A'),
      (select array_agg(gen_random_uuid()) from generate_series(1, 21)), 'finished', now();
    raise exception 'ASSERT: 21 ítems debía rechazarse';
  exception when check_violation then
    null;
  end;
end $$;

rollback;

select 'game_round_size: OK' as resultado;
