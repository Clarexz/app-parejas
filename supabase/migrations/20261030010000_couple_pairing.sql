-- =============================================================================
-- 20261030010000_couple_pairing.sql
-- Fase 1: emparejamiento y perfil.
--   * Restricciones de datos en profiles y couples (longitudes, rutas de fotos,
--     zona horaria válida).
--   * RPC security definer: create_couple, join_couple, leave_couple.
--   * Realtime en profiles, couples y couple_members (pantalla de espera y
--     cambios de la pareja al instante; Realtime respeta las RLS).
--   * Bucket privado `avatars`: políticas de storage.objects (tu carpeta y la de
--     tu pareja; carpeta compartida de la pareja para su foto).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Restricciones de datos
-- -----------------------------------------------------------------------------

-- Las fotos viven en el bucket `avatars`:
--   <user_id>/<archivo>                 foto de perfil
--   couples/<couple_id>/<archivo>       foto de la pareja
-- La ruta guardada debe apuntar a la carpeta propia (no a la de otra persona).
alter table public.profiles
  drop constraint if exists profiles_display_name_length,
  drop constraint if exists profiles_nickname_length,
  drop constraint if exists profiles_birthday_range,
  drop constraint if exists profiles_avatar_path_own_folder;
alter table public.profiles
  add constraint profiles_display_name_length
    check (display_name is null or char_length(btrim(display_name)) between 1 and 40),
  add constraint profiles_nickname_length
    check (nickname is null or char_length(btrim(nickname)) between 1 and 30),
  add constraint profiles_birthday_range
    check (birthday is null or birthday between date '1900-01-01' and date '2100-01-01'),
  add constraint profiles_avatar_path_own_folder
    check (
      avatar_path is null
      or (avatar_path like id::text || '/%' and position('..' in avatar_path) = 0)
    );

alter table public.couples
  drop constraint if exists couples_anniversary_range,
  drop constraint if exists couples_photo_path_own_folder;
alter table public.couples
  add constraint couples_anniversary_range
    check (anniversary_date is null or anniversary_date between date '1900-01-01' and date '2100-01-01'),
  add constraint couples_photo_path_own_folder
    check (
      photo_path is null
      or (photo_path like 'couples/' || id::text || '/%' and position('..' in photo_path) = 0)
    );

-- Zona horaria: debe ser un nombre IANA que Postgres conozca (p. ej. America/Mexico_City).
create or replace function public.validate_couple_timezone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names tz where tz.name = new.timezone) then
    raise exception 'invalid_timezone'
      using errcode = 'P0001', detail = format('Zona horaria desconocida: %s', new.timezone);
  end if;
  return new;
end;
$$;
comment on function public.validate_couple_timezone() is 'Rechaza zonas horarias que no sean IANA válidas.';

drop trigger if exists couples_validate_timezone on public.couples;
create trigger couples_validate_timezone
  before insert or update of timezone on public.couples
  for each row execute function public.validate_couple_timezone();

-- -----------------------------------------------------------------------------
-- Código de invitación
-- -----------------------------------------------------------------------------

-- 6 caracteres del alfabeto sin ambiguos (mismo que el check couples_invite_code_format).
-- Usa los bytes aleatorios de gen_random_uuid() (núcleo de Postgres, sin extensiones).
create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := pg_catalog.uuid_send(pg_catalog.gen_random_uuid());
  code text := '';
  i integer;
begin
  -- Bytes 0-5 del uuid v4 son completamente aleatorios.
  for i in 0..5 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return code;
end;
$$;
comment on function public.generate_invite_code() is 'Código de invitación aleatorio de 6 caracteres (sin I, L, O, 0, 1).';

-- -----------------------------------------------------------------------------
-- RPC
-- Errores: se lanzan con errcode P0001 y un mensaje-clave estable que la app
-- traduce (src/lib/errors.ts): not_authenticated, already_in_couple,
-- invalid_code, code_not_found, couple_full, invalid_timezone.
-- -----------------------------------------------------------------------------

-- Crea una pareja nueva con el usuario como primer miembro.
create or replace function public.create_couple(
  p_anniversary_date date default null,
  p_timezone text default null
)
returns public.couples
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple public.couples;
  attempt integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.couple_members cm where cm.user_id = v_uid) then
    raise exception 'already_in_couple' using errcode = 'P0001';
  end if;

  -- Reintenta si el código aleatorio choca con uno existente (muy improbable).
  for attempt in 1..10 loop
    begin
      insert into public.couples (invite_code, anniversary_date, timezone)
      values (
        public.generate_invite_code(),
        p_anniversary_date,
        coalesce(nullif(btrim(p_timezone), ''), 'America/Mexico_City')
      )
      returning * into v_couple;
      exit;
    exception when unique_violation then
      if attempt = 10 then
        raise;
      end if;
    end;
  end loop;

  begin
    insert into public.couple_members (couple_id, user_id) values (v_couple.id, v_uid);
  exception when unique_violation then
    -- Otra llamada concurrente del mismo usuario ya lo unió a una pareja.
    raise exception 'already_in_couple' using errcode = 'P0001';
  end;

  return v_couple;
end;
$$;
comment on function public.create_couple(date, text) is 'Crea una pareja con código de invitación y agrega a auth.uid() como miembro.';

-- Se une a la pareja del código. Acepta minúsculas, espacios y guiones.
create or replace function public.join_couple(p_code text)
returns public.couples
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[[:space:]-]', '', 'g'));
  v_couple public.couples;
  v_current uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if v_code !~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$' then
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;

  -- Bloquea la pareja para serializar uniones concurrentes al mismo código.
  select * into v_couple from public.couples c where c.invite_code = v_code for update;
  if not found then
    raise exception 'code_not_found' using errcode = 'P0001';
  end if;

  select cm.couple_id into v_current from public.couple_members cm where cm.user_id = v_uid;
  if v_current = v_couple.id then
    return v_couple; -- ya es miembro: idempotente
  elsif v_current is not null then
    raise exception 'already_in_couple' using errcode = 'P0001';
  end if;

  if (select count(*) from public.couple_members cm where cm.couple_id = v_couple.id) >= 2 then
    raise exception 'couple_full' using errcode = 'P0001';
  end if;

  begin
    insert into public.couple_members (couple_id, user_id) values (v_couple.id, v_uid);
  exception
    when check_violation then
      raise exception 'couple_full' using errcode = 'P0001';
    when unique_violation then
      raise exception 'already_in_couple' using errcode = 'P0001';
  end;

  return v_couple;
end;
$$;
comment on function public.join_couple(text) is 'Une a auth.uid() a la pareja del código (máximo 2 miembros).';

-- Sale de la pareja. Si queda alguien, se cambia el código (quien se fue ya no
-- puede volver con el anterior); si no queda nadie, se borra la pareja.
create or replace function public.leave_couple()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid;
  attempt integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  delete from public.couple_members cm where cm.user_id = v_uid returning cm.couple_id into v_couple_id;
  if v_couple_id is null then
    return; -- no tenía pareja: nada que hacer
  end if;

  if not exists (select 1 from public.couple_members cm where cm.couple_id = v_couple_id) then
    delete from public.couples c where c.id = v_couple_id;
    return;
  end if;

  for attempt in 1..10 loop
    begin
      update public.couples c set invite_code = public.generate_invite_code() where c.id = v_couple_id;
      exit;
    exception when unique_violation then
      if attempt = 10 then
        raise;
      end if;
    end;
  end loop;
end;
$$;
comment on function public.leave_couple() is 'Saca a auth.uid() de su pareja; rota el código o borra la pareja si queda vacía.';

-- -----------------------------------------------------------------------------
-- Permisos de las funciones
-- -----------------------------------------------------------------------------

revoke all on function public.validate_couple_timezone() from public, anon, authenticated;
revoke all on function public.generate_invite_code() from public, anon, authenticated;
revoke all on function public.create_couple(date, text) from public, anon;
revoke all on function public.join_couple(text) from public, anon;
revoke all on function public.leave_couple() from public, anon;

grant execute on function public.create_couple(date, text) to authenticated, service_role;
grant execute on function public.join_couple(text) to authenticated, service_role;
grant execute on function public.leave_couple() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    raise notice 'No existe la publicación supabase_realtime; se omite Realtime.';
    return;
  end if;
  foreach t in array array['profiles', 'couples', 'couple_members'] loop
    if not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Storage: bucket privado `avatars` (el bucket lo crea deploy.sh desde
-- server/buckets.json; aquí solo van las políticas).
-- storage.objects la crea el servicio de Storage; si no existe (p. ej. un
-- Postgres sin Storage), se omite con un aviso. El CI crea un stub para probarlas.
-- -----------------------------------------------------------------------------

-- Carpetas de `avatars` que el usuario puede escribir: la suya y la de su pareja (couples/<id>).
create or replace function public.avatar_folder_writable(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null or p_name is null or position('..' in p_name) > 0 then false
    when split_part(p_name, '/', 1) = auth.uid()::text then true
    when split_part(p_name, '/', 1) = 'couples'
      then split_part(p_name, '/', 2) = coalesce(public.my_couple_id()::text, '-')
    else false
  end;
$$;
comment on function public.avatar_folder_writable(text) is 'true si la ruta del bucket avatars está en la carpeta de auth.uid() o de su pareja.';

-- Carpetas legibles: las escribibles + la carpeta personal de tu pareja.
create or replace function public.avatar_folder_readable(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.avatar_folder_writable(p_name)
    or exists (
      select 1
      from public.couple_members cm
      where cm.couple_id = public.my_couple_id()
        and cm.user_id::text = split_part(p_name, '/', 1)
    );
$$;
comment on function public.avatar_folder_readable(text) is 'true si la ruta del bucket avatars es tuya, de tu pareja o de su carpeta compartida.';

revoke all on function public.avatar_folder_writable(text) from public, anon;
revoke all on function public.avatar_folder_readable(text) from public, anon;
grant execute on function public.avatar_folder_writable(text) to authenticated, service_role;
grant execute on function public.avatar_folder_readable(text) to authenticated, service_role;

do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'No existe storage.objects; se omiten las políticas del bucket avatars.';
    return;
  end if;

  drop policy if exists avatars_select on storage.objects;
  create policy avatars_select on storage.objects
    for select to authenticated
    using (bucket_id = 'avatars' and public.avatar_folder_readable(name));

  drop policy if exists avatars_insert on storage.objects;
  create policy avatars_insert on storage.objects
    for insert to authenticated
    with check (bucket_id = 'avatars' and public.avatar_folder_writable(name));

  drop policy if exists avatars_update on storage.objects;
  create policy avatars_update on storage.objects
    for update to authenticated
    using (bucket_id = 'avatars' and public.avatar_folder_writable(name))
    with check (bucket_id = 'avatars' and public.avatar_folder_writable(name));

  drop policy if exists avatars_delete on storage.objects;
  create policy avatars_delete on storage.objects
    for delete to authenticated
    using (bucket_id = 'avatars' and public.avatar_folder_writable(name));
end;
$$;
