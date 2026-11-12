-- Pruebas de la Fase 10: banco de contenido (migración 20261112000000_content_bank.sql):
-- temas (kind packs), preguntas propias, votos 👍/👎, pregunta del día y get_packs.
-- Todo ocurre en una transacción que termina en ROLLBACK. Es determinista aunque el seed esté
-- aplicado: apaga el banco existente y crea su propio banco `test-...`.
--   psql -X -v ON_ERROR_STOP=1 -f supabase/tests/content_bank.sql

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
-- Helpers propios de esta prueba.
-- ¿Las n elecciones de pick_daily_question(c) caen todas en p_allowed?
create function pg_temp.picks_in(p_couple uuid, p_allowed uuid[], p_n integer) returns boolean language plpgsql as $$
declare
  i integer;
  v uuid;
begin
  for i in 1..p_n loop
    v := public.pick_daily_question(p_couple);
    if v is null or not (v = any (p_allowed)) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;
-- ¿Salen todos los de p_expected en n elecciones? (comprueba que no hay sesgo a uno solo)
create function pg_temp.picks_cover(p_couple uuid, p_expected uuid[], p_n integer) returns boolean language plpgsql as $$
declare
  i integer;
  seen uuid[] := '{}';
begin
  for i in 1..p_n loop
    seen := seen || public.pick_daily_question(p_couple);
  end loop;
  return (select bool_and(e = any (seen)) from unnest(p_expected) e);
end;
$$;

-- Cuenta respuestas sin RLS (la de mi pareja no se ve hasta contestar).
create function pg_temp.n_answers(p_question_id uuid) returns bigint language sql security definer as $$
  select count(*) from public.answers where question_id = p_question_id;
$$;
grant execute on function pg_temp.n_answers(uuid) to authenticated;

-- Texto de relleno con varias palabras distintas (no choca con el duplicado normalizado).
create function pg_temp.words(p_n integer) returns text language sql immutable as $$
  select 'Pregunta de prueba para el limite numero ' || p_n;
$$;

-- =============================================================================
-- 0) Banco determinista: se apaga todo lo existente (seed) y se arma uno propio.
-- =============================================================================
update public.questions set is_active = false;

insert into public.question_categories (slug, name, emoji, intensity, position, kind) values
  ('test-a', 'Prueba A', '🅰️', 'ligera', 900, 'questions'),
  ('test-ord', 'Prueba orden', '🔢', 'ligera', 901, 'questions'),
  ('test-games', 'Prueba juegos', '🎲', 'ligera', 902, 'games'),
  ('test-pack-1', 'Tema uno', '📘', 'ligera', 9001, 'packs'),
  ('test-pack-hot', 'Tema picante', '🌶️', 'picante', 9002, 'packs');
-- `picantes` lo crea el seed; aquí solo se asegura que exista.
insert into public.question_categories (slug, name, emoji, intensity, position, kind)
values ('picantes', 'Picantes', '🌶️', 'picante', 13, 'questions')
on conflict (slug) do nothing;

insert into public.questions (slug, category, type, text, options, intensity, is_active, position) values
  ('test-a-1', 'test-a', 'open', 'Cuál es tu canción favorita para ustedes dos', null, 'ligera', true, null),
  ('test-a-2', 'test-a', 'choice', 'Dónde pasarían un fin de semana largo', '["Playa","Montaña","Ciudad"]', 'ligera', true, null),
  ('test-a-hot', 'test-a', 'open', 'Pregunta picante suelta de prueba', null, 'picante', true, null),
  ('test-g-1', 'test-games', 'open', 'Pregunta de juego que no sale como pregunta del día', null, 'ligera', true, null),
  ('test-g-2', 'test-games', 'wyr', 'Preferirías viajar al pasado o al futuro', '["Pasado","Futuro"]', 'ligera', true, null),
  ('test-ord-b', 'test-ord', 'open', 'Pregunta de orden bravo sin posición', null, 'ligera', true, null),
  ('test-ord-a', 'test-ord', 'open', 'Pregunta de orden alfa sin posición', null, 'ligera', true, null),
  ('test-ord-z', 'test-ord', 'open', 'Pregunta de orden zeta con posición uno', null, 'ligera', true, 1),
  -- Tema 1: el orden del quiz es la posición, no el slug (c, b, a); la cuarta está apagada.
  ('test-pk1-a', 'test-pack-1', 'open', 'Tema uno pregunta tercera por posición', null, 'ligera', true, 3),
  ('test-pk1-b', 'test-pack-1', 'choice', 'Tema uno pregunta segunda por posición', '["Sí","No"]', 'ligera', true, 2),
  ('test-pk1-c', 'test-pack-1', 'open', 'Tema uno pregunta primera por posición', null, 'ligera', true, 1),
  ('test-pk1-off', 'test-pack-1', 'open', 'Tema uno pregunta apagada que no cuenta', null, 'ligera', false, 4),
  ('test-hotpk-1', 'test-pack-hot', 'open', 'Tema picante primera pregunta de prueba', null, 'picante', true, 1),
  ('test-hotpk-2', 'test-pack-hot', 'open', 'Tema picante segunda pregunta de prueba', null, 'picante', true, 2);

-- =============================================================================
-- 1) Permisos: anon no puede nada; authenticated solo lee su voto (todo lo demás va por RPC).
-- =============================================================================
set local role anon;
select pg_temp.expect_denied($q$select public.set_question_feedback(gen_random_uuid(), 1::smallint)$q$);
select pg_temp.expect_denied($q$select * from public.get_packs()$q$);
select pg_temp.expect_denied($q$select public.add_custom_question('test-a', 'open', 'Pregunta de prueba larga', null, 'ligera')$q$);
select pg_temp.expect_denied($q$select public.retire_custom_question(gen_random_uuid())$q$);
select pg_temp.expect_denied($q$select * from public.get_custom_questions()$q$);
select pg_temp.expect_denied('select * from public.question_feedback');
reset role;

-- Parejas. P1 Ana+Beto, P2 Caro+Dani. Eli (E) no tiene pareja.
select pg_temp.as_user('A'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('B'); select public.join_couple(pg_temp.code_of(pg_temp.u('A')));
select pg_temp.as_user('C'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('D'); select public.join_couple(pg_temp.code_of(pg_temp.u('C')));
reset role;

select pg_temp.as_user('A');
select pg_temp.expect_denied($q$insert into public.question_feedback (user_id, question_id, vote)
  values (auth.uid(), public.my_couple_id(), 1)$q$);
select pg_temp.expect_denied($q$update public.question_feedback set vote = 1$q$);
select pg_temp.expect_denied($q$delete from public.question_feedback$q$);
select pg_temp.expect_denied($q$update public.questions set position = 5$q$);
select pg_temp.expect_denied($q$insert into public.questions (slug, category, type, text, intensity, created_by, couple_id)
  values ('propia-colada', 'test-a', 'open', 'Pregunta colada directo', 'ligera', auth.uid(), public.my_couple_id())$q$);
select pg_temp.expect_denied($q$select private.fold_question_text('x')$q$);
reset role;

-- Sin pareja y sin sesión.
select pg_temp.as_user('E');
select pg_temp.expect_error($q$select public.set_question_feedback(gen_random_uuid(), 1::smallint)$q$, 'no_couple');
select pg_temp.expect_error($q$select * from public.get_packs()$q$, 'no_couple');
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'open', 'Pregunta de prueba larga', null, 'ligera')$q$, 'no_couple');
select pg_temp.expect_error($q$select public.retire_custom_question(gen_random_uuid())$q$, 'no_couple');
select pg_temp.expect_error($q$select * from public.get_custom_questions()$q$, 'no_couple');
select pg_temp.expect_error($q$select * from public.get_category_questions('test-a')$q$, 'no_couple');
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.expect_error($q$select * from public.get_packs()$q$, 'not_authenticated');
select pg_temp.expect_error($q$select public.set_question_feedback(gen_random_uuid(), null)$q$, 'not_authenticated');

-- =============================================================================
-- 2) kind = 'packs' en las categorías.
-- =============================================================================
do $$
begin
  assert (select kind from public.question_categories where slug = 'test-pack-1') = 'packs', 'kind packs aceptado';
  begin
    insert into public.question_categories (slug, name, emoji, intensity, kind)
    values ('test-bad-kind', 'Mal', 'x', 'ligera', 'otra');
    raise exception 'ASSERT: un kind desconocido debía rechazarse';
  exception when check_violation then
    null;
  end;
  -- Una pregunta con created_by debe traer couple_id.
  begin
    insert into public.questions (slug, category, type, text, intensity, created_by)
    values ('test-bad-owner', 'test-a', 'open', 'Pregunta con autor pero sin pareja', 'ligera',
            '00000000-0000-0000-0000-0000000000a1');
    raise exception 'ASSERT: created_by sin couple_id debía rechazarse';
  exception when check_violation then
    null;
  end;
end $$;

-- =============================================================================
-- 3) Votos: set_question_feedback + RLS de question_feedback.
-- =============================================================================
select pg_temp.as_user('A');
do $$
declare
  q1 uuid := pg_temp.qid('test-a-1');
begin
  assert public.set_question_feedback(q1, 1::smallint) = 1, 'devuelve el voto guardado (👍)';
  assert (select count(*) from public.question_feedback where question_id = q1) = 1, 'una fila';
  assert (select vote from public.question_feedback where question_id = q1) = 1, 'voto 1';
  -- Upsert: cambia a 👎 sin duplicar fila.
  assert public.set_question_feedback(q1, (-1)::smallint) = -1, 'devuelve -1';
  assert (select count(*) from public.question_feedback where question_id = q1) = 1, 'sigue una sola fila (upsert)';
  assert (select vote from public.question_feedback where question_id = q1) = -1, 'voto cambiado';
  assert (select updated_at >= created_at from public.question_feedback where question_id = q1), 'updated_at';
  -- null borra.
  assert public.set_question_feedback(q1, null) is null, 'null devuelve null';
  assert (select count(*) from public.question_feedback where question_id = q1) = 0, 'voto borrado';
  -- Borrar sin voto previo no falla.
  assert public.set_question_feedback(q1, null) is null, 'borrar sin voto es inofensivo';
  -- Dejo un 👍 para probar RLS.
  perform public.set_question_feedback(q1, 1::smallint);
end $$;
select pg_temp.expect_error(format('select public.set_question_feedback(%L, 0::smallint)', pg_temp.qid('test-a-1')), 'invalid_feedback');
select pg_temp.expect_error(format('select public.set_question_feedback(%L, 2::smallint)', pg_temp.qid('test-a-1')), 'invalid_feedback');
select pg_temp.expect_error(format('select public.set_question_feedback(%L, (-2)::smallint)', pg_temp.qid('test-a-1')), 'invalid_feedback');
-- Inexistente, apagada y picante sin picantes activas: no visibles.
select pg_temp.expect_error($q$select public.set_question_feedback(gen_random_uuid(), 1::smallint)$q$, 'question_not_found');
select pg_temp.expect_error(format('select public.set_question_feedback(%L, 1::smallint)', pg_temp.qid('test-pk1-off')), 'question_not_found');
select pg_temp.expect_error(format('select public.set_question_feedback(%L, 1::smallint)', pg_temp.qid('test-a-hot')), 'question_not_found');
-- Una pregunta de un pack o de un juego sí se puede votar (es visible).
do $$
begin
  assert public.set_question_feedback(pg_temp.qid('test-pk1-c'), 1::smallint) = 1, 'se vota una pregunta de pack';
  perform public.set_question_feedback(pg_temp.qid('test-pk1-c'), null);
end $$;

-- RLS: Beto (misma pareja) no ve el voto de Ana, y tampoco Caro; Ana sí ve el suyo.
select pg_temp.as_user('B');
do $$
begin
  assert (select count(*) from public.question_feedback) = 0, 'la pareja no ve mi voto';
  perform public.set_question_feedback(pg_temp.qid('test-a-2'), 1::smallint);
  assert (select count(*) from public.question_feedback) = 1, 'solo veo el mío';
end $$;
select pg_temp.as_user('C');
do $$
begin
  assert (select count(*) from public.question_feedback) = 0, 'otra pareja no ve votos ajenos';
end $$;
select pg_temp.as_user('A');
do $$
begin
  assert (select count(*) from public.question_feedback) = 1, 'Ana ve su voto';
  assert (select question_id from public.question_feedback) = pg_temp.qid('test-a-1'), 'y es el suyo';
end $$;
reset role;
delete from public.question_feedback;

-- =============================================================================
-- 4) Preguntas propias: add_custom_question (errores, normalización, duplicados).
-- =============================================================================
select pg_temp.as_user('A');
-- Categoría.
select pg_temp.expect_error($q$select public.add_custom_question('no-existe', 'open', 'Pregunta de prueba larga')$q$, 'invalid_category');
select pg_temp.expect_error($q$select public.add_custom_question(null, 'open', 'Pregunta de prueba larga')$q$, 'invalid_category');
select pg_temp.expect_error($q$select public.add_custom_question('test-pack-1', 'open', 'Pregunta de prueba larga')$q$, 'invalid_category');
select pg_temp.expect_error($q$select public.add_custom_question('test-games', 'open', 'Pregunta de prueba larga')$q$, 'invalid_category');
-- Texto.
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'open', 'corta')$q$, 'invalid_question');
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'open', '  nueve ch   ')$q$, 'invalid_question');
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'open', '          ')$q$, 'invalid_question');
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'open', null)$q$, 'invalid_question');
select pg_temp.expect_error(format('select public.add_custom_question(%L, %L, %L)', 'test-a', 'open', repeat('a', 221)), 'invalid_question');
-- Tipo y opciones.
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'wyr', 'Pregunta de prueba larga')$q$, 'invalid_question');
select pg_temp.expect_error($q$select public.add_custom_question('test-a', null, 'Pregunta de prueba larga')$q$, 'invalid_question');
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'open', 'Pregunta de prueba larga', '["a","b"]'::jsonb)$q$, 'invalid_question');
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'choice', 'Pregunta de prueba larga')$q$, 'invalid_question');
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'choice', 'Pregunta de prueba larga', '["solo una"]'::jsonb)$q$, 'invalid_question');
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'choice', 'Pregunta de prueba larga', '["a","b","c","d","e"]'::jsonb)$q$, 'invalid_question');
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'choice', 'Pregunta de prueba larga', '["Sí","sí"]'::jsonb)$q$, 'invalid_question');
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'choice', 'Pregunta de prueba larga', '["Sí","  "]'::jsonb)$q$, 'invalid_question');
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'choice', 'Pregunta de prueba larga', '["Sí",3]'::jsonb)$q$, 'invalid_question');
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'choice', 'Pregunta de prueba larga', '{"a":1}'::jsonb)$q$, 'invalid_question');
select pg_temp.expect_error(format('select public.add_custom_question(%L, %L, %L, %L::jsonb)', 'test-a', 'choice',
  'Pregunta de prueba larga', jsonb_build_array('Sí', repeat('o', 61))), 'invalid_question');
-- Intensidad.
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'open', 'Pregunta de prueba larga', null, 'picante')$q$, 'invalid_question');
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'open', 'Pregunta de prueba larga', null, 'otra')$q$, 'invalid_question');
-- Nada de lo anterior insertó.
reset role;
do $$
begin
  assert (select count(*) from public.questions where couple_id is not null) = 0, 'los errores no insertan nada';
end $$;

select pg_temp.as_user('A');
do $$
declare
  v_id uuid;
  r public.questions;
begin
  -- Normaliza espacios, recorta y guarda en la pareja de Ana.
  v_id := public.add_custom_question('test-a', 'open', '   Qué   comida   te recuerda  a casa?  ');
  insert into t_ids values ('own1', v_id);
  select * into r from public.questions where id = v_id;
  assert r.text = 'Qué comida te recuerda a casa?', 'texto normalizado: ' || r.text;
  assert r.type = 'open' and r.options is null, 'abierta sin opciones';
  assert r.intensity = 'ligera', 'intensidad por omisión';
  assert r.category = 'test-a', 'categoría';
  assert r.is_active, 'activa';
  assert r.created_by = pg_temp.u('A'), 'creada por Ana';
  assert r.couple_id = pg_temp.cid(pg_temp.u('A')), 'de su pareja';
  assert r.position is null, 'sin position';
  assert r.slug ~ '^propia-[0-9a-f]{24}$', 'slug propia-<24 hex>: ' || r.slug;

  -- Choice: recorta opciones y respeta el orden; intensidad profunda.
  v_id := public.add_custom_question('test-a', 'choice', 'Qué plan prefieren para el domingo', '["  Cine ","Casa","Paseo"]'::jsonb, 'profunda');
  insert into t_ids values ('own2', v_id);
  select * into r from public.questions where id = v_id;
  assert r.options = '["Cine","Casa","Paseo"]'::jsonb, 'opciones recortadas en orden: ' || r.options::text;
  assert r.intensity = 'profunda', 'profunda';
  assert r.type = 'choice';

  -- open con options = JSON null también vale.
  v_id := public.add_custom_question('test-a', 'open', 'Una pregunta abierta con json null', 'null'::jsonb);
  assert (select options from public.questions where id = v_id) is null, 'options null';
  perform public.retire_custom_question(v_id);

  -- Texto de exactamente 10 y 220 caracteres.
  perform public.add_custom_question('test-a', 'open', 'abcde fghi');
  perform public.add_custom_question('test-a', 'open', repeat('b', 220));
  assert true;
end $$;

-- Duplicados: texto normalizado contra el banco global activo y contra las propias.
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'open', 'CUAL es tu cancion favorita para ustedes dos!!')$q$, 'duplicate_question');
select pg_temp.expect_error($q$select public.add_custom_question('test-ord', 'open', '  cual es tu cancion  favorita para ustedes, dos  ')$q$, 'duplicate_question');
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'open', 'qué comida te recuerda a casa')$q$, 'duplicate_question');
-- También contra los juegos y los temas activos.
select pg_temp.expect_error($q$select public.add_custom_question('test-a', 'open', 'Tema uno pregunta primera por posicion')$q$, 'duplicate_question');
-- Una apagada no cuenta como duplicado.
do $$
begin
  perform public.add_custom_question('test-a', 'open', 'Tema uno pregunta apagada que no cuenta');
end $$;
-- Una propia de otra pareja no es visible, así que no choca.
select pg_temp.as_user('C');
do $$
begin
  perform public.add_custom_question('test-a', 'open', 'Qué comida te recuerda a casa?');
end $$;
reset role;

-- =============================================================================
-- 5) Visibilidad de las propias (question_visible + policy de select).
-- =============================================================================
select pg_temp.as_user('B');
do $$
declare
  own1 uuid := (select id from t_ids where k = 'own1');
begin
  assert (select count(*) from public.questions where id = own1) = 1, 'Beto ve la propia de su pareja';
  assert exists (select 1 from public.get_category_questions('test-a') g where g.id = own1), 'sale en la categoría';
  assert public.set_question_feedback(own1, 1::smallint) = 1, 'se puede votar';
  perform public.set_question_feedback(own1, null);
end $$;
select pg_temp.as_user('C');
do $$
declare
  own1 uuid := (select id from t_ids where k = 'own1');
begin
  assert (select count(*) from public.questions where id = own1) = 0, 'la policy oculta la propia de otra pareja';
  assert (select count(*) from public.questions where slug like 'propia-%') = 1, 'Caro solo ve la suya';
  assert not exists (select 1 from public.get_category_questions('test-a') g where g.id = own1),
    'no sale en la categoría de otra pareja';
  assert (select count(*) from public.get_category_questions('test-a')) = 3,
    'Caro ve 2 globales + 1 propia (la picante no)';
end $$;
select pg_temp.expect_error(format('select public.set_question_feedback(%L, 1::smallint)', (select id from t_ids where k = 'own1')), 'question_not_found');
select pg_temp.expect_error(format('select public.retire_custom_question(%L)', (select id from t_ids where k = 'own1')), 'question_not_found');
-- Una propia de otra pareja tampoco se puede contestar.
select pg_temp.expect_error(format('select public.submit_answer(%L, %L)', (select id from t_ids where k = 'own1'), 'hola'), 'question_not_found');
reset role;

-- ===========================================================================
-- 6) Pregunta del día: solo banco global de preguntas, sin 👎, nunca propias, respaldo.
-- ===========================================================================
-- Escenario: P1 y P2 tienen propias activas (sin usar) y el banco global elegible es a1, a2.
-- test-ord es una categoría de preguntas: se apaga mientras se prueba la pregunta del día.
update public.questions set is_active = false where category = 'test-ord';
-- Se retiran las propias extra de P1 (dejando own1 y own2) para controlar el escenario.
update public.questions set is_active = false
where couple_id = pg_temp.cid(pg_temp.u('A')) and id not in (select id from t_ids where k in ('own1', 'own2'));

do $$
declare
  p1 uuid := pg_temp.cid(pg_temp.u('A'));
  p2 uuid := pg_temp.cid(pg_temp.u('C'));
  a1 uuid := pg_temp.qid('test-a-1');
  a2 uuid := pg_temp.qid('test-a-2');
  own1 uuid := (select id from t_ids where k = 'own1');
  own2 uuid := (select id from t_ids where k = 'own2');
begin
  assert (select count(*) from public.questions where couple_id = p1 and is_active) = 2, 'P1 tiene 2 propias activas';
  assert (select count(*) from public.questions where couple_id = p2 and is_active) = 1, 'P2 tiene 1 propia activa';

  -- Las propias sin usar NO salen: solo a1/a2 (nunca packs, juegos, picantes ni propias).
  assert pg_temp.picks_in(p1, array[a1, a2], 80), 'P1: solo banco global de preguntas';
  assert pg_temp.picks_cover(p1, array[a1, a2], 80), 'P1: ambas globales salen';
  assert pg_temp.picks_in(p2, array[a1, a2], 80), 'P2: solo banco global (ni la suya ni la de P1)';
  assert pg_temp.picks_cover(p2, array[a1, a2], 80), 'P2: ambas globales salen';

  -- 👎 de Ana a a1: ya no sale para ninguno de los dos; P2 no se afecta.
  insert into public.question_feedback (user_id, question_id, vote) values (pg_temp.u('A'), a1, -1);
  assert pg_temp.picks_in(p1, array[a2], 40), '👎 de Ana excluye a a1';
  assert pg_temp.picks_cover(p2, array[a1, a2], 80), 'el 👎 de P1 no afecta a P2';
  -- 👍 no excluye.
  update public.question_feedback set vote = 1 where question_id = a1;
  assert pg_temp.picks_cover(p1, array[a1, a2], 80), '👍 no excluye';
  -- 👎 de Ana a a1 y de Beto a a2: no queda nada sin 👎, se permiten (nunca null, nunca propias).
  update public.question_feedback set vote = -1 where question_id = a1;
  insert into public.question_feedback (user_id, question_id, vote) values (pg_temp.u('B'), a2, -1);
  assert pg_temp.picks_in(p1, array[a1, a2], 40), 'si todo tiene 👎, se permite alguna (no null, no propias)';
  delete from public.question_feedback;

  -- Todo el banco usado (las propias también estuvieron asignadas): respaldo = la más vieja
  -- del banco global; nunca una propia aunque sea más vieja.
  insert into public.daily_questions (couple_id, day, question_id) values
    (p1, pg_temp.today() - 6, own1), (p1, pg_temp.today() - 5, own2),
    (p1, pg_temp.today() - 4, a1), (p1, pg_temp.today() - 3, a2);
  assert pg_temp.picks_in(p1, array[a1], 30), 'respaldo: la global asignada hace más tiempo (a1), no una propia';
  insert into public.question_feedback (user_id, question_id, vote) values (pg_temp.u('B'), a1, -1);
  assert pg_temp.picks_in(p1, array[a2], 30), 'respaldo sin las 👎';
  insert into public.question_feedback (user_id, question_id, vote) values (pg_temp.u('A'), a2, -1);
  assert pg_temp.picks_in(p1, array[a1], 30), 'todo con 👎: último recurso, la más vieja global';
  delete from public.question_feedback;

  -- Un 👎 de alguien que ya no es miembro no cuenta.
  insert into public.question_feedback (user_id, question_id, vote) values (pg_temp.u('E'), a1, -1);
  delete from public.daily_questions where couple_id = p1;
  assert pg_temp.picks_cover(p1, array[a1, a2], 80), 'el 👎 de alguien ajeno a la pareja no excluye';
  delete from public.question_feedback;

  -- Sin preguntas globales elegibles (solo packs, juegos y propias): no hay pregunta del día.
  update public.questions set is_active = false where id in (a1, a2);
  assert public.pick_daily_question(p1) is null, 'con solo packs/juegos/propias no se elige nada';
  update public.questions set is_active = true where id in (a1, a2);
end $$;
delete from public.daily_questions;

-- get_daily_question usa la misma regla (nunca una propia).
select pg_temp.as_user('A');
do $$
declare
  card jsonb := public.get_daily_question();
begin
  assert (card->'question'->>'id')::uuid in (pg_temp.qid('test-a-1'), pg_temp.qid('test-a-2')),
    'la pregunta del día es del banco global';
end $$;
reset role;
delete from public.daily_questions;

-- =============================================================================
-- 7) Temas: get_packs.
-- =============================================================================
select pg_temp.as_user('A');
do $$
declare
  r record;
  n integer;
begin
  -- Orden por position entre los temas de la prueba.
  assert (select array_agg(g.slug order by g.position) filter (where g.slug like 'test-%') from public.get_packs() g)
       = array['test-pack-1', 'test-pack-hot'], 'orden por position';
  assert (select array_agg(g.slug) filter (where g.slug like 'test-%') from public.get_packs() g)
       = array['test-pack-1', 'test-pack-hot'], 'get_packs ya devuelve en orden';
  assert not exists (select 1 from public.get_packs() g where g.slug in ('test-a', 'test-ord', 'test-games')),
    'solo kind packs';

  select * into r from public.get_packs() g where g.slug = 'test-pack-1';
  assert r.name = 'Tema uno' and r.emoji = '📘' and r.intensity = 'ligera' and r.position = 9001, 'datos del tema';
  assert r.total = 3, 'total cuenta solo activas: ' || r.total;
  assert r.answered_by_me = 0 and r.answered_by_both = 0, 'sin respuestas';
  assert r.next_question_id = pg_temp.qid('test-pk1-c'), 'la siguiente es la de position 1 (no la de slug menor)';

  -- Contesto la 1: la siguiente pasa a la position 2.
  perform public.submit_answer(pg_temp.qid('test-pk1-c'), 'respuesta de Ana');
  select * into r from public.get_packs() g where g.slug = 'test-pack-1';
  assert r.answered_by_me = 1 and r.answered_by_both = 0, 'yo 1, ambos 0';
  assert r.next_question_id = pg_temp.qid('test-pk1-b'), 'siguiente: position 2';
end $$;
select pg_temp.as_user('B');
do $$
declare
  r record;
begin
  select * into r from public.get_packs() g where g.slug = 'test-pack-1';
  assert r.answered_by_me = 0 and r.next_question_id = pg_temp.qid('test-pk1-c'),
    'Beto empieza desde la primera aunque Ana ya avanzó';
  perform public.submit_answer(pg_temp.qid('test-pk1-c'), 'respuesta de Beto');
  select * into r from public.get_packs() g where g.slug = 'test-pack-1';
  assert r.answered_by_me = 1 and r.answered_by_both = 1, 'ambos contestaron la primera';
  assert r.next_question_id = pg_temp.qid('test-pk1-b'), 'la siguiente de Beto';
  -- Beto contesta la 3 (position 3) saltándose la 2: la siguiente sigue siendo la 2.
  perform public.submit_answer(pg_temp.qid('test-pk1-a'), 'respuesta de Beto 3');
  select * into r from public.get_packs() g where g.slug = 'test-pack-1';
  assert r.answered_by_me = 2 and r.answered_by_both = 1, 'Beto 2, ambos 1';
  assert r.next_question_id = pg_temp.qid('test-pk1-b'), 'la primera sin contestar por mí en orden';
end $$;
select pg_temp.as_user('A');
do $$
declare
  r record;
begin
  perform public.submit_answer(pg_temp.qid('test-pk1-b'), null, 1);
  perform public.submit_answer(pg_temp.qid('test-pk1-a'), 'respuesta de Ana 3');
  select * into r from public.get_packs() g where g.slug = 'test-pack-1';
  assert r.answered_by_me = 3 and r.total = 3, 'contesté todas';
  assert r.next_question_id is null, 'ya no hay siguiente';
  assert r.answered_by_both = 2, 'ambos: la 1 y la 3';

  -- Tema picante sin picantes activas: total real, pero bloqueado (sin siguiente ni progreso).
  select * into r from public.get_packs() g where g.slug = 'test-pack-hot';
  assert r.total = 2, 'total real del tema picante: ' || r.total;
  assert r.answered_by_me = 0 and r.answered_by_both = 0, 'sin progreso';
  assert r.next_question_id is null, 'bloqueado: sin next_question_id';
end $$;
-- Otra pareja no cuenta mis respuestas.
select pg_temp.as_user('C');
do $$
declare
  r record;
begin
  select * into r from public.get_packs() g where g.slug = 'test-pack-1';
  assert r.answered_by_me = 0 and r.answered_by_both = 0 and r.total = 3, 'P2 empieza de cero';
  assert r.next_question_id = pg_temp.qid('test-pk1-c'), 'P2 empieza por la primera';
end $$;
reset role;

-- =============================================================================
-- 8) get_category_questions ordena por position (nulos al final) y slug.
-- =============================================================================
update public.questions set is_active = true where category = 'test-ord';
select pg_temp.as_user('A');
do $$
begin
  assert (select array_agg(g.slug order by o) from (select g.*, row_number() over () as o from public.get_category_questions('test-ord') g) g)
       = array['test-ord-z', 'test-ord-a', 'test-ord-b'], 'position primero, luego los nulos por slug';
  assert (select array_agg(g.slug) from (select g.*, row_number() over () as o from public.get_category_questions('test-pack-1') g order by o) g)
       = array['test-pk1-c', 'test-pk1-b', 'test-pk1-a'], 'un pack sale en el orden del quiz';
  assert (select bool_and(g.answered_by_me) from public.get_category_questions('test-pack-1') g), 'trae answered_by_me';
end $$;
reset role;

-- =============================================================================
-- 9) retire_custom_question y get_custom_questions.
-- =============================================================================
-- Fechas distintas para comprobar el orden (dentro de una transacción now() no cambia).
update public.questions set created_at = now() - interval '3 hours' where id = (select id from t_ids where k = 'own1');
update public.questions set created_at = now() - interval '1 hour' where id = (select id from t_ids where k = 'own2');

select pg_temp.as_user('A');
do $$
declare
  own1 uuid := (select id from t_ids where k = 'own1');
  own2 uuid := (select id from t_ids where k = 'own2');
  r record;
begin
  perform public.submit_answer(own1, 'mi respuesta a la propia');
  -- Lista: solo activas de mi pareja, más nuevas primero.
  assert (select array_agg(g.id) from (select g.id from public.get_custom_questions() g) g)
       = (select array_agg(c.id order by c.created_at desc, c.id)
          from public.questions c
          where c.couple_id = pg_temp.cid(pg_temp.u('A')) and c.is_active),
    'get_custom_questions: activas, más nuevas primero';
  assert (select count(*) from public.get_custom_questions()) = 2, 'solo own1 y own2 (las otras se apagaron arriba)';
  select * into r from public.get_custom_questions() g where g.id = own1;
  assert r.category = 'test-a' and r.category_name = 'Prueba A' and r.category_emoji = '🅰️', 'categoría con nombre y emoji';
  assert r.type = 'open' and r.text = 'Qué comida te recuerda a casa?' and r.intensity = 'ligera', 'campos';
  assert r.created_by = pg_temp.u('A') and r.created_at is not null, 'autor y fecha';
  assert r.answered_by_me and not r.answered_by_partner, 'yo contesté, mi pareja no';
  select * into r from public.get_custom_questions() g where g.id = own2;
  assert r.options = '["Cine","Casa","Paseo"]'::jsonb and not r.answered_by_me, 'opciones y sin responder';
end $$;
select pg_temp.as_user('B');
do $$
declare
  own1 uuid := (select id from t_ids where k = 'own1');
  r record;
begin
  select * into r from public.get_custom_questions() g where g.id = own1;
  assert not r.answered_by_me and r.answered_by_partner, 'desde Beto: Ana contestó';
  assert (select count(*) from public.get_custom_questions()) = 2, 'Beto ve las mismas';
end $$;
select pg_temp.as_user('C');
do $$
begin
  assert (select count(*) from public.get_custom_questions()) = 1, 'Caro solo ve la suya (de la prueba de duplicados)';
end $$;
-- Otra pareja no retira la mía; una global tampoco se puede retirar; inexistente igual.
select pg_temp.expect_error(format('select public.retire_custom_question(%L)', (select id from t_ids where k = 'own1')), 'question_not_found');
select pg_temp.expect_error(format('select public.retire_custom_question(%L)', pg_temp.qid('test-a-1')), 'question_not_found');
select pg_temp.expect_error($q$select public.retire_custom_question(gen_random_uuid())$q$, 'question_not_found');
select pg_temp.expect_error($q$select public.retire_custom_question(null)$q$, 'question_not_found');
-- Beto (el otro miembro) retira la que Ana creó y contestó.
select pg_temp.as_user('B');
do $$
declare
  own1 uuid := (select id from t_ids where k = 'own1');
begin
  perform public.retire_custom_question(own1);
  assert not (select is_active from public.questions where id = own1), 'queda inactiva';
  assert pg_temp.n_answers(own1) = 1, 'las respuestas se conservan';
  assert not exists (select 1 from public.get_custom_questions() g where g.id = own1), 'sale de la lista';
  -- Retirar de nuevo es inofensivo.
  perform public.retire_custom_question(own1);
  -- Sigue viéndose para quien ya la contestó (historial), aunque esté inactiva.
  assert (select count(*) from public.questions where id = own1) = 1, 'visible por estar contestada';
end $$;
reset role;
update public.questions set is_active = false where category = 'test-ord';
do $$
declare
  p1 uuid := pg_temp.cid(pg_temp.u('A'));
begin
  assert pg_temp.picks_in(p1, array[pg_temp.qid('test-a-1'), pg_temp.qid('test-a-2')], 40), 'la retirada no sale en la pregunta del día';
end $$;

-- =============================================================================
-- 10) Picantes: la categoría `picantes` fuerza intensidad y exige picantes activas.
-- =============================================================================
select pg_temp.as_user('A');
select pg_temp.expect_error($q$select public.add_custom_question('picantes', 'open', 'Una pregunta picante de prueba')$q$, 'spicy_not_active');
select pg_temp.as_user('A'); select public.set_spicy_opt_in(true);
select pg_temp.expect_error($q$select public.add_custom_question('picantes', 'open', 'Una pregunta picante de prueba')$q$, 'spicy_not_active');
select pg_temp.as_user('B'); select public.set_spicy_opt_in(true);
select pg_temp.as_user('A');
do $$
declare
  v_id uuid;
begin
  v_id := public.add_custom_question('picantes', 'open', 'Una pregunta picante de prueba', null, 'ligera');
  assert (select intensity from public.questions where id = v_id) = 'picante', 'picantes fuerza intensity picante';
  v_id := public.add_custom_question('picantes', 'open', 'Otra pregunta picante de prueba', null, 'profunda');
  assert (select intensity from public.questions where id = v_id) = 'picante', 'incluso si pasan profunda';
  insert into t_ids values ('hot1', v_id);
  -- Con picantes activas, `picante` en otra categoría sigue sin valer.
  perform pg_temp.expect_error($q$select public.add_custom_question('test-a', 'open', 'Pregunta de prueba larga', null, 'picante')$q$, 'invalid_question');
  -- Con picantes activas el tema picante deja de estar bloqueado.
  assert (select g.next_question_id from public.get_packs() g where g.slug = 'test-pack-hot') = pg_temp.qid('test-hotpk-1'),
    'tema picante desbloqueado: siguiente por position';
  assert (select g.total from public.get_packs() g where g.slug = 'test-pack-hot') = 2, 'mismo total';
end $$;
-- Si Beto quita el opt-in, la propia picante se oculta para ambos (pero no se pierde).
select pg_temp.as_user('B'); select public.set_spicy_opt_in(false);
select pg_temp.as_user('A');
do $$
begin
  assert (select count(*) from public.questions where id = (select id from t_ids where k = 'hot1')) = 0, 'picante propia oculta sin opt-in';
  assert (select g.next_question_id from public.get_packs() g where g.slug = 'test-pack-hot') is null, 'tema picante bloqueado otra vez';
end $$;
reset role;
do $$
begin
  -- pick no elige la propia picante sin picantes activas.
  assert pg_temp.picks_in(pg_temp.cid(pg_temp.u('A')), array[pg_temp.qid('test-a-1'), pg_temp.qid('test-a-2')], 40),
    'sin picantes activas no se elige la picante propia';
end $$;

-- =============================================================================
-- 11) Límite de 20 preguntas propias por pareja en 24 h.
-- =============================================================================
select pg_temp.as_user('D');
do $$
declare
  i integer;
begin
  -- P2 ya tiene 1 propia de la prueba de duplicados; agrega 19 más hasta llegar a 20.
  for i in 1..19 loop
    perform public.add_custom_question('test-a', 'open', pg_temp.words(i));
  end loop;
  assert (select count(*) from public.questions where couple_id = public.my_couple_id()) = 20, '20 propias';
end $$;
select pg_temp.expect_error(format('select public.add_custom_question(%L, %L, %L)', 'test-a', 'open', pg_temp.words(20)), 'too_many_questions');
-- Retirar no devuelve cupo (cuentan las creadas en 24 h) y el límite es por pareja.
select pg_temp.as_user('C');
do $$
begin
  perform public.retire_custom_question((select q.id from public.questions q where q.couple_id = public.my_couple_id() limit 1));
end $$;
select pg_temp.expect_error(format('select public.add_custom_question(%L, %L, %L)', 'test-a', 'open', pg_temp.words(21)), 'too_many_questions');
reset role;
-- Las creadas hace más de 24 h ya no cuentan.
update public.questions set created_at = now() - interval '25 hours'
where couple_id = pg_temp.cid(pg_temp.u('C'));
select pg_temp.as_user('C');
do $$
begin
  perform public.add_custom_question('test-a', 'open', pg_temp.words(22));
end $$;
-- P1 no se ve afectada por el límite de P2.
select pg_temp.as_user('A');
do $$
begin
  perform public.add_custom_question('test-a', 'open', 'Pregunta extra de Ana sin límite');
end $$;
reset role;

rollback;

select 'content_bank: OK' as resultado;
