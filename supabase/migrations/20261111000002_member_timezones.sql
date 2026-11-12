-- =============================================================================
-- Fase 12 (parte 2): zona horaria de cada quien.
--
-- Antes la pareja tenía una sola zona (couples.timezone) y con ella cambiaba el día
-- para los dos. Ahora cada persona tiene la suya (profiles.timezone, la manda la
-- app al abrirse con set_my_timezone) y **el día de la pareja es el de quien va
-- más atrás**: no termina mientras para alguno de los dos siga siendo ese día.
--   * private.couple_day_at(couple, instante): el menor de los días locales de los
--     miembros actuales en ese instante (sin zona propia, la de la pareja).
--   * couple_today / couple_start_day y el día en que se completó cada pregunta en
--     get_streak usan esa regla. Todo lo que ya llamaba a couple_today (pregunta
--     del día, recuperar ayer, visitas, estadísticas, avisos) la hereda.
--   * couples.timezone se queda como respaldo (personas sin zona guardada).
-- Errores (P0001): invalid_timezone, not_authenticated.
-- =============================================================================

alter table public.profiles add column if not exists timezone text;
comment on column public.profiles.timezone is 'Zona IANA del celular de la persona (set_my_timezone). Null = usar la de la pareja.';

create or replace function public.validate_profile_timezone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.timezone is not null
    and not exists (select 1 from pg_catalog.pg_timezone_names tz where tz.name = new.timezone)
  then
    raise exception 'invalid_timezone'
      using errcode = 'P0001', detail = format('Zona horaria desconocida: %s', new.timezone);
  end if;
  return new;
end;
$$;
comment on function public.validate_profile_timezone() is 'Rechaza zonas horarias de perfil que no sean IANA válidas.';
revoke all on function public.validate_profile_timezone() from public, anon, authenticated;

drop trigger if exists profiles_validate_timezone on public.profiles;
create trigger profiles_validate_timezone
  before insert or update of timezone on public.profiles
  for each row execute function public.validate_profile_timezone();

-- Guarda la zona del celular de auth.uid() (solo si cambió, para no despertar Realtime).
create or replace function public.set_my_timezone(p_timezone text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text := nullif(btrim(coalesce(p_timezone, '')), '');
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if v_tz is null or char_length(v_tz) > 64 then
    raise exception 'invalid_timezone' using errcode = 'P0001';
  end if;
  update public.profiles p set timezone = v_tz
  where p.id = v_uid and p.timezone is distinct from v_tz;
end;
$$;
comment on function public.set_my_timezone(text) is 'Guarda la zona horaria IANA del celular de quien llama.';
revoke all on function public.set_my_timezone(text) from public, anon;
grant execute on function public.set_my_timezone(text) to authenticated, service_role;

-- Día de la pareja en un instante: el menor día local entre los miembros actuales.
create or replace function private.couple_day_at(p_couple_id uuid, p_at timestamptz)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select min((p_at at time zone coalesce(p.timezone, c.timezone))::date)
       from public.couple_members cm
       join public.profiles p on p.id = cm.user_id
       where cm.couple_id = c.id),
    (p_at at time zone c.timezone)::date
  )
  from public.couples c
  where c.id = p_couple_id;
$$;
comment on function private.couple_day_at(uuid, timestamptz) is 'Día de la pareja en un instante: el de quien va más atrás (zona de cada miembro o la de la pareja).';
revoke all on function private.couple_day_at(uuid, timestamptz) from public, anon, authenticated;

create or replace function public.couple_today(p_couple_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select private.couple_day_at(p_couple_id, now());
$$;
comment on function public.couple_today(uuid) is 'Hoy para la pareja: el día de quien va más atrás.';

create or replace function public.couple_start_day(p_couple_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select private.couple_day_at(p_couple_id, max(cm.joined_at))
  from public.couple_members cm
  where cm.couple_id = p_couple_id
  having count(*) > 0;
$$;
comment on function public.couple_start_day(uuid) is 'Día de la pareja en que se unió el último miembro actual (inicio de la racha).';

-- Igual que en 20261110000000, pero el día en que se completó usa el día de la pareja.
create or replace function public.get_streak()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := public.require_couple();
  v_today date := public.couple_today(v_couple_id);
  v_completed jsonb;
begin
  -- completed_on: día de la pareja en que llegó la última respuesta de los 2 miembros actuales.
  select coalesce(jsonb_object_agg(s.day::text, s.completed_on::text), '{}'::jsonb)
  into v_completed
  from (
    select dq.day, private.couple_day_at(v_couple_id, max(a.created_at)) as completed_on
    from public.daily_questions dq
    join public.answers a on a.couple_id = dq.couple_id and a.question_id = dq.question_id
    join public.couple_members cm on cm.couple_id = a.couple_id and cm.user_id = a.user_id
    where dq.couple_id = v_couple_id and dq.day <= v_today
    group by dq.day
    having count(distinct a.user_id) = 2
  ) s;

  return private.compute_streak(
    v_today,
    public.couple_start_day(v_couple_id),
    public.couple_member_count(v_couple_id),
    v_completed
  );
end;
$$;
comment on function public.get_streak() is 'Racha actual y récord de la pareja, con recuperaciones del día anterior (5 por mes); el día es el de quien va más atrás.';
