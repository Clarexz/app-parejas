-- =============================================================================
-- 20261101000000_questions.sql
-- Fase 3: preguntas diarias, racha, comentarios por pregunta y toques.
--   * Catálogo: question_categories, questions (se llenan con el seed generado
--     desde content/, ver docs/CONTENT.md). Lectura para miembros; las
--     picantes solo si los DOS activaron picantes (couple_spicy_active).
--   * daily_questions: una pregunta por pareja y día local de la pareja, asignada
--     de forma idempotente por get_daily_question.
--   * answers: una respuesta por persona y pregunta. La de tu pareja solo se
--     puede leer si ya contestaste esa pregunta (RLS y RPC).
--   * answer_comments: hilo por pregunta, con una reacción por persona.
--   * nudges: "recuérdale a tu pareja".
--   * Racha (get_streak): un día cuenta si ambos contestaron su pregunta y la
--     última respuesta llegó a más tardar 7 días después (reparación ≤ 7 días).
--     Lógica espejo en src/lib/streak.ts.
-- Errores (P0001, claves estables traducidas en src/lib/errors.ts):
--   not_authenticated, no_couple, invalid_day, no_questions, question_not_found,
--   invalid_answer, not_answered, invalid_comment, comment_not_found,
--   invalid_reaction, nudge_too_soon, no_partner.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Catálogo
-- -----------------------------------------------------------------------------

create table if not exists public.question_categories (
  slug text primary key
    constraint question_categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null constraint question_categories_name_length check (char_length(name) between 1 and 40),
  emoji text not null constraint question_categories_emoji_length check (char_length(emoji) between 1 and 16),
  description text not null default ''
    constraint question_categories_description_length check (char_length(description) <= 200),
  intensity text not null
    constraint question_categories_intensity check (intensity in ('ligera', 'profunda', 'picante')),
  position smallint not null default 0,
  created_at timestamptz not null default now()
);
comment on table public.question_categories is 'Categorías del banco de preguntas (seed desde content/categories.json).';

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    constraint questions_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  category text not null references public.question_categories (slug) on update cascade,
  type text not null
    constraint questions_type check (type in ('open', 'choice', 'wyr', 'nhie', 'most_likely', 'agree')),
  text text not null constraint questions_text_length check (char_length(text) between 5 and 300),
  options jsonb
    constraint questions_options_shape check (
      options is null
      or (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6)
    ),
  intensity text not null
    constraint questions_intensity check (intensity in ('ligera', 'profunda', 'picante')),
  is_active boolean not null default true,
  -- Fase 10 ("Agregar pregunta"): preguntas creadas desde la app. Las del seed van en null.
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint questions_choice_has_options check (type <> 'choice' or options is not null)
);
comment on table public.questions is 'Banco de preguntas. Se identifica por slug (estable); el seed hace upsert por slug.';

create index if not exists questions_category_idx on public.questions (category) where is_active;

-- -----------------------------------------------------------------------------
-- Datos de la pareja
-- -----------------------------------------------------------------------------

create table if not exists public.daily_questions (
  couple_id uuid not null references public.couples (id) on delete cascade,
  day date not null,
  question_id uuid not null references public.questions (id),
  created_at timestamptz not null default now(),
  -- Se toca cuando alguien contesta o borra su respuesta: la app lo escucha por
  -- Realtime para saber que tu pareja contestó sin poder leer su respuesta.
  updated_at timestamptz not null default now(),
  primary key (couple_id, day)
);
comment on table public.daily_questions is 'Pregunta del día de cada pareja (día local de couples.timezone). La asigna get_daily_question().';

create index if not exists daily_questions_question_idx on public.daily_questions (couple_id, question_id);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  question_id uuid not null references public.questions (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Día de daily_questions al que corresponde (null si fue una pregunta extra).
  day date,
  text text constraint answers_text_length check (text is null or char_length(text) between 1 and 2000),
  choice smallint constraint answers_choice_range check (choice is null or choice between 0 and 5),
  audio_path text, -- Fase 12
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint answers_has_content check (text is not null or choice is not null),
  constraint answers_one_per_question unique (couple_id, question_id, user_id)
);
comment on table public.answers is 'Respuestas. La de tu pareja solo es visible si ya contestaste la misma pregunta. Se escribe con submit_answer().';

create index if not exists answers_user_idx on public.answers (user_id);
create index if not exists answers_couple_created_idx on public.answers (couple_id, created_at desc);

create table if not exists public.answer_comments (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  question_id uuid not null references public.questions (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null constraint answer_comments_body_length check (char_length(body) between 1 and 1000),
  -- Una reacción por persona: {"<user_id>": "😂"}.
  reactions jsonb not null default '{}'::jsonb
    constraint answer_comments_reactions_object check (jsonb_typeof(reactions) = 'object'),
  created_at timestamptz not null default now()
);
comment on table public.answer_comments is 'Hilo de comentarios por pregunta (el "chat" de la app). Solo lo ve quien ya contestó.';

create index if not exists answer_comments_thread_idx
  on public.answer_comments (couple_id, question_id, created_at);

create table if not exists public.nudges (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'answer' constraint nudges_kind check (kind in ('answer')),
  created_at timestamptz not null default now()
);
comment on table public.nudges is '"Recuérdale a tu pareja". La Fase 4 manda el push; aquí solo se registra (y llega por Realtime).';

create index if not exists nudges_couple_created_idx on public.nudges (couple_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- Picantes activas: la pareja tiene 2 miembros y los dos dieron su opt-in.
create or replace function public.couple_spicy_active(p_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) = 2
  from public.couple_members cm
  where cm.couple_id = p_couple_id and cm.spicy_opt_in;
$$;
comment on function public.couple_spicy_active(uuid) is 'true si los 2 miembros de la pareja activaron las picantes.';

-- Día local de la pareja.
create or replace function public.couple_today(p_couple_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone c.timezone)::date from public.couples c where c.id = p_couple_id;
$$;
comment on function public.couple_today(uuid) is 'Fecha de hoy en la zona horaria de la pareja.';

-- Primer día que cuenta para la racha: cuando el segundo miembro actual se unió.
create or replace function public.couple_start_day(p_couple_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (max(cm.joined_at) at time zone c.timezone)::date
  from public.couple_members cm
  join public.couples c on c.id = cm.couple_id
  where cm.couple_id = p_couple_id
  group by c.timezone;
$$;
comment on function public.couple_start_day(uuid) is 'Día local en que se unió el último miembro actual (inicio de la racha).';

-- ¿auth.uid() ya contestó esta pregunta en su pareja?
create or replace function public.has_answered(p_couple_id uuid, p_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.answers a
    where a.couple_id = p_couple_id and a.question_id = p_question_id and a.user_id = auth.uid()
  );
$$;
comment on function public.has_answered(uuid, uuid) is 'true si auth.uid() ya contestó la pregunta en la pareja dada. Helper de RLS.';

-- ¿El usuario es miembro ACTUAL de mi pareja (yo o mi pareja)?
create or replace function public.is_current_member(p_couple_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_couple_id = public.my_couple_id()
    and exists (
      select 1 from public.couple_members cm
      where cm.couple_id = p_couple_id and cm.user_id = p_user_id
    );
$$;
comment on function public.is_current_member(uuid, uuid) is 'true si p_couple_id es mi pareja y p_user_id es miembro actual de ella. Helper de RLS.';

-- ¿Puedo ver esta pregunta? Activa y, si es picante, con picantes activas.
-- Las ya asignadas a mi pareja o ya contestadas por alguien de ella se pueden ver siempre.
create or replace function public.question_visible(p_question public.questions)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (p_question.is_active
      and (p_question.intensity <> 'picante' or public.couple_spicy_active(public.my_couple_id())))
    or exists (
      select 1 from public.daily_questions dq
      where dq.couple_id = public.my_couple_id() and dq.question_id = p_question.id
    )
    or exists (
      select 1 from public.answers a
      where a.couple_id = public.my_couple_id() and a.question_id = p_question.id
    );
$$;
comment on function public.question_visible(public.questions) is 'Regla de visibilidad de una pregunta para auth.uid().';

-- Representación JSON de una pregunta para la app.
create or replace function public.question_json(p_question public.questions)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_question.id,
    'slug', p_question.slug,
    'category', p_question.category,
    'category_name', qc.name,
    'category_emoji', qc.emoji,
    'type', p_question.type,
    'text', p_question.text,
    'options', p_question.options,
    'intensity', p_question.intensity
  )
  from public.question_categories qc
  where qc.slug = p_question.category;
$$;

create or replace function public.answer_json(p_answer public.answers)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when p_answer.id is null then null else jsonb_build_object(
    'id', p_answer.id,
    'user_id', p_answer.user_id,
    'text', p_answer.text,
    'choice', p_answer.choice,
    'created_at', p_answer.created_at,
    'updated_at', p_answer.updated_at
  ) end;
$$;

-- Tarjeta de una pregunta para auth.uid(): pregunta, día (si fue del día), mi
-- respuesta, la de mi pareja SOLO si ya contesté, si mi pareja ya contestó y
-- cuántos comentarios hay (solo si ya contesté).
create or replace function public.question_card(p_couple_id uuid, p_question_id uuid, p_day date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_question public.questions;
  v_mine public.answers;
  v_partner public.answers;
  v_partner_id uuid;
  v_comments integer := 0;
begin
  select * into v_question from public.questions q where q.id = p_question_id;
  if not found then
    raise exception 'question_not_found' using errcode = 'P0001';
  end if;

  select cm.user_id into v_partner_id
  from public.couple_members cm
  where cm.couple_id = p_couple_id and cm.user_id <> v_uid
  limit 1;

  select * into v_mine from public.answers a
  where a.couple_id = p_couple_id and a.question_id = p_question_id and a.user_id = v_uid;

  if v_partner_id is not null then
    select * into v_partner from public.answers a
    where a.couple_id = p_couple_id and a.question_id = p_question_id and a.user_id = v_partner_id;
  end if;

  if v_mine.id is not null then
    select count(*) into v_comments from public.answer_comments ac
    where ac.couple_id = p_couple_id and ac.question_id = p_question_id
      and ac.user_id in (select cm.user_id from public.couple_members cm where cm.couple_id = p_couple_id);
  end if;

  return jsonb_build_object(
    'question', public.question_json(v_question),
    'day', p_day,
    'mine', public.answer_json(v_mine),
    'partner', case when v_mine.id is not null then public.answer_json(v_partner) else null end,
    'partner_answered', v_partner.id is not null,
    'comment_count', v_comments
  );
end;
$$;
comment on function public.question_card(uuid, uuid, date) is 'Tarjeta de pregunta para auth.uid() (oculta la respuesta de la pareja si no ha contestado).';

-- Mi pareja o error no_couple.
create or replace function public.require_couple()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  v_couple_id := public.my_couple_id();
  if v_couple_id is null then
    raise exception 'no_couple' using errcode = 'P0001';
  end if;
  return v_couple_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Pregunta del día
-- -----------------------------------------------------------------------------

-- Elige la siguiente pregunta diaria para la pareja (no la guarda):
--   1) tipos open/choice, activas y picantes solo con picantes activas;
--   2) que nunca se haya asignado ni contestado en la pareja;
--   3) de la categoría usada hace más tiempo (rotación), al azar dentro de ella.
-- Si el banco se agotó, repite la que se asignó hace más tiempo.
create or replace function public.pick_daily_question(p_couple_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_spicy boolean := public.couple_spicy_active(p_couple_id);
  v_question_id uuid;
begin
  with eligible as (
    select q.id, q.category
    from public.questions q
    where q.is_active
      and q.type in ('open', 'choice')
      and (q.intensity <> 'picante' or v_spicy)
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
  order by lu.last_day asc nulls first, random()
  limit 1;

  if v_question_id is null then
    select e.id into v_question_id
    from (select q.id from public.questions q
          where q.is_active and q.type in ('open', 'choice')
            and (q.intensity <> 'picante' or v_spicy)) e
    left join lateral (
      select max(dq.day) as last_day from public.daily_questions dq
      where dq.couple_id = p_couple_id and dq.question_id = e.id
    ) lu on true
    order by lu.last_day asc nulls first, random()
    limit 1;
  end if;

  return v_question_id;
end;
$$;
comment on function public.pick_daily_question(uuid) is 'Elige (sin guardar) la siguiente pregunta diaria: sin repetir, rotando categorías y respetando picantes.';

-- Pregunta del día `p_day` (hoy si es null) de la pareja de auth.uid(). La asigna
-- la primera vez (idempotente: los dos reciben la misma). Se aceptan días de hasta
-- 7 atrás (reparar racha), nunca futuros ni anteriores al inicio de la pareja.
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
  if v_day > v_today or v_day < v_today - 7
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
comment on function public.get_daily_question(date) is 'Pregunta del día (asignación idempotente) con respuestas según quién ya contestó.';

-- Tarjeta de cualquier pregunta visible (extra, historial o del día).
create or replace function public.get_question_with_answers(p_question_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := public.require_couple();
  v_question public.questions;
  v_day date;
begin
  select * into v_question from public.questions q where q.id = p_question_id;
  if not found or not public.question_visible(v_question) then
    raise exception 'question_not_found' using errcode = 'P0001';
  end if;
  select max(dq.day) into v_day
  from public.daily_questions dq where dq.couple_id = v_couple_id and dq.question_id = p_question_id;
  return public.question_card(v_couple_id, p_question_id, v_day);
end;
$$;
comment on function public.get_question_with_answers(uuid) is 'Pregunta con mi respuesta y la de mi pareja (solo si ya contesté).';

-- -----------------------------------------------------------------------------
-- Respuestas
-- -----------------------------------------------------------------------------

-- Guarda (o edita) la respuesta de auth.uid(). open: texto obligatorio.
-- choice: índice de opción obligatorio y texto opcional (≤ 500).
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
    if p_choice is null or p_choice < 0 or p_choice >= jsonb_array_length(v_question.options)
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
comment on function public.submit_answer(uuid, text, integer) is 'Guarda o edita la respuesta de auth.uid() y devuelve la tarjeta actualizada.';

-- Borra mi respuesta (la de mi pareja vuelve a quedar oculta para mí).
create or replace function public.delete_answer(p_question_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := public.require_couple();
begin
  delete from public.answers a
  where a.couple_id = v_couple_id and a.question_id = p_question_id and a.user_id = auth.uid();
end;
$$;
comment on function public.delete_answer(uuid) is 'Borra la respuesta de auth.uid() a la pregunta.';

-- Al contestar o borrar, se toca la fila del día para avisar por Realtime.
create or replace function public.touch_daily_question()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.answers := coalesce(new, old);
begin
  update public.daily_questions dq
  set updated_at = now()
  where dq.couple_id = v_row.couple_id and dq.question_id = v_row.question_id;
  return null;
end;
$$;

drop trigger if exists answers_touch_daily on public.answers;
create trigger answers_touch_daily
  after insert or update or delete on public.answers
  for each row execute function public.touch_daily_question();

-- Preguntas de una categoría (preguntas extra) con quién ya contestó.
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
  order by q.slug;
end;
$$;
comment on function public.get_category_questions(text) is 'Preguntas activas y visibles de una categoría con quién ya contestó.';

-- Historial: preguntas que alguno de los dos contestó, de la más reciente a la
-- más vieja. Búsqueda (sin acentos ni mayúsculas) en el texto de la pregunta y
-- en las respuestas que puedo ver. Paginación por `p_before` (last_activity).
create or replace function public.get_history(
  p_search text default null,
  p_category text default null,
  p_limit integer default 30,
  p_before timestamptz default null
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := public.require_couple();
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  return query
  with members as (
    select cm.user_id from public.couple_members cm where cm.couple_id = v_couple_id
  ),
  per_question as (
    select a.question_id,
      max(a.created_at) as last_activity,
      bool_or(a.user_id = v_uid) as answered_by_me
    from public.answers a
    where a.couple_id = v_couple_id and a.user_id in (select m.user_id from members m)
    group by a.question_id
  ),
  rows as (
    select pq.*, q,
      public.question_card(v_couple_id, q.id,
        (select max(dq.day) from public.daily_questions dq
         where dq.couple_id = v_couple_id and dq.question_id = q.id)) as card
    from per_question pq
    join public.questions q on q.id = pq.question_id
    where (p_category is null or q.category = p_category)
      and (p_before is null or pq.last_activity < p_before)
  )
  select r.card || jsonb_build_object('last_activity', r.last_activity)
  from rows r
  where v_search is null
    or public.fold_text(concat_ws(' ',
         (r.q).text,
         r.card -> 'mine' ->> 'text',
         r.card -> 'partner' ->> 'text'))
       like '%' || public.fold_text(v_search) || '%'
  order by r.last_activity desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
end;
$$;
comment on function public.get_history(text, text, integer, timestamptz) is 'Historial de preguntas contestadas con búsqueda y filtro por categoría.';

-- Minúsculas y sin acentos, para buscar.
create or replace function public.fold_text(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(lower(coalesce(p_text, '')), 'áéíóúüñàèìòù', 'aeiouunaeiou');
$$;

-- -----------------------------------------------------------------------------
-- Racha
-- -----------------------------------------------------------------------------

-- Días completos de la pareja: ambos miembros actuales contestaron la pregunta
-- del día y la última de las dos respuestas llegó a más tardar 7 días después.
create or replace function public.couple_complete_days(p_couple_id uuid)
returns setof date
language sql
stable
security definer
set search_path = ''
as $$
  select dq.day
  from public.daily_questions dq
  join public.couples c on c.id = dq.couple_id
  join public.answers a on a.couple_id = dq.couple_id and a.question_id = dq.question_id
  join public.couple_members cm on cm.couple_id = a.couple_id and cm.user_id = a.user_id
  where dq.couple_id = p_couple_id
  group by dq.day, c.timezone
  having count(distinct a.user_id) = 2
    and (max(a.created_at) at time zone c.timezone)::date <= dq.day + 7;
$$;
comment on function public.couple_complete_days(uuid) is 'Días con la pregunta contestada por los dos (a tiempo o reparada en ≤ 7 días).';

-- Racha de la pareja de auth.uid():
--   current: días completos seguidos que terminan hoy (o ayer, si hoy aún no se completa);
--   best: la racha más larga;
--   today_done: si hoy ya está completo;
--   missing_days: días de los últimos 7 (sin hoy, desde el inicio de la pareja) que
--     faltan y todavía se pueden reparar.
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
  v_start date := public.couple_start_day(v_couple_id);
  v_days date[];
  v_today_done boolean;
  v_anchor date;
  v_current integer := 0;
  v_best integer := 0;
  v_missing date[];
begin
  select coalesce(array_agg(d order by d), '{}') into v_days
  from public.couple_complete_days(v_couple_id) d
  where d <= v_today;

  v_today_done := v_today = any (v_days);
  v_anchor := case when v_today_done then v_today else v_today - 1 end;

  -- Islas de días consecutivos (d - row_number constante dentro de cada racha).
  with islands as (
    select d, d - (row_number() over (order by d))::integer as grp
    from unnest(v_days) d
  ),
  runs as (
    select min(d) as first_day, max(d) as last_day, count(*)::integer as len
    from islands group by grp
  )
  select coalesce(max(r.len), 0),
    coalesce(max(r.len) filter (where r.last_day = v_anchor), 0)
  into v_best, v_current
  from runs r;

  select coalesce(array_agg(g::date order by g), '{}') into v_missing
  from generate_series(greatest(v_today - 7, coalesce(v_start, v_today)), v_today - 1, interval '1 day') g
  where not (g::date = any (v_days))
    and public.couple_member_count(v_couple_id) = 2;

  return jsonb_build_object(
    'current', v_current,
    'best', v_best,
    'today', v_today,
    'today_done', v_today_done,
    'missing_days', to_jsonb(v_missing)
  );
end;
$$;
comment on function public.get_streak() is 'Racha actual y récord de la pareja, y días que se pueden reparar.';

create or replace function public.couple_member_count(p_couple_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.couple_members cm where cm.couple_id = p_couple_id;
$$;

-- -----------------------------------------------------------------------------
-- Comentarios
-- -----------------------------------------------------------------------------

-- Agrega un comentario al hilo de la pregunta. Hay que haberla contestado.
create or replace function public.add_comment(p_question_id uuid, p_body text)
returns public.answer_comments
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := public.require_couple();
  v_body text := btrim(coalesce(p_body, ''));
  v_comment public.answer_comments;
begin
  if char_length(v_body) not between 1 and 1000 then
    raise exception 'invalid_comment' using errcode = 'P0001';
  end if;
  if not public.has_answered(v_couple_id, p_question_id) then
    raise exception 'not_answered' using errcode = 'P0001';
  end if;
  insert into public.answer_comments (couple_id, question_id, user_id, body)
  values (v_couple_id, p_question_id, auth.uid(), v_body)
  returning * into v_comment;
  return v_comment;
end;
$$;
comment on function public.add_comment(uuid, text) is 'Comenta en el hilo de una pregunta que auth.uid() ya contestó.';

-- Borra mi comentario.
create or replace function public.delete_comment(p_comment_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := public.require_couple();
begin
  delete from public.answer_comments ac
  where ac.id = p_comment_id and ac.couple_id = v_couple_id and ac.user_id = auth.uid();
  if not found then
    raise exception 'comment_not_found' using errcode = 'P0001';
  end if;
end;
$$;
comment on function public.delete_comment(uuid) is 'Borra un comentario propio.';

-- Pone, cambia o quita (mismo emoji o null) mi reacción a un comentario.
create or replace function public.react_to_comment(p_comment_id uuid, p_emoji text default null)
returns public.answer_comments
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid text := auth.uid()::text;
  v_couple_id uuid := public.require_couple();
  v_emoji text := nullif(btrim(coalesce(p_emoji, '')), '');
  v_comment public.answer_comments;
begin
  if v_emoji is not null and (char_length(v_emoji) > 16 or v_emoji ~ '[[:space:]]') then
    raise exception 'invalid_reaction' using errcode = 'P0001';
  end if;

  select * into v_comment from public.answer_comments ac
  where ac.id = p_comment_id and ac.couple_id = v_couple_id
  for update;
  if not found or not public.has_answered(v_couple_id, v_comment.question_id) then
    raise exception 'comment_not_found' using errcode = 'P0001';
  end if;

  update public.answer_comments ac
  set reactions = case
      when v_emoji is null or ac.reactions ->> v_uid = v_emoji then ac.reactions - v_uid
      else ac.reactions || jsonb_build_object(v_uid, v_emoji)
    end
  where ac.id = p_comment_id
  returning * into v_comment;
  return v_comment;
end;
$$;
comment on function public.react_to_comment(uuid, text) is 'Alterna la reacción de auth.uid() en un comentario (una por persona).';

-- -----------------------------------------------------------------------------
-- Toques y picantes
-- -----------------------------------------------------------------------------

-- "Recuérdale a tu pareja": máximo uno cada 10 minutos.
create or replace function public.send_nudge(p_kind text default 'answer')
returns public.nudges
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := public.require_couple();
  v_partner uuid;
  v_nudge public.nudges;
begin
  if coalesce(p_kind, '') <> 'answer' then
    raise exception 'invalid_nudge' using errcode = 'P0001';
  end if;
  select cm.user_id into v_partner from public.couple_members cm
  where cm.couple_id = v_couple_id and cm.user_id <> v_uid;
  if v_partner is null then
    raise exception 'no_partner' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.nudges n
    where n.from_user = v_uid and n.couple_id = v_couple_id
      and n.created_at > now() - interval '10 minutes'
  ) then
    raise exception 'nudge_too_soon' using errcode = 'P0001';
  end if;
  insert into public.nudges (couple_id, from_user, to_user, kind)
  values (v_couple_id, v_uid, v_partner, p_kind)
  returning * into v_nudge;
  return v_nudge;
end;
$$;
comment on function public.send_nudge(text) is 'Registra un recordatorio para la pareja (máx. 1 cada 10 min).';

-- Mi opt-in de picantes. Se activan solo si los dos dieron el suyo;
-- couples.spicy_enabled queda como espejo de couple_spicy_active().
create or replace function public.set_spicy_opt_in(p_enabled boolean)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := public.require_couple();
  v_active boolean;
begin
  update public.couple_members cm
  set spicy_opt_in = coalesce(p_enabled, false)
  where cm.couple_id = v_couple_id and cm.user_id = auth.uid();
  v_active := public.couple_spicy_active(v_couple_id);
  update public.couples c set spicy_enabled = v_active where c.id = v_couple_id;
  return v_active;
end;
$$;
comment on function public.set_spicy_opt_in(boolean) is 'Guarda el opt-in de picantes de auth.uid(); devuelve si quedaron activas para la pareja.';

-- Al entrar alguien nuevo su opt-in es false: las picantes se apagan.
create or replace function public.sync_spicy_on_join()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.couples c
  set spicy_enabled = public.couple_spicy_active(new.couple_id)
  where c.id = new.couple_id and c.spicy_enabled;
  return null;
end;
$$;

drop trigger if exists couple_members_sync_spicy on public.couple_members;
create trigger couple_members_sync_spicy
  after insert on public.couple_members
  for each row execute function public.sync_spicy_on_join();

-- spicy_enabled ya no se escribe directo (requiere a los dos).
revoke update (spicy_enabled) on public.couples from authenticated;

-- -----------------------------------------------------------------------------
-- RLS (lectura directa; toda escritura va por RPC)
-- -----------------------------------------------------------------------------

alter table public.question_categories enable row level security;
alter table public.questions enable row level security;
alter table public.daily_questions enable row level security;
alter table public.answers enable row level security;
alter table public.answer_comments enable row level security;
alter table public.nudges enable row level security;

drop policy if exists question_categories_select on public.question_categories;
create policy question_categories_select on public.question_categories
  for select to authenticated
  using (true);

drop policy if exists questions_select_visible on public.questions;
create policy questions_select_visible on public.questions
  for select to authenticated
  using (public.question_visible(questions));

drop policy if exists daily_questions_select_member on public.daily_questions;
create policy daily_questions_select_member on public.daily_questions
  for select to authenticated
  using (couple_id = (select public.my_couple_id()));

-- Mi respuesta, o la de mi pareja (miembro actual) si yo ya contesté esa pregunta.
drop policy if exists answers_select_own_or_revealed on public.answers;
create policy answers_select_own_or_revealed on public.answers
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      public.is_current_member(couple_id, user_id)
      and public.has_answered(couple_id, question_id)
    )
  );

drop policy if exists answer_comments_select_answered on public.answer_comments;
create policy answer_comments_select_answered on public.answer_comments
  for select to authenticated
  using (
    public.is_current_member(couple_id, user_id)
    and public.has_answered(couple_id, question_id)
  );

drop policy if exists nudges_select_member on public.nudges;
create policy nudges_select_member on public.nudges
  for select to authenticated
  using (
    couple_id = (select public.my_couple_id())
    and (from_user = (select auth.uid()) or to_user = (select auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------

revoke all on public.question_categories, public.questions, public.daily_questions,
  public.answers, public.answer_comments, public.nudges from anon, authenticated;

grant select on public.question_categories, public.questions, public.daily_questions,
  public.answers, public.answer_comments, public.nudges to authenticated;

grant all on public.question_categories, public.questions, public.daily_questions,
  public.answers, public.answer_comments, public.nudges to service_role;

-- Helpers internos: solo los usan otras funciones o las políticas.
revoke all on function public.couple_spicy_active(uuid) from public, anon;
revoke all on function public.couple_today(uuid) from public, anon, authenticated;
revoke all on function public.couple_start_day(uuid) from public, anon, authenticated;
revoke all on function public.has_answered(uuid, uuid) from public, anon;
revoke all on function public.is_current_member(uuid, uuid) from public, anon;
revoke all on function public.question_visible(public.questions) from public, anon;
revoke all on function public.question_json(public.questions) from public, anon, authenticated;
revoke all on function public.answer_json(public.answers) from public, anon, authenticated;
revoke all on function public.question_card(uuid, uuid, date) from public, anon, authenticated;
revoke all on function public.require_couple() from public, anon, authenticated;
revoke all on function public.pick_daily_question(uuid) from public, anon, authenticated;
revoke all on function public.couple_complete_days(uuid) from public, anon, authenticated;
revoke all on function public.couple_member_count(uuid) from public, anon, authenticated;
revoke all on function public.touch_daily_question() from public, anon, authenticated;
revoke all on function public.sync_spicy_on_join() from public, anon, authenticated;
revoke all on function public.fold_text(text) from public, anon;

-- Los que usan las políticas de RLS deben poder ejecutarse como authenticated.
grant execute on function public.couple_spicy_active(uuid) to authenticated, service_role;
grant execute on function public.has_answered(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_current_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.question_visible(public.questions) to authenticated, service_role;
grant execute on function public.fold_text(text) to authenticated, service_role;

-- RPC públicas de la app.
revoke all on function public.get_daily_question(date) from public, anon;
revoke all on function public.get_question_with_answers(uuid) from public, anon;
revoke all on function public.submit_answer(uuid, text, integer) from public, anon;
revoke all on function public.delete_answer(uuid) from public, anon;
revoke all on function public.get_category_questions(text) from public, anon;
revoke all on function public.get_history(text, text, integer, timestamptz) from public, anon;
revoke all on function public.get_streak() from public, anon;
revoke all on function public.add_comment(uuid, text) from public, anon;
revoke all on function public.delete_comment(uuid) from public, anon;
revoke all on function public.react_to_comment(uuid, text) from public, anon;
revoke all on function public.send_nudge(text) from public, anon;
revoke all on function public.set_spicy_opt_in(boolean) from public, anon;

grant execute on function public.get_daily_question(date) to authenticated, service_role;
grant execute on function public.get_question_with_answers(uuid) to authenticated, service_role;
grant execute on function public.submit_answer(uuid, text, integer) to authenticated, service_role;
grant execute on function public.delete_answer(uuid) to authenticated, service_role;
grant execute on function public.get_category_questions(text) to authenticated, service_role;
grant execute on function public.get_history(text, text, integer, timestamptz) to authenticated, service_role;
grant execute on function public.get_streak() to authenticated, service_role;
grant execute on function public.add_comment(uuid, text) to authenticated, service_role;
grant execute on function public.delete_comment(uuid) to authenticated, service_role;
grant execute on function public.react_to_comment(uuid, text) to authenticated, service_role;
grant execute on function public.send_nudge(text) to authenticated, service_role;
grant execute on function public.set_spicy_opt_in(boolean) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Realtime (respeta la RLS de select)
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    raise notice 'No existe la publicación supabase_realtime; se omite Realtime.';
    return;
  end if;
  foreach t in array array['daily_questions', 'answers', 'answer_comments', 'nudges'] loop
    if not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
