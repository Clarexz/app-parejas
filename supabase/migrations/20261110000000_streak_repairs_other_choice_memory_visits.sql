-- =============================================================================
-- 20261110000000_streak_repairs_other_choice_memory_visits.sql
-- Tres cambios:
--   1) Racha estilo TikTok: se reemplaza la reparación de hasta 7 días por
--      "recuperar el día de ayer" (hasta 5 recuperaciones por mes calendario).
--      get_streak() se recalcula día por día con private.compute_streak()
--      (espejo en src/lib/streak.ts) y get_daily_question() solo acepta ayer y hoy.
--      couple_complete_days() NO cambia (sigue con su ventana de 7 días y solo la
--      usa get_relationship_stats para `daily_complete`, un conteo informativo).
--   2) Opción "Otra" en preguntas de opciones: answers.choice = -1 con texto
--      obligatorio (la opción propia, 1..500 caracteres).
--   3) Memorias que también son visitas: memories.visit_id y set_memory_visit().
-- Errores nuevos: ninguno (reusa invalid_answer, invalid_day, memory_not_found,
-- invalid_visit, visit_overlap).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Racha
-- -----------------------------------------------------------------------------

-- Cálculo puro de la racha. Entradas (todo en días locales de la pareja):
--   p_today: hoy; p_start: primer día que cuenta (null = hoy);
--   p_member_count: miembros actuales;
--   p_completed: {"día": "día en que los dos contestaron"} (completed_on), solo
--     para días con fila en daily_questions y contestados por los dos.
-- Reglas: se recorre cada día calendario de p_start a p_today.
--   * Día neutral (hoy o un día en que se recuperó): ni suma ni rompe.
--   * completed_on(d) <= d: la racha suma.
--   * completed_on(d) = d + 1, con racha > 0 y menos de 5 recuperaciones usadas en el
--     mes de d + 1: recuperación. El día perdido cuenta, se gasta 1 y d + 1 queda neutral.
--   * Cualquier otro caso en días anteriores a ayer: la racha vuelve a 0.
--   * Ayer sin completar y recuperable: queda pendiente (repair_day), la racha sigue
--     "en riesgo" y hoy no suma aunque contesten a tiempo.
create or replace function private.compute_streak(
  p_today date,
  p_start date,
  p_member_count integer,
  p_completed jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  c_per_month constant integer := 5;
  v_start date := coalesce(p_start, p_today);
  v_run integer := 0;
  v_best integer := 0;
  v_repairs date[] := '{}';   -- días (d + 1) en que se gastó una recuperación
  v_neutral date;             -- día neutral por recuperación (siempre el siguiente)
  v_repair_day date;
  v_today_done boolean := false;
  v_today_is_repair boolean := false;
  v_d date;
  v_c date;
  v_used integer;
begin
  for v_d in
    select g::date from generate_series(v_start, p_today, interval '1 day') g
  loop
    if v_neutral = v_d then
      if v_d = p_today then
        v_today_done := true;
        v_today_is_repair := true;
      end if;
      continue;
    end if;

    v_c := nullif(p_completed ->> (v_d::text), '')::date;

    if v_d < p_today then
      select count(*)::integer into v_used from unnest(v_repairs) r
      where to_char(r, 'YYYY-MM') = to_char(v_d + 1, 'YYYY-MM');

      if v_c is not null and v_c <= v_d then
        v_run := v_run + 1;
      elsif v_c = v_d + 1 and v_run > 0 and v_used < c_per_month then
        v_run := v_run + 1;
        v_repairs := v_repairs || (v_d + 1);
        v_neutral := v_d + 1;
      elsif v_d = p_today - 1 and v_run > 0 and p_member_count = 2 and v_used < c_per_month then
        -- Ayer pendiente: todavía se puede recuperar hoy.
        v_repair_day := v_d;
      else
        v_run := 0;
      end if;
      if v_run > v_best then v_best := v_run; end if;
    elsif v_repair_day is null and v_c is not null and v_c <= v_d then
      v_run := v_run + 1;
      v_today_done := true;
      if v_run > v_best then v_best := v_run; end if;
    end if;
  end loop;

  select count(*)::integer into v_used from unnest(v_repairs) r
  where to_char(r, 'YYYY-MM') = to_char(p_today, 'YYYY-MM');

  return jsonb_build_object(
    'current', v_run,
    'best', v_best,
    'today', p_today,
    'today_done', v_today_done,
    'today_is_repair', v_today_is_repair,
    'repair_day', v_repair_day,
    'repairs_used', v_used,
    'repairs_left', greatest(c_per_month - v_used, 0),
    'repairs_per_month', c_per_month,
    -- Compatibilidad con APKs viejos: a lo más el día recuperable.
    'missing_days', case when v_repair_day is null then '[]'::jsonb else jsonb_build_array(v_repair_day) end
  );
end;
$$;
comment on function private.compute_streak(date, date, integer, jsonb) is 'Racha día por día con recuperaciones (5 por mes). Espejo de src/lib/streak.ts.';
revoke all on function private.compute_streak(date, date, integer, jsonb) from public, anon, authenticated;

-- Racha de la pareja de auth.uid(). Mismo nombre, firma y permisos que antes.
--   current / best / today / today_done / today_is_repair / repair_day /
--   repairs_used / repairs_left / repairs_per_month / missing_days (= [repair_day] o []).
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
  -- completed_on: día local de la última respuesta de los 2 miembros actuales.
  select coalesce(jsonb_object_agg(s.day::text, s.completed_on::text), '{}'::jsonb)
  into v_completed
  from (
    select dq.day, (max(a.created_at) at time zone c.timezone)::date as completed_on
    from public.daily_questions dq
    join public.couples c on c.id = dq.couple_id
    join public.answers a on a.couple_id = dq.couple_id and a.question_id = dq.question_id
    join public.couple_members cm on cm.couple_id = a.couple_id and cm.user_id = a.user_id
    where dq.couple_id = v_couple_id and dq.day <= v_today
    group by dq.day, c.timezone
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
comment on function public.get_streak() is 'Racha actual y récord de la pareja, con recuperaciones del día anterior (5 por mes).';

-- Pregunta del día `p_day` (hoy si es null). Ahora solo se aceptan ayer y hoy
-- (recuperar la racha), nunca futuros ni anteriores al inicio de la pareja.
create or replace function public.get_daily_question(p_day date default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := public.require_couple();
  v_today date := public.couple_today(v_couple_id);
  v_day date := coalesce(p_day, v_today);
  v_question_id uuid;
begin
  if v_day > v_today or v_day < v_today - 1
    or v_day < coalesce(public.couple_start_day(v_couple_id), v_today)
  then
    -- Hoy siempre es válido aunque la pareja se acabe de formar.
    if v_day <> v_today then
      raise exception 'invalid_day' using errcode = 'P0001';
    end if;
  end if;

  select dq.question_id into v_question_id
  from public.daily_questions dq where dq.couple_id = v_couple_id and dq.day = v_day;

  if v_question_id is null then
    -- Serializa la asignación por pareja (los dos celulares pueden pedirla a la vez).
    perform 1 from public.couples c where c.id = v_couple_id for update;
    select dq.question_id into v_question_id
    from public.daily_questions dq where dq.couple_id = v_couple_id and dq.day = v_day;

    if v_question_id is null then
      v_question_id := public.pick_daily_question(v_couple_id);
      if v_question_id is null then
        raise exception 'no_questions' using errcode = 'P0001';
      end if;
      insert into public.daily_questions (couple_id, day, question_id)
      values (v_couple_id, v_day, v_question_id);
    end if;
  end if;

  return public.question_card(v_couple_id, v_question_id, v_day);
end;
$$;
comment on function public.get_daily_question(date) is 'Pregunta del día (hoy o ayer; asignación idempotente) con respuestas según quién ya contestó.';

-- -----------------------------------------------------------------------------
-- 2) Opción "Otra" (choice = -1)
-- -----------------------------------------------------------------------------

alter table public.answers drop constraint if exists answers_choice_range;
alter table public.answers
  add constraint answers_choice_range check (choice is null or choice between -1 and 5);

alter table public.answers drop constraint if exists answers_other_has_text;
alter table public.answers
  add constraint answers_other_has_text check (choice is distinct from -1 or text is not null);

-- Guarda (o edita) la respuesta de auth.uid(). open: texto obligatorio.
-- choice: índice de opción (0..n-1) con nota opcional (≤ 500), o -1 = "Otra" con el
-- texto obligatorio (1..500) como opción propia.
create or replace function public.submit_answer(
  p_question_id uuid,
  p_text text default null,
  p_choice integer default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := public.require_couple();
  v_question public.questions;
  v_text text := nullif(btrim(coalesce(p_text, '')), '');
  v_day date;
begin
  select * into v_question from public.questions q where q.id = p_question_id;
  if not found or not public.question_visible(v_question) then
    raise exception 'question_not_found' using errcode = 'P0001';
  end if;

  if v_question.type = 'open' then
    if v_text is null or char_length(v_text) > 2000 or p_choice is not null then
      raise exception 'invalid_answer' using errcode = 'P0001';
    end if;
  elsif v_question.type = 'choice' then
    if p_choice is null or p_choice < -1 or p_choice >= jsonb_array_length(v_question.options)
      or (p_choice = -1 and v_text is null)
      or (v_text is not null and char_length(v_text) > 500)
    then
      raise exception 'invalid_answer' using errcode = 'P0001';
    end if;
  else
    -- Los tipos de juegos (Fase 9) no se contestan aquí.
    raise exception 'invalid_answer' using errcode = 'P0001';
  end if;

  select max(dq.day) into v_day
  from public.daily_questions dq where dq.couple_id = v_couple_id and dq.question_id = p_question_id;

  insert into public.answers (couple_id, question_id, user_id, day, text, choice)
  values (v_couple_id, p_question_id, v_uid, v_day, v_text, p_choice::smallint)
  on conflict (couple_id, question_id, user_id) do update
    set text = excluded.text, choice = excluded.choice, updated_at = now();

  return public.question_card(v_couple_id, p_question_id, v_day);
end;
$$;
comment on function public.submit_answer(uuid, text, integer) is 'Guarda o edita la respuesta de auth.uid() (choice -1 = Otra, con texto) y devuelve la tarjeta actualizada.';

-- -----------------------------------------------------------------------------
-- 3) Memorias que también son visitas
-- -----------------------------------------------------------------------------

alter table public.memories
  add column if not exists visit_id uuid references public.visits (id) on delete set null;
comment on column public.memories.visit_id is 'Visita ligada a la memoria (set_memory_visit); null si la memoria no es una visita.';
create index if not exists memories_visit_idx on public.memories (visit_id) where visit_id is not null;

-- Marca (p_is_visit) o desmarca una memoria como visita. Con rango
-- happened_on .. coalesce(p_end_date, happened_on) y lugar = place_name. Reusa
-- save_visit/delete_visit (traslapes, aviso push, eventos ligados). Devuelve {visit_id}.
create or replace function public.set_memory_visit(
  p_memory_id uuid,
  p_is_visit boolean,
  p_end_date date default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
  v_memory public.memories;
  v_visit public.visits;
  v_end date;
begin
  select * into v_memory from public.memories m
  where m.id = p_memory_id and m.couple_id = v_couple_id
  for update;
  if not found then
    raise exception 'memory_not_found' using errcode = 'P0001';
  end if;

  if coalesce(p_is_visit, false) then
    v_end := coalesce(p_end_date, v_memory.happened_on);
    if v_end < v_memory.happened_on or v_end - v_memory.happened_on > 365 then
      raise exception 'invalid_visit' using errcode = 'P0001';
    end if;

    if v_memory.visit_id is not null and exists (
      select 1 from public.visits v where v.id = v_memory.visit_id and v.couple_id = v_couple_id
    ) then
      -- Conserva nota y cuenta regresiva de la visita existente.
      select * into v_visit from public.visits v where v.id = v_memory.visit_id;
      v_visit := public.save_visit(
        v_memory.happened_on, v_end, v_memory.place_name, v_visit.note, v_visit.event_id, v_visit.id
      );
    else
      v_visit := public.save_visit(v_memory.happened_on, v_end, v_memory.place_name);
    end if;

    update public.memories m set visit_id = v_visit.id where m.id = p_memory_id;
    return jsonb_build_object('visit_id', v_visit.id);
  end if;

  if v_memory.visit_id is not null then
    -- Si la visita ya no existe (visit_id se habría limpiado solo), no hay nada que borrar.
    if exists (select 1 from public.visits v where v.id = v_memory.visit_id and v.couple_id = v_couple_id) then
      perform public.delete_visit(v_memory.visit_id);
    end if;
    update public.memories m set visit_id = null where m.id = p_memory_id;
  end if;
  return jsonb_build_object('visit_id', null);
end;
$$;
comment on function public.set_memory_visit(uuid, boolean, date) is 'Marca o desmarca una memoria de la pareja de auth.uid() como visita (crea, actualiza o borra la visita ligada).';

revoke all on function public.set_memory_visit(uuid, boolean, date) from public, anon;
grant execute on function public.set_memory_visit(uuid, boolean, date) to authenticated, service_role;

-- Permisos de las RPC redefinidas (idénticos a los de antes).
revoke all on function public.get_streak() from public, anon;
grant execute on function public.get_streak() to authenticated, service_role;
revoke all on function public.get_daily_question(date) from public, anon;
grant execute on function public.get_daily_question(date) to authenticated, service_role;
revoke all on function public.submit_answer(uuid, text, integer) from public, anon;
grant execute on function public.submit_answer(uuid, text, integer) to authenticated, service_role;
