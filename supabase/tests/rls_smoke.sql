-- Prueba de humo de esquema y RLS (la corre el CI tras aplicar las migraciones).
-- Se ejecuta con: psql -v ON_ERROR_STOP=1 -f supabase/tests/rls_smoke.sql
-- Todo ocurre dentro de una transacción que termina en ROLLBACK (no deja datos).

begin;

-- 1) Tres usuarios; el trigger debe crear sus perfiles.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local', '{"display_name":"Ana"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.local', '{}'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@test.local', '{}');

do $$
begin
  assert (select count(*) from public.profiles
          where id in ('00000000-0000-0000-0000-0000000000a1',
                       '00000000-0000-0000-0000-0000000000b2',
                       '00000000-0000-0000-0000-0000000000c3')) = 3,
    'el trigger on_auth_user_created debe crear 3 perfiles';
  assert (select display_name from public.profiles
          where id = '00000000-0000-0000-0000-0000000000a1') = 'Ana',
    'display_name debe venir de raw_user_meta_data';
end $$;

-- 2) Pareja con 2 miembros (como service / superusuario, sin RLS).
insert into public.couples (id, invite_code) values
  ('00000000-0000-0000-0000-00000000c0c0', 'ABC234');
insert into public.couple_members (couple_id, user_id) values
  ('00000000-0000-0000-0000-00000000c0c0', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-00000000c0c0', '00000000-0000-0000-0000-0000000000b2');

-- 3) Un tercer miembro debe fallar.
do $$
begin
  begin
    insert into public.couple_members (couple_id, user_id)
    values ('00000000-0000-0000-0000-00000000c0c0', '00000000-0000-0000-0000-0000000000c3');
    raise exception 'ASSERT: el tercer miembro NO debió insertarse';
  exception when check_violation then
    null; -- esperado
  end;
end $$;

-- 4) Código de invitación inválido debe fallar (formato).
do $$
begin
  begin
    insert into public.couples (invite_code) values ('ABC0I1');
    raise exception 'ASSERT: el código inválido NO debió insertarse';
  exception when check_violation then
    null; -- esperado
  end;
end $$;

-- 5) El tercer usuario (sin pareja) no ve nada ajeno.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true) as _ \gset
-- auth.uid() puede leer cualquiera de las dos variantes según la versión de la imagen.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c3', true) as _ \gset

do $$
begin
  assert auth.uid() = '00000000-0000-0000-0000-0000000000c3', format('auth.uid() = %s', auth.uid());
  assert (select count(*) from public.couples) = 0, 'c3 no debe ver ninguna pareja';
  assert (select count(*) from public.couple_members) = 0, 'c3 no debe ver miembros';
  assert (select count(*) from public.profiles) = 1, format('c3 solo debe ver su propio perfil (ve %s)', (select count(*) from public.profiles));
  assert public.my_couple_id() is null, 'c3 no tiene pareja';
  assert not public.is_couple_member('00000000-0000-0000-0000-00000000c0c0'),
    'c3 no es miembro';
end $$;

-- 6) Un miembro ve su pareja, a su pareja y los perfiles de ambos; no el de c3.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true) as _ \gset
-- auth.uid() puede leer cualquiera de las dos variantes según la versión de la imagen.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true) as _ \gset

do $$
begin
  assert (select count(*) from public.couples) = 1, 'a1 debe ver su pareja';
  assert (select count(*) from public.couple_members) = 2, 'a1 debe ver 2 miembros';
  assert (select count(*) from public.profiles) = 2, 'a1 debe ver 2 perfiles (propio y pareja)';
  assert not exists (select 1 from public.profiles
                     where id = '00000000-0000-0000-0000-0000000000c3'),
    'a1 no debe ver el perfil de c3';
  assert public.my_couple_id() = '00000000-0000-0000-0000-00000000c0c0', 'my_couple_id de a1';
end $$;

-- 7) Un miembro puede editar su perfil pero no el de su pareja; no puede insertar/borrar.
do $$
declare
  n integer;
begin
  update public.profiles set nickname = 'Ani'
  where id = '00000000-0000-0000-0000-0000000000a1';
  get diagnostics n = row_count;
  assert n = 1, 'a1 debe poder editar su perfil';

  update public.profiles set nickname = 'hack'
  where id = '00000000-0000-0000-0000-0000000000b2';
  get diagnostics n = row_count;
  assert n = 0, 'a1 no debe poder editar el perfil de su pareja';

  begin
    insert into public.couples (invite_code) values ('XYZ234');
    raise exception 'ASSERT: authenticated no debe poder insertar parejas';
  exception when insufficient_privilege then
    null; -- esperado
  end;
end $$;

-- 8) anon no ve nada.
reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.profiles;
    raise exception 'ASSERT: anon no debe poder leer profiles';
  exception when insufficient_privilege then
    null; -- esperado
  end;
end $$;

reset role;
rollback;

select 'rls_smoke: OK' as resultado;
