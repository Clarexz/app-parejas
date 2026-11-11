-- Pruebas de la Fase 12 (parte 2): respuestas en audio (migración 20261111000000_audio_answers.sql).
-- Requiere el stub de Storage (supabase/tests/fixtures/storage_stub.sql) aplicado ANTES.
-- Todo ocurre en una transacción que termina en ROLLBACK.
--   psql -X -v ON_ERROR_STOP=1 -f supabase/tests/audio_answers.sql

begin;

insert into storage.buckets (id, name, public) values ('answer-audio', 'answer-audio', false), ('memories', 'memories', false)
on conflict (id) do nothing;

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

create function pg_temp.cid(p_letter text) returns uuid language sql security definer as $$
  select cm.couple_id from public.couple_members cm where cm.user_id = pg_temp.u(p_letter);
$$;

create function pg_temp.qid(p_slug text) returns uuid language sql security definer as $$
  select id from public.questions where slug = p_slug;
$$;

-- Ruta de audio: <pareja de p_letter>/<p_letter>/<pregunta>/<p_tag>.m4a (p_tag es un uuid).
create function pg_temp.ap(p_letter text, p_slug text, p_tag text) returns text language sql security definer as $$
  select pg_temp.cid(p_letter)::text || '/' || pg_temp.u(p_letter)::text || '/' || pg_temp.qid(p_slug)::text
    || '/' || p_tag || '.m4a';
$$;

grant execute on function pg_temp.u(text), pg_temp.as_user(text), pg_temp.expect_error(text, text),
  pg_temp.expect_denied(text), pg_temp.assert(boolean, text), pg_temp.code_of(uuid),
  pg_temp.cid(text), pg_temp.qid(text), pg_temp.ap(text, text, text)
  to authenticated, anon, service_role;

-- Banco propio (las preguntas se identifican por slug).
insert into public.question_categories (slug, name, emoji, intensity, position) values
  ('test-au', 'Prueba audio', '🎙️', 'ligera', 910);
insert into public.questions (slug, category, type, text, options, intensity, is_active) values
  ('au-open-1', 'test-au', 'open', 'Cuéntame algo con tu voz uno', null, 'ligera', true),
  ('au-open-2', 'test-au', 'open', 'Cuéntame algo con tu voz dos', null, 'ligera', true),
  ('au-open-3', 'test-au', 'open', 'Cuéntame algo con tu voz tres', null, 'ligera', true),
  ('au-choice', 'test-au', 'choice', 'Playa o montaña para el audio', '["Playa","Montaña"]', 'ligera', true);

-- Parejas: Ana + Beto (P1), Caro + Dani (P2).
select pg_temp.as_user('A'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('B'); select public.join_couple(pg_temp.code_of(pg_temp.u('A')));
select pg_temp.as_user('C'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('D'); select public.join_couple(pg_temp.code_of(pg_temp.u('C')));
reset role;

-- Archivos de la prueba (uuid fijos).
create temp table t_f (k text primary key, v text);
grant select on t_f to authenticated, service_role;
insert into t_f values
  ('a1', pg_temp.ap('A', 'au-open-1', '11111111-1111-1111-1111-111111111111')),
  ('a2', pg_temp.ap('A', 'au-open-1', '22222222-2222-2222-2222-222222222222')),
  ('b1', pg_temp.ap('B', 'au-open-1', '33333333-3333-3333-3333-333333333333')),
  ('a_choice', pg_temp.ap('A', 'au-choice', '44444444-4444-4444-4444-444444444444')),
  ('a_o2', pg_temp.ap('A', 'au-open-2', '55555555-5555-5555-5555-555555555555'));
create function pg_temp.f(p_k text) returns text language sql security definer as $$
  select v from t_f where k = p_k;
$$;
grant execute on function pg_temp.f(text) to authenticated, service_role;

-- =============================================================================
-- 1) Permisos y validaciones de submit_answer
-- =============================================================================
set local role anon;
select pg_temp.expect_denied(format($q$select public.submit_answer(%L, null, null, %L, 5000)$q$, pg_temp.qid('au-open-1'), pg_temp.f('a1')));
select pg_temp.expect_denied($q$select public.answer_audio_cleanup_batch()$q$);
reset role;

-- Sin objeto en Storage el audio se rechaza.
select pg_temp.as_user('A');
select pg_temp.expect_error(format($q$select public.submit_answer(%L, null, null, %L, 5000)$q$,
  pg_temp.qid('au-open-1'), pg_temp.f('a1')), 'invalid_answer');
reset role;

-- Ana sube sus archivos (solo en su carpeta; la de Beto o la de otra pareja se rechaza).
select pg_temp.as_user('A');
do $$
declare
  v_couple uuid := public.my_couple_id();
begin
  insert into storage.objects (bucket_id, name, owner) values ('answer-audio', pg_temp.f('a1'), auth.uid());
  insert into storage.objects (bucket_id, name, owner) values ('answer-audio', pg_temp.f('a2'), auth.uid());
  insert into storage.objects (bucket_id, name, owner) values ('answer-audio', pg_temp.f('a_choice'), auth.uid());
  insert into storage.objects (bucket_id, name, owner) values ('answer-audio', pg_temp.f('a_o2'), auth.uid());
  perform pg_temp.expect_denied(format('insert into storage.objects (bucket_id, name) values (%L, %L)',
    'answer-audio', pg_temp.f('b1')));
  perform pg_temp.expect_denied(format('insert into storage.objects (bucket_id, name) values (%L, %L)',
    'answer-audio', pg_temp.cid('C') || '/' || pg_temp.u('A') || '/' || pg_temp.qid('au-open-1') || '/x.m4a'));
  -- profundidad incorrecta y ".."
  perform pg_temp.expect_denied(format('insert into storage.objects (bucket_id, name) values (%L, %L)',
    'answer-audio', v_couple || '/' || auth.uid() || '/x.m4a'));
  perform pg_temp.expect_denied(format('insert into storage.objects (bucket_id, name) values (%L, %L)',
    'answer-audio', v_couple || '/' || auth.uid() || '/' || pg_temp.qid('au-open-1') || '/..x.m4a'));
  -- sin update ni delete para clientes
  update storage.objects set name = name || 'x' where bucket_id = 'answer-audio';
  assert (select count(*) from storage.objects where bucket_id = 'answer-audio' and name like '%x') = 0, 'nadie renombra audios';
  delete from storage.objects where bucket_id = 'answer-audio';
  assert (select count(*) from storage.objects where bucket_id = 'answer-audio') = 4, 'Ana no borra audios con SQL';
end;
$$;
reset role;

-- Beto sube el suyo.
select pg_temp.as_user('B');
insert into storage.objects (bucket_id, name, owner) values ('answer-audio', pg_temp.f('b1'), auth.uid());
reset role;

-- Validaciones: ruta ajena, audio en choice, duración, pareja de argumentos, extensión.
select pg_temp.as_user('A');
-- ruta de otra persona (la de Beto, con el objeto existente)
select pg_temp.expect_error(format($q$select public.submit_answer(%L, null, null, %L, 5000)$q$,
  pg_temp.qid('au-open-1'), pg_temp.f('b1')), 'invalid_answer');
-- ruta de otra pregunta
select pg_temp.expect_error(format($q$select public.submit_answer(%L, null, null, %L, 5000)$q$,
  pg_temp.qid('au-open-1'), pg_temp.f('a_o2')), 'invalid_answer');
-- audio en pregunta de opciones
select pg_temp.expect_error(format($q$select public.submit_answer(%L, null, 0, %L, 5000)$q$,
  pg_temp.qid('au-choice'), pg_temp.f('a_choice')), 'invalid_answer');
-- duración fuera de rango
select pg_temp.expect_error(format($q$select public.submit_answer(%L, null, null, %L, 499)$q$,
  pg_temp.qid('au-open-1'), pg_temp.f('a1')), 'invalid_answer');
select pg_temp.expect_error(format($q$select public.submit_answer(%L, null, null, %L, 120001)$q$,
  pg_temp.qid('au-open-1'), pg_temp.f('a1')), 'invalid_answer');
-- ruta sin duración y duración sin ruta
select pg_temp.expect_error(format($q$select public.submit_answer(%L, 'hola', null, %L)$q$,
  pg_temp.qid('au-open-1'), pg_temp.f('a1')), 'invalid_answer');
select pg_temp.expect_error(format($q$select public.submit_answer(%L, 'hola', null, null, 5000)$q$,
  pg_temp.qid('au-open-1')), 'invalid_answer');
-- extensión o nombre que no es uuid.m4a
select pg_temp.expect_error(format($q$select public.submit_answer(%L, null, null, %L, 5000)$q$,
  pg_temp.qid('au-open-1'), replace(pg_temp.f('a1'), '.m4a', '.mp3')), 'invalid_answer');
select pg_temp.expect_error(format($q$select public.submit_answer(%L, null, null, %L, 5000)$q$,
  pg_temp.qid('au-open-1'), replace(pg_temp.f('a1'), '11111111-1111-1111-1111-111111111111', 'otro')), 'invalid_answer');
-- sin texto ni audio
select pg_temp.expect_error(format($q$select public.submit_answer(%L)$q$, pg_temp.qid('au-open-1')), 'invalid_answer');
select pg_temp.assert(not exists (select 1 from public.answers where user_id = auth.uid()), 'nada se guardó con los errores');
reset role;

-- =============================================================================
-- 2) Caso feliz y ocultamiento
-- =============================================================================
select pg_temp.as_user('A');
create temp table t_card as select public.submit_answer(pg_temp.qid('au-open-1'), null, null, pg_temp.f('a1'), 7000) as c;
grant select on t_card to authenticated, service_role;
select pg_temp.assert((select c -> 'mine' ->> 'audio_path' from t_card) = pg_temp.f('a1'), 'mine trae audio_path');
select pg_temp.assert((select (c -> 'mine' ->> 'audio_ms')::int from t_card) = 7000, 'mine trae audio_ms');
select pg_temp.assert((select c -> 'mine' -> 'text' from t_card) = 'null'::jsonb, 'solo audio: texto null');
select pg_temp.assert((select c -> 'partner' from t_card) = 'null'::jsonb, 'la pareja aún no contesta');
reset role;

-- Beto no ve la fila ni el objeto de Ana antes de contestar.
select pg_temp.as_user('B');
select pg_temp.assert(not exists (select 1 from public.answers where user_id = pg_temp.u('A')), 'Beto no ve la fila de Ana antes de contestar');
select pg_temp.assert(not exists (select 1 from storage.objects where name = pg_temp.f('a1')), 'Beto no ve el audio de Ana antes de contestar');
select pg_temp.assert(not public.answer_audio_path_readable(pg_temp.f('a1')), 'readable: no antes de contestar');
select pg_temp.assert(public.get_question_with_answers(pg_temp.qid('au-open-1')) -> 'partner' = 'null'::jsonb, 'card: partner oculto');
select pg_temp.assert(public.get_question_with_answers(pg_temp.qid('au-open-1')) ->> 'partner_answered' = 'true', 'card: sabe que Ana contestó');
select pg_temp.assert((select count(*) from storage.objects where bucket_id = 'answer-audio') = 1, 'Beto solo ve su propio audio');
-- Contestar con texto no desbloquea otra pregunta distinta.
create temp table t_card_b as select public.submit_answer(pg_temp.qid('au-open-1'), 'mi texto', null, pg_temp.f('b1'), 3000) as c;
grant select on t_card_b to authenticated, service_role;
select pg_temp.assert((select c -> 'partner' ->> 'audio_path' from t_card_b) = pg_temp.f('a1'), 'tras contestar, Beto recibe el audio de Ana');
select pg_temp.assert((select (c -> 'partner' ->> 'audio_ms')::int from t_card_b) = 7000, 'y su duración');
select pg_temp.assert(exists (select 1 from storage.objects where name = pg_temp.f('a1')), 'Beto ve el objeto de Ana tras contestar');
select pg_temp.assert(public.answer_audio_path_readable(pg_temp.f('a1')), 'readable tras contestar');
-- Pero no los audios de otras preguntas que no ha contestado.
select pg_temp.assert(not exists (select 1 from storage.objects where name = pg_temp.f('a_o2')), 'Beto no ve el audio de otra pregunta sin contestar');
select pg_temp.assert(exists (select 1 from public.answers where user_id = pg_temp.u('A') and question_id = pg_temp.qid('au-open-1')), 'Beto ve la fila de Ana tras contestar');
reset role;

-- Otra pareja nunca ve nada.
select pg_temp.as_user('C');
select pg_temp.assert((select count(*) from storage.objects where bucket_id = 'answer-audio') = 0, 'Caro no ve audios ajenos');
select pg_temp.assert(not public.answer_audio_path_readable(pg_temp.f('a1')), 'Caro no puede leer');
select pg_temp.assert(not public.answer_audio_path_writable(pg_temp.f('a1')), 'Caro no puede escribir');
reset role;

-- =============================================================================
-- 3) Edición y compatibilidad con llamadas viejas
-- =============================================================================
select pg_temp.as_user('A');
-- Cambiar a otro audio.
select pg_temp.assert((select public.submit_answer(pg_temp.qid('au-open-1'), null, null, pg_temp.f('a2'), 9000) -> 'mine' ->> 'audio_path') = pg_temp.f('a2'), 'editar con otro audio');
-- Texto + audio juntos.
select pg_temp.assert((select public.submit_answer(pg_temp.qid('au-open-1'), 'con texto', null, pg_temp.f('a2'), 9000) -> 'mine' ->> 'text') = 'con texto', 'texto y audio');
-- Llamada vieja de 3 argumentos: solo texto, y quita el audio.
select pg_temp.assert((select public.submit_answer(pg_temp.qid('au-open-1'), 'solo texto', null) -> 'mine' -> 'audio_path') = 'null'::jsonb, 'llamada de 3 args deja audio en null');
select pg_temp.assert((select count(*) from public.answers where user_id = auth.uid() and audio_ms is null and audio_path is null) = 1, 'audio_path y audio_ms quedan null');
-- Opciones con 3 argumentos sigue igual.
select pg_temp.assert((select public.submit_answer(pg_temp.qid('au-choice'), null, 1) -> 'mine' ->> 'choice') = '1', 'choice con 3 args');
reset role;

-- Constraints directos (como superusuario): ambos o ninguno, rango y forma.
select pg_temp.expect_error(format($q$update public.answers set audio_path = %L where user_id = %L and question_id = %L$q$,
  pg_temp.f('a1'), pg_temp.u('A'), pg_temp.qid('au-open-1')), 'new row for relation "answers" violates check constraint "answers_audio_pair"');
select pg_temp.expect_error(format($q$update public.answers set audio_path = %L, audio_ms = 10 where user_id = %L and question_id = %L$q$,
  pg_temp.f('a1'), pg_temp.u('A'), pg_temp.qid('au-open-1')), 'new row for relation "answers" violates check constraint "answers_audio_ms_range"');
select pg_temp.expect_error(format($q$update public.answers set audio_path = %L, audio_ms = 1000 where user_id = %L and question_id = %L$q$,
  pg_temp.f('b1'), pg_temp.u('A'), pg_temp.qid('au-open-1')), 'new row for relation "answers" violates check constraint "answers_audio_path_shape"');

-- =============================================================================
-- 4) Limpieza
-- =============================================================================
-- Ana volvió a solo texto: a1 y a2 ya no están referenciados; b1 sí (Beto lo conserva).
update storage.objects set created_at = now() - interval '48 hours' where bucket_id = 'answer-audio';
update storage.objects set created_at = now() - interval '1 hour' where name = pg_temp.f('a_o2');
insert into storage.objects (bucket_id, name, created_at) values
  ('answer-audio', pg_temp.cid('A') || '/' || pg_temp.u('A') || '/' || pg_temp.qid('au-open-3') || '/66666666-6666-6666-6666-666666666666.m4a', now() - interval '30 hours'),
  ('memories', pg_temp.cid('A') || '/' || pg_temp.u('A') || '/otro-bucket.jpg', now() - interval '30 hours');

set local role service_role;
create temp table t_batch as select public.answer_audio_cleanup_batch() as b;
reset role;
select pg_temp.assert((select b -> 'paths' ? pg_temp.f('a1') from t_batch), 'huérfano a1 en el lote');
select pg_temp.assert((select b -> 'paths' ? pg_temp.f('a2') from t_batch), 'huérfano a2 en el lote');
select pg_temp.assert(not (select b -> 'paths' ? pg_temp.f('b1') from t_batch), 'b1 está referenciado');
select pg_temp.assert(not (select b -> 'paths' ? pg_temp.f('a_o2') from t_batch), 'a_o2 es reciente');
select pg_temp.assert(not (select b -> 'paths' ? (pg_temp.cid('A') || '/' || pg_temp.u('A') || '/otro-bucket.jpg') from t_batch), 'otros buckets se ignoran');
select pg_temp.assert((select jsonb_array_length(b -> 'paths') from t_batch) = 4, 'lote: 4 huérfanos (a1, a2, a_choice, au-open-3), hay ' || (select jsonb_array_length(b -> 'paths') from t_batch));
set local role service_role;
select pg_temp.assert((select jsonb_array_length(public.answer_audio_cleanup_batch(1) -> 'paths')) = 1, 'p_limit = 1');
reset role;

select pg_temp.as_user('A');
select pg_temp.expect_denied($q$select public.answer_audio_cleanup_batch()$q$);
reset role;

rollback;
