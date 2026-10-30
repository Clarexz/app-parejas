-- Pruebas de la Fase 3: preguntas diarias, respuestas ocultas, racha, comentarios, toques,
-- historial y picantes (migración 20261101000000_questions.sql).
-- Todo ocurre en una transacción que termina en ROLLBACK. Es determinista aunque el seed de
-- preguntas esté aplicado: apaga el banco existente y crea su propio banco `test-...`.
--   psql -X -v ON_ERROR_STOP=1 -f supabase/tests/questions.sql

begin;

-- Congela el catálogo para que un seed concurrente no altere el banco mientras corre la prueba.
lock table public.questions in share row exclusive mode;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local', '{"display_name":"Ana"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.local', '{"display_name":"Beto"}'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@test.local', '{"display_name":"Caro"}'),
  ('00000000-0000-0000-0000-0000000000d4', 'd@test.local', '{"display_name":"Dani"}'),
  ('00000000-0000-0000-0000-0000000000e5', 'e@test.local', '{"display_name":"Eli"}'),
  ('00000000-0000-0000-0000-0000000000f6', 'f@test.local', '{"display_name":"Fer"}'),
  ('00000000-0000-0000-0000-0000000000a7', 'g@test.local', '{"display_name":"Gabo"}'),
  ('00000000-0000-0000-0000-0000000000b8', 'h@test.local', '{"display_name":"Hugo"}'),
  ('00000000-0000-0000-0000-0000000000c9', 'i@test.local', '{"display_name":"Ines"}'),
  ('00000000-0000-0000-0000-0000000000d0', 'j@test.local', '{"display_name":"Jaime"}'),
  ('00000000-0000-0000-0000-0000000000e1', 'k@test.local', '{"display_name":"Karla"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'l@test.local', '{"display_name":"Luis"}'),
  ('00000000-0000-0000-0000-0000000000a3', 'm@test.local', '{"display_name":"Mara"}'),
  ('00000000-0000-0000-0000-0000000000b4', 'n@test.local', '{"display_name":"Nico"}');

-- Letra -> usuario: A Ana, B Beto, C Caro, D Dani, E Eli, F Fer, G Gabo, H Hugo, I Ines,
-- J Jaime, K Karla, L Luis, M Mara, N Nico.
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

-- =============================================================================
-- 0) Banco determinista: se apaga todo lo existente (seed) y se arma uno propio.
-- =============================================================================
update public.questions set is_active = false;

-- =============================================================================
-- 1) Permisos: anon no puede nada; authenticated solo lee (toda escritura va por RPC).
-- =============================================================================
set local role anon;
select pg_temp.expect_denied($q$select public.get_daily_question()$q$);
select pg_temp.expect_denied($q$select public.get_question_with_answers(gen_random_uuid())$q$);
select pg_temp.expect_denied($q$select public.submit_answer(gen_random_uuid(), 'x', null)$q$);
select pg_temp.expect_denied($q$select public.delete_answer(gen_random_uuid())$q$);
select pg_temp.expect_denied($q$select * from public.get_category_questions('x')$q$);
select pg_temp.expect_denied($q$select * from public.get_history()$q$);
select pg_temp.expect_denied($q$select public.get_streak()$q$);
select pg_temp.expect_denied($q$select public.add_comment(gen_random_uuid(), 'x')$q$);
select pg_temp.expect_denied($q$select public.delete_comment(gen_random_uuid())$q$);
select pg_temp.expect_denied($q$select public.react_to_comment(gen_random_uuid(), '😂')$q$);
select pg_temp.expect_denied($q$select public.send_nudge()$q$);
select pg_temp.expect_denied($q$select public.set_spicy_opt_in(true)$q$);
select pg_temp.expect_denied('select * from public.question_categories');
select pg_temp.expect_denied('select * from public.questions');
select pg_temp.expect_denied('select * from public.daily_questions');
select pg_temp.expect_denied('select * from public.answers');
select pg_temp.expect_denied('select * from public.answer_comments');
select pg_temp.expect_denied('select * from public.nudges');
reset role;

-- Parejas. P1 Ana+Beto, P2 Caro+Dani, P3 Fer+Gabo, P4 Hugo+Ines, P5 Karla+Luis, P6 Mara+Nico.
-- Eli (E) empieza sin pareja.
select pg_temp.as_user('A'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('B'); select public.join_couple(pg_temp.code_of(pg_temp.u('A')));
select pg_temp.as_user('C'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('D'); select public.join_couple(pg_temp.code_of(pg_temp.u('C')));
select pg_temp.as_user('F'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('G'); select public.join_couple(pg_temp.code_of(pg_temp.u('F')));
select pg_temp.as_user('H'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('I'); select public.join_couple(pg_temp.code_of(pg_temp.u('H')));
select pg_temp.as_user('K'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('L'); select public.join_couple(pg_temp.code_of(pg_temp.u('K')));
select pg_temp.as_user('M'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('N'); select public.join_couple(pg_temp.code_of(pg_temp.u('M')));

-- Escritura directa prohibida a authenticated (con pareja, para que no sea RLS lo que rechace).
select pg_temp.as_user('A');
select pg_temp.expect_denied($q$insert into public.question_categories (slug, name, emoji, intensity)
  values ('test-x', 'X', 'x', 'ligera')$q$);
select pg_temp.expect_denied($q$update public.question_categories set name = 'hack'$q$);
select pg_temp.expect_denied($q$delete from public.question_categories$q$);
select pg_temp.expect_denied($q$insert into public.questions (slug, category, type, text, intensity)
  values ('test-x', 'test-a', 'open', 'Pregunta colada', 'ligera')$q$);
select pg_temp.expect_denied($q$update public.questions set is_active = true$q$);
select pg_temp.expect_denied($q$delete from public.questions$q$);
select pg_temp.expect_denied($q$insert into public.daily_questions (couple_id, day, question_id)
  values (public.my_couple_id(), current_date, gen_random_uuid())$q$);
select pg_temp.expect_denied($q$update public.daily_questions set question_id = gen_random_uuid()$q$);
select pg_temp.expect_denied($q$delete from public.daily_questions$q$);
select pg_temp.expect_denied($q$insert into public.answers (couple_id, question_id, user_id, text)
  values (public.my_couple_id(), gen_random_uuid(), auth.uid(), 'x')$q$);
select pg_temp.expect_denied($q$update public.answers set text = 'hack'$q$);
select pg_temp.expect_denied($q$delete from public.answers$q$);
select pg_temp.expect_denied($q$insert into public.answer_comments (couple_id, question_id, user_id, body)
  values (public.my_couple_id(), gen_random_uuid(), auth.uid(), 'x')$q$);
select pg_temp.expect_denied($q$update public.answer_comments set body = 'hack'$q$);
select pg_temp.expect_denied($q$delete from public.answer_comments$q$);
select pg_temp.expect_denied($q$insert into public.nudges (couple_id, from_user, to_user)
  values (public.my_couple_id(), auth.uid(), gen_random_uuid())$q$);
select pg_temp.expect_denied($q$update public.nudges set kind = 'answer'$q$);
select pg_temp.expect_denied($q$delete from public.nudges$q$);
select pg_temp.expect_denied($q$update public.couples set spicy_enabled = true$q$);
-- Helpers internos tampoco se pueden llamar directo.
select pg_temp.expect_denied($q$select public.couple_today(public.my_couple_id())$q$);
select pg_temp.expect_denied($q$select public.couple_start_day(public.my_couple_id())$q$);
select pg_temp.expect_denied($q$select public.require_couple()$q$);
select pg_temp.expect_denied($q$select public.pick_daily_question(public.my_couple_id())$q$);
select pg_temp.expect_denied($q$select public.question_card(public.my_couple_id(), gen_random_uuid(), null)$q$);
select pg_temp.expect_denied($q$select * from public.couple_complete_days(public.my_couple_id())$q$);
reset role;

-- =============================================================================
-- 2) Sin pareja y sin sesión.
-- =============================================================================
select pg_temp.as_user('E');
select pg_temp.expect_error($q$select public.get_daily_question()$q$, 'no_couple');
select pg_temp.expect_error($q$select public.get_question_with_answers(gen_random_uuid())$q$, 'no_couple');
select pg_temp.expect_error($q$select public.submit_answer(gen_random_uuid(), 'x', null)$q$, 'no_couple');
select pg_temp.expect_error($q$select public.delete_answer(gen_random_uuid())$q$, 'no_couple');
select pg_temp.expect_error($q$select * from public.get_category_questions('x')$q$, 'no_couple');
select pg_temp.expect_error($q$select * from public.get_history()$q$, 'no_couple');
select pg_temp.expect_error($q$select public.get_streak()$q$, 'no_couple');
select pg_temp.expect_error($q$select public.add_comment(gen_random_uuid(), 'x')$q$, 'no_couple');
select pg_temp.expect_error($q$select public.delete_comment(gen_random_uuid())$q$, 'no_couple');
select pg_temp.expect_error($q$select public.react_to_comment(gen_random_uuid(), '😂')$q$, 'no_couple');
select pg_temp.expect_error($q$select public.send_nudge()$q$, 'no_couple');
select pg_temp.expect_error($q$select public.set_spicy_opt_in(true)$q$, 'no_couple');
do $$
begin
  assert (select count(*) from public.answers) = 0, 'sin pareja no se ven respuestas';
  assert (select count(*) from public.daily_questions) = 0, 'sin pareja no se ven preguntas del día';
  assert (select count(*) from public.nudges) = 0, 'sin pareja no se ven toques';
end $$;
reset role;

-- Sin sesión (auth.uid() nulo) las RPC avisan not_authenticated.
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.expect_error($q$select public.get_streak()$q$, 'not_authenticated');
select pg_temp.expect_error($q$select public.get_daily_question()$q$, 'not_authenticated');

-- =============================================================================
-- 3) Banco vacío / sin preguntas elegibles -> no_questions.
-- =============================================================================
select pg_temp.as_user('C');
select pg_temp.expect_error($q$select public.get_daily_question()$q$, 'no_questions');
reset role;

insert into public.question_categories (slug, name, emoji, intensity, position) values
  ('test-a', 'Prueba A', '🅰️', 'ligera', 900),
  ('test-b', 'Prueba B', '🅱️', 'ligera', 901),
  ('test-hot', 'Prueba picante', '🌶️', 'picante', 902),
  ('test-st', 'Prueba racha', '📅', 'ligera', 903);

-- Solo hay preguntas NO elegibles para el día: de juego (wyr), apagada y picante sin opt-in.
insert into public.questions (slug, category, type, text, options, intensity, is_active) values
  ('test-a-wyr', 'test-a', 'wyr', 'Preferirías viajar al pasado o al futuro', '["Pasado","Futuro"]', 'ligera', true),
  ('test-a-off', 'test-a', 'open', 'Pregunta apagada que nadie debe ver', null, 'ligera', false),
  ('test-hot-1', 'test-hot', 'open', 'Pregunta picante de prueba uno', null, 'picante', true),
  ('test-hot-2', 'test-hot', 'open', 'Pregunta picante de prueba dos', null, 'picante', false);

select pg_temp.as_user('C');
select pg_temp.expect_error($q$select public.get_daily_question()$q$, 'no_questions');
reset role;

-- Banco real de la prueba: 7 elegibles (4 en A, 3 en B) + las 11 apagadas de la racha.
insert into public.questions (slug, category, type, text, options, intensity, is_active) values
  ('test-a-1', 'test-a', 'open', 'Cuál es tu canción favorita para ustedes dos', null, 'ligera', true),
  ('test-a-2', 'test-a', 'open', 'Qué recuerdo guardas de su primer viaje', null, 'ligera', true),
  ('test-a-3', 'test-a', 'open', 'Qué te gustaría aprender junto a tu pareja', null, 'ligera', true),
  ('test-a-4', 'test-a', 'choice', 'Dónde pasarían un fin de semana largo', '["Playa","Montaña","Ciudad"]', 'ligera', true),
  ('test-b-1', 'test-b', 'open', 'Cuál fue tu ÚLTIMA aventura favorita', null, 'ligera', true),
  ('test-b-2', 'test-b', 'open', 'Qué platillo te recuerda a tu infancia', null, 'ligera', true),
  ('test-b-3', 'test-b', 'open', 'Qué hábito nuevo quisieras probar', null, 'ligera', true);
insert into public.questions (slug, category, type, text, intensity, is_active)
select 'test-st-' || n, 'test-st', 'open', 'Pregunta de racha número ' || n, 'ligera', false
from generate_series(0, 10) n;

do $$
begin
  assert (select count(*) from public.questions
          where is_active and type in ('open', 'choice') and intensity <> 'picante') = 7,
    'el banco de la prueba tiene 7 elegibles';
end $$;

-- =============================================================================
-- 4) Pareja nueva (P2): hoy siempre es válido; idempotencia entre miembros; días inválidos.
-- =============================================================================
select pg_temp.as_user('C');
do $$
declare
  card jsonb;
begin
  card := public.get_daily_question();
  assert (card->>'day')::date = pg_temp.today(), 'la pregunta de hoy tiene el día de hoy';
  assert pg_temp.isnull(card->'mine'), 'sin respuesta propia';
  assert pg_temp.isnull(card->'partner'), 'sin respuesta de la pareja';
  assert (card->>'partner_answered')::boolean = false, 'la pareja no ha contestado';
  assert (card->>'comment_count')::int = 0, 'sin comentarios';
  assert card->'question'->>'type' in ('open', 'choice'), 'solo open/choice';
  assert card->'question'->>'category_name' is not null, 'la tarjeta trae la categoría';
  insert into t_ids values ('p2_q', (card->'question'->>'id')::uuid);
  -- Idempotente: otra llamada (con y sin día explícito) da la misma.
  assert public.get_daily_question() = card, 'misma tarjeta al repetir';
  assert public.get_daily_question(pg_temp.today()) = card, 'misma tarjeta con día explícito';
end $$;
select pg_temp.as_user('D');
do $$
begin
  assert (public.get_daily_question()->'question'->>'id')::uuid = (select id from t_ids where k = 'p2_q'),
    'Dani recibe la misma pregunta que Caro';
  assert (select count(*) from public.daily_questions) = 1, 'una sola fila de pregunta del día';
end $$;
-- Pareja recién formada: ayer es anterior a que se unieron, mañana es futuro, hoy-8 es muy viejo.
select pg_temp.expect_error(format('select public.get_daily_question(%L)', pg_temp.today() - 1), 'invalid_day');
select pg_temp.expect_error(format('select public.get_daily_question(%L)', pg_temp.today() + 1), 'invalid_day');
select pg_temp.expect_error(format('select public.get_daily_question(%L)', pg_temp.today() - 8), 'invalid_day');
select pg_temp.expect_error(format('select public.get_daily_question(%L)', pg_temp.today() - 400), 'invalid_day');
reset role;
do $$
begin
  assert public.couple_today(pg_temp.cid(pg_temp.u('C'))) = pg_temp.today(), 'couple_today coincide con el helper';
  assert public.couple_start_day(pg_temp.cid(pg_temp.u('C'))) = pg_temp.today(),
    'pareja nueva: inicia hoy';
end $$;

-- =============================================================================
-- 5) P1: asignación de 8 días (rotación, sin repetir, tipos, agotar banco, límites).
-- =============================================================================
update public.couple_members set joined_at = now() - interval '10 days'
where couple_id = pg_temp.cid(pg_temp.u('A'));

select pg_temp.as_user('A');
-- Mañana y hoy-8 (aunque la pareja ya existía) son inválidos.
select pg_temp.expect_error(format('select public.get_daily_question(%L)', pg_temp.today() + 1), 'invalid_day');
select pg_temp.expect_error(format('select public.get_daily_question(%L)', pg_temp.today() - 8), 'invalid_day');
select pg_temp.expect_error(format('select public.get_daily_question(%L)', pg_temp.today() - 11), 'invalid_day');
-- Se asignan de la más vieja (hoy-7, válido) a hoy, para fijar el orden de rotación.
do $$
declare
  i integer;
  card jsonb;
begin
  for i in 0..7 loop
    card := public.get_daily_question(pg_temp.today() - 7 + i);
    assert (card->>'day')::date = pg_temp.today() - 7 + i, 'día de la tarjeta';
  end loop;
end $$;
select pg_temp.as_user('B');
do $$
begin
  -- Idempotente entre miembros.
  assert (public.get_daily_question()->'question'->>'id')::uuid = (
    select question_id from public.daily_questions where day = pg_temp.today()
  ), 'Beto recibe la misma pregunta de hoy que Ana';
  assert (select count(*) from public.daily_questions) = 8, 'una fila por día (8)';
end $$;
reset role;
do $$
declare
  c uuid := pg_temp.cid(pg_temp.u('A'));
  t date := pg_temp.today();
begin
  assert (select count(*) from public.daily_questions where couple_id = c) = 8, '8 días asignados';
  -- Solo open/choice, activas y no picantes.
  assert (select count(*) from public.daily_questions dq join public.questions q on q.id = dq.question_id
          where dq.couple_id = c
            and (q.type not in ('open', 'choice') or not q.is_active or q.intensity = 'picante')) = 0,
    'solo preguntas elegibles';
  -- Los primeros 7 días no repiten y agotan las 7 elegibles.
  assert (select count(distinct question_id) from public.daily_questions
          where couple_id = c and day < t) = 7, 'los 7 primeros días son distintos';
  -- Rotación: con 2 categorías, los primeros 6 días alternan.
  assert (select count(*) from (
            select q.category, lag(q.category) over (order by dq.day) as prev
            from public.daily_questions dq join public.questions q on q.id = dq.question_id
            where dq.couple_id = c and dq.day between t - 7 and t - 2
          ) s where s.category = s.prev) = 0, 'las categorías alternan';
  -- Banco agotado: hoy repite la asignada hace más tiempo (hoy-7).
  assert (select question_id from public.daily_questions where couple_id = c and day = t)
       = (select question_id from public.daily_questions where couple_id = c and day = t - 7),
    'al agotar el banco repite la asignada hace más tiempo';
end $$;

-- hoy-7 sigue siendo válido al pedirlo de nuevo (idempotente).
select pg_temp.as_user('A');
do $$
begin
  assert (public.get_daily_question(pg_temp.today() - 7)->>'day')::date = pg_temp.today() - 7, 'hoy-7 es válido';
end $$;
reset role;

-- =============================================================================
-- 6) P3: preguntas contestadas como extra no se asignan; visibilidad de apagadas asignadas.
-- =============================================================================
update public.couple_members set joined_at = now() - interval '10 days'
where couple_id = pg_temp.cid(pg_temp.u('F'));

select pg_temp.as_user('F');
do $$
declare
  s text;
begin
  foreach s in array array['test-a-1', 'test-a-2', 'test-a-3', 'test-b-1', 'test-b-2', 'test-b-3'] loop
    perform public.submit_answer(pg_temp.qid(s), 'respuesta extra');
  end loop;
  assert (select count(*) from public.answers where day is not null) = 0, 'las extra no tienen día';
  -- Solo queda sin contestar test-a-4: es la pregunta de hoy.
  assert (public.get_daily_question()->'question'->>'slug') = 'test-a-4', 'no repite las contestadas como extra';
  -- Si ya no queda nada nuevo, tampoco asigna la de hoy otra vez ni falla.
  assert (public.get_daily_question(pg_temp.today() - 1)->'question'->>'slug') <> 'test-a-4',
    'banco agotado: repite una, la de hoy (más reciente) es la última opción';
end $$;
select pg_temp.as_user('G');
do $$
begin
  perform public.submit_answer(pg_temp.qid('test-a-4'), null, 2);
  assert (select day from public.answers where user_id = pg_temp.u('G')) = pg_temp.today(),
    'la respuesta de la del día lleva el día';
end $$;
reset role;

-- Una pregunta apagada que ya fue asignada se sigue viendo; para otra pareja no existe.
insert into public.daily_questions (couple_id, day, question_id)
values (pg_temp.cid(pg_temp.u('F')), pg_temp.today() - 2, pg_temp.qid('test-a-off'));
select pg_temp.as_user('F');
do $$
begin
  assert (select count(*) from public.questions where slug = 'test-a-off') = 1, 'asignada apagada: visible (select)';
  assert public.get_question_with_answers(pg_temp.qid('test-a-off'))->'question'->>'slug' = 'test-a-off',
    'asignada apagada: visible (RPC)';
end $$;
select pg_temp.as_user('C');
do $$
begin
  assert (select count(*) from public.questions where slug = 'test-a-off') = 0, 'otra pareja no ve la apagada';
  assert (select count(*) from public.questions where slug = 'test-a-wyr') = 1, 'las activas no picantes se ven';
end $$;
select pg_temp.expect_error(format('select public.get_question_with_answers(%L)', pg_temp.qid('test-a-off')), 'question_not_found');
select pg_temp.expect_error(format('select public.submit_answer(%L, %L, null)', pg_temp.qid('test-a-off'), 'x'), 'question_not_found');
select pg_temp.expect_error(format('select public.get_question_with_answers(%L)', gen_random_uuid()), 'question_not_found');
reset role;

-- Una pregunta contestada y luego apagada sigue visible para esa pareja.
update public.questions set is_active = false where slug = 'test-a-1';
select pg_temp.as_user('F');
do $$
begin
  assert (select count(*) from public.questions where slug = 'test-a-1') = 1, 'contestada apagada: visible';
end $$;
select pg_temp.as_user('K'); -- Karla: su pareja aún no tiene nada asignado ni contestado
do $$
begin
  assert (select count(*) from public.questions where slug = 'test-a-1') = 0, 'apagada sin contestar: invisible';
end $$;
reset role;
update public.questions set is_active = true where slug = 'test-a-1';

-- =============================================================================
-- 7) Respuestas ocultas, validaciones, edición y borrado (P1 con preguntas extra).
-- =============================================================================
select pg_temp.as_user('A');
-- Validaciones de submit_answer.
select pg_temp.expect_error(format('select public.submit_answer(%L)', pg_temp.qid('test-a-1')), 'invalid_answer');
select pg_temp.expect_error(format('select public.submit_answer(%L, %L)', pg_temp.qid('test-a-1'), '   '), 'invalid_answer');
select pg_temp.expect_error(format('select public.submit_answer(%L, %L, 0)', pg_temp.qid('test-a-1'), 'hola'), 'invalid_answer');
select pg_temp.expect_error(format('select public.submit_answer(%L, %L)', pg_temp.qid('test-a-1'), repeat('x', 2001)), 'invalid_answer');
select pg_temp.expect_error(format('select public.submit_answer(%L)', pg_temp.qid('test-a-4')), 'invalid_answer');
select pg_temp.expect_error(format('select public.submit_answer(%L, %L)', pg_temp.qid('test-a-4'), 'solo texto'), 'invalid_answer');
select pg_temp.expect_error(format('select public.submit_answer(%L, null, -1)', pg_temp.qid('test-a-4')), 'invalid_answer');
select pg_temp.expect_error(format('select public.submit_answer(%L, null, 3)', pg_temp.qid('test-a-4')), 'invalid_answer');
select pg_temp.expect_error(format('select public.submit_answer(%L, null, 99)', pg_temp.qid('test-a-4')), 'invalid_answer');
select pg_temp.expect_error(format('select public.submit_answer(%L, %L, 1)', pg_temp.qid('test-a-4'), repeat('x', 501)), 'invalid_answer');
-- Las preguntas de juegos no se contestan aquí.
select pg_temp.expect_error(format('select public.submit_answer(%L, %L)', pg_temp.qid('test-a-wyr'), 'x'), 'invalid_answer');
select pg_temp.expect_error(format('select public.submit_answer(%L, %L)', gen_random_uuid(), 'x'), 'question_not_found');
do $$
begin
  assert (select count(*) from public.answers) = 0, 'las inválidas no guardan nada';
  -- Límites válidos.
  perform public.submit_answer(pg_temp.qid('test-a-4'), repeat('x', 500), 2);
  perform public.submit_answer(pg_temp.qid('test-a-4'), null, 0);
  assert (select choice from public.answers where question_id = pg_temp.qid('test-a-4')) = 0, 'choice sin texto';
  assert (select text from public.answers where question_id = pg_temp.qid('test-a-4')) is null, 'texto opcional en choice';
  perform public.delete_answer(pg_temp.qid('test-a-4'));
  perform public.submit_answer(pg_temp.qid('test-a-1'), repeat('x', 2000));
  perform public.delete_answer(pg_temp.qid('test-a-1'));
  assert (select count(*) from public.answers) = 0, 'limpio';
end $$;

-- Antes de contestar, la pareja no ve nada.
select pg_temp.as_user('B');
do $$
declare
  card jsonb := public.get_question_with_answers(pg_temp.qid('test-a-1'));
begin
  assert pg_temp.isnull(card->'mine'), 'Beto sin respuesta';
  assert pg_temp.isnull(card->'partner'), 'Beto sin respuesta de la pareja';
  assert (card->>'partner_answered')::boolean = false, 'nadie ha contestado';
end $$;
select pg_temp.as_user('A');
do $$
declare
  card jsonb;
begin
  card := public.submit_answer(pg_temp.qid('test-a-1'), '  hola Beto  ');
  assert card->'mine'->>'text' = 'hola Beto', 'texto recortado';
  assert card->'mine'->>'user_id' = pg_temp.u('A')::text, 'user_id del servidor';
  assert pg_temp.isnull(card->'partner'), 'Beto no ha contestado';
  assert (card->>'partner_answered')::boolean = false, 'Beto no ha contestado (flag)';
  assert card->'question'->>'slug' = 'test-a-1', 'tarjeta de la pregunta';
end $$;
-- Beto no ve la respuesta de Ana hasta contestar (RPC y RLS), pero sabe que contestó.
select pg_temp.as_user('B');
do $$
declare
  card jsonb := public.get_question_with_answers(pg_temp.qid('test-a-1'));
begin
  assert pg_temp.isnull(card->'partner'), 'RPC: respuesta oculta';
  assert pg_temp.isnull(card->'mine'), 'Beto aún sin respuesta';
  assert (card->>'partner_answered')::boolean, 'RPC: sabe que Ana contestó';
  assert (select count(*) from public.answers where question_id = pg_temp.qid('test-a-1')) = 0,
    'RLS: select * from answers no muestra la de Ana';
  assert (select count(*) from public.answers) = 0, 'RLS: tabla vacía para Beto';
  -- Contesta: se revela.
  card := public.submit_answer(pg_temp.qid('test-a-1'), 'hola Ana');
  assert card->'partner'->>'text' = 'hola Beto', 'RPC: se revela la de Ana';
  assert (card->>'partner_answered')::boolean, 'flag sigue true';
  assert (select count(*) from public.answers where question_id = pg_temp.qid('test-a-1')) = 2, 'RLS: ve las dos';
end $$;
select pg_temp.as_user('A');
do $$
begin
  assert public.get_question_with_answers(pg_temp.qid('test-a-1'))->'partner'->>'text' = 'hola Ana',
    'Ana ve la de Beto';
  assert (select count(*) from public.answers where question_id = pg_temp.qid('test-a-1')) = 2, 'RLS: Ana ve las dos';
end $$;

-- Editar actualiza sin duplicar.
do $$
declare
  v_id uuid;
  card jsonb;
begin
  select id into v_id from public.answers
  where question_id = pg_temp.qid('test-a-1') and user_id = pg_temp.u('A');
  card := public.submit_answer(pg_temp.qid('test-a-1'), 'hola de nuevo');
  assert (select count(*) from public.answers
          where question_id = pg_temp.qid('test-a-1') and user_id = pg_temp.u('A')) = 1, 'no duplica';
  assert (card->'mine'->>'id')::uuid = v_id, 'misma fila';
  assert card->'mine'->>'text' = 'hola de nuevo', 'texto actualizado';
  assert (card->'mine'->>'updated_at')::timestamptz >= (card->'mine'->>'created_at')::timestamptz, 'updated_at';
end $$;

-- Otra pareja no ve nada, aunque conteste la misma pregunta normal.
select pg_temp.as_user('C');
do $$
declare
  card jsonb := public.get_question_with_answers(pg_temp.qid('test-a-1'));
begin
  assert pg_temp.isnull(card->'mine') and pg_temp.isnull(card->'partner'), 'otra pareja: nada ajeno';
  assert (card->>'partner_answered')::boolean = false, 'Dani no contestó';
  assert (select count(*) from public.answers) = 0, 'otra pareja: select vacío';
  card := public.submit_answer(pg_temp.qid('test-a-1'), 'Caro responde');
  assert pg_temp.isnull(card->'partner'), 'nunca ve las de otra pareja';
  assert (select count(*) from public.answers) = 1, 'solo la suya';
  assert (select count(*) from public.answers where user_id in (pg_temp.u('A'), pg_temp.u('B'))) = 0,
    'no ve respuestas de P1';
end $$;
select pg_temp.as_user('A');
do $$
begin
  assert (select count(*) from public.answers where user_id = pg_temp.u('C')) = 0, 'Ana no ve la de Caro';
  assert (select count(*) from public.answers) = 2, 'Ana solo ve las de su pareja';
end $$;

-- Borrar la propia respuesta vuelve a ocultar la de la pareja.
select public.delete_answer(pg_temp.qid('test-a-1'));
select public.delete_answer(pg_temp.qid('test-a-1')); -- idempotente
do $$
declare
  card jsonb := public.get_question_with_answers(pg_temp.qid('test-a-1'));
begin
  assert pg_temp.isnull(card->'mine'), 'Ana ya no tiene respuesta';
  assert pg_temp.isnull(card->'partner'), 'oculta otra vez la de Beto (RPC)';
  assert (card->>'partner_answered')::boolean, 'Beto sí contestó';
  assert (select count(*) from public.answers where question_id = pg_temp.qid('test-a-1')) = 0,
    'oculta otra vez la de Beto (RLS)';
end $$;
select pg_temp.as_user('B');
do $$
begin
  assert pg_temp.isnull(public.get_question_with_answers(pg_temp.qid('test-a-1'))->'partner'),
    'Ana borró: Beto ya no ve la suya';
  assert (public.get_question_with_answers(pg_temp.qid('test-a-1'))->>'partner_answered')::boolean = false,
    'Ana ya no ha contestado';
  -- Borrar solo afecta la propia: Beto no puede borrar la de Ana (no existe) y la suya sigue.
  perform public.delete_answer(pg_temp.qid('test-a-1'));
  assert (select count(*) from public.answers where question_id = pg_temp.qid('test-a-1')) = 0, 'Beto borró la suya';
end $$;
-- Ambos vuelven a contestar (los comentarios la necesitan).
select pg_temp.as_user('A'); select public.submit_answer(pg_temp.qid('test-a-1'), 'Ana otra vez');
select pg_temp.as_user('B'); select public.submit_answer(pg_temp.qid('test-a-1'), 'Beto otra vez');

-- Contestar la pregunta del día: revelado y trigger touch_daily_question.
-- La de hoy es al azar: puede coincidir con una ya contestada arriba, así que se limpia primero.
reset role;
delete from public.answers
where couple_id = pg_temp.cid(pg_temp.u('A'))
  and question_id = (select question_id from public.daily_questions
                     where couple_id = pg_temp.cid(pg_temp.u('A')) and day = pg_temp.today());
update public.daily_questions set updated_at = '2000-01-01' where couple_id = pg_temp.cid(pg_temp.u('A'));
select pg_temp.as_user('A');
do $$
declare
  card jsonb := public.get_daily_question();
  q uuid := (card->'question'->>'id')::uuid;
begin
  insert into t_ids values ('p1_q', q);
  if card->'question'->>'type' = 'open' then
    perform public.submit_answer(q, 'respuesta de Ana');
  else
    perform public.submit_answer(q, 'respuesta de Ana', 0);
  end if;
  assert (select count(*) from public.answers where question_id = q) = 1, 'solo la de Ana';
end $$;
reset role;
do $$
declare
  c uuid := pg_temp.cid(pg_temp.u('A'));
  q uuid := (select id from t_ids where k = 'p1_q');
begin
  -- El trigger toca las filas del día de esa pregunta y solo esas.
  assert (select count(*) from public.daily_questions where couple_id = c and question_id = q and updated_at > '2000-01-02') >= 1,
    'trigger: al contestar se actualiza daily_questions.updated_at';
  assert (select count(*) from public.daily_questions where couple_id = c and question_id <> q and updated_at > '2000-01-02') = 0,
    'trigger: no toca los otros días';
  assert (select count(*) from public.daily_questions where couple_id = c and question_id <> q) >= 5, 'hay otros días';
end $$;
select pg_temp.as_user('B');
do $$
declare
  card jsonb := public.get_daily_question();
  q uuid := (select id from t_ids where k = 'p1_q');
begin
  assert (card->'question'->>'id')::uuid = q, 'misma pregunta del día';
  assert pg_temp.isnull(card->'partner'), 'oculta antes de contestar';
  assert (card->>'partner_answered')::boolean, 'Beto sabe que Ana contestó';
  assert (select count(*) from public.answers where question_id = q) = 0, 'RLS oculta la de Ana';
end $$;
reset role;
update public.daily_questions set updated_at = '2000-01-01' where couple_id = pg_temp.cid(pg_temp.u('A'));
select pg_temp.as_user('B');
do $$
declare
  card jsonb := public.get_daily_question();
  q uuid := (select id from t_ids where k = 'p1_q');
begin
  if card->'question'->>'type' = 'open' then
    card := public.submit_answer(q, 'respuesta de Beto');
  else
    card := public.submit_answer(q, 'respuesta de Beto', 1);
  end if;
  assert card->'partner'->>'text' = 'respuesta de Ana', 'se revela la de Ana al contestar';
  assert card->'mine'->>'text' = 'respuesta de Beto', 'mi respuesta';
  assert (card->>'day')::date = pg_temp.today(), 'la tarjeta lleva el día';
  assert (select day from public.answers where user_id = pg_temp.u('B') and question_id = q) is not null,
    'la respuesta guarda el día de la pregunta';
end $$;
reset role;
do $$
declare
  c uuid := pg_temp.cid(pg_temp.u('A'));
  q uuid := (select id from t_ids where k = 'p1_q');
begin
  assert (select count(*) from public.daily_questions where couple_id = c and question_id = q and updated_at > '2000-01-02') >= 1,
    'trigger: insert de la segunda respuesta';
  update public.daily_questions set updated_at = '2000-01-01' where couple_id = c;
end $$;
-- Borrar y editar también tocan la fila.
select pg_temp.as_user('A');
select public.delete_answer((select id from t_ids where k = 'p1_q'));
reset role;
do $$
declare
  c uuid := pg_temp.cid(pg_temp.u('A'));
  q uuid := (select id from t_ids where k = 'p1_q');
begin
  assert (select count(*) from public.daily_questions where couple_id = c and question_id = q and updated_at > '2000-01-02') >= 1,
    'trigger: delete_answer';
  update public.daily_questions set updated_at = '2000-01-01' where couple_id = c;
end $$;
select pg_temp.as_user('B');
do $$
declare
  q uuid := (select id from t_ids where k = 'p1_q');
begin
  perform pg_temp.answer_any(q, 'Beto edita');
end $$;
reset role;
do $$
declare
  c uuid := pg_temp.cid(pg_temp.u('A'));
  q uuid := (select id from t_ids where k = 'p1_q');
begin
  assert (select count(*) from public.daily_questions where couple_id = c and question_id = q and updated_at > '2000-01-02') >= 1,
    'trigger: edición';
  -- Una pregunta extra (sin fila en daily_questions) no rompe nada ni crea filas.
  assert (select count(*) from public.daily_questions where couple_id = c) = 8, 'siguen 8 filas del día';
end $$;
-- Ana vuelve a contestar la del día: ambas listas para la racha/historial.
select pg_temp.as_user('A');
do $$
declare
  q uuid := (select id from t_ids where k = 'p1_q');
begin
  perform pg_temp.answer_any(q, 'Ana de nuevo');
  assert (select count(*) from public.answers where question_id = q) = 2, 'ambas visibles de nuevo';
end $$;
-- daily_questions: cada pareja ve solo las suyas.
do $$
begin
  assert (select count(*) from public.daily_questions) = 8, 'Ana ve sus 8 días';
end $$;
select pg_temp.as_user('C');
do $$
begin
  assert (select count(*) from public.daily_questions) = 1, 'Caro ve solo su día';
end $$;
reset role;

-- =============================================================================
-- 8) Comentarios (P1).
-- =============================================================================
-- Estado limpio: test-b-1 sin respuestas ni comentarios; test-a-1 contestada por los dos
-- (la pregunta del día, al azar, pudo haber tocado cualquiera de las dos).
reset role;
delete from public.answer_comments where question_id = pg_temp.qid('test-b-1');
delete from public.answers
where couple_id = pg_temp.cid(pg_temp.u('A')) and question_id = pg_temp.qid('test-b-1');
select pg_temp.as_user('A'); select public.submit_answer(pg_temp.qid('test-a-1'), 'Ana comenta');
select pg_temp.as_user('B'); select public.submit_answer(pg_temp.qid('test-a-1'), 'Beto comenta');
select pg_temp.as_user('A');
-- Validaciones (invalid_comment va antes que not_answered).
select pg_temp.expect_error(format('select public.add_comment(%L, %L)', pg_temp.qid('test-b-1'), ''), 'invalid_comment');
select pg_temp.expect_error(format('select public.add_comment(%L, %L)', pg_temp.qid('test-b-1'), '   '), 'invalid_comment');
select pg_temp.expect_error(format('select public.add_comment(%L, null)', pg_temp.qid('test-b-1')), 'invalid_comment');
select pg_temp.expect_error(format('select public.add_comment(%L, %L)', pg_temp.qid('test-a-1'), repeat('x', 1001)), 'invalid_comment');
-- Sin haber contestado: not_answered.
select pg_temp.expect_error(format('select public.add_comment(%L, %L)', pg_temp.qid('test-b-1'), 'hola'), 'not_answered');
select pg_temp.expect_error(format('select public.add_comment(%L, %L)', gen_random_uuid(), 'hola'), 'not_answered');
do $$
declare
  c public.answer_comments;
begin
  c := public.add_comment(pg_temp.qid('test-a-1'), '  Qué lindo recuerdo  ');
  assert c.body = 'Qué lindo recuerdo', 'cuerpo recortado';
  assert c.user_id = pg_temp.u('A'), 'user_id del servidor';
  assert c.couple_id = pg_temp.cid(pg_temp.u('A')), 'couple_id del servidor';
  assert c.reactions = '{}'::jsonb, 'sin reacciones';
  insert into t_ids values ('c1', c.id);
  c := public.add_comment(pg_temp.qid('test-a-1'), repeat('x', 1000));
  insert into t_ids values ('c2', c.id);
end $$;
select pg_temp.as_user('B');
do $$
declare
  c public.answer_comments;
begin
  assert (select count(*) from public.answer_comments where question_id = pg_temp.qid('test-a-1')) = 2,
    'Beto (ya contestó) ve los comentarios de Ana';
  c := public.add_comment(pg_temp.qid('test-a-1'), 'Yo también');
  insert into t_ids values ('c3', c.id);
  assert (public.get_question_with_answers(pg_temp.qid('test-a-1'))->>'comment_count')::int = 3, 'comment_count 3';
end $$;
-- Quien no ha contestado no ve el hilo (RLS) ni el conteo.
select pg_temp.as_user('A');
select public.submit_answer(pg_temp.qid('test-b-1'), 'Mi aventura');
do $$
declare
  c public.answer_comments;
begin
  c := public.add_comment(pg_temp.qid('test-b-1'), 'Comentario oculto');
  insert into t_ids values ('c4', c.id);
  assert (public.get_question_with_answers(pg_temp.qid('test-b-1'))->>'comment_count')::int = 1, 'Ana ve su comentario';
end $$;
select pg_temp.as_user('B');
do $$
begin
  assert (select count(*) from public.answer_comments where question_id = pg_temp.qid('test-b-1')) = 0,
    'Beto sin contestar no ve comentarios (RLS)';
  assert (public.get_question_with_answers(pg_temp.qid('test-b-1'))->>'comment_count')::int = 0,
    'Beto sin contestar no ve el conteo';
end $$;
select pg_temp.expect_error(format('select public.add_comment(%L, %L)', pg_temp.qid('test-b-1'), 'hola'), 'not_answered');
select pg_temp.expect_error(format('select public.react_to_comment(%L, %L)', (select id from t_ids where k = 'c4'), '😂'), 'comment_not_found');
select public.submit_answer(pg_temp.qid('test-b-1'), 'Mi aventura de Beto');
do $$
begin
  assert (select count(*) from public.answer_comments where question_id = pg_temp.qid('test-b-1')) = 1,
    'al contestar ve el comentario';
  assert (public.get_question_with_answers(pg_temp.qid('test-b-1'))->>'comment_count')::int = 1, 'y el conteo';
end $$;

-- Otra pareja (que también contestó la pregunta) no ve ni toca los comentarios de P1.
select pg_temp.as_user('C');
do $$
declare
  c public.answer_comments;
begin
  assert (select count(*) from public.answer_comments) = 0, 'Caro no ve comentarios ajenos';
  c := public.add_comment(pg_temp.qid('test-a-1'), 'Comentario de Caro');
  insert into t_ids values ('c5', c.id);
  assert (select count(*) from public.answer_comments) = 1, 'Caro ve el suyo';
  assert (public.get_question_with_answers(pg_temp.qid('test-a-1'))->>'comment_count')::int = 1, 'conteo propio';
end $$;
select pg_temp.expect_error(format('select public.delete_comment(%L)', (select id from t_ids where k = 'c1')), 'comment_not_found');
select pg_temp.expect_error(format('select public.react_to_comment(%L, %L)', (select id from t_ids where k = 'c1'), '😂'), 'comment_not_found');
select pg_temp.as_user('A');
do $$
begin
  assert (select count(*) from public.answer_comments where user_id = pg_temp.u('C')) = 0, 'Ana no ve el de Caro';
  assert (public.get_question_with_answers(pg_temp.qid('test-a-1'))->>'comment_count')::int = 3, 'conteo sin los ajenos';
end $$;

-- Reacciones: una por persona; poner, cambiar y quitar.
select pg_temp.as_user('B');
do $$
declare
  c public.answer_comments;
  cid uuid := (select id from t_ids where k = 'c1');
begin
  c := public.react_to_comment(cid, '😂');
  assert c.reactions = jsonb_build_object(pg_temp.u('B')::text, '😂'), 'Beto pone 😂';
  c := public.react_to_comment(cid, '❤️');
  assert c.reactions = jsonb_build_object(pg_temp.u('B')::text, '❤️'), 'Beto cambia a ❤️';
  assert (select count(*) from jsonb_object_keys(c.reactions)) = 1, 'una reacción por persona';
  c := public.react_to_comment(cid, '❤️');
  assert c.reactions = '{}'::jsonb, 'mismo emoji la quita';
  c := public.react_to_comment(cid, '😂');
  assert c.reactions ->> pg_temp.u('B')::text = '😂', 'vuelve a poner';
end $$;
select pg_temp.as_user('A');
do $$
declare
  c public.answer_comments;
  cid uuid := (select id from t_ids where k = 'c1');
begin
  c := public.react_to_comment(cid, '😂');
  assert (select count(*) from jsonb_object_keys(c.reactions)) = 2, 'dos personas, dos reacciones';
  assert c.reactions ->> pg_temp.u('A')::text = '😂' and c.reactions ->> pg_temp.u('B')::text = '😂', 'cada quien la suya';
  c := public.react_to_comment(cid, null);
  assert c.reactions = jsonb_build_object(pg_temp.u('B')::text, '😂'), 'null quita solo la mía';
  c := public.react_to_comment(cid, '   ');
  assert c.reactions = jsonb_build_object(pg_temp.u('B')::text, '😂'), 'vacío quita (nada que quitar)';
  -- Se ve en select.
  assert (select reactions from public.answer_comments where id = cid) = c.reactions, 'select refleja reacciones';
end $$;
select pg_temp.expect_error(format('select public.react_to_comment(%L, %L)', (select id from t_ids where k = 'c1'), 'a b'), 'invalid_reaction');
select pg_temp.expect_error(format('select public.react_to_comment(%L, %L)', (select id from t_ids where k = 'c1'), repeat('x', 17)), 'invalid_reaction');
select pg_temp.expect_error(format('select public.react_to_comment(%L, %L)', gen_random_uuid(), '😂'), 'comment_not_found');

-- Borrar: solo el propio.
select pg_temp.as_user('B');
select pg_temp.expect_error(format('select public.delete_comment(%L)', (select id from t_ids where k = 'c1')), 'comment_not_found');
select pg_temp.as_user('A');
select public.delete_comment((select id from t_ids where k = 'c2'));
select pg_temp.expect_error(format('select public.delete_comment(%L)', (select id from t_ids where k = 'c2')), 'comment_not_found');
select pg_temp.expect_error(format('select public.delete_comment(%L)', gen_random_uuid()), 'comment_not_found');
select pg_temp.expect_error(format('select public.delete_comment(%L)', (select id from t_ids where k = 'c3')), 'comment_not_found');
do $$
begin
  assert (select count(*) from public.answer_comments where question_id = pg_temp.qid('test-a-1')) = 2,
    'quedan c1 y c3';
end $$;
-- Si Ana borra su respuesta ya no ve el hilo ni puede comentar ni reaccionar.
select public.delete_answer(pg_temp.qid('test-a-1'));
do $$
begin
  assert (select count(*) from public.answer_comments where question_id = pg_temp.qid('test-a-1')) = 0,
    'sin contestar no ve el hilo';
end $$;
select pg_temp.expect_error(format('select public.add_comment(%L, %L)', pg_temp.qid('test-a-1'), 'hola'), 'not_answered');
select pg_temp.expect_error(format('select public.react_to_comment(%L, %L)', (select id from t_ids where k = 'c3'), '😂'), 'comment_not_found');
select public.submit_answer(pg_temp.qid('test-a-1'), 'Ana, tercera vez');
reset role;

-- =============================================================================
-- 9) Toques (nudges).
-- =============================================================================
select pg_temp.as_user('E');
select pg_temp.expect_error($q$select public.send_nudge()$q$, 'no_couple');
select pg_temp.as_user('A');
select pg_temp.expect_error($q$select public.send_nudge('otro')$q$, 'invalid_nudge');
select pg_temp.expect_error($q$select public.send_nudge(null)$q$, 'invalid_nudge');
do $$
declare
  n public.nudges;
begin
  n := public.send_nudge();
  assert n.from_user = pg_temp.u('A') and n.to_user = pg_temp.u('B'), 'de Ana para Beto';
  assert n.kind = 'answer', 'tipo answer';
  assert n.couple_id = pg_temp.cid(pg_temp.u('A')), 'pareja';
end $$;
select pg_temp.expect_error($q$select public.send_nudge()$q$, 'nudge_too_soon');
select pg_temp.expect_error($q$select public.send_nudge('answer')$q$, 'nudge_too_soon');
-- El límite es por remitente: Beto sí puede.
select pg_temp.as_user('B');
do $$
begin
  perform public.send_nudge();
  assert (select count(*) from public.nudges) = 2, 'Beto ve el que recibió y el que mandó';
end $$;
select pg_temp.as_user('A');
do $$
begin
  assert (select count(*) from public.nudges) = 2, 'Ana ve los dos';
end $$;
-- Terceros no ven los toques.
select pg_temp.as_user('C');
do $$ begin assert (select count(*) from public.nudges) = 0, 'otra pareja no ve toques'; end $$;
select pg_temp.as_user('E');
do $$ begin assert (select count(*) from public.nudges) = 0, 'sin pareja no ve toques'; end $$;
-- Pasan los 10 minutos.
reset role;
update public.nudges set created_at = now() - interval '9 minutes' where from_user = pg_temp.u('A');
select pg_temp.as_user('A');
select pg_temp.expect_error($q$select public.send_nudge()$q$, 'nudge_too_soon');
reset role;
update public.nudges set created_at = now() - interval '11 minutes' where from_user = pg_temp.u('A');
select pg_temp.as_user('A');
do $$
begin
  perform public.send_nudge();
  assert (select count(*) from public.nudges) = 3, 'a los 11 minutos se puede otra vez';
end $$;
reset role;

-- =============================================================================
-- 10) Racha (P4: Hugo + Ines).
-- =============================================================================
-- Día completo = ambos contestaron. p_h / p_i = desfase (en días respecto a hoy) de cuándo
-- contestó cada quien; null = no contestó.
create function pg_temp.mk_day(p_off int, p_h int, p_i int) returns void language plpgsql as $$
declare
  c uuid := pg_temp.cid(pg_temp.u('H'));
  d date := pg_temp.today() + p_off;
  q uuid := pg_temp.qid('test-st-' || (10 + p_off));
begin
  insert into public.daily_questions (couple_id, day, question_id) values (c, d, q);
  if p_h is not null then
    insert into public.answers (couple_id, question_id, user_id, day, text, created_at)
    values (c, q, pg_temp.u('H'), d, 'h', pg_temp.at(pg_temp.today() + p_h));
  end if;
  if p_i is not null then
    insert into public.answers (couple_id, question_id, user_id, day, text, created_at)
    values (c, q, pg_temp.u('I'), d, 'i', pg_temp.at(pg_temp.today() + p_i));
  end if;
end;
$$;
create function pg_temp.clear_p4() returns void language plpgsql as $$
declare
  c uuid := pg_temp.cid(pg_temp.u('H'));
begin
  delete from public.answers where couple_id = c;
  delete from public.daily_questions where couple_id = c;
end;
$$;

-- Inicio de la pareja: el último miembro en unirse (Ines, hace 3 días).
update public.couple_members set joined_at = now() - interval '10 days' where user_id = pg_temp.u('H');
update public.couple_members set joined_at = now() - interval '3 days' where user_id = pg_temp.u('I');
select pg_temp.as_user('H');
select pg_temp.expect_error(format('select public.get_daily_question(%L)', pg_temp.today() - 4), 'invalid_day');
do $$
begin
  assert (public.get_daily_question(pg_temp.today() - 3)->>'day')::date = pg_temp.today() - 3,
    'el día en que se unió el segundo es válido';
  assert (public.get_streak()->'missing_days') = to_jsonb(array[pg_temp.today() - 3, pg_temp.today() - 2, pg_temp.today() - 1]),
    'missing_days solo desde que se unieron';
end $$;
reset role;
update public.couple_members set joined_at = now() - interval '10 days' where user_id = pg_temp.u('I');

-- Sin nada: racha 0.
select pg_temp.clear_p4();
select pg_temp.as_user('H');
do $$
declare
  s jsonb := public.get_streak();
  t date := pg_temp.today();
begin
  assert (s->>'current')::int = 0 and (s->>'best')::int = 0, 'sin días: racha 0';
  assert (s->>'today')::date = t, 'today';
  assert (s->>'today_done')::boolean = false, 'hoy sin completar';
  assert s->'missing_days' = to_jsonb(array[t-7, t-6, t-5, t-4, t-3, t-2, t-1]), 'faltan los 7 (sin hoy)';
end $$;

-- S1: 3 días completos seguidos; hoy incompleto no rompe.
reset role;
select pg_temp.mk_day(-3, -3, -3);
select pg_temp.mk_day(-2, -2, -2);
select pg_temp.mk_day(-1, -1, -1);
select pg_temp.mk_day(0, 0, null); -- hoy: solo Hugo
select pg_temp.as_user('H');
do $$
declare
  s jsonb := public.get_streak();
  t date := pg_temp.today();
begin
  assert (s->>'current')::int = 3 and (s->>'best')::int = 3, 'S1: racha de 3 hasta ayer';
  assert (s->>'today_done')::boolean = false, 'S1: hoy incompleto';
  assert s->'missing_days' = to_jsonb(array[t-7, t-6, t-5, t-4]), 'S1: faltantes dentro de los últimos 7, sin hoy';
end $$;
select pg_temp.as_user('I');
do $$
begin
  assert (public.get_streak()->>'current')::int = 3, 'S1: Ines ve la misma racha';
  -- Ines completa hoy: la racha crece.
  perform public.get_daily_question(); -- ya existe la fila de hoy: idempotente
end $$;
reset role;
insert into public.answers (couple_id, question_id, user_id, day, text)
values (pg_temp.cid(pg_temp.u('H')), pg_temp.qid('test-st-10'), pg_temp.u('I'), pg_temp.today(), 'i');
select pg_temp.as_user('H');
do $$
declare
  s jsonb := public.get_streak();
  t date := pg_temp.today();
begin
  assert (s->>'current')::int = 4 and (s->>'best')::int = 4, 'S1: con hoy completo, 4';
  assert (s->>'today_done')::boolean, 'S1: hoy listo';
  assert s->'missing_days' = to_jsonb(array[t-7, t-6, t-5, t-4]), 'S1: faltantes igual';
end $$;

-- S2: best vs current: racha vieja de 4 y racha actual de 2, con hueco en medio.
reset role;
select pg_temp.clear_p4();
select pg_temp.mk_day(-9, -9, -9);
select pg_temp.mk_day(-8, -8, -8);
select pg_temp.mk_day(-7, -7, -7);
select pg_temp.mk_day(-6, -6, -6);
select pg_temp.mk_day(-2, -2, -2);
select pg_temp.mk_day(-1, -1, -1);
select pg_temp.as_user('H');
do $$
declare
  s jsonb := public.get_streak();
  t date := pg_temp.today();
begin
  assert (s->>'current')::int = 2, 'S2: actual 2';
  assert (s->>'best')::int = 4, 'S2: récord 4';
  assert s->'missing_days' = to_jsonb(array[t-5, t-4, t-3]), 'S2: faltantes (los completos no aparecen)';
end $$;

-- S3: un hueco ayer rompe la racha (aunque hoy esté pendiente); contestar uno solo no completa el día.
reset role;
select pg_temp.clear_p4();
select pg_temp.mk_day(-3, -3, -3);
select pg_temp.mk_day(-2, -2, -2);
select pg_temp.mk_day(-1, -1, null); -- solo Hugo contestó ayer
select pg_temp.as_user('H');
do $$
declare
  s jsonb := public.get_streak();
  t date := pg_temp.today();
begin
  assert (s->>'current')::int = 0, 'S3: el hueco de ayer rompe la racha actual';
  assert (s->>'best')::int = 2, 'S3: el récord se conserva';
  assert s->'missing_days' = to_jsonb(array[t-7, t-6, t-5, t-4, t-1]), 'S3: ayer sigue pendiente (reparable)';
end $$;

-- S4: reparar un día faltante contestándolo después (<= 7 días) lo cuenta.
reset role;
select pg_temp.clear_p4();
select pg_temp.mk_day(-4, -4, -4);
select pg_temp.mk_day(-3, -3, -1); -- Ines lo contestó 2 días después
select pg_temp.mk_day(-2, -2, -2);
select pg_temp.mk_day(-1, -1, -1);
select pg_temp.as_user('H');
do $$
declare
  s jsonb := public.get_streak();
  t date := pg_temp.today();
begin
  assert (s->>'current')::int = 4 and (s->>'best')::int = 4, 'S4: el día reparado cuenta';
  assert s->'missing_days' = to_jsonb(array[t-7, t-6, t-5]), 'S4: el reparado ya no falta';
end $$;

-- S4b: contestar 7 días después aún cuenta; 8 días después ya no.
reset role;
select pg_temp.clear_p4();
select pg_temp.mk_day(-10, -10, -2); -- 8 días después: no cuenta
select pg_temp.mk_day(-9, -9, -2);   -- 7 días después: cuenta
select pg_temp.as_user('H');
do $$
declare
  s jsonb := public.get_streak();
  t date := pg_temp.today();
begin
  assert (s->>'best')::int = 1, 'S4b: solo cuenta el reparado en 7 días';
  assert (s->>'current')::int = 0, 'S4b: sin días recientes';
  assert s->'missing_days' = to_jsonb(array[t-7, t-6, t-5, t-4, t-3, t-2, t-1]),
    'S4b: missing_days limitado a los últimos 7';
end $$;

-- S5: las respuestas de un ex miembro no cuentan; missing_days solo con 2 miembros.
reset role;
select pg_temp.clear_p4();
select pg_temp.mk_day(-3, -3, -3);
select pg_temp.mk_day(-2, -2, -2);
select pg_temp.mk_day(-1, -1, -1);
select pg_temp.as_user('H');
do $$
begin
  assert (public.get_streak()->>'current')::int = 3, 'S5: racha de 3 antes de que Ines salga';
  assert (select count(*) from public.answers where user_id = pg_temp.u('I')) = 3, 'Hugo ve las de Ines (contestó)';
end $$;
select pg_temp.as_user('I');
select public.leave_couple();
select pg_temp.as_user('H');
do $$
declare
  s jsonb := public.get_streak();
begin
  assert (s->>'current')::int = 0 and (s->>'best')::int = 0, 'S5: sin Ines no hay días completos';
  assert s->'missing_days' = '[]'::jsonb, 'S5: con un solo miembro no hay faltantes';
  assert (select count(*) from public.answers where user_id = pg_temp.u('I')) = 0,
    'S5: RLS no muestra respuestas del ex miembro';
end $$;
select pg_temp.expect_error($q$select public.send_nudge()$q$, 'no_partner');
reset role;
do $$
begin
  assert (select count(*) from public.answers where user_id = pg_temp.u('I')) = 3, 'las respuestas de Ines siguen en la tabla';
end $$;
-- Jaime entra: su racha empieza hoy; sus faltantes, desde que entró.
select pg_temp.as_user('J');
select public.join_couple(pg_temp.code_of(pg_temp.u('H')));
select pg_temp.as_user('H');
do $$
declare
  s jsonb := public.get_streak();
  t date := pg_temp.today();
begin
  assert (s->>'best')::int = 0 and (s->>'current')::int = 0, 'S5: con Jaime, las de Ines no cuentan';
  assert s->'missing_days' = '[]'::jsonb, 'S5: Jaime se unió hoy: sin faltantes';
  assert (select count(*) from public.answers where user_id = pg_temp.u('I')) = 0, 'Hugo no ve las de Ines';
  assert pg_temp.isnull(public.get_daily_question()->'partner'), 'sigue sin ver nada ajeno';
end $$;
reset role;
update public.couple_members set joined_at = now() - interval '3 days' where user_id = pg_temp.u('J');
select pg_temp.as_user('H');
do $$
declare
  t date := pg_temp.today();
begin
  assert public.get_streak()->'missing_days' = to_jsonb(array[t-3, t-2, t-1]), 'S5: faltantes desde que entró Jaime';
end $$;
select pg_temp.as_user('J');
do $$
begin
  assert (select count(*) from public.answers where user_id = pg_temp.u('I')) = 0, 'Jaime no ve las de Ines';
end $$;
reset role;

-- Otra pareja sin días: su racha es independiente.
select pg_temp.as_user('C');
do $$
begin
  assert (public.get_streak()->>'best')::int = 0, 'la racha es por pareja';
end $$;
reset role;

-- =============================================================================
-- 11) Historial y preguntas por categoría (P5: Karla + Luis).
-- =============================================================================
select pg_temp.as_user('K');
select public.submit_answer(pg_temp.qid('test-b-1'), 'Un viaje en moto');
select public.submit_answer(pg_temp.qid('test-a-4'), 'La montaña', 1);
select public.submit_answer(pg_temp.qid('test-a-1'), 'Me encantó la canción');
select pg_temp.as_user('L');
select public.submit_answer(pg_temp.qid('test-b-1'), 'Una caminata nocturna');
select public.submit_answer(pg_temp.qid('test-a-2'), 'Mi secreto: sandía');
select public.submit_answer(pg_temp.qid('test-a-1'), 'Fue en MÉXICO increíble');
reset role;
-- Orden por última actividad: a-1 (hoy-1), a-2 (hoy-3), a-4 (hoy-4), b-1 (hoy-5).
update public.answers set created_at = pg_temp.at(pg_temp.today() - 5) where question_id = pg_temp.qid('test-b-1')
  and user_id in (pg_temp.u('K'), pg_temp.u('L'));
update public.answers set created_at = pg_temp.at(pg_temp.today() - 4) where question_id = pg_temp.qid('test-a-4')
  and user_id = pg_temp.u('K');
update public.answers set created_at = pg_temp.at(pg_temp.today() - 3) where question_id = pg_temp.qid('test-a-2')
  and user_id = pg_temp.u('L');
update public.answers set created_at = pg_temp.at(pg_temp.today() - 2) where question_id = pg_temp.qid('test-a-1')
  and user_id = pg_temp.u('K');
update public.answers set created_at = pg_temp.at(pg_temp.today() - 1) where question_id = pg_temp.qid('test-a-1')
  and user_id = pg_temp.u('L');

select pg_temp.as_user('K');
do $$
declare
  v_slugs text[];
  v_page1 jsonb[];
  v_page2 jsonb[];
  v_cursor timestamptz;
begin
  -- Todas las contestadas por cualquiera, la más reciente primero.
  select array_agg(h.c->'question'->>'slug' order by h.n) into v_slugs
  from public.get_history() with ordinality as h(c, n);
  assert v_slugs = array['test-a-1', 'test-a-2', 'test-a-4', 'test-b-1'], 'orden por actividad reciente: ' || v_slugs::text;

  -- La de Luis (a-2) aparece aunque Karla no la contestó, pero sin mostrar su respuesta.
  assert pg_temp.isnull((select h.c->'partner' from public.get_history() h(c) where h.c->'question'->>'slug' = 'test-a-2')),
    'respuesta de Luis oculta en el historial';
  assert (select (h.c->>'partner_answered')::boolean from public.get_history() h(c) where h.c->'question'->>'slug' = 'test-a-2'),
    'pero se sabe que contestó';
  assert (select h.c->'partner'->>'text' from public.get_history() h(c) where h.c->'question'->>'slug' = 'test-a-1')
    = 'Fue en MÉXICO increíble', 'revelada donde Karla sí contestó';

  -- Filtro por categoría.
  assert (select array_agg(h.c->'question'->>'slug' order by h.n) from public.get_history(null, 'test-b') with ordinality as h(c, n))
    = array['test-b-1'], 'filtro test-b';
  assert (select count(*) from public.get_history(null, 'test-a')) = 3, 'filtro test-a';
  assert (select count(*) from public.get_history(null, 'no-existe')) = 0, 'categoría inexistente';

  -- Búsqueda sin acentos ni mayúsculas: en la pregunta, en mi respuesta y en la visible de Luis.
  assert (select count(*) from public.get_history('CANCION')) = 1, 'busca en mi respuesta (sin acento/mayúsculas)';
  assert (select count(*) from public.get_history('canción')) = 1, 'busca con acento';
  assert (select count(*) from public.get_history('mexico')) = 1, 'busca en la respuesta visible de la pareja';
  assert (select count(*) from public.get_history('INCREIBLE')) = 1, 'acentos en la respuesta de la pareja';
  assert (select count(*) from public.get_history('ultima aventura')) = 1, 'busca en el texto de la pregunta (Ú)';
  assert (select h.c->'question'->>'slug' from public.get_history('ultima aventura') h(c)) = 'test-b-1', 'la correcta';
  assert (select count(*) from public.get_history('platillo')) = 0, 'sin coincidencias (pregunta no contestada)';
  assert (select count(*) from public.get_history('  ')) = 4, 'búsqueda en blanco = sin filtro';
  assert (select count(*) from public.get_history('cancion', 'test-b')) = 0, 'búsqueda + categoría';
  -- NO encuentra la respuesta oculta de la pareja.
  assert (select count(*) from public.get_history('sandia')) = 0, 'no busca en la respuesta oculta (sin acento)';
  assert (select count(*) from public.get_history('secreto')) = 0, 'no busca en la respuesta oculta';
  assert (select count(*) from public.get_history('Mi secreto: sandía')) = 0, 'ni con el texto exacto';

  -- Paginación con p_before.
  select array_agg(h.c) into v_page1 from public.get_history(null, null, 2) h(c);
  assert array_length(v_page1, 1) = 2, 'página de 2';
  assert v_page1[1]->'question'->>'slug' = 'test-a-1' and v_page1[2]->'question'->>'slug' = 'test-a-2', 'página 1';
  v_cursor := (v_page1[2]->>'last_activity')::timestamptz;
  select array_agg(h.c) into v_page2 from public.get_history(null, null, 2, v_cursor) h(c);
  assert array_length(v_page2, 1) = 2, 'página 2';
  assert v_page2[1]->'question'->>'slug' = 'test-a-4' and v_page2[2]->'question'->>'slug' = 'test-b-1', 'página 2 correcta';
  assert (select count(*) from public.get_history(null, null, 2, (v_page2[2]->>'last_activity')::timestamptz)) = 0,
    'sin más páginas';
  assert (select count(*) from public.get_history(null, null, 0)) = 1, 'límite mínimo 1';
  assert (select count(*) from public.get_history(null, null, null)) = 4, 'límite nulo = por defecto';
  assert (select count(*) from public.get_history(null, null, 1000)) = 4, 'límite máximo no falla';

  -- Preguntas por categoría con quién ya contestó (solo open/choice activas y visibles).
  assert (select string_agg(g.slug || ':' || g.answered_by_me::int || g.answered_by_partner::int, ',' order by g.slug)
          from public.get_category_questions('test-a') g)
    = 'test-a-1:11,test-a-2:01,test-a-3:00,test-a-4:10', 'category questions de Karla';
  assert (select count(*) from public.get_category_questions('test-b')) = 3, 'test-b trae 3';
  assert (select count(*) from public.get_category_questions('no-existe')) = 0, 'categoría vacía';
  assert (select count(*) from public.get_category_questions('test-a') where slug in ('test-a-wyr', 'test-a-off')) = 0,
    'sin juegos ni apagadas';
  assert (select count(*) from public.get_category_questions('test-st')) = 0, 'las apagadas de la racha no salen';
end $$;
select pg_temp.as_user('L');
do $$
begin
  assert (select string_agg(g.slug || ':' || g.answered_by_me::int || g.answered_by_partner::int, ',' order by g.slug)
          from public.get_category_questions('test-a') g)
    = 'test-a-1:11,test-a-2:10,test-a-3:00,test-a-4:01', 'category questions de Luis';
  assert (select count(*) from public.get_history('sandia')) = 1, 'Luis sí encuentra su respuesta';
  assert (select count(*) from public.get_history('montana')) = 0, 'Luis no ve la de Karla en a-4 (no contestó)';
end $$;
-- Otra pareja: su historial no filtra nada de P5.
select pg_temp.as_user('C');
do $$
begin
  assert (select count(*) from public.get_history('moto')) = 0, 'Caro no encuentra texto de P5';
  assert (select count(*) from public.get_history('Caro responde')) = 1, 'solo su historial';
  assert (select count(*) from public.get_history()) = 1, 'su historial: una pregunta';
end $$;
-- Karla contesta a-2: ahora sí encuentra la respuesta de Luis.
select pg_temp.as_user('K');
select public.submit_answer(pg_temp.qid('test-a-2'), 'Un viaje a la sierra');
do $$
begin
  assert (select count(*) from public.get_history('sandia')) = 1, 'al contestar, la búsqueda ve la de Luis';
end $$;
-- Luis contesta a-3 (solo él) y luego se va: lo suyo desaparece del historial y de los flags.
select pg_temp.as_user('L');
select public.submit_answer(pg_temp.qid('test-a-3'), 'Aprender a bailar');
do $$
begin
  assert (select count(*) from public.get_history()) = 5, 'a-3 entra al historial';
end $$;
select public.leave_couple();
select pg_temp.as_user('K');
do $$
begin
  assert (select count(*) from public.get_history()) = 4, 'lo único de Luis (a-3) sale del historial';
  assert (select count(*) from public.get_history('bailar')) = 0, 'no busca en respuestas de un ex miembro';
  assert (select count(*) from public.get_history('increible')) = 0, 'su respuesta en a-1 ya no se ve';
  assert (select string_agg(g.slug || ':' || g.answered_by_me::int || g.answered_by_partner::int, ',' order by g.slug)
          from public.get_category_questions('test-a') g)
    = 'test-a-1:10,test-a-2:10,test-a-3:00,test-a-4:10', 'answered_by_partner solo cuenta miembros actuales';
  assert pg_temp.isnull(public.get_question_with_answers(pg_temp.qid('test-a-1'))->'partner'), 'ya no hay pareja que revelar';
  assert (select count(*) from public.answers where user_id = pg_temp.u('L')) = 0, 'RLS: respuestas del ex miembro ocultas';
end $$;
reset role;

-- =============================================================================
-- 12) Picantes (P6: Mara + Nico). Se deja solo una pregunta picante activa en el banco.
-- =============================================================================
update public.questions set is_active = false where slug like 'test-%' and slug <> 'test-hot-1';
update public.questions set is_active = true where slug = 'test-hot-1';

-- Sin opt-in: ni se ve ni se asigna.
select pg_temp.as_user('M');
do $$
begin
  assert (select count(*) from public.questions where slug = 'test-hot-1') = 0, 'sin opt-in: no se ve en select';
  assert (select count(*) from public.get_category_questions('test-hot')) = 0, 'sin opt-in: no sale en la categoría';
end $$;
select pg_temp.expect_error(format('select public.get_question_with_answers(%L)', pg_temp.qid('test-hot-1')), 'question_not_found');
select pg_temp.expect_error(format('select public.submit_answer(%L, %L)', pg_temp.qid('test-hot-1'), 'x'), 'question_not_found');
select pg_temp.expect_error($q$select public.get_daily_question()$q$, 'no_questions');

-- Solo uno con opt-in: tampoco.
do $$
begin
  assert public.set_spicy_opt_in(true) = false, 'con uno solo no quedan activas';
  assert pg_temp.spicy(pg_temp.u('M')) = false, 'couples.spicy_enabled sigue en false';
  assert (select spicy_opt_in from public.couple_members where user_id = pg_temp.u('M')), 'se guardó mi opt-in';
  assert (select count(*) from public.questions where slug = 'test-hot-1') = 0, 'uno solo: no se ve';
  assert (select count(*) from public.get_category_questions('test-hot')) = 0, 'uno solo: no sale';
end $$;
select pg_temp.expect_error(format('select public.get_question_with_answers(%L)', pg_temp.qid('test-hot-1')), 'question_not_found');
select pg_temp.expect_error($q$select public.get_daily_question()$q$, 'no_questions');
select pg_temp.as_user('N');
do $$
begin
  assert (select count(*) from public.questions where slug = 'test-hot-1') = 0, 'Nico sin opt-in: no se ve';
end $$;
select pg_temp.expect_error($q$select public.get_daily_question()$q$, 'no_questions');

-- Con los dos: se ve y se asigna.
do $$
begin
  assert public.set_spicy_opt_in(true) = true, 'con los dos quedan activas';
  assert pg_temp.spicy(pg_temp.u('N')) = true, 'couples.spicy_enabled refleja el estado';
  assert (select count(*) from public.questions where slug = 'test-hot-1') = 1, 'se ve en select';
  assert (select count(*) from public.get_category_questions('test-hot')) = 1, 'sale en la categoría';
  assert public.get_question_with_answers(pg_temp.qid('test-hot-1'))->'question'->>'intensity' = 'picante', 'RPC';
  assert public.get_daily_question()->'question'->>'slug' = 'test-hot-1', 'se asigna como pregunta del día';
end $$;
select pg_temp.as_user('M');
do $$
begin
  assert public.get_daily_question()->'question'->>'slug' = 'test-hot-1', 'Mara recibe la misma';
  assert (select count(*) from public.questions where slug = 'test-hot-1') = 1, 'Mara también la ve';
end $$;
-- Quitar el opt-in apaga las picantes nuevas, pero la ya asignada se sigue viendo.
reset role;
update public.questions set is_active = true where slug = 'test-hot-2';
select pg_temp.as_user('N');
do $$
begin
  assert (select count(*) from public.questions where slug = 'test-hot-2') = 1, 'con ambos: la nueva se ve';
  assert public.set_spicy_opt_in(false) = false, 'Nico quita el opt-in';
  assert pg_temp.spicy(pg_temp.u('N')) = false, 'espejo en false';
  assert (select count(*) from public.questions where slug = 'test-hot-2') = 0, 'sin opt-in: la nueva se oculta';
  assert (select count(*) from public.questions where slug = 'test-hot-1') = 1, 'la ya asignada se sigue viendo';
  assert (select count(*) from public.get_category_questions('test-hot')) = 1, 'solo la asignada sale en la categoría';
  assert public.set_spicy_opt_in(null) = false, 'null equivale a false';
  assert public.set_spicy_opt_in(true) = true, 'vuelve a activar';
end $$;

-- Si un miembro sale y entra otro, se desactivan (el nuevo empieza sin opt-in).
select pg_temp.as_user('N');
select public.leave_couple();
select pg_temp.as_user('E');
select public.join_couple(pg_temp.code_of(pg_temp.u('M')));
do $$
begin
  assert pg_temp.spicy(pg_temp.u('E')) = false, 'al entrar alguien nuevo se desactivan';
  assert (select count(*) from public.questions where slug = 'test-hot-2') = 0, 'Eli no ve las picantes nuevas';
  assert (select count(*) from public.questions where slug = 'test-hot-1') = 1, 'la asignada se sigue viendo';
  assert (select spicy_opt_in from public.couple_members where user_id = pg_temp.u('E')) = false, 'opt-in de Eli = false';
end $$;
select pg_temp.as_user('M');
do $$
begin
  assert (select spicy_opt_in from public.couple_members where user_id = pg_temp.u('M')), 'el opt-in de Mara se conserva';
  assert (select count(*) from public.questions where slug = 'test-hot-2') = 0, 'Mara tampoco ve picantes nuevas';
end $$;
select pg_temp.as_user('E');
do $$
begin
  assert public.set_spicy_opt_in(true) = true, 'con Eli y Mara activas otra vez';
  assert pg_temp.spicy(pg_temp.u('E')) = true, 'espejo en true';
  assert (select count(*) from public.questions where slug = 'test-hot-2') = 1, 'ahora sí se ve la nueva';
  assert public.set_spicy_opt_in(false) = false, 'Eli la apaga';
  assert pg_temp.spicy(pg_temp.u('M')) = false, 'espejo en false';
end $$;
reset role;

rollback;

select 'questions: OK' as resultado;
