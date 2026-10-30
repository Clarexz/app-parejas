-- Pruebas de la Fase 2: moods (RPC set_mood, RLS de lectura y escritura directa).
-- Todo ocurre en una transacción que termina en ROLLBACK.
--   psql -X -v ON_ERROR_STOP=1 -f supabase/tests/moods.sql

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local', '{"display_name":"Ana"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.local', '{"display_name":"Beto"}'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@test.local', '{"display_name":"Caro"}'),
  ('00000000-0000-0000-0000-0000000000d4', 'd@test.local', '{"display_name":"Dani"}'),
  ('00000000-0000-0000-0000-0000000000e5', 'e@test.local', '{"display_name":"Eli"}');

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
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

grant execute on function pg_temp.act_as(uuid), pg_temp.expect_error(text, text),
  pg_temp.expect_denied(text) to authenticated, anon;

-- 1) anon no puede llamar a set_mood ni leer moods.
set local role anon;
select pg_temp.expect_denied($q$select public.set_mood('🙂')$q$);
select pg_temp.expect_denied('select * from public.moods');
reset role;

-- Parejas: Ana + Beto (P1), Caro + Dani (P2). Eli sin pareja.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
create temp table t_p1 on commit drop as select (public.create_couple(null, 'America/Mexico_City')).invite_code;
grant select on t_p1 to authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select public.join_couple((select invite_code from t_p1));

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
create temp table t_p2 on commit drop as select (public.create_couple(null, 'America/Mexico_City')).invite_code;
grant select on t_p2 to authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d4');
select public.join_couple((select invite_code from t_p2));

-- 2) Sin pareja no hay mood.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e5');
select pg_temp.expect_error($q$select public.set_mood('🙂')$q$, 'no_couple');

-- 3) Validaciones.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect_error($q$select public.set_mood('')$q$, 'invalid_mood');
select pg_temp.expect_error($q$select public.set_mood(null)$q$, 'invalid_mood');
select pg_temp.expect_error($q$select public.set_mood('🙂 🙂')$q$, 'invalid_mood');
select pg_temp.expect_error($q$select public.set_mood('abcdefghijklmnopq')$q$, 'invalid_mood');
select pg_temp.expect_error(format('select public.set_mood(%L, %L)', '🙂', repeat('x', 81)), 'invalid_mood');

-- 4) Ana guarda dos moods; la nota se recorta y la vacía queda null.
do $$
declare
  m public.moods;
begin
  m := public.set_mood(' 🥰 ', '  pensando en ti  ');
  assert m.emoji = '🥰', 'emoji recortado';
  assert m.note = 'pensando en ti', 'nota recortada';
  assert m.user_id = '00000000-0000-0000-0000-0000000000a1', 'user_id del servidor';
  m := public.set_mood('👩‍❤️‍👨', '   ');
  assert m.note is null, 'nota vacía = null';
end $$;

-- 5) Escritura directa prohibida (insert/update/delete).
select pg_temp.expect_denied($q$insert into public.moods (couple_id, user_id, emoji)
  values (public.my_couple_id(), auth.uid(), '😈')$q$);
select pg_temp.expect_denied($q$update public.moods set emoji = '😈'$q$);
select pg_temp.expect_denied($q$delete from public.moods$q$);

-- 6) Beto ve los moods de Ana; Caro (otra pareja) no ve nada de P1.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
do $$
begin
  assert (select count(*) from public.moods) = 2, 'Beto ve los 2 moods de Ana';
  perform public.set_mood('😴');
  assert (select count(*) from public.moods) = 3, 'Beto ve 3 moods en su pareja';
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
do $$
begin
  perform public.set_mood('🌮', 'tacos');
  assert (select count(*) from public.moods) = 1, 'Caro solo ve el suyo';
  assert not exists (
    select 1 from public.moods where user_id <> '00000000-0000-0000-0000-0000000000c3'
  ), 'Caro no ve moods de otra pareja';
end $$;

-- 7) Beto sale de P1; Eli entra con el código nuevo y no ve el historial de Beto.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select public.leave_couple();
do $$
begin
  assert (select count(*) from public.moods) = 0, 'sin pareja, Beto no ve moods';
end $$;

reset role;
create temp table t_p1b on commit drop as
  select c.invite_code from public.couples c
  join public.couple_members cm on cm.couple_id = c.id
  where cm.user_id = '00000000-0000-0000-0000-0000000000a1';
grant select on t_p1b to authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e5');
select public.join_couple((select invite_code from t_p1b));
do $$
begin
  assert (select count(*) from public.moods) = 2, 'Eli ve solo los moods de Ana';
  assert not exists (
    select 1 from public.moods where user_id = '00000000-0000-0000-0000-0000000000b2'
  ), 'Eli no ve el historial de Beto';
end $$;

reset role;

-- 8) Restricciones de la tabla aunque se escriba como service_role.
do $$
begin
  begin
    insert into public.moods (couple_id, user_id, emoji, note)
    select cm.couple_id, cm.user_id, '🙂', '   ' from public.couple_members cm limit 1;
    raise exception 'ASSERT: nota en blanco debía fallar';
  exception when check_violation then
    null;
  end;
end $$;

rollback;

select 'moods: OK' as resultado;
