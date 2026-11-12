-- Pruebas de la zona horaria de cada quien (migración 20261111000002_member_timezones.sql).
-- El día de la pareja es el de quien va más atrás. Todo termina en ROLLBACK.
--   psql -X -v ON_ERROR_STOP=1 -f supabase/tests/member_timezones.sql

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local', '{"display_name":"Ana"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.local', '{"display_name":"Beto"}');

create function pg_temp.u(p_letter text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-0000000000' ||
    (array['a1','b2'])[ascii(upper(p_letter)) - 64])::uuid;
$$;

create function pg_temp.as_user(p_letter text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', pg_temp.u(p_letter), 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', pg_temp.u(p_letter)::text, true);
end;
$$;

create function pg_temp.code_of(p_user uuid) returns text language sql security definer as $$
  select c.invite_code from public.couples c
  join public.couple_members cm on cm.couple_id = c.id where cm.user_id = p_user;
$$;

create function pg_temp.couple_of(p_user uuid) returns uuid language sql security definer as $$
  select cm.couple_id from public.couple_members cm where cm.user_id = p_user;
$$;

select pg_temp.as_user('A'); select public.create_couple(null, 'America/Mexico_City');
select pg_temp.as_user('B'); select public.join_couple(pg_temp.code_of(pg_temp.u('A')));
reset role;

-- 1) set_my_timezone guarda solo la zona propia y valida el nombre.
select pg_temp.as_user('A'); select public.set_my_timezone('America/Mexico_City'); reset role;
select pg_temp.as_user('B'); select public.set_my_timezone('America/Tijuana'); reset role;

do $$
begin
  assert (select timezone from public.profiles where id = pg_temp.u('A')) = 'America/Mexico_City',
    'Ana guarda su zona';
  assert (select timezone from public.profiles where id = pg_temp.u('B')) = 'America/Tijuana',
    'Beto guarda su zona';
end;
$$;

do $$
begin
  perform pg_temp.as_user('A');
  begin
    perform public.set_my_timezone('Marte/Olympus');
    raise exception 'ASSERT: una zona inventada debía fallar';
  exception when others then
    if sqlerrm <> 'invalid_timezone' then raise; end if;
  end;
  begin
    perform public.set_my_timezone('');
    raise exception 'ASSERT: una zona vacía debía fallar';
  exception when others then
    if sqlerrm <> 'invalid_timezone' then raise; end if;
  end;
  execute 'reset role';
end;
$$;

-- La app no puede escribir la columna directo (va por RPC).
do $$
begin
  perform pg_temp.as_user('A');
  begin
    update public.profiles set timezone = 'Asia/Tokyo' where id = pg_temp.u('A');
    raise exception 'ASSERT: el update directo de timezone debía ser rechazado';
  exception when insufficient_privilege then
    null;
  end;
  execute 'reset role';
end;
$$;

-- 2) El día de la pareja es el de quien va más atrás.
--    06:30 UTC = 00:30 en Ciudad de México (UTC-6) y 22:30 del día anterior en Tijuana (UTC-8).
do $$
declare
  v_couple uuid := pg_temp.couple_of(pg_temp.u('A'));
  v_at timestamptz := '2026-11-12 06:30:00+00';
begin
  assert private.couple_day_at(v_couple, v_at) = date '2026-11-11',
    'a las 00:30 en CDMX sigue siendo el 11 porque en Tijuana son las 22:30';
  assert private.couple_day_at(v_couple, '2026-11-12 08:00:00+00') = date '2026-11-12',
    'a medianoche de Tijuana ya es el 12 para los dos';
  -- Sin zona propia se usa la de la pareja.
  update public.profiles set timezone = null where id = pg_temp.u('B');
  assert private.couple_day_at(v_couple, v_at) = date '2026-11-12',
    'sin zona de Beto, manda la de la pareja (CDMX)';
  update public.profiles set timezone = 'America/Tijuana' where id = pg_temp.u('B');
  -- Quien va adelante tampoco adelanta el día: Asia/Tokyo no cambia nada.
  update public.profiles set timezone = 'Asia/Tokyo' where id = pg_temp.u('A');
  assert private.couple_day_at(v_couple, v_at) = date '2026-11-11',
    'el día sigue siendo el de Tijuana aunque en Tokio ya sea el 12';
  update public.profiles set timezone = 'America/Mexico_City' where id = pg_temp.u('A');
  assert public.couple_today(v_couple) = private.couple_day_at(v_couple, now()),
    'couple_today usa couple_day_at';
  assert public.couple_start_day(v_couple) is not null, 'couple_start_day sigue funcionando';
end;
$$;

-- 3) get_streak sigue funcionando con la regla nueva.
create temp table expected_today as select public.couple_today(pg_temp.couple_of(pg_temp.u('A'))) as d;
grant select on expected_today to authenticated;
select pg_temp.as_user('A');
do $$
begin
  assert (public.get_streak() ->> 'today')::date = (select d from expected_today),
    'get_streak.today es el día de la pareja';
end;
$$;
reset role;

-- 4) Las funciones internas no se exponen.
do $$
begin
  assert not has_function_privilege('authenticated', 'private.couple_day_at(uuid, timestamptz)', 'execute'),
    'couple_day_at es interna';
  assert not has_function_privilege('anon', 'public.set_my_timezone(text)', 'execute'),
    'anon no llama set_my_timezone';
end;
$$;

rollback;
