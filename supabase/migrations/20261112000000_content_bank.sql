-- =============================================================================
-- 20261112000000_content_bank.sql
-- Fase 10: banco de contenido grande, temas (packs), votos y preguntas propias.
--   * question_categories.kind acepta también 'packs' (temas: quizzes con orden fijo).
--   * questions.position (orden dentro de un pack; null en el resto) y
--     questions.couple_id (null = banco global; con valor = pregunta propia de esa
--     pareja). Check: created_by no nulo implica couple_id no nulo.
--   * question_visible: una pregunta con couple_id solo la ve esa pareja.
--   * pick_daily_question: nunca elige packs ni juegos, ni preguntas con 👎 de
--     cualquier miembro actual; las propias de la pareja van primero.
--   * get_category_questions: ordena por position (nulos al final) y slug.
--   * question_feedback: voto 👍/👎 por persona y pregunta (solo se lee el propio;
--     se escribe con set_question_feedback).
--   * RPC nuevas: set_question_feedback, get_packs, add_custom_question,
--     retire_custom_question, get_custom_questions.
--   * private.fold_question_text: normaliza texto para detectar duplicados.
-- Errores nuevos (P0001, claves estables traducidas en src/lib/errors.ts):
--   invalid_feedback, invalid_category, invalid_question, duplicate_question,
--   too_many_questions, spicy_not_active (además de no_couple / not_authenticated /
--   question_not_found, que ya existían).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Columnas y restricciones
-- -----------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'question_categories_kind' and conrelid = 'public.question_categories'::regclass
  ) then
    alter table public.question_categories drop constraint question_categories_kind;
  end if;
  alter table public.question_categories
    add constraint question_categories_kind check (kind in ('questions', 'games', 'packs'));
end;
$$;
comment on column public.question_categories.kind is 'questions = banco de preguntas; games = ítems de juegos (categoría `juegos`); packs = temas (quizzes con orden fijo por position).';

alter table public.questions add column if not exists position smallint;
alter table public.questions
  add column if not exists couple_id uuid references public.couples (id) on delete cascade;
comment on column public.questions.position is 'Orden dentro de un pack (1..N). Null en el resto de preguntas.';
comment on column public.questions.couple_id is 'Null = banco global. Con valor = pregunta propia de esa pareja (solo ella la ve).';

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'questions_custom_has_couple' and conrelid = 'public.questions'::regclass
  ) then
    alter table public.questions
      add constraint questions_custom_has_couple check (created_by is null or couple_id is not null);
  end if;
end;
$$;

create index if not exists questions_couple_idx on public.questions (couple_id) where couple_id is not null;

-- -----------------------------------------------------------------------------
-- Votos 👍/👎
-- -----------------------------------------------------------------------------

create table if not exists public.question_feedback (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  vote smallint not null constraint question_feedback_vote check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);
comment on table public.question_feedback is 'Voto 👍 (1) / 👎 (-1) de cada persona por pregunta. Un 👎 de cualquiera de los dos la saca de la pregunta del día. Se escribe con set_question_feedback().';

create index if not exists question_feedback_question_idx on public.question_feedback (question_id);

alter table public.question_feedback enable row level security;

drop policy if exists question_feedback_select_own on public.question_feedback;
create policy question_feedback_select_own on public.question_feedback
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.question_feedback from anon, authenticated;
grant select on public.question_feedback to authenticated;

-- -----------------------------------------------------------------------------
-- Helper privado: texto normalizado (minúsculas, sin acentos, solo [a-z0-9] y espacios)
-- -----------------------------------------------------------------------------

create schema if not exists private;

create or replace function private.fold_question_text(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(
    pg_catalog.translate(pg_catalog.lower(coalesce(p_text, '')), 'áéíóúüñàèìòù', 'aeiouunaeiou'),
    '[^a-z0-9]+', ' ', 'g'));
$$;
revoke all on function private.fold_question_text(text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Visibilidad: las preguntas propias solo las ve su pareja
-- -----------------------------------------------------------------------------

create or replace function public.question_visible(p_question public.questions)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (p_question.couple_id is null or p_question.couple_id = public.my_couple_id())
    and (
      (p_question.is_active
        and (p_question.intensity <> 'picante' or public.couple_spicy_active(public.my_couple_id())))
      or exists (
        select 1 from public.daily_questions dq
        where dq.couple_id = public.my_couple_id() and dq.question_id = p_question.id
      )
      or exists (
        select 1 from public.answers a
        where a.couple_id = public.my_couple_id() and a.question_id = p_question.id
      )
    );
$$;
comment on function public.question_visible(public.questions) is 'Regla de visibilidad de una pregunta para auth.uid(): global o propia de mi pareja; activa (y picante solo con picantes activas) o ya asignada/contestada.';

revoke all on function public.question_visible(public.questions) from public, anon;
grant execute on function public.question_visible(public.questions) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Pregunta del día
-- -----------------------------------------------------------------------------

-- Elige (sin guardar) la siguiente pregunta diaria para la pareja:
--   1) solo categorías kind = 'questions' (nunca packs ni juegos), tipos open/choice,
--      activas, picantes solo con picantes activas, globales o propias de la pareja;
--   2) sin las que cualquier miembro actual marcó 👎;
--   3) que nunca se hayan asignado ni contestado en la pareja;
--   4) primero las propias de la pareja; luego la categoría usada hace más tiempo
--      (rotación), al azar dentro de ella.
-- Si no queda ninguna sin usar, repite la asignada hace más tiempo (mismas reglas).
-- Último recurso: si todo el banco tiene 👎, las permite (nunca null si hay banco).
create or replace function public.pick_daily_question(p_couple_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_spicy boolean := public.couple_spicy_active(p_couple_id);
  v_allow_down boolean;
  v_question_id uuid;
begin
  foreach v_allow_down in array array[false, true] loop
    -- Sin usar.
    with eligible as (
      select q.id, q.category, (q.couple_id is not null) as own
      from public.questions q
      join public.question_categories c on c.slug = q.category and c.kind = 'questions'
      where q.is_active
        and q.type in ('open', 'choice')
        and (q.intensity <> 'picante' or v_spicy)
        and (q.couple_id is null or q.couple_id = p_couple_id)
        and (v_allow_down or not exists (
          select 1 from public.question_feedback f
          join public.couple_members cm on cm.user_id = f.user_id and cm.couple_id = p_couple_id
          where f.question_id = q.id and f.vote = -1
        ))
    ),
    unused as (
      select e.* from eligible e
      where not exists (
          select 1 from public.daily_questions dq
          where dq.couple_id = p_couple_id and dq.question_id = e.id
        )
        and not exists (
          select 1 from public.answers a
          where a.couple_id = p_couple_id and a.question_id = e.id
        )
    ),
    last_use as (
      select q.category, max(dq.day) as last_day
      from public.daily_questions dq
      join public.questions q on q.id = dq.question_id
      where dq.couple_id = p_couple_id
      group by q.category
    )
    select u.id into v_question_id
    from unused u
    left join last_use lu on lu.category = u.category
    order by u.own desc, lu.last_day asc nulls first, random()
    limit 1;

    -- Respaldo: la asignada hace más tiempo.
    if v_question_id is null then
      select q.id into v_question_id
      from public.questions q
      join public.question_categories c on c.slug = q.category and c.kind = 'questions'
      left join lateral (
        select max(dq.day) as last_day from public.daily_questions dq
        where dq.couple_id = p_couple_id and dq.question_id = q.id
      ) lu on true
      where q.is_active
        and q.type in ('open', 'choice')
        and (q.intensity <> 'picante' or v_spicy)
        and (q.couple_id is null or q.couple_id = p_couple_id)
        and (v_allow_down or not exists (
          select 1 from public.question_feedback f
          join public.couple_members cm on cm.user_id = f.user_id and cm.couple_id = p_couple_id
          where f.question_id = q.id and f.vote = -1
        ))
      order by lu.last_day asc nulls first, random()
      limit 1;
    end if;

    exit when v_question_id is not null;
  end loop;

  return v_question_id;
end;
$$;
comment on function public.pick_daily_question(uuid) is 'Elige (sin guardar) la siguiente pregunta diaria: solo categorías de preguntas, sin 👎, propias primero, rotando categorías y respetando picantes.';

revoke all on function public.pick_daily_question(uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Preguntas de una categoría o tema, en orden
-- -----------------------------------------------------------------------------

create or replace function public.get_category_questions(p_category text)
returns table (
  id uuid,
  slug text,
  type text,
  text text,
  options jsonb,
  intensity text,
  answered_by_me boolean,
  answered_by_partner boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := public.require_couple();
begin
  return query
  select q.id, q.slug, q.type, q.text, q.options, q.intensity,
    exists (select 1 from public.answers a
            where a.couple_id = v_couple_id and a.question_id = q.id and a.user_id = v_uid),
    exists (select 1 from public.answers a
            join public.couple_members cm on cm.couple_id = a.couple_id and cm.user_id = a.user_id
            where a.couple_id = v_couple_id and a.question_id = q.id and a.user_id <> v_uid)
  from public.questions q
  where q.category = p_category
    and q.type in ('open', 'choice')
    and q.is_active
    and public.question_visible(q)
  order by q.position nulls last, q.slug;
end;
$$;
comment on function public.get_category_questions(text) is 'Preguntas activas y visibles de una categoría o tema (por position, luego slug) con quién ya contestó.';

revoke all on function public.get_category_questions(text) from public, anon;
grant execute on function public.get_category_questions(text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Votos
-- -----------------------------------------------------------------------------

-- Guarda mi voto (1 o -1) sobre una pregunta visible; null lo borra. Devuelve el voto guardado.
create or replace function public.set_question_feedback(p_question_id uuid, p_vote smallint)
returns smallint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := public.require_couple();
  v_question public.questions;
begin
  if p_vote is not null and p_vote not in (-1, 1) then
    raise exception 'invalid_feedback' using errcode = 'P0001';
  end if;

  select * into v_question from public.questions q where q.id = p_question_id;
  if not found or not public.question_visible(v_question) then
    raise exception 'question_not_found' using errcode = 'P0001';
  end if;

  if p_vote is null then
    delete from public.question_feedback f
    where f.user_id = v_uid and f.question_id = p_question_id;
    return null;
  end if;

  insert into public.question_feedback (user_id, question_id, vote)
  values (v_uid, p_question_id, p_vote)
  on conflict (user_id, question_id)
  do update set vote = excluded.vote, updated_at = now();
  return p_vote;
end;
$$;
comment on function public.set_question_feedback(uuid, smallint) is 'Voto 👍/👎 de auth.uid() sobre una pregunta visible; null borra el voto.';

-- -----------------------------------------------------------------------------
-- Temas (packs)
-- -----------------------------------------------------------------------------

-- Todos los packs en orden de position con mi progreso y el de los dos.
-- total = preguntas activas del pack (aunque sean picantes bloqueadas);
-- el resto solo cuenta preguntas visibles para mí. next_question_id = la primera
-- (por position) visible que yo no he contestado.
create or replace function public.get_packs()
returns table (
  slug text,
  name text,
  emoji text,
  description text,
  intensity text,
  "position" smallint,
  total integer,
  answered_by_me integer,
  answered_by_both integer,
  next_question_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := public.require_couple();
begin
  return query
  with pq as (
    select q.id as qid, q.category as cat, q.position as qpos, q.slug as qslug,
      public.question_visible(q) as vis
    from public.questions q
    join public.question_categories c on c.slug = q.category and c.kind = 'packs'
    where q.is_active and q.type in ('open', 'choice')
  ),
  st as (
    select pq.*,
      exists (select 1 from public.answers a
              where a.couple_id = v_couple_id and a.question_id = pq.qid and a.user_id = v_uid) as mine,
      (select count(distinct a.user_id)
       from public.answers a
       join public.couple_members cm on cm.couple_id = a.couple_id and cm.user_id = a.user_id
       where a.couple_id = v_couple_id and a.question_id = pq.qid) as answered_n
    from pq
  )
  select c.slug, c.name, c.emoji, c.description, c.intensity, c."position",
    count(st.qid)::integer,
    (count(*) filter (where st.vis and st.mine))::integer,
    (count(*) filter (where st.vis and st.answered_n = 2))::integer,
    (select s2.qid from st s2
     where s2.cat = c.slug and s2.vis and not s2.mine
     order by s2.qpos nulls last, s2.qslug
     limit 1)
  from public.question_categories c
  left join st on st.cat = c.slug
  where c.kind = 'packs'
  group by c.slug, c.name, c.emoji, c.description, c.intensity, c."position"
  order by c."position", c.slug;
end;
$$;
comment on function public.get_packs() is 'Temas (packs) con total, mi progreso, progreso de los dos y la siguiente pregunta sin contestar por mí.';

-- -----------------------------------------------------------------------------
-- Preguntas propias de la pareja
-- -----------------------------------------------------------------------------

create or replace function public.add_custom_question(
  p_category text,
  p_type text,
  p_text text,
  p_options jsonb default null,
  p_intensity text default 'ligera'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := public.require_couple();
  v_text text;
  v_intensity text := coalesce(p_intensity, 'ligera');
  v_options jsonb := null;
  v_len integer;
  v_id uuid;
begin
  if p_category is null or not exists (
    select 1 from public.question_categories c where c.slug = p_category and c.kind = 'questions'
  ) then
    raise exception 'invalid_category' using errcode = 'P0001';
  end if;

  if p_category = 'picantes' then
    if not public.couple_spicy_active(v_couple_id) then
      raise exception 'spicy_not_active' using errcode = 'P0001';
    end if;
    v_intensity := 'picante';
  elsif v_intensity not in ('ligera', 'profunda') then
    raise exception 'invalid_question' using errcode = 'P0001';
  end if;

  v_text := btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g'));
  if char_length(v_text) not between 10 and 220 then
    raise exception 'invalid_question' using errcode = 'P0001';
  end if;

  if p_type = 'open' then
    if p_options is not null and p_options <> 'null'::jsonb then
      raise exception 'invalid_question' using errcode = 'P0001';
    end if;
  elsif p_type = 'choice' then
    if p_options is null or jsonb_typeof(p_options) <> 'array'
       or jsonb_array_length(p_options) not between 2 and 4
       or exists (select 1 from jsonb_array_elements(p_options) e where jsonb_typeof(e) <> 'string') then
      raise exception 'invalid_question' using errcode = 'P0001';
    end if;
    select jsonb_agg(to_jsonb(btrim(e #>> '{}')) order by n), count(*)
    into v_options, v_len
    from jsonb_array_elements(p_options) with ordinality as t(e, n);
    if exists (select 1 from jsonb_array_elements_text(v_options) o where char_length(o) not between 1 and 60)
       or (select count(distinct lower(o)) from jsonb_array_elements_text(v_options) o) <> v_len then
      raise exception 'invalid_question' using errcode = 'P0001';
    end if;
  else
    raise exception 'invalid_question' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.questions q
    where q.is_active
      and public.question_visible(q)
      and private.fold_question_text(q.text) = private.fold_question_text(v_text)
  ) then
    raise exception 'duplicate_question' using errcode = 'P0001';
  end if;

  if (select count(*) from public.questions q
      where q.couple_id = v_couple_id and q.created_at > now() - interval '24 hours') >= 20 then
    raise exception 'too_many_questions' using errcode = 'P0001';
  end if;

  insert into public.questions (slug, category, type, text, options, intensity, created_by, couple_id)
  values (
    'propia-' || left(replace(gen_random_uuid()::text, '-', ''), 24),
    p_category, p_type, v_text, v_options, v_intensity, v_uid, v_couple_id
  )
  returning id into v_id;
  return v_id;
end;
$$;
comment on function public.add_custom_question(text, text, text, jsonb, text) is 'Agrega una pregunta propia de mi pareja (entra a la pregunta del día antes que las del banco).';

-- Cualquiera de los dos retira una pregunta propia de la pareja (las respuestas se conservan).
create or replace function public.retire_custom_question(p_question_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := public.require_couple();
begin
  if not exists (
    select 1 from public.questions q where q.id = p_question_id and q.couple_id = v_couple_id
  ) then
    raise exception 'question_not_found' using errcode = 'P0001';
  end if;
  update public.questions set is_active = false where id = p_question_id;
end;
$$;
comment on function public.retire_custom_question(uuid) is 'Desactiva una pregunta propia de mi pareja; sus respuestas se conservan.';

create or replace function public.get_custom_questions()
returns table (
  id uuid,
  category text,
  category_name text,
  category_emoji text,
  type text,
  text text,
  options jsonb,
  intensity text,
  created_by uuid,
  created_at timestamptz,
  answered_by_me boolean,
  answered_by_partner boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := public.require_couple();
begin
  return query
  select q.id, q.category, c.name, c.emoji, q.type, q.text, q.options, q.intensity,
    q.created_by, q.created_at,
    exists (select 1 from public.answers a
            where a.couple_id = v_couple_id and a.question_id = q.id and a.user_id = v_uid),
    exists (select 1 from public.answers a
            join public.couple_members cm on cm.couple_id = a.couple_id and cm.user_id = a.user_id
            where a.couple_id = v_couple_id and a.question_id = q.id and a.user_id <> v_uid)
  from public.questions q
  join public.question_categories c on c.slug = q.category
  where q.couple_id = v_couple_id and q.is_active
  order by q.created_at desc, q.id;
end;
$$;
comment on function public.get_custom_questions() is 'Preguntas propias activas de mi pareja, más nuevas primero.';

-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------

revoke all on function public.set_question_feedback(uuid, smallint) from public, anon;
revoke all on function public.get_packs() from public, anon;
revoke all on function public.add_custom_question(text, text, text, jsonb, text) from public, anon;
revoke all on function public.retire_custom_question(uuid) from public, anon;
revoke all on function public.get_custom_questions() from public, anon;

grant execute on function public.set_question_feedback(uuid, smallint) to authenticated, service_role;
grant execute on function public.get_packs() to authenticated, service_role;
grant execute on function public.add_custom_question(text, text, text, jsonb, text) to authenticated, service_role;
grant execute on function public.retire_custom_question(uuid) to authenticated, service_role;
grant execute on function public.get_custom_questions() to authenticated, service_role;
