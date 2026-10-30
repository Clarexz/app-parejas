-- Pruebas de la Fase 1: RPC de emparejamiento, restricciones y políticas del bucket avatars.
-- Requiere el stub de Storage (supabase/tests/fixtures/storage_stub.sql) aplicado ANTES de
-- las migraciones. Todo ocurre en una transacción que termina en ROLLBACK.
--   psql -X -v ON_ERROR_STOP=1 -f supabase/tests/couple_pairing.sql

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local', '{"display_name":"Ana"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.local', '{"display_name":"Beto"}'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@test.local', '{"display_name":"Caro"}'),
  ('00000000-0000-0000-0000-0000000000d4', 'd@test.local', '{}');

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- Helper de la prueba: actuar como un usuario (rol authenticated + claims del JWT).
create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
end;
$$;

-- Helper: espera que el SQL falle con el mensaje-clave indicado.
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

-- Helper: espera que el SQL falle por permisos/RLS/restricción (cualquiera de esas clases).
create function pg_temp.expect_denied(p_sql text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception
    when insufficient_privilege or check_violation then
      return;
  end;
  raise exception 'ASSERT: % debía ser rechazado', p_sql;
end;
$$;

grant execute on function pg_temp.act_as(uuid), pg_temp.expect_error(text, text),
  pg_temp.expect_denied(text) to authenticated, anon;

-- 1) anon no puede llamar a las RPC.
set local role anon;
do $$
begin
  perform pg_temp.expect_denied('select public.create_couple()');
  perform pg_temp.expect_denied('select public.join_couple(''ABC234'')');
end $$;
reset role;

-- 2) Ana crea la pareja.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
create temp table t_code on commit drop as
  select invite_code from public.create_couple(date '2023-02-14', 'America/Monterrey');
grant select on t_code to authenticated;

do $$
declare
  v_code text := (select invite_code from t_code);
begin
  assert v_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$', format('código con formato: %s', v_code);
  assert public.my_couple_id() is not null, 'Ana ya tiene pareja';
  assert (select timezone from public.couples) = 'America/Monterrey', 'zona horaria guardada';
  assert (select anniversary_date from public.couples) = date '2023-02-14', 'aniversario guardado';
  assert (select count(*) from public.couple_members) = 1, 'un miembro';
  perform pg_temp.expect_error('select public.create_couple()', 'already_in_couple');
  -- Ana no puede llamar a las funciones internas.
  perform pg_temp.expect_denied('select public.generate_invite_code()');
  -- Zona horaria inválida.
  perform pg_temp.expect_error(
    'update public.couples set timezone = ''Mars/Olympus''', 'invalid_timezone');
end $$;

-- 3) Beto se une con el código en minúsculas y con espacios.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
do $$
declare
  v_code text := (select invite_code from t_code);
  v_couple public.couples;
begin
  perform pg_temp.expect_error('select public.join_couple(''12'')', 'invalid_code');
  perform pg_temp.expect_error('select public.join_couple(''ZZZZZZ'')', 'code_not_found');
  v_couple := public.join_couple(lower(substr(v_code, 1, 3)) || ' - ' || lower(substr(v_code, 4)));
  assert v_couple.invite_code = v_code, 'se unió a la pareja del código';
  -- Repetir es idempotente.
  v_couple := public.join_couple(v_code);
  assert (select count(*) from public.couple_members) = 2, 'Beto ve 2 miembros';
  assert (select count(*) from public.profiles) = 2, 'Beto ve su perfil y el de Ana';
  perform pg_temp.expect_error('select public.create_couple()', 'already_in_couple');
end $$;

-- 4) Caro no puede unirse (pareja llena) ni ver nada de la pareja.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
do $$
declare
  v_code text := (select invite_code from t_code);
begin
  perform pg_temp.expect_error(format('select public.join_couple(%L)', v_code), 'couple_full');
  assert public.my_couple_id() is null, 'Caro sigue sin pareja';
  assert (select count(*) from public.couples) = 0, 'Caro no ve parejas';
  assert (select count(*) from public.couple_members) = 0, 'Caro no ve miembros';
  assert (select count(*) from public.profiles) = 1, 'Caro solo ve su perfil';
end $$;

-- 5) Restricciones del perfil y de la pareja.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
do $$
declare
  n integer;
begin
  update public.profiles
     set avatar_path = '00000000-0000-0000-0000-0000000000a1/123.jpg', nickname = 'Ani',
         birthday = date '1998-05-03'
   where id = '00000000-0000-0000-0000-0000000000a1';
  get diagnostics n = row_count;
  assert n = 1, 'Ana edita su perfil';

  perform pg_temp.expect_denied(
    'update public.profiles set avatar_path = ''00000000-0000-0000-0000-0000000000b2/x.jpg'' '
    'where id = ''00000000-0000-0000-0000-0000000000a1''');
  perform pg_temp.expect_denied(
    'update public.profiles set avatar_path = ''00000000-0000-0000-0000-0000000000a1/../b.jpg'' '
    'where id = ''00000000-0000-0000-0000-0000000000a1''');
  perform pg_temp.expect_denied(
    'update public.profiles set display_name = ''   '' '
    'where id = ''00000000-0000-0000-0000-0000000000a1''');

  update public.couples set photo_path = 'couples/' || id::text || '/1.jpg';
  get diagnostics n = row_count;
  assert n = 1, 'Ana pone la foto de la pareja';
  perform pg_temp.expect_denied('update public.couples set photo_path = ''couples/otra/1.jpg''');
  perform pg_temp.expect_denied('update public.couples set invite_code = ''ABCDEF''');
end $$;

-- 6) Storage: carpeta propia, de la pareja y compartida.
do $$
declare
  v_couple uuid := public.my_couple_id();
begin
  insert into storage.objects (bucket_id, name)
    values ('avatars', '00000000-0000-0000-0000-0000000000a1/1.jpg');
  insert into storage.objects (bucket_id, name)
    values ('avatars', 'couples/' || v_couple::text || '/1.jpg');
  perform pg_temp.expect_denied(
    'insert into storage.objects (bucket_id, name) '
    'values (''avatars'', ''00000000-0000-0000-0000-0000000000b2/x.jpg'')');
  perform pg_temp.expect_denied(
    'insert into storage.objects (bucket_id, name) '
    'values (''avatars'', ''couples/00000000-0000-0000-0000-000000000000/x.jpg'')');
  perform pg_temp.expect_denied(
    'insert into storage.objects (bucket_id, name) values (''otro'', ''x/1.jpg'')');
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
do $$
declare
  n integer;
begin
  insert into storage.objects (bucket_id, name)
    values ('avatars', '00000000-0000-0000-0000-0000000000b2/1.jpg');
  assert (select count(*) from storage.objects where bucket_id = 'avatars') = 3,
    'Beto ve su foto, la de Ana y la de la pareja';
  delete from storage.objects where name = '00000000-0000-0000-0000-0000000000a1/1.jpg';
  get diagnostics n = row_count;
  assert n = 0, 'Beto no puede borrar la foto de Ana';
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
do $$
begin
  assert (select count(*) from storage.objects) = 0, 'Caro no ve fotos ajenas';
end $$;

-- 7) Beto sale: el código cambia, Ana sigue; Beto ya no ve nada y no vuelve con el código viejo.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
do $$
declare
  v_old text := (select invite_code from t_code);
begin
  perform public.leave_couple();
  assert public.my_couple_id() is null, 'Beto ya no tiene pareja';
  assert (select count(*) from storage.objects where name like 'couples/%') = 0,
    'Beto ya no ve la carpeta de la pareja';
  perform pg_temp.expect_error(format('select public.join_couple(%L)', v_old), 'code_not_found');
  perform public.leave_couple(); -- sin pareja: no falla
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
create temp table t_code2 on commit drop as select invite_code from public.couples;
grant select on t_code2 to authenticated;
do $$
begin
  assert (select count(*) from public.couple_members) = 1, 'Ana sigue sola en la pareja';
  assert (select invite_code from t_code2) <> (select invite_code from t_code), 'código rotado';
end $$;

-- 8) Caro se une con el código nuevo; luego ambas salen y la pareja desaparece.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
do $$
begin
  perform public.join_couple((select invite_code from t_code2));
  assert (select count(*) from public.couple_members) = 2, 'Caro entra con el código nuevo';
  perform public.leave_couple();
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
do $$
begin
  perform public.leave_couple();
end $$;

reset role;
do $$
begin
  assert (select count(*) from public.couples) = 0, 'la pareja vacía se borró';
end $$;

rollback;

select 'couple_pairing: OK' as resultado;
