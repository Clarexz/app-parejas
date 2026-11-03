-- =============================================================================
-- 20261108000000_fruits.sql
-- Fase 12A: sistema de frutas (D100). Cada persona elige una fruta; es su color
-- en el símbolo, los widgets, sus respuestas, stories y avisos.
--   * profiles.fruit: llave de la fruta o NULL (= sin elegir). SIN grant update:
--     solo se cambia con public.set_fruit().
--   * private.fruit_clash / private.suggested_fruit / private.effective_fruit
--     replican src/lib/fruits.ts (fruitClash, FRUITS[..].suggested, resolveFruits).
--   * public.set_fruit(p_fruit): rechaza la fruta (efectiva) de tu pareja
--     ('fruit_taken') y los pares que se parecen ('fruit_too_similar'), y avisa
--     con un push de datos (scope `profile`) para refrescar los widgets del otro.
--   * public.notify_actor_fruit(p_user): solo service_role; la usa la función
--     notify para pintar el color de los avisos.
--   * Realtime en profiles ya existe desde 20261030010000 (se verifica aquí).
-- Errores (P0001): not_authenticated, invalid_fruit, fruit_taken, fruit_too_similar.
-- =============================================================================

alter table public.profiles add column if not exists fruit text;
alter table public.profiles drop constraint if exists profiles_fruit_valid;
alter table public.profiles
  add constraint profiles_fruit_valid
  check (fruit is null or fruit in ('sandia', 'mango', 'mandarina', 'limon', 'uva', 'arandano', 'pitaya'));
comment on column public.profiles.fruit is 'Fruta elegida (llave de src/lib/fruits.ts); NULL = sin elegir. Se escribe con set_fruit().';

-- -----------------------------------------------------------------------------
-- Reglas puras
-- -----------------------------------------------------------------------------

-- 'same' | 'similar' | null (BLOCKED_PAIRS de src/lib/fruits.ts; el orden no importa).
create or replace function private.fruit_clash(a text, b text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when a = b then 'same'
    when (least(a, b), greatest(a, b)) in (
      ('pitaya', 'sandia'),
      ('mandarina', 'sandia'),
      ('limon', 'mango'),
      ('mandarina', 'mango'),
      ('arandano', 'uva'),
      ('pitaya', 'uva')
    ) then 'similar'
    else null
  end;
$$;
comment on function private.fruit_clash(text, text) is 'Si dos frutas no pueden convivir: same | similar | null (fruitClash).';

-- La fruta que mejor le queda a la pareja de p_fruit.
create or replace function private.suggested_fruit(f text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case f
    when 'sandia' then 'mango'
    when 'mango' then 'sandia'
    when 'mandarina' then 'uva'
    when 'limon' then 'pitaya'
    when 'uva' then 'limon'
    when 'arandano' then 'mandarina'
    when 'pitaya' then 'limon'
  end;
$$;
comment on function private.suggested_fruit(text) is 'Fruta sugerida para la pareja de f (FRUITS[f].suggested).';

-- Fruta que se ve de verdad para una persona (resolveFruits). Los ids se comparan
-- como texto en collation C, igual que `<` sobre strings en JS.
create or replace function private.effective_fruit(p_user uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid;
  v_partner uuid;
  v_mine text;
  v_theirs text;
  v_me_first boolean;
begin
  select p.fruit into v_mine from public.profiles p where p.id = p_user;
  select cm.couple_id into v_couple_id from public.couple_members cm where cm.user_id = p_user;
  if v_couple_id is not null then
    select cm.user_id into v_partner
    from public.couple_members cm
    where cm.couple_id = v_couple_id and cm.user_id <> p_user
    limit 1;
  end if;
  -- Sin pareja: tu fruta, o Sandía si no has elegido.
  if v_partner is null then
    return coalesce(v_mine, 'sandia');
  end if;

  select p.fruit into v_theirs from public.profiles p where p.id = v_partner;
  v_me_first := (p_user::text collate "C") < (v_partner::text collate "C");

  if v_mine is null and v_theirs is null then
    return case when v_me_first then 'sandia' else 'mango' end;
  end if;
  if v_mine is not null and v_theirs is null then
    return v_mine;
  end if;
  if v_mine is null then
    return private.suggested_fruit(v_theirs);
  end if;
  -- Los dos eligieron: si chocan, el id menor se queda con la suya y el mayor toma la sugerida.
  if private.fruit_clash(v_mine, v_theirs) is null or v_me_first then
    return v_mine;
  end if;
  return private.suggested_fruit(v_theirs);
end;
$$;
comment on function private.effective_fruit(uuid) is 'Fruta visible de una persona (resolveFruits de src/lib/fruits.ts).';

-- -----------------------------------------------------------------------------
-- RPC
-- -----------------------------------------------------------------------------

create or replace function public.set_fruit(p_fruit text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid;
  v_partner uuid;
  v_clash text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if p_fruit is null
    or p_fruit not in ('sandia', 'mango', 'mandarina', 'limon', 'uva', 'arandano', 'pitaya')
  then
    raise exception 'invalid_fruit' using errcode = 'P0001';
  end if;

  select cm.couple_id into v_couple_id from public.couple_members cm where cm.user_id = v_uid;
  if v_couple_id is not null then
    select cm.user_id into v_partner
    from public.couple_members cm
    where cm.couple_id = v_couple_id and cm.user_id <> v_uid
    limit 1;
  end if;

  if v_partner is not null then
    v_clash := private.fruit_clash(p_fruit, private.effective_fruit(v_partner));
    if v_clash = 'same' then
      raise exception 'fruit_taken' using errcode = 'P0001';
    elsif v_clash = 'similar' then
      raise exception 'fruit_too_similar' using errcode = 'P0001';
    end if;
  end if;

  update public.profiles p set fruit = p_fruit where p.id = v_uid;
  if not found then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if v_couple_id is not null then
    perform private.send_widget_push(v_couple_id, v_uid, 'profile');
  end if;
  return p_fruit;
end;
$$;
comment on function public.set_fruit(text) is 'Elige la fruta de auth.uid(); rechaza la de su pareja y las que se le parecen.';

-- Solo para la Edge Function notify (service_role): fruta visible de quien manda el aviso.
create or replace function public.notify_actor_fruit(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select private.effective_fruit(p_user);
$$;
comment on function public.notify_actor_fruit(uuid) is 'Fruta visible de una persona (solo service_role, la usa la función notify).';

-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------

revoke all on function private.fruit_clash(text, text) from public, anon, authenticated;
revoke all on function private.suggested_fruit(text) from public, anon, authenticated;
revoke all on function private.effective_fruit(uuid) from public, anon, authenticated;
revoke all on function public.set_fruit(text) from public, anon;
revoke all on function public.notify_actor_fruit(uuid) from public, anon, authenticated;

grant execute on function public.set_fruit(text) to authenticated, service_role;
grant execute on function public.notify_actor_fruit(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- Realtime: profiles ya está en la publicación (couple_pairing); se asegura
-- (idempotente) para que el cambio de fruta llegue al otro celular.
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    raise notice 'No existe la publicación supabase_realtime; se omite Realtime.';
    return;
  end if;
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end;
$$;
