-- Pruebas de la Fase 12A: frutas (migración 20261108000000_fruits.sql).
-- Todo ocurre en una transacción que termina en ROLLBACK. Las peticiones de pg_net que se
-- encolan aquí nunca salen: el worker solo ve filas confirmadas.
--   psql -X -v ON_ERROR_STOP=1 -f supabase/tests/fruits.sql

begin;

-- Los ids están en orden: Ana (a1) < Beto (b2) < Caro (c3) < Eli (e5).
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local', '{"display_name":"Ana"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.local', '{"display_name":"Beto"}'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@test.local', '{"display_name":"Caro"}'),
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

-- Llama a set_fruit como esa persona y devuelve la fruta o el mensaje de error.
create function pg_temp.try_set(p_letter text, p_fruit text) returns text language plpgsql as $$
declare
  v_result text;
begin
  perform pg_temp.as_user(p_letter);
  begin
    v_result := public.set_fruit(p_fruit);
  exception when others then
    v_result := 'ERR:' || sqlerrm;
  end;
  execute 'reset role';
  return v_result;
end;
$$;

-- Fruta efectiva de una persona (la función es privada: se llama como superusuario).
create function pg_temp.eff(p_letter text) returns text language sql as $$
  select private.effective_fruit(pg_temp.u(p_letter));
$$;

-- Fija la fruta directo en la tabla (solo el superusuario puede; sirve para armar escenarios).
create function pg_temp.raw(p_letter text, p_fruit text) returns void language sql as $$
  update public.profiles set fruit = p_fruit where id = pg_temp.u(p_letter);
$$;

grant execute on function pg_temp.u(text), pg_temp.as_user(text), pg_temp.expect_error(text, text),
  pg_temp.expect_denied(text), pg_temp.assert(boolean, text), pg_temp.code_of(uuid),
  pg_temp.try_set(text, text), pg_temp.eff(text), pg_temp.raw(text, text)
  to authenticated, anon, service_role;

-- Peticiones encoladas en pg_net por esta transacción (las de antes no cuentan).
create temp table t_base as select coalesce(max(id), 0) as id from net.http_request_queue;
create function pg_temp.queued() returns setof jsonb language sql as $$
  select convert_from(q.body, 'utf8')::jsonb from net.http_request_queue q
  where q.id > (select id from t_base) order by q.id;
$$;

-- Las 7 llaves, en el orden del manual.
create temp table t_keys (k text primary key);
insert into t_keys values ('sandia'), ('mango'), ('mandarina'), ('limon'), ('uva'), ('arandano'), ('pitaya');
grant select on t_keys to authenticated, service_role;

-- =============================================================================
-- 1) Reglas puras
-- =============================================================================
select pg_temp.assert(private.fruit_clash('mango', 'mango') = 'same', 'misma fruta: same');
select pg_temp.assert(private.fruit_clash('sandia', 'pitaya') = 'similar', 'sandia-pitaya');
select pg_temp.assert(private.fruit_clash('pitaya', 'sandia') = 'similar', 'pitaya-sandia');
select pg_temp.assert(private.fruit_clash('sandia', 'mandarina') = 'similar', 'sandia-mandarina');
select pg_temp.assert(private.fruit_clash('mandarina', 'sandia') = 'similar', 'mandarina-sandia');
select pg_temp.assert(private.fruit_clash('mango', 'limon') = 'similar', 'mango-limon');
select pg_temp.assert(private.fruit_clash('limon', 'mango') = 'similar', 'limon-mango');
select pg_temp.assert(private.fruit_clash('mango', 'mandarina') = 'similar', 'mango-mandarina');
select pg_temp.assert(private.fruit_clash('mandarina', 'mango') = 'similar', 'mandarina-mango');
select pg_temp.assert(private.fruit_clash('uva', 'arandano') = 'similar', 'uva-arandano');
select pg_temp.assert(private.fruit_clash('arandano', 'uva') = 'similar', 'arandano-uva');
select pg_temp.assert(private.fruit_clash('uva', 'pitaya') = 'similar', 'uva-pitaya');
select pg_temp.assert(private.fruit_clash('pitaya', 'uva') = 'similar', 'pitaya-uva');
select pg_temp.assert(private.fruit_clash('sandia', 'mango') is null, 'sandia-mango conviven');
select pg_temp.assert(private.fruit_clash('limon', 'uva') is null, 'limon-uva conviven');
select pg_temp.assert(private.fruit_clash('arandano', 'mandarina') is null, 'arandano-mandarina conviven');
select pg_temp.assert(private.fruit_clash(null, 'mango') is null, 'null no choca');

-- Exactamente 6 pares parecidos (de las 21 combinaciones distintas).
select pg_temp.assert(
  (select count(*) from t_keys a, t_keys b where a.k < b.k and private.fruit_clash(a.k, b.k) = 'similar') = 6,
  'hay 6 pares parecidos');

select pg_temp.assert(private.suggested_fruit('sandia') = 'mango', 'sugerida de sandia');
select pg_temp.assert(private.suggested_fruit('mango') = 'sandia', 'sugerida de mango');
select pg_temp.assert(private.suggested_fruit('mandarina') = 'uva', 'sugerida de mandarina');
select pg_temp.assert(private.suggested_fruit('limon') = 'pitaya', 'sugerida de limon');
select pg_temp.assert(private.suggested_fruit('uva') = 'limon', 'sugerida de uva');
select pg_temp.assert(private.suggested_fruit('arandano') = 'mandarina', 'sugerida de arandano');
select pg_temp.assert(private.suggested_fruit('pitaya') = 'limon', 'sugerida de pitaya');
-- Ninguna sugerida choca con su origen.
select pg_temp.assert(
  not exists (select 1 from t_keys where private.fruit_clash(k, private.suggested_fruit(k)) is not null),
  'las sugeridas siempre conviven');

-- =============================================================================
-- 2) Permisos y sesión
-- =============================================================================
set local role anon;
select pg_temp.expect_denied($q$select public.set_fruit('mango')$q$);
select pg_temp.expect_denied($q$select public.notify_actor_fruit(gen_random_uuid())$q$);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true);
select pg_temp.expect_error($q$select public.set_fruit('mango')$q$, 'not_authenticated');
select pg_temp.expect_denied($q$select private.fruit_clash('mango', 'uva')$q$);
select pg_temp.expect_denied($q$select private.suggested_fruit('mango')$q$);
select pg_temp.expect_denied($q$select private.effective_fruit(gen_random_uuid())$q$);
select pg_temp.expect_denied($q$select public.notify_actor_fruit(gen_random_uuid())$q$);
reset role;

-- =============================================================================
-- 3) Sin pareja (Eli)
-- =============================================================================
select pg_temp.assert(pg_temp.eff('E') = 'sandia', 'sin elegir y sin pareja: Sandía');
select pg_temp.assert((select fruit from public.profiles where id = pg_temp.u('E')) is null, 'la columna empieza en null');

select pg_temp.as_user('E');
select pg_temp.expect_error($q$select public.set_fruit('kiwi')$q$, 'invalid_fruit');
select pg_temp.expect_error($q$select public.set_fruit('')$q$, 'invalid_fruit');
select pg_temp.expect_error($q$select public.set_fruit('Mango')$q$, 'invalid_fruit');
select pg_temp.expect_error($q$select public.set_fruit(null)$q$, 'invalid_fruit');
reset role;
select pg_temp.assert((select fruit from public.profiles where id = pg_temp.u('E')) is null, 'una fruta inválida no se guarda');

select pg_temp.assert(pg_temp.try_set('E', 'uva') = 'uva', 'Eli elige uva sin pareja');
select pg_temp.assert(pg_temp.eff('E') = 'uva', 'Eli ve uva');
select pg_temp.assert(pg_temp.try_set('E', 'pitaya') = 'pitaya', 'Eli cambia a pitaya (no hay pareja con quién chocar)');
select pg_temp.assert(pg_temp.try_set('E', 'pitaya') = 'pitaya', 'repetir la propia no falla');
select pg_temp.assert((select count(*) from pg_temp.queued()) = 0, 'sin pareja no se encola nada');

-- =============================================================================
-- 4) RLS: la columna no se escribe directo
-- =============================================================================
select pg_temp.as_user('E');
select pg_temp.expect_denied($q$update public.profiles set fruit = 'mango' where id = pg_temp.u('E')$q$);
select pg_temp.expect_denied($q$update public.profiles set fruit = null where id = pg_temp.u('E')$q$);
-- Lo demás del perfil sigue editable.
update public.profiles set nickname = 'Eli' where id = pg_temp.u('E');
reset role;
select pg_temp.assert((select fruit from public.profiles where id = pg_temp.u('E')) = 'pitaya', 'el update directo no cambió la fruta');

-- El CHECK rechaza llaves que no existen (aun para el superusuario).
create function pg_temp.check_rejects() returns boolean language plpgsql as $$
begin
  update public.profiles set fruit = 'kiwi' where id = pg_temp.u('E');
  return false;
exception when check_violation then
  return true;
end;
$$;
select pg_temp.assert(pg_temp.check_rejects(), 'el CHECK rechaza llaves inválidas');

-- =============================================================================
-- 5) Parejas: Ana + Beto (Ana tiene el id menor); Caro sola en su pareja
-- =============================================================================
select pg_temp.as_user('A'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('B'); select public.join_couple(pg_temp.code_of(pg_temp.u('A')));
select pg_temp.as_user('C'); select public.create_couple(null, 'America/Mexico_City');
reset role;

-- Valores por defecto: ninguno eligió.
select pg_temp.assert(pg_temp.eff('A') = 'sandia', 'por defecto el id menor: Sandía');
select pg_temp.assert(pg_temp.eff('B') = 'mango', 'por defecto el id mayor: Mango');
select pg_temp.assert(pg_temp.eff('C') = 'sandia', 'sola en su pareja: Sandía');

-- Solo uno eligió: el otro toma la sugerida.
select pg_temp.raw('B', 'uva');
select pg_temp.assert(pg_temp.eff('B') = 'uva' and pg_temp.eff('A') = 'limon', 'solo Beto eligió uva: Ana ve limón');
select pg_temp.raw('B', null); select pg_temp.raw('A', 'mango');
select pg_temp.assert(pg_temp.eff('A') = 'mango' and pg_temp.eff('B') = 'sandia', 'solo Ana eligió mango: Beto ve sandía');
select pg_temp.raw('A', 'sandia');
select pg_temp.assert(pg_temp.eff('A') = 'sandia' and pg_temp.eff('B') = 'mango', 'solo Ana eligió sandía: Beto ve mango');

-- Los dos eligieron sin chocar: cada quien la suya.
select pg_temp.raw('A', 'uva'); select pg_temp.raw('B', 'mango');
select pg_temp.assert(pg_temp.eff('A') = 'uva' and pg_temp.eff('B') = 'mango', 'sin choque: cada quien la suya');

-- Chocan (pasa al volver a emparejarse): el id menor conserva y el mayor toma la sugerida.
select pg_temp.raw('A', 'mango'); select pg_temp.raw('B', 'mango');
select pg_temp.assert(pg_temp.eff('A') = 'mango' and pg_temp.eff('B') = 'sandia', 'misma fruta: Ana conserva, Beto toma la sugerida');
select pg_temp.raw('A', 'uva'); select pg_temp.raw('B', 'arandano');
select pg_temp.assert(pg_temp.eff('A') = 'uva' and pg_temp.eff('B') = 'limon', 'parecidas (uva/arandano): Ana conserva, Beto toma la sugerida de uva');
select pg_temp.raw('A', 'arandano'); select pg_temp.raw('B', 'uva');
select pg_temp.assert(pg_temp.eff('A') = 'arandano' and pg_temp.eff('B') = 'mandarina', 'parecidas (arandano/uva): Ana conserva, Beto toma la sugerida de arandano');

-- Con cualquier combinación de 49, lo que se ve nunca choca.
create temp table t_resolve (x text, y text, ea text, eb text);
insert into t_resolve (x, y) select a.k, b.k from t_keys a, t_keys b;
do $$
declare
  r record;
begin
  for r in select x, y from t_resolve loop
    perform pg_temp.raw('A', r.x);
    perform pg_temp.raw('B', r.y);
    update t_resolve set ea = pg_temp.eff('A'), eb = pg_temp.eff('B') where t_resolve.x = r.x and t_resolve.y = r.y;
  end loop;
end;
$$;
select pg_temp.assert(not exists (select 1 from t_resolve where private.fruit_clash(ea, eb) is not null),
  'la resolución nunca deja un choque');
-- Y si no chocaban, cada quien conserva la suya.
select pg_temp.assert(not exists (
  select 1 from t_resolve where private.fruit_clash(x, y) is null and (ea <> x or eb <> y)
), 'sin choque no se cambia nada');
-- Ana (id menor) siempre conserva la suya.
select pg_temp.assert(not exists (select 1 from t_resolve where ea <> x), 'el id menor conserva siempre la suya');

select pg_temp.raw('A', null); select pg_temp.raw('B', null);

-- =============================================================================
-- 6) set_fruit con pareja
-- =============================================================================
-- Matriz completa: Beto tiene y, Ana intenta x.
create temp table t_matrix (x text, y text, got text, want text);
insert into t_matrix (x, y) select a.k, b.k from t_keys a, t_keys b;
do $$
declare
  r record;
  v_got text;
begin
  for r in select x, y from t_matrix loop
    perform pg_temp.raw('A', null);
    perform pg_temp.raw('B', r.y);
    v_got := pg_temp.try_set('A', r.x);
    update t_matrix set got = v_got,
      want = case private.fruit_clash(r.x, r.y)
        when 'same' then 'ERR:fruit_taken'
        when 'similar' then 'ERR:fruit_too_similar'
        else r.x end
    where t_matrix.x = r.x and t_matrix.y = r.y;
  end loop;
end;
$$;
select pg_temp.assert(not exists (select 1 from t_matrix where got is distinct from want),
  'matriz de set_fruit: ' || coalesce((select string_agg(x || '/' || y || '=' || coalesce(got, '?'), ', ') from t_matrix where got is distinct from want), ''));

-- Casos nombrados.
select pg_temp.raw('A', null); select pg_temp.raw('B', 'mango');
select pg_temp.assert(pg_temp.try_set('A', 'mango') = 'ERR:fruit_taken', 'misma que la de la pareja');
select pg_temp.assert(pg_temp.try_set('A', 'limon') = 'ERR:fruit_too_similar', 'limón se parece a mango');
select pg_temp.assert(pg_temp.try_set('A', 'mandarina') = 'ERR:fruit_too_similar', 'mandarina se parece a mango');
select pg_temp.assert(pg_temp.try_set('A', 'kiwi') = 'ERR:invalid_fruit', 'llave inválida con pareja');
select pg_temp.assert((select fruit from public.profiles where id = pg_temp.u('A')) is null, 'los rechazos no guardan nada');
select pg_temp.assert(pg_temp.try_set('A', 'uva') = 'uva', 'uva sí convive con mango');
select pg_temp.assert((select fruit from public.profiles where id = pg_temp.u('A')) = 'uva', 'se guardó uva');

-- Se compara contra la fruta EFECTIVA de la pareja: Beto no eligió y ve la sugerida de la de Ana.
select pg_temp.raw('A', 'sandia'); select pg_temp.raw('B', null);
select pg_temp.assert(pg_temp.eff('B') = 'mango', 'Beto sin elegir ve mango');
select pg_temp.assert(pg_temp.try_set('A', 'mango') = 'ERR:fruit_taken', 'Ana no puede tomar la mango que Beto está viendo');

-- Caro, sola en su pareja, elige libremente.
select pg_temp.assert(pg_temp.try_set('C', 'pitaya') = 'pitaya', 'Caro sin pareja elige pitaya');

-- Salir de la pareja: cada quien conserva su fruta y deja de depender de la otra.
select pg_temp.raw('A', 'uva'); select pg_temp.raw('B', 'arandano');
select pg_temp.as_user('B'); select public.leave_couple(); reset role;
select pg_temp.assert(pg_temp.eff('B') = 'arandano', 'Beto fuera de la pareja ve su fruta');
select pg_temp.assert(pg_temp.eff('A') = 'uva', 'Ana sola ve su fruta');
select pg_temp.assert(pg_temp.try_set('B', 'pitaya') = 'pitaya', 'sin pareja ya no hay choque');

-- =============================================================================
-- 7) notify_actor_fruit (solo service_role)
-- =============================================================================
select pg_temp.raw('E', 'limon');
set local role service_role;
select pg_temp.assert(public.notify_actor_fruit(pg_temp.u('E')) = 'limon', 'service_role lee la fruta del actor');
select pg_temp.assert(public.notify_actor_fruit(gen_random_uuid()) = 'sandia', 'un id desconocido cae en Sandía');
reset role;

-- =============================================================================
-- 8) Push de datos al cambiar de fruta
-- =============================================================================
-- Rearmar la pareja Ana + Beto (Ana ya tiene su pareja de un solo miembro: se une Beto).
select pg_temp.raw('A', null); select pg_temp.raw('B', null);
select pg_temp.as_user('B'); select public.join_couple(pg_temp.code_of(pg_temp.u('A'))); reset role;

insert into public.push_tokens (token, user_id) values
  ('token-ana-celular-1-xxxxxxxxxxxx', pg_temp.u('A')),
  ('token-beto-celular-1-xxxxxxxxxxx', pg_temp.u('B'));

-- Sin configuración la RPC no encola ni falla.
select pg_temp.assert(pg_temp.try_set('A', 'uva') = 'uva', 'set_fruit sin notify_url funciona');
select pg_temp.assert((select count(*) from pg_temp.queued()) = 0, 'sin notify_url no se encola');

insert into private.settings (key, value) values
  ('notify_url', 'http://functions:9000/notify'), ('notify_secret', 'secreto-de-prueba');

select pg_temp.assert(pg_temp.try_set('A', 'sandia') = 'sandia', 'Ana cambia a sandía');
select pg_temp.assert((select count(*) from pg_temp.queued()) = 1, 'set_fruit encola 1, hay ' || (select count(*) from pg_temp.queued()));
select pg_temp.assert((select e ->> 'kind' || ':' || (e -> 'data' ->> 'scope') from pg_temp.queued() e) = 'widget:profile', 'kind widget, scope profile');
select pg_temp.assert((select (e -> 'recipient' ->> 'id')::uuid from pg_temp.queued() e) = pg_temp.u('B'), 'destinatario Beto');
select pg_temp.assert((select (e -> 'actor' ->> 'id')::uuid from pg_temp.queued() e) = pg_temp.u('A'), 'actora Ana');

-- Un rechazo no encola.
select pg_temp.raw('B', 'pitaya');
select pg_temp.assert(pg_temp.try_set('A', 'uva') = 'ERR:fruit_too_similar', 'uva se parece a pitaya');
select pg_temp.assert((select count(*) from pg_temp.queued()) = 1, 'un rechazo no encola');

-- =============================================================================
-- 9) Realtime
-- =============================================================================
select pg_temp.assert(
  not exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime')
  or exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ),
  'profiles está en supabase_realtime');

rollback;

select 'fruits: OK' as resultado;
