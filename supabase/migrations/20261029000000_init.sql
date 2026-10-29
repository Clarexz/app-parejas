-- =============================================================================
-- 20261029000000_init.sql
-- Fase 0: tablas base (profiles, couples, couple_members), helpers de RLS y
-- políticas mínimas. Las RPC create_couple / join_couple llegan en la Fase 1,
-- por eso aquí NO hay políticas de insert/delete directas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

-- Perfil de cada persona (1:1 con auth.users).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  nickname text,
  avatar_path text,
  birthday date,
  created_at timestamptz default now()
);
comment on table public.profiles is 'Perfil público de cada usuario; se crea solo al registrarse (trigger on_auth_user_created).';

-- Pareja. El código de invitación son 6 caracteres sin ambiguos
-- (sin I, L, O; dígitos 2-9) para poder dictarlo sin confusiones.
create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique
    constraint couples_invite_code_format
    check (invite_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$'),
  anniversary_date date,
  photo_path text,
  timezone text not null default 'America/Mexico_City',
  spicy_enabled boolean not null default false,
  created_at timestamptz default now()
);
comment on table public.couples is 'Una fila por pareja. El "día" de la pareja se calcula con su timezone (IANA).';

-- Miembros de la pareja (máximo 2, ver trigger más abajo).
-- user_id es único: una persona solo puede pertenecer a una pareja.
create table if not exists public.couple_members (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  spicy_opt_in boolean not null default false,
  joined_at timestamptz default now(),
  primary key (couple_id, user_id)
);
comment on table public.couple_members is 'Pertenencia usuario-pareja; máximo 2 miembros por pareja.';

-- -----------------------------------------------------------------------------
-- Funciones helper (security definer para evitar recursión de RLS)
-- -----------------------------------------------------------------------------

-- ¿El usuario autenticado es miembro de la pareja indicada?
create or replace function public.is_couple_member(p_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.couple_members cm
    where cm.couple_id = p_couple_id
      and cm.user_id = auth.uid()
  );
$$;
comment on function public.is_couple_member(uuid) is 'true si auth.uid() es miembro de la pareja dada. Helper de RLS.';

-- Id de la pareja del usuario autenticado (null si aún no tiene).
create or replace function public.my_couple_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cm.couple_id
  from public.couple_members cm
  where cm.user_id = auth.uid()
  limit 1;
$$;
comment on function public.my_couple_id() is 'Id de la pareja de auth.uid(), o null. Helper de RLS.';

-- -----------------------------------------------------------------------------
-- Trigger: crear el perfil al registrarse
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
comment on function public.handle_new_user() is 'Crea public.profiles al insertarse un usuario en auth.users.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Perfiles para usuarios que ya existieran antes de esta migración.
insert into public.profiles (id, display_name)
select u.id, nullif(u.raw_user_meta_data ->> 'display_name', '')
from auth.users u
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Trigger: máximo 2 miembros por pareja
-- -----------------------------------------------------------------------------

create or replace function public.enforce_max_couple_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Bloquea la fila de la pareja para serializar inserciones concurrentes.
  perform 1 from public.couples c where c.id = new.couple_id for update;

  if (select count(*) from public.couple_members cm where cm.couple_id = new.couple_id) >= 2 then
    raise exception 'La pareja ya tiene 2 miembros'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
comment on function public.enforce_max_couple_members() is 'Impide más de 2 miembros por pareja.';

drop trigger if exists couple_members_max_two on public.couple_members;
create trigger couple_members_max_two
  before insert on public.couple_members
  for each row execute function public.enforce_max_couple_members();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;

-- profiles: ver el propio y el de tu pareja; editar solo el propio.
drop policy if exists profiles_select_own_or_partner on public.profiles;
create policy profiles_select_own_or_partner on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or id in (
      select cm.user_id
      from public.couple_members cm
      where cm.couple_id = (select public.my_couple_id())
    )
  );

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- couples: los miembros ven y editan su pareja.
drop policy if exists couples_select_member on public.couples;
create policy couples_select_member on public.couples
  for select to authenticated
  using (public.is_couple_member(id));

drop policy if exists couples_update_member on public.couples;
create policy couples_update_member on public.couples
  for update to authenticated
  using (public.is_couple_member(id))
  with check (public.is_couple_member(id));

-- couple_members: los miembros ven a los miembros de su pareja.
drop policy if exists couple_members_select_member on public.couple_members;
create policy couple_members_select_member on public.couple_members
  for select to authenticated
  using (public.is_couple_member(couple_id));

-- -----------------------------------------------------------------------------
-- Permisos (grants explícitos; nada para anon)
-- -----------------------------------------------------------------------------

revoke all on public.profiles from anon, authenticated;
revoke all on public.couples from anon, authenticated;
revoke all on public.couple_members from anon, authenticated;

-- Solo columnas editables por el usuario; id, created_at e invite_code no se tocan.
grant select on public.profiles to authenticated;
grant update (display_name, nickname, avatar_path, birthday) on public.profiles to authenticated;

grant select on public.couples to authenticated;
grant update (anniversary_date, photo_path, timezone, spicy_enabled) on public.couples to authenticated;

grant select on public.couple_members to authenticated;

-- service_role (backend / RPC / Edge Functions) conserva acceso total.
grant all on public.profiles, public.couples, public.couple_members to service_role;

-- Funciones: por defecto PUBLIC puede ejecutarlas; se restringe.
revoke all on function public.is_couple_member(uuid) from public, anon;
revoke all on function public.my_couple_id() from public, anon;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.enforce_max_couple_members() from public, anon, authenticated;

grant execute on function public.is_couple_member(uuid) to authenticated, service_role;
grant execute on function public.my_couple_id() to authenticated, service_role;
