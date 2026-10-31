-- =============================================================================
-- 20261107000000_love_languages_visits_stats.sql
-- Fase 11B: test de lenguajes del amor, calendario de visitas y estadísticas.
--   * love_language_results: el último resultado de cada persona (personal, no
--     de la pareja). Se guarda la lista de lenguajes elegidos en las 30 preguntas
--     del test (content/love-languages.json, versión 1); los puntajes se derivan
--     (src/lib/loveLanguages.ts y get_love_languages()). Tu pareja ve tu resultado
--     solo cuando también hizo el test (misma idea que las respuestas, D50).
--   * visits: cada vez que se vieron en persona (rango de fechas, lugar y nota),
--     de la pareja; cualquiera de los dos edita o borra. Opcionalmente ligada a la
--     cuenta regresiva "la próxima vez que nos vemos" (events.kind = 'visit').
--     No se traslapan; no empiezan en el futuro (lo futuro es una cuenta regresiva).
--   * get_relationship_stats(): agregados de solo lectura (preguntas, racha,
--     juegos, memorias por mes, visitas, stories, moods).
--   * Push: kinds `love_language` (pref `games`) y `visit` (pref `memories`);
--     private.notification_event se redefine completa.
--   * Realtime en love_language_results y visits.
-- Errores (P0001): not_authenticated, no_couple, invalid_love_language,
--   invalid_visit, visit_overlap, visit_not_found.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

create table if not exists public.love_language_results (
  user_id uuid primary key references auth.users (id) on delete cascade,
  quiz_version smallint not null default 1
    constraint love_language_results_version check (quiz_version between 1 and 100),
  answers text[] not null
    constraint love_language_results_answers check (
      cardinality(answers) = 30
      and answers <@ array['words', 'time', 'gifts', 'acts', 'touch']::text[]
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.love_language_results is 'Último resultado del test de lenguajes del amor de cada persona (lenguaje elegido en cada pregunta). Se escribe con submit_love_language_test().';

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  event_id uuid unique references public.events (id) on delete set null,
  start_date date not null,
  end_date date not null,
  place text
    constraint visits_place_length check (place is null or char_length(btrim(place)) between 1 and 80),
  note text
    constraint visits_note_length check (note is null or char_length(note) between 1 and 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visits_range check (end_date >= start_date and end_date - start_date <= 365)
);
comment on table public.visits is 'Veces que la pareja se vio en persona (rango de fechas). Se escribe con save_visit()/delete_visit().';

create index if not exists visits_couple_start_idx on public.visits (couple_id, start_date desc);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table public.love_language_results enable row level security;
alter table public.visits enable row level security;

-- ¿auth.uid() ya hizo el test? (helper de RLS: evita que la política se lea a sí misma)
create or replace function public.love_language_done()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.love_language_results r where r.user_id = auth.uid());
$$;
comment on function public.love_language_done() is 'true si auth.uid() ya hizo el test de lenguajes del amor. Helper de RLS.';

-- Mi resultado, o el de mi pareja actual cuando yo también hice el test.
drop policy if exists love_language_results_select on public.love_language_results;
create policy love_language_results_select on public.love_language_results
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      public.is_current_member((select public.my_couple_id()), user_id)
      and (select public.love_language_done())
    )
  );

drop policy if exists visits_select on public.visits;
create policy visits_select on public.visits
  for select to authenticated
  using (couple_id = (select public.my_couple_id()));

revoke all on public.love_language_results, public.visits from anon, authenticated;
grant select on public.love_language_results, public.visits to authenticated;
grant all on public.love_language_results, public.visits to service_role;

-- -----------------------------------------------------------------------------
-- RPC: lenguajes del amor
-- -----------------------------------------------------------------------------

-- { words: n, time: n, gifts: n, acts: n, touch: n } de una lista de respuestas.
create or replace function private.love_language_scores(p_answers text[])
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_object_agg(k.key, (select count(*) from unnest(p_answers) a where a = k.key))
  from unnest(array['words', 'time', 'gifts', 'acts', 'touch']) as k(key);
$$;

-- Formato del resultado de una persona (o null).
create or replace function private.love_language_json(p_result public.love_language_results)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case when p_result.user_id is null then null else jsonb_build_object(
    'user_id', p_result.user_id,
    'quiz_version', p_result.quiz_version,
    'answers', to_jsonb(p_result.answers),
    'scores', private.love_language_scores(p_result.answers),
    'created_at', p_result.created_at,
    'updated_at', p_result.updated_at
  ) end;
$$;

-- Guarda (o reemplaza) el resultado de auth.uid(). Avisa a la pareja solo la primera vez.
create or replace function public.submit_love_language_test(
  p_answers text[],
  p_quiz_version integer default 1
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := private.require_couple();
  v_first boolean;
  v_result public.love_language_results;
  v_partner uuid;
begin
  if p_answers is null or p_quiz_version is null or p_quiz_version not between 1 and 100 then
    raise exception 'invalid_love_language' using errcode = 'P0001';
  end if;
  v_first := not exists (select 1 from public.love_language_results r where r.user_id = v_uid);

  begin
    insert into public.love_language_results as r (user_id, quiz_version, answers)
    values (v_uid, p_quiz_version, p_answers)
    on conflict (user_id) do update
      set quiz_version = excluded.quiz_version,
          answers = excluded.answers,
          updated_at = now()
    returning * into v_result;
  exception when check_violation or null_value_not_allowed then
    raise exception 'invalid_love_language' using errcode = 'P0001';
  end;

  if v_first then
    v_partner := private.partner_of(v_couple_id, v_uid);
    perform private.send_notification('love_language', v_couple_id, v_uid, jsonb_build_object(
      'event', 'done',
      'recipient_done', v_partner is not null
        and exists (select 1 from public.love_language_results r where r.user_id = v_partner)
    ));
  end if;

  return private.love_language_json(v_result);
end;
$$;
comment on function public.submit_love_language_test(text[], integer) is 'Guarda el resultado del test de lenguajes del amor de auth.uid().';

-- Mi resultado y, si yo ya lo hice, el de mi pareja; `partner_done` siempre.
create or replace function public.get_love_languages()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := private.require_couple();
  v_partner uuid := private.partner_of(v_couple_id, v_uid);
  v_mine public.love_language_results;
  v_theirs public.love_language_results;
begin
  select * into v_mine from public.love_language_results r where r.user_id = v_uid;
  if v_partner is not null then
    select * into v_theirs from public.love_language_results r where r.user_id = v_partner;
  end if;
  return jsonb_build_object(
    'mine', private.love_language_json(v_mine),
    'partner_done', v_theirs.user_id is not null,
    'partner', case when v_mine.user_id is not null then private.love_language_json(v_theirs) end
  );
end;
$$;
comment on function public.get_love_languages() is 'Resultados del test de lenguajes del amor (el de la pareja solo si ya hiciste el tuyo).';

-- -----------------------------------------------------------------------------
-- RPC: visitas
-- -----------------------------------------------------------------------------

-- Crea (p_id null) o edita una visita. Valida rango, que no empiece en el futuro,
-- que no se traslape con otra y que la cuenta regresiva ligada sea una visita de la pareja.
create or replace function public.save_visit(
  p_start_date date,
  p_end_date date,
  p_place text default null,
  p_note text default null,
  p_event_id uuid default null,
  p_id uuid default null
)
returns public.visits
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := private.require_couple();
  v_visit public.visits;
  v_existing public.visits;
begin
  if p_start_date is null or p_end_date is null
    or p_start_date < date '1900-01-01' or p_end_date > date '2200-12-31'
    or p_start_date > public.couple_today(v_couple_id)
  then
    raise exception 'invalid_visit' using errcode = 'P0001';
  end if;

  if p_id is not null then
    select * into v_existing from public.visits v where v.id = p_id and v.couple_id = v_couple_id
    for update;
    if v_existing.id is null then
      raise exception 'visit_not_found' using errcode = 'P0001';
    end if;
  end if;

  if p_event_id is not null and not exists (
    select 1 from public.events e
    where e.id = p_event_id and e.couple_id = v_couple_id and e.kind = 'visit'
  ) then
    raise exception 'invalid_visit' using errcode = 'P0001';
  end if;

  -- Serializa las altas de la pareja para que dos visitas simultáneas no se traslapen.
  perform 1 from public.couples c where c.id = v_couple_id for update;
  if exists (
    select 1 from public.visits v
    where v.couple_id = v_couple_id
      and v.id is distinct from p_id
      and v.start_date <= p_end_date and v.end_date >= p_start_date
  ) then
    raise exception 'visit_overlap' using errcode = 'P0001';
  end if;

  begin
    if p_id is null then
      insert into public.visits (couple_id, created_by, event_id, start_date, end_date, place, note)
      values (
        v_couple_id, v_uid, p_event_id, p_start_date, p_end_date,
        nullif(btrim(coalesce(p_place, '')), ''), nullif(btrim(coalesce(p_note, '')), '')
      )
      returning * into v_visit;
    else
      update public.visits v
      set event_id = p_event_id,
          start_date = p_start_date,
          end_date = p_end_date,
          place = nullif(btrim(coalesce(p_place, '')), ''),
          note = nullif(btrim(coalesce(p_note, '')), ''),
          updated_at = now()
      where v.id = p_id
      returning * into v_visit;
    end if;
  exception
    when check_violation then
      raise exception 'invalid_visit' using errcode = 'P0001';
    when unique_violation then
      -- Esa cuenta regresiva ya está ligada a otra visita.
      raise exception 'invalid_visit' using errcode = 'P0001';
  end;

  if p_id is null then
    perform private.send_notification('visit', v_couple_id, v_uid, to_jsonb(v_visit));
  end if;
  return v_visit;
end;
$$;
comment on function public.save_visit(date, date, text, text, uuid, uuid) is 'Crea o edita una visita (vez que se vieron) de la pareja de auth.uid().';

create or replace function public.delete_visit(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
begin
  delete from public.visits v where v.id = p_id and v.couple_id = v_couple_id;
  if not found then
    raise exception 'visit_not_found' using errcode = 'P0001';
  end if;
end;
$$;
comment on function public.delete_visit(uuid) is 'Borra una visita de la pareja de auth.uid().';

-- -----------------------------------------------------------------------------
-- RPC: estadísticas
-- -----------------------------------------------------------------------------

-- Agregados de la pareja de auth.uid() (solo cuentas; nunca el contenido de tu pareja).
create or replace function public.get_relationship_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := private.require_couple();
  v_partner uuid := private.partner_of(v_couple_id, v_uid);
  v_streak jsonb := public.get_streak();
  v_questions jsonb;
  v_games jsonb;
  v_by_game jsonb;
  v_drawings jsonb;
  v_memories jsonb;
  v_visits jsonb;
begin
  select jsonb_build_object(
    'answered_me', (select count(*) from public.answers a
      where a.couple_id = v_couple_id and a.user_id = v_uid),
    'answered_partner', (select count(*) from public.answers a
      where a.couple_id = v_couple_id and a.user_id = v_partner),
    'answered_both', (select count(*) from (
      select a.question_id from public.answers a
      where a.couple_id = v_couple_id and a.user_id in (v_uid, v_partner)
      group by a.question_id having count(distinct a.user_id) = 2) s),
    'daily_complete', (select count(*) from public.couple_complete_days(v_couple_id)),
    'comments', (select count(*) from public.answer_comments c where c.couple_id = v_couple_id)
  ) into v_questions;

  with finished as (
    select r.game, (private.game_round_match(r, v_uid) ->> 'pct')::integer as pct
    from public.game_rounds r
    where r.couple_id = v_couple_id and r.status = 'finished'
  )
  select
    jsonb_build_object(
      'rounds', (select count(*) from finished),
      'avg_pct', (select round(avg(f.pct))::integer from finished f),
      'best_pct', (select max(f.pct) from finished f)
    ),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'game', g.game, 'rounds', g.rounds, 'avg_pct', g.avg_pct
      ) order by g.game)
      from (
        select f.game, count(*)::integer as rounds, round(avg(f.pct))::integer as avg_pct
        from finished f group by f.game
      ) g
    ), '[]'::jsonb)
  into v_games, v_by_game;
  v_games := v_games || jsonb_build_object('by_game', v_by_game);

  select jsonb_build_object(
    'solved', count(*) filter (where c.status = 'solved'),
    'finished', count(*) filter (where c.status in ('solved', 'gave_up'))
  ) into v_drawings
  from public.drawing_challenges c where c.couple_id = v_couple_id;

  select jsonb_build_object(
    'total', (select count(*) from public.memories m where m.couple_id = v_couple_id),
    'photos', (select count(*) from public.memory_photos p where p.couple_id = v_couple_id),
    'by_month', coalesce((
      select jsonb_agg(jsonb_build_object('month', s.month, 'count', s.n) order by s.month)
      from (
        select to_char(m.happened_on, 'YYYY-MM') as month, count(*)::integer as n
        from public.memories m where m.couple_id = v_couple_id
        group by 1
      ) s
    ), '[]'::jsonb)
  ) into v_memories;

  select jsonb_build_object(
    'count', count(*),
    'days', coalesce(sum(v.end_date - v.start_date + 1), 0)
  ) into v_visits
  from public.visits v where v.couple_id = v_couple_id;

  return jsonb_build_object(
    'since', public.couple_start_day(v_couple_id),
    'today', public.couple_today(v_couple_id),
    'questions', v_questions,
    'streak', jsonb_build_object('current', v_streak -> 'current', 'best', v_streak -> 'best'),
    'games', v_games,
    'drawings', v_drawings,
    'memories', v_memories,
    'visits', v_visits,
    'stories', (select count(*) from public.stories s where s.couple_id = v_couple_id),
    'moods', (select count(*) from public.moods m where m.couple_id = v_couple_id)
  );
end;
$$;
comment on function public.get_relationship_stats() is 'Estadísticas de la relación de la pareja de auth.uid() (solo agregados).';

-- -----------------------------------------------------------------------------
-- Push: private.notification_event con love_language y visit
-- -----------------------------------------------------------------------------

create or replace function private.notification_event(
  p_kind text,
  p_couple_id uuid,
  p_actor uuid,
  p_row jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_recipient uuid;
  v_tokens jsonb;
  v_prefs public.notification_prefs;
  v_data jsonb := '{}'::jsonb;
  v_question_id uuid;
  v_day date;
  v_answered boolean;
begin
  if p_kind = 'test' then
    v_recipient := p_actor;
  else
    select cm.user_id into v_recipient
    from public.couple_members cm
    where cm.couple_id = p_couple_id and cm.user_id <> p_actor
    limit 1;
    -- El actor debe seguir en la pareja (filas viejas o de otra pareja no avisan).
    if v_recipient is null or not exists (
      select 1 from public.couple_members cm where cm.couple_id = p_couple_id and cm.user_id = p_actor
    ) then
      return null;
    end if;
  end if;

  select coalesce(jsonb_agg(pt.token order by pt.updated_at desc), '[]'::jsonb) into v_tokens
  from public.push_tokens pt where pt.user_id = v_recipient;
  if jsonb_array_length(v_tokens) = 0 then
    return null;
  end if;

  select * into v_prefs from public.notification_prefs np where np.user_id = v_recipient;

  if p_kind in ('answer', 'comment') then
    v_question_id := (p_row ->> 'question_id')::uuid;
    select max(dq.day) into v_day
    from public.daily_questions dq
    where dq.couple_id = p_couple_id and dq.question_id = v_question_id;
    v_answered := exists (
      select 1 from public.answers a
      where a.couple_id = p_couple_id and a.question_id = v_question_id and a.user_id = v_recipient
    );
    v_data := jsonb_build_object(
      'question_id', v_question_id,
      'day', v_day,
      'question_text', (select q.text from public.questions q where q.id = v_question_id),
      'recipient_answered', v_answered
    );
    if p_kind = 'comment' then
      v_data := v_data || jsonb_build_object(
        'comment_id', p_row ->> 'id',
        'body', case when v_answered then p_row ->> 'body' end
      );
    end if;
  elsif p_kind = 'mood' then
    v_data := jsonb_build_object('mood_id', p_row ->> 'id', 'emoji', p_row ->> 'emoji', 'note', p_row ->> 'note');
  elsif p_kind = 'nudge' then
    v_data := jsonb_build_object(
      'nudge_id', p_row ->> 'id',
      'nudge_kind', p_row ->> 'kind',
      'day', public.couple_today(p_couple_id)
    );
  elsif p_kind = 'story' then
    v_data := jsonb_build_object(
      'story_id', p_row ->> 'id',
      'story_kind', p_row ->> 'kind',
      'text', case when p_row ->> 'kind' = 'text' then p_row ->> 'text' end
    );
  elsif p_kind = 'memory' then
    v_data := jsonb_build_object(
      'memory_id', p_row ->> 'id',
      'title', p_row ->> 'title',
      'happened_on', p_row ->> 'happened_on',
      'place_name', p_row ->> 'place_name'
    );
  elsif p_kind = 'game' then
    v_data := jsonb_build_object(
      'round_id', p_row ->> 'round_id',
      'game', p_row ->> 'game',
      'event', p_row ->> 'event',
      'match_pct', p_row -> 'match_pct'
    );
  elsif p_kind = 'drawing' then
    -- La palabra solo viaja cuando el reto ya terminó.
    v_data := jsonb_build_object(
      'drawing_id', p_row ->> 'drawing_id',
      'event', p_row ->> 'event',
      'word', case when p_row ->> 'event' in ('solved', 'gave_up') then p_row ->> 'word' end
    );
  elsif p_kind = 'story_reply' then
    v_data := jsonb_build_object(
      'story_id', p_row ->> 'story_id',
      'reply_id', p_row ->> 'id',
      'body', p_row ->> 'body',
      'story_author_id', (select s.user_id from public.stories s where s.id = (p_row ->> 'story_id')::uuid)
    );
  elsif p_kind = 'love_language' then
    -- Nunca viaja el resultado: solo que ya lo hizo y si quien recibe también.
    v_data := jsonb_build_object(
      'event', p_row ->> 'event',
      'recipient_done', coalesce((p_row ->> 'recipient_done')::boolean, false)
    );
  elsif p_kind = 'visit' then
    v_data := jsonb_build_object(
      'visit_id', p_row ->> 'id',
      'start_date', p_row ->> 'start_date',
      'end_date', p_row ->> 'end_date',
      'place', p_row ->> 'place'
    );
  elsif p_kind <> 'test' then
    return null;
  end if;

  return jsonb_build_object(
    'kind', p_kind,
    'couple_id', p_couple_id,
    'actor', jsonb_build_object('id', p_actor, 'name', private.person_name(p_actor)),
    'recipient', jsonb_build_object('id', v_recipient, 'name', private.person_name(v_recipient)),
    'tokens', v_tokens,
    'prefs', jsonb_build_object(
      'answers', coalesce(v_prefs.answers, true),
      'comments', coalesce(v_prefs.comments, true),
      'moods', coalesce(v_prefs.moods, true),
      'nudges', coalesce(v_prefs.nudges, true),
      'stories', coalesce(v_prefs.stories, true),
      'memories', coalesce(v_prefs.memories, true),
      'games', coalesce(v_prefs.games, true)
    ),
    'data', v_data
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Permisos de funciones
-- -----------------------------------------------------------------------------

revoke all on function private.love_language_scores(text[]) from public, anon, authenticated;
revoke all on function private.love_language_json(public.love_language_results) from public, anon, authenticated;
revoke all on function private.notification_event(text, uuid, uuid, jsonb) from public, anon, authenticated;

revoke all on function public.love_language_done() from public, anon;
revoke all on function public.submit_love_language_test(text[], integer) from public, anon;
revoke all on function public.get_love_languages() from public, anon;
revoke all on function public.save_visit(date, date, text, text, uuid, uuid) from public, anon;
revoke all on function public.delete_visit(uuid) from public, anon;
revoke all on function public.get_relationship_stats() from public, anon;

grant execute on function public.love_language_done() to authenticated, service_role;
grant execute on function public.submit_love_language_test(text[], integer) to authenticated, service_role;
grant execute on function public.get_love_languages() to authenticated, service_role;
grant execute on function public.save_visit(date, date, text, text, uuid, uuid) to authenticated, service_role;
grant execute on function public.delete_visit(uuid) to authenticated, service_role;
grant execute on function public.get_relationship_stats() to authenticated, service_role;

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
  foreach t in array array['love_language_results', 'visits'] loop
    if not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
