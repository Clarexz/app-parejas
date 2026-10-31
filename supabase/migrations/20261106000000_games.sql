-- =============================================================================
-- 20261106000000_games.sql
-- Fase 9: juegos de pareja.
--   * Juegos de rondas (wyr, nhie, most_likely, agree): una ronda son hasta 10
--     ítems de public.questions (type = el juego, categoría `juegos`). Cada quien
--     contesta a su ritmo, una vez por ítem y sin editar. Al contestar los dos
--     todo la ronda pasa a `finished` y se revelan las respuestas y el % de
--     coincidencia (en most_likely coincide cuando las respuestas son DISTINTAS:
--     los dos señalan a la misma persona).
--   * Reto de dibujo: quien dibuja recibe una palabra secreta (drawing_words),
--     dibuja (strokes, mismo formato que las stories) y la otra persona adivina
--     (máx. 10 intentos). La palabra vive en drawing_secrets, sin ninguna
--     política para authenticated: quien adivina solo la obtiene cuando el reto
--     termina (get_drawing / get_game_overview la incluyen únicamente entonces).
--   * Toda escritura va por RPC security definer; las tablas solo se leen.
--     Realtime: game_rounds y drawing_challenges (game_answers toca
--     game_rounds.updated_at para avisar del progreso sin exponer respuestas).
--   * Push: kinds `game` y `drawing` (private.notification_event se redefine
--     completa; notification_prefs.games los apaga). Los juegos no cuentan para
--     la racha.
-- Errores (P0001, claves estables traducidas en src/lib/errors.ts):
--   not_authenticated, no_couple, no_partner, invalid_game, spicy_not_active,
--   no_questions, round_not_found, round_finished, invalid_choice,
--   item_not_in_round, drawing_not_found, not_drawer, not_guesser,
--   invalid_drawing_state, invalid_drawing, invalid_guess, no_rerolls, no_words.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Columnas nuevas
-- -----------------------------------------------------------------------------

alter table public.question_categories
  add column if not exists kind text not null default 'questions';
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'question_categories_kind' and conrelid = 'public.question_categories'::regclass
  ) then
    alter table public.question_categories
      add constraint question_categories_kind check (kind in ('questions', 'games'));
  end if;
end;
$$;
comment on column public.question_categories.kind is 'questions = banco de preguntas; games = ítems de juegos (categoría `juegos`, la crea el seed).';

alter table public.notification_prefs add column if not exists games boolean not null default true;

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

create table if not exists public.drawing_words (
  slug text primary key
    constraint drawing_words_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  word text not null constraint drawing_words_word_length check (char_length(word) between 2 and 40),
  alternates text[] not null default '{}'
    constraint drawing_words_alternates_count check (cardinality(alternates) <= 6),
  intensity text not null constraint drawing_words_intensity check (intensity in ('ligera', 'profunda')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.drawing_words is 'Palabras secretas del reto de dibujo (seed desde content/games/drawing.json). Sin acceso desde la app: solo vía RPC.';

create table if not exists public.game_rounds (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  game text not null constraint game_rounds_game check (game in ('wyr', 'nhie', 'most_likely', 'agree')),
  created_by uuid not null references auth.users (id) on delete cascade,
  spicy boolean not null default false,
  item_ids uuid[] not null
    constraint game_rounds_item_count check (cardinality(item_ids) between 1 and 10),
  status text not null default 'playing' constraint game_rounds_status check (status in ('playing', 'finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint game_rounds_finished_at check ((status = 'finished') = (finished_at is not null))
);
comment on table public.game_rounds is 'Rondas de juegos de la pareja. Se escribe solo con start_game_round / answer_game_item / delete_game_round.';

create unique index if not exists game_rounds_one_playing_idx
  on public.game_rounds (couple_id, game) where status = 'playing';
create index if not exists game_rounds_couple_idx on public.game_rounds (couple_id, created_at desc);

create table if not exists public.game_answers (
  round_id uuid not null references public.game_rounds (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  question_id uuid not null references public.questions (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  choice smallint not null constraint game_answers_choice check (choice between 0 and 1),
  created_at timestamptz not null default now(),
  primary key (round_id, question_id, user_id)
);
comment on table public.game_answers is 'Respuestas de las rondas. La de tu pareja solo es visible cuando la ronda termina.';

create index if not exists game_answers_user_idx on public.game_answers (user_id);

create table if not exists public.drawing_challenges (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  drawer_id uuid not null references auth.users (id) on delete cascade,
  guesser_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'drawing'
    constraint drawing_challenges_status check (status in ('drawing', 'guessing', 'solved', 'gave_up')),
  strokes jsonb
    constraint drawing_challenges_strokes check (
      strokes is null
      or (
        jsonb_typeof(strokes) = 'array'
        and jsonb_array_length(strokes) between 1 and 300
        and octet_length(strokes::text) <= 262144
      )
    ),
  rerolls smallint not null default 0 constraint drawing_challenges_rerolls check (rerolls between 0 and 3),
  guesses jsonb not null default '[]'::jsonb
    constraint drawing_challenges_guesses check (jsonb_typeof(guesses) = 'array' and jsonb_array_length(guesses) <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  drawn_at timestamptz,
  finished_at timestamptz,
  constraint drawing_challenges_distinct_people check (drawer_id <> guesser_id),
  constraint drawing_challenges_strokes_state check ((status = 'drawing') = (strokes is null))
);
comment on table public.drawing_challenges is 'Retos de dibujo. La palabra NO está aquí (ver drawing_secrets). Se escribe solo por RPC.';

create index if not exists drawing_challenges_couple_idx on public.drawing_challenges (couple_id, created_at desc);

create table if not exists public.drawing_secrets (
  challenge_id uuid primary key references public.drawing_challenges (id) on delete cascade,
  word_slug text not null references public.drawing_words (slug)
);
comment on table public.drawing_secrets is 'Palabra de cada reto de dibujo. Sin políticas para authenticated: nunca se lee desde la app.';

create index if not exists drawing_secrets_word_idx on public.drawing_secrets (word_slug);

-- Tocar la ronda cuando alguien contesta, para que Realtime avise del progreso.
create or replace function private.touch_game_round()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.game_rounds r set updated_at = now() where r.id = new.round_id;
  return null;
end;
$$;

drop trigger if exists game_answers_touch_round on public.game_answers;
create trigger game_answers_touch_round
  after insert on public.game_answers
  for each row execute function private.touch_game_round();

-- -----------------------------------------------------------------------------
-- RLS: solo lectura; la escritura es siempre por RPC
-- -----------------------------------------------------------------------------

alter table public.drawing_words enable row level security;
alter table public.game_rounds enable row level security;
alter table public.game_answers enable row level security;
alter table public.drawing_challenges enable row level security;
alter table public.drawing_secrets enable row level security;

drop policy if exists game_rounds_select_member on public.game_rounds;
create policy game_rounds_select_member on public.game_rounds
  for select to authenticated
  using (couple_id = (select public.my_couple_id()));

-- Mi respuesta, o la de mi pareja (miembro actual) cuando la ronda ya terminó.
drop policy if exists game_answers_select_own_or_revealed on public.game_answers;
create policy game_answers_select_own_or_revealed on public.game_answers
  for select to authenticated
  using (
    couple_id = (select public.my_couple_id())
    and (
      user_id = (select auth.uid())
      or (
        public.is_current_member(couple_id, user_id)
        and exists (
          select 1 from public.game_rounds r
          where r.id = game_answers.round_id and r.status = 'finished'
        )
      )
    )
  );

drop policy if exists drawing_challenges_select_member on public.drawing_challenges;
create policy drawing_challenges_select_member on public.drawing_challenges
  for select to authenticated
  using (couple_id = (select public.my_couple_id()));

revoke all on public.drawing_words from anon, authenticated;
revoke all on public.drawing_secrets from anon, authenticated;
revoke all on public.game_rounds from anon, authenticated;
revoke all on public.game_answers from anon, authenticated;
revoke all on public.drawing_challenges from anon, authenticated;
grant select on public.game_rounds to authenticated;
grant select on public.game_answers to authenticated;
grant select on public.drawing_challenges to authenticated;
grant all on public.drawing_words to service_role;
grant all on public.drawing_secrets to service_role;
grant all on public.game_rounds to service_role;
grant all on public.game_answers to service_role;
grant all on public.drawing_challenges to service_role;

-- -----------------------------------------------------------------------------
-- Helpers privados
-- -----------------------------------------------------------------------------

-- Pareja de auth.uid() y su pareja (la otra persona). Errores: not_authenticated,
-- no_couple, no_partner.
create or replace function private.require_pair(out o_couple_id uuid, out o_partner_id uuid)
returns record
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  o_couple_id := private.require_couple();
  select cm.user_id into o_partner_id
  from public.couple_members cm
  where cm.couple_id = o_couple_id and cm.user_id <> auth.uid()
  limit 1;
  if o_partner_id is null then
    raise exception 'no_partner' using errcode = 'P0001';
  end if;
end;
$$;

-- Otra persona de la pareja (null si no hay).
create or replace function private.partner_of(p_couple_id uuid, p_uid uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cm.user_id from public.couple_members cm
  where cm.couple_id = p_couple_id and cm.user_id <> p_uid
  limit 1;
$$;

-- { mis respuestas, las de mi pareja } de una ronda.
create or replace function private.game_counts(p_round public.game_rounds, p_uid uuid)
returns integer[]
language sql
stable
security definer
set search_path = ''
as $$
  select array[
    (select count(*)::integer from public.game_answers a
      where a.round_id = p_round.id and a.user_id = p_uid),
    (select count(*)::integer from public.game_answers a
      where a.round_id = p_round.id and a.user_id = private.partner_of(p_round.couple_id, p_uid))
  ];
$$;

-- { matches, total, pct } de una ronda según las respuestas de p_uid y su pareja actual.
create or replace function private.game_round_match(p_round public.game_rounds, p_uid uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_partner uuid := private.partner_of(p_round.couple_id, p_uid);
  v_total integer := greatest(cardinality(p_round.item_ids), 1);
  v_matches integer;
begin
  select count(*)::integer into v_matches
  from public.game_answers m
  join public.game_answers p
    on p.round_id = m.round_id and p.question_id = m.question_id and p.user_id = v_partner
  where m.round_id = p_round.id and m.user_id = p_uid
    and case when p_round.game = 'most_likely' then m.choice <> p.choice else m.choice = p.choice end;
  return jsonb_build_object(
    'matches', v_matches,
    'total', v_total,
    'pct', round(100.0 * v_matches / v_total)::integer
  );
end;
$$;

-- Formato R de la ronda para auth.uid() (la pareja solo se revela si terminó).
create or replace function private.game_round_json(p_round public.game_rounds)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_partner uuid := private.partner_of(p_round.couple_id, auth.uid());
  v_counts integer[] := private.game_counts(p_round, auth.uid());
  v_finished boolean := p_round.status = 'finished';
begin
  return jsonb_build_object(
    'id', p_round.id,
    'game', p_round.game,
    'spicy', p_round.spicy,
    'status', p_round.status,
    'created_by', p_round.created_by,
    'created_at', p_round.created_at,
    'finished_at', p_round.finished_at,
    'total', cardinality(p_round.item_ids),
    'my_count', v_counts[1],
    'partner_count', v_counts[2],
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'position', i.ord - 1,
          'text', q.text,
          'options', case when q.type = 'wyr' then q.options else null end,
          'intensity', q.intensity
        ) order by i.ord)
      from unnest(p_round.item_ids) with ordinality as i(qid, ord)
      join public.questions q on q.id = i.qid
    ), '[]'::jsonb),
    'mine', coalesce((
      select jsonb_object_agg(a.question_id::text, a.choice)
      from public.game_answers a where a.round_id = p_round.id and a.user_id = v_uid
    ), '{}'::jsonb),
    'partner', case when v_finished then coalesce((
      select jsonb_object_agg(a.question_id::text, a.choice)
      from public.game_answers a where a.round_id = p_round.id and a.user_id = v_partner
    ), '{}'::jsonb) else null end,
    'match', case when v_finished then private.game_round_match(p_round, v_uid) else null end
  );
end;
$$;

-- Texto sin acentos, sin signos y con espacios simples (para comparar intentos).
create or replace function private.guess_key(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(public.fold_text(btrim(coalesce(p_text, ''))), '[^a-z0-9]+', ' ', 'g'));
$$;

-- Igual, y sin artículo inicial (el/la/los/las/un/una).
create or replace function private.guess_key_bare(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(private.guess_key(p_text), '^(el|la|los|las|un|una) (.+)$', '\2');
$$;

-- "_ _ _" por letra y tres espacios entre palabras.
create or replace function private.drawing_hint(p_word text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(string_agg(
    array_to_string(array(select '_' from generate_series(1, char_length(w.word))), ' '),
    '   ' order by w.ord), '')
  from regexp_split_to_table(btrim(coalesce(p_word, '')), '\s+') with ordinality as w(word, ord)
  where w.word <> '';
$$;

-- D-resumen del reto para p_uid. La palabra solo la ve quien dibuja o cuando terminó.
create or replace function private.drawing_summary_json(p_challenge public.drawing_challenges, p_uid uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_challenge.id,
    'drawer_id', p_challenge.drawer_id,
    'guesser_id', p_challenge.guesser_id,
    'status', p_challenge.status,
    'created_at', p_challenge.created_at,
    'drawn_at', p_challenge.drawn_at,
    'finished_at', p_challenge.finished_at,
    'guess_count', jsonb_array_length(p_challenge.guesses),
    'word', case
      when p_uid = p_challenge.drawer_id or p_challenge.status in ('solved', 'gave_up')
        then (select w.word from public.drawing_secrets s
              join public.drawing_words w on w.slug = s.word_slug
              where s.challenge_id = p_challenge.id)
      else null
    end
  );
$$;

-- Formato D completo del reto para auth.uid().
create or replace function private.drawing_json(p_challenge public.drawing_challenges)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.drawing_summary_json(p_challenge, auth.uid()) || jsonb_build_object(
    'strokes', p_challenge.strokes,
    'guesses', p_challenge.guesses,
    'hint', private.drawing_hint(w.word),
    'word_length', char_length(replace(w.word, ' ', '')),
    'rerolls_left', 3 - p_challenge.rerolls
  )
  from public.drawing_secrets s
  join public.drawing_words w on w.slug = s.word_slug
  where s.challenge_id = p_challenge.id;
$$;

-- -----------------------------------------------------------------------------
-- RPC: rondas
-- -----------------------------------------------------------------------------

create or replace function public.start_game_round(p_game text, p_spicy boolean default false)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_pair record;
  v_uid uuid := auth.uid();
  v_spicy boolean := coalesce(p_spicy, false);
  v_round public.game_rounds;
  v_ids uuid[];
begin
  select * into v_pair from private.require_pair();
  if p_game is null or p_game not in ('wyr', 'nhie', 'most_likely', 'agree') then
    raise exception 'invalid_game' using errcode = 'P0001';
  end if;
  if v_spicy and not public.couple_spicy_active(v_pair.o_couple_id) then
    raise exception 'spicy_not_active' using errcode = 'P0001';
  end if;

  -- Serializa por pareja: los dos celulares pueden pedir la ronda a la vez.
  perform 1 from public.couples c where c.id = v_pair.o_couple_id for update;

  select * into v_round from public.game_rounds r
  where r.couple_id = v_pair.o_couple_id and r.game = p_game and r.status = 'playing';
  if found then
    return private.game_round_json(v_round);
  end if;

  -- Menos usados por la pareja primero (al azar entre empates); picantes primero
  -- si la ronda es picante; sin picantes en una ronda normal.
  select coalesce(array_agg(s.id order by random()), '{}') into v_ids
  from (
    select q.id
    from public.questions q
    left join (
      select u.qid, count(*) as n
      from public.game_rounds r, unnest(r.item_ids) as u(qid)
      where r.couple_id = v_pair.o_couple_id and r.game = p_game
      group by u.qid
    ) used on used.qid = q.id
    where q.is_active and q.type = p_game
      and (v_spicy or q.intensity <> 'picante')
    order by (v_spicy and q.intensity = 'picante') desc, coalesce(used.n, 0), random()
    limit 10
  ) s;

  if cardinality(v_ids) = 0 then
    raise exception 'no_questions' using errcode = 'P0001';
  end if;

  insert into public.game_rounds (couple_id, game, created_by, spicy, item_ids)
  values (v_pair.o_couple_id, p_game, v_uid, v_spicy, v_ids)
  returning * into v_round;

  perform private.send_notification(
    'game', v_pair.o_couple_id, v_uid,
    jsonb_build_object('round_id', v_round.id, 'game', v_round.game, 'event', 'started')
  );

  return private.game_round_json(v_round);
end;
$$;
comment on function public.start_game_round(text, boolean) is 'Inicia (o devuelve la abierta de) una ronda del juego para la pareja de auth.uid().';

create or replace function public.get_game_round(p_round_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
  v_round public.game_rounds;
begin
  select * into v_round from public.game_rounds r where r.id = p_round_id and r.couple_id = v_couple_id;
  if not found then
    raise exception 'round_not_found' using errcode = 'P0001';
  end if;
  return private.game_round_json(v_round);
end;
$$;
comment on function public.get_game_round(uuid) is 'Ronda de mi pareja con mis respuestas (y las de mi pareja si terminó).';

create or replace function public.answer_game_item(p_round_id uuid, p_question_id uuid, p_choice integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
  v_uid uuid := auth.uid();
  v_round public.game_rounds;
  v_counts integer[];
  v_pct integer;
begin
  select * into v_round from public.game_rounds r
  where r.id = p_round_id and r.couple_id = v_couple_id
  for update;
  if not found then
    raise exception 'round_not_found' using errcode = 'P0001';
  end if;
  if p_choice is null or p_choice not in (0, 1) then
    raise exception 'invalid_choice' using errcode = 'P0001';
  end if;
  if p_question_id is null or not (p_question_id = any (v_round.item_ids)) then
    raise exception 'item_not_in_round' using errcode = 'P0001';
  end if;

  -- Ya contestado: no se edita, no pasa nada.
  if exists (
    select 1 from public.game_answers a
    where a.round_id = v_round.id and a.question_id = p_question_id and a.user_id = v_uid
  ) then
    return private.game_round_json(v_round);
  end if;
  if v_round.status = 'finished' then
    raise exception 'round_finished' using errcode = 'P0001';
  end if;

  insert into public.game_answers (round_id, couple_id, question_id, user_id, choice)
  values (v_round.id, v_couple_id, p_question_id, v_uid, p_choice::smallint);

  v_counts := private.game_counts(v_round, v_uid);
  if v_counts[1] >= cardinality(v_round.item_ids) and v_counts[2] >= cardinality(v_round.item_ids) then
    update public.game_rounds r
    set status = 'finished', finished_at = now(), updated_at = now()
    where r.id = v_round.id
    returning * into v_round;
    v_pct := (private.game_round_match(v_round, v_uid) ->> 'pct')::integer;
    perform private.send_notification(
      'game', v_couple_id, v_uid,
      jsonb_build_object('round_id', v_round.id, 'game', v_round.game, 'event', 'finished', 'match_pct', v_pct)
    );
  end if;

  return private.game_round_json(v_round);
end;
$$;
comment on function public.answer_game_item(uuid, uuid, integer) is 'Contesta un ítem de la ronda (una vez, sin editar). Al contestar los dos todo, la ronda termina.';

create or replace function public.delete_game_round(p_round_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
begin
  delete from public.game_rounds r where r.id = p_round_id and r.couple_id = v_couple_id;
  if not found then
    raise exception 'round_not_found' using errcode = 'P0001';
  end if;
end;
$$;
comment on function public.delete_game_round(uuid) is 'Abandona o borra una ronda de mi pareja (cualquiera de los dos).';

create or replace function public.get_game_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
  v_uid uuid := auth.uid();
  v_game text;
  v_games jsonb := '[]'::jsonb;
  v_open jsonb;
  v_round public.game_rounds;
  v_counts integer[];
  v_count integer;
  v_avg integer;
  v_last integer;
  v_recent jsonb;
  v_active jsonb;
  v_done jsonb;
begin
  foreach v_game in array array['wyr', 'nhie', 'most_likely', 'agree'] loop
    v_open := null;
    select * into v_round from public.game_rounds r
    where r.couple_id = v_couple_id and r.game = v_game and r.status = 'playing';
    if found then
      v_counts := private.game_counts(v_round, v_uid);
      v_open := jsonb_build_object(
        'id', v_round.id, 'spicy', v_round.spicy, 'created_by', v_round.created_by,
        'created_at', v_round.created_at, 'my_count', v_counts[1], 'partner_count', v_counts[2],
        'total', cardinality(v_round.item_ids)
      );
    end if;

    select count(*)::integer, round(avg(s.pct))::integer, (array_agg(s.pct order by s.finished_at desc))[1]
    into v_count, v_avg, v_last
    from (
      select r.finished_at, (private.game_round_match(r, v_uid) ->> 'pct')::integer as pct
      from public.game_rounds r
      where r.couple_id = v_couple_id and r.game = v_game and r.status = 'finished'
    ) s;

    v_games := v_games || jsonb_build_array(jsonb_build_object(
      'game', v_game, 'open_round', v_open, 'finished_count', v_count,
      'avg_pct', v_avg, 'last_pct', v_last
    ));
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id, 'game', s.game, 'spicy', s.spicy, 'finished_at', s.finished_at,
    'pct', (private.game_round_match(s, v_uid) ->> 'pct')::integer
  ) order by s.finished_at desc), '[]'::jsonb) into v_recent
  from (
    select * from public.game_rounds r
    where r.couple_id = v_couple_id and r.status = 'finished'
    order by r.finished_at desc limit 10
  ) s;

  -- Los retos que aún dibuja la otra persona no le sirven a quien va a adivinar.
  select coalesce(jsonb_agg(private.drawing_summary_json(c, v_uid) order by c.created_at desc), '[]'::jsonb)
  into v_active
  from public.drawing_challenges c
  where c.couple_id = v_couple_id and c.status in ('drawing', 'guessing')
    and not (c.status = 'drawing' and c.guesser_id = v_uid);

  select coalesce(jsonb_agg(private.drawing_summary_json(s, v_uid) order by s.finished_at desc), '[]'::jsonb)
  into v_done
  from (
    select * from public.drawing_challenges c
    where c.couple_id = v_couple_id and c.status in ('solved', 'gave_up')
    order by c.finished_at desc limit 10
  ) s;

  return jsonb_build_object(
    'games', v_games,
    'recent', v_recent,
    'drawings', jsonb_build_object('active', v_active, 'recent', v_done)
  );
end;
$$;
comment on function public.get_game_overview() is 'Resumen del hub de juegos: rondas abiertas, estadísticas, últimas rondas y retos de dibujo.';

-- -----------------------------------------------------------------------------
-- RPC: reto de dibujo
-- -----------------------------------------------------------------------------

-- Palabra activa menos usada por la pareja (al azar entre empates), distinta de p_exclude.
create or replace function private.pick_drawing_word(p_couple_id uuid, p_exclude text default null)
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select w.slug
  from public.drawing_words w
  left join (
    select s.word_slug, count(*) as n
    from public.drawing_secrets s
    join public.drawing_challenges c on c.id = s.challenge_id
    where c.couple_id = p_couple_id
    group by s.word_slug
  ) used on used.word_slug = w.slug
  where w.is_active and w.slug is distinct from p_exclude
  order by coalesce(used.n, 0), random()
  limit 1;
$$;

create or replace function public.start_drawing()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_pair record;
  v_uid uuid := auth.uid();
  v_challenge public.drawing_challenges;
  v_word text;
begin
  select * into v_pair from private.require_pair();

  perform 1 from public.couples c where c.id = v_pair.o_couple_id for update;

  select * into v_challenge from public.drawing_challenges c
  where c.couple_id = v_pair.o_couple_id and c.drawer_id = v_uid and c.status in ('drawing', 'guessing')
  order by c.created_at desc limit 1;
  if found then
    return private.drawing_json(v_challenge);
  end if;

  v_word := private.pick_drawing_word(v_pair.o_couple_id);
  if v_word is null then
    raise exception 'no_words' using errcode = 'P0001';
  end if;

  insert into public.drawing_challenges (couple_id, drawer_id, guesser_id)
  values (v_pair.o_couple_id, v_uid, v_pair.o_partner_id)
  returning * into v_challenge;
  insert into public.drawing_secrets (challenge_id, word_slug) values (v_challenge.id, v_word);

  return private.drawing_json(v_challenge);
end;
$$;
comment on function public.start_drawing() is 'Crea (o devuelve el abierto de) un reto de dibujo: auth.uid() dibuja y su pareja adivina.';

create or replace function public.reroll_drawing_word(p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
  v_challenge public.drawing_challenges;
  v_current text;
  v_word text;
begin
  select * into v_challenge from public.drawing_challenges c
  where c.id = p_id and c.couple_id = v_couple_id
  for update;
  if not found then
    raise exception 'drawing_not_found' using errcode = 'P0001';
  end if;
  if v_challenge.drawer_id <> auth.uid() then
    raise exception 'not_drawer' using errcode = 'P0001';
  end if;
  if v_challenge.status <> 'drawing' then
    raise exception 'invalid_drawing_state' using errcode = 'P0001';
  end if;
  if v_challenge.rerolls >= 3 then
    raise exception 'no_rerolls' using errcode = 'P0001';
  end if;

  select s.word_slug into v_current from public.drawing_secrets s where s.challenge_id = v_challenge.id;
  v_word := private.pick_drawing_word(v_couple_id, v_current);
  if v_word is null then
    raise exception 'no_words' using errcode = 'P0001';
  end if;

  update public.drawing_secrets s set word_slug = v_word where s.challenge_id = v_challenge.id;
  update public.drawing_challenges c
  set rerolls = c.rerolls + 1, updated_at = now()
  where c.id = v_challenge.id
  returning * into v_challenge;

  return private.drawing_json(v_challenge);
end;
$$;
comment on function public.reroll_drawing_word(uuid) is 'Cambia la palabra del reto (máx. 3 veces, solo quien dibuja y antes de enviar).';

create or replace function public.submit_drawing(p_id uuid, p_strokes jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
  v_uid uuid := auth.uid();
  v_challenge public.drawing_challenges;
begin
  select * into v_challenge from public.drawing_challenges c
  where c.id = p_id and c.couple_id = v_couple_id
  for update;
  if not found then
    raise exception 'drawing_not_found' using errcode = 'P0001';
  end if;
  if v_challenge.drawer_id <> v_uid then
    raise exception 'not_drawer' using errcode = 'P0001';
  end if;
  if v_challenge.status <> 'drawing' then
    raise exception 'invalid_drawing_state' using errcode = 'P0001';
  end if;
  if p_strokes is null
    or jsonb_typeof(p_strokes) <> 'array'
    or jsonb_array_length(p_strokes) not between 1 and 300
    or octet_length(p_strokes::text) > 262144
    or exists (select 1 from jsonb_array_elements(p_strokes) e where jsonb_typeof(e) <> 'object')
  then
    raise exception 'invalid_drawing' using errcode = 'P0001';
  end if;

  update public.drawing_challenges c
  set strokes = p_strokes, status = 'guessing', drawn_at = now(), updated_at = now()
  where c.id = v_challenge.id
  returning * into v_challenge;

  perform private.send_notification(
    'drawing', v_couple_id, v_uid,
    jsonb_build_object('drawing_id', v_challenge.id, 'event', 'ready')
  );

  return private.drawing_json(v_challenge);
end;
$$;
comment on function public.submit_drawing(uuid, jsonb) is 'Envía el dibujo: el reto pasa a guessing y avisa a quien adivina.';

create or replace function public.guess_drawing(p_id uuid, p_guess text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
  v_uid uuid := auth.uid();
  v_challenge public.drawing_challenges;
  v_guess text := btrim(coalesce(p_guess, ''));
  v_correct boolean;
  v_word text;
  v_alternates text[];
  v_event text;
begin
  select * into v_challenge from public.drawing_challenges c
  where c.id = p_id and c.couple_id = v_couple_id
  for update;
  if not found then
    raise exception 'drawing_not_found' using errcode = 'P0001';
  end if;
  if v_challenge.guesser_id <> v_uid then
    raise exception 'not_guesser' using errcode = 'P0001';
  end if;
  if v_challenge.status <> 'guessing' then
    raise exception 'invalid_drawing_state' using errcode = 'P0001';
  end if;
  if char_length(v_guess) not between 1 and 60 then
    raise exception 'invalid_guess' using errcode = 'P0001';
  end if;

  select w.word, w.alternates into v_word, v_alternates
  from public.drawing_secrets s
  join public.drawing_words w on w.slug = s.word_slug
  where s.challenge_id = v_challenge.id;

  v_correct := private.guess_key(v_guess) <> '' and exists (
    select 1
    from unnest(array[v_word] || v_alternates) as cand(t)
    where private.guess_key(cand.t) = private.guess_key(v_guess)
       or private.guess_key_bare(cand.t) = private.guess_key_bare(v_guess)
  );

  v_challenge.guesses := v_challenge.guesses || jsonb_build_array(
    jsonb_build_object('text', v_guess, 'at', now())
  );
  v_event := case
    when v_correct then 'solved'
    when jsonb_array_length(v_challenge.guesses) >= 10 then 'gave_up'
    else null
  end;

  update public.drawing_challenges c
  set guesses = v_challenge.guesses,
      status = coalesce(v_event, c.status),
      finished_at = case when v_event is not null then now() else c.finished_at end,
      updated_at = now()
  where c.id = v_challenge.id
  returning * into v_challenge;

  if v_event is not null then
    perform private.send_notification(
      'drawing', v_couple_id, v_uid,
      jsonb_build_object('drawing_id', v_challenge.id, 'event', v_event, 'word', v_word)
    );
  end if;

  return jsonb_build_object('correct', v_correct, 'drawing', private.drawing_json(v_challenge));
end;
$$;
comment on function public.guess_drawing(uuid, text) is 'Intenta adivinar (máx. 10). Correcto = solved; el décimo fallo = gave_up.';

create or replace function public.give_up_drawing(p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
  v_uid uuid := auth.uid();
  v_challenge public.drawing_challenges;
begin
  select * into v_challenge from public.drawing_challenges c
  where c.id = p_id and c.couple_id = v_couple_id
  for update;
  if not found then
    raise exception 'drawing_not_found' using errcode = 'P0001';
  end if;
  if v_challenge.guesser_id <> v_uid then
    raise exception 'not_guesser' using errcode = 'P0001';
  end if;
  if v_challenge.status <> 'guessing' then
    raise exception 'invalid_drawing_state' using errcode = 'P0001';
  end if;

  update public.drawing_challenges c
  set status = 'gave_up', finished_at = now(), updated_at = now()
  where c.id = v_challenge.id
  returning * into v_challenge;

  perform private.send_notification(
    'drawing', v_couple_id, v_uid,
    jsonb_build_object(
      'drawing_id', v_challenge.id, 'event', 'gave_up',
      'word', (select w.word from public.drawing_secrets s
               join public.drawing_words w on w.slug = s.word_slug
               where s.challenge_id = v_challenge.id)
    )
  );

  return private.drawing_json(v_challenge);
end;
$$;
comment on function public.give_up_drawing(uuid) is 'Quien adivina se rinde: el reto pasa a gave_up y se revela la palabra.';

create or replace function public.delete_drawing(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
  v_challenge public.drawing_challenges;
begin
  select * into v_challenge from public.drawing_challenges c
  where c.id = p_id and c.couple_id = v_couple_id
  for update;
  if not found then
    raise exception 'drawing_not_found' using errcode = 'P0001';
  end if;
  -- Quien dibuja siempre puede borrarlo; quien adivina, solo cuando ya terminó.
  if v_challenge.drawer_id <> auth.uid() and v_challenge.status not in ('solved', 'gave_up') then
    raise exception 'not_drawer' using errcode = 'P0001';
  end if;
  delete from public.drawing_challenges c where c.id = v_challenge.id;
end;
$$;
comment on function public.delete_drawing(uuid) is 'Borra un reto: quien dibuja siempre; la otra persona solo si ya terminó.';

create or replace function public.get_drawing(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
  v_challenge public.drawing_challenges;
begin
  select * into v_challenge from public.drawing_challenges c
  where c.id = p_id and c.couple_id = v_couple_id;
  if not found then
    raise exception 'drawing_not_found' using errcode = 'P0001';
  end if;
  return private.drawing_json(v_challenge);
end;
$$;
comment on function public.get_drawing(uuid) is 'Reto de dibujo con la palabra solo para quien dibuja o cuando ya terminó.';

-- -----------------------------------------------------------------------------
-- Push: private.notification_event completa (copia de la de memories + game/drawing)
-- Forma de p_row para los kinds nuevos:
--   game:    round_id, game, event ('started'|'finished'), match_pct
--   drawing: drawing_id, event ('ready'|'solved'|'gave_up'), word (solo solved/gave_up)
-- prefs: {answers, comments, moods, nudges, stories, memories, games}
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

revoke all on function private.touch_game_round() from public, anon, authenticated;
revoke all on function private.require_pair() from public, anon, authenticated;
revoke all on function private.partner_of(uuid, uuid) from public, anon, authenticated;
revoke all on function private.game_counts(public.game_rounds, uuid) from public, anon, authenticated;
revoke all on function private.game_round_match(public.game_rounds, uuid) from public, anon, authenticated;
revoke all on function private.game_round_json(public.game_rounds) from public, anon, authenticated;
revoke all on function private.guess_key(text) from public, anon, authenticated;
revoke all on function private.guess_key_bare(text) from public, anon, authenticated;
revoke all on function private.drawing_hint(text) from public, anon, authenticated;
revoke all on function private.drawing_summary_json(public.drawing_challenges, uuid) from public, anon, authenticated;
revoke all on function private.drawing_json(public.drawing_challenges) from public, anon, authenticated;
revoke all on function private.pick_drawing_word(uuid, text) from public, anon, authenticated;
revoke all on function private.notification_event(text, uuid, uuid, jsonb) from public, anon, authenticated;

revoke all on function public.start_game_round(text, boolean) from public, anon;
revoke all on function public.get_game_round(uuid) from public, anon;
revoke all on function public.answer_game_item(uuid, uuid, integer) from public, anon;
revoke all on function public.delete_game_round(uuid) from public, anon;
revoke all on function public.get_game_overview() from public, anon;
revoke all on function public.start_drawing() from public, anon;
revoke all on function public.reroll_drawing_word(uuid) from public, anon;
revoke all on function public.submit_drawing(uuid, jsonb) from public, anon;
revoke all on function public.guess_drawing(uuid, text) from public, anon;
revoke all on function public.give_up_drawing(uuid) from public, anon;
revoke all on function public.delete_drawing(uuid) from public, anon;
revoke all on function public.get_drawing(uuid) from public, anon;

grant execute on function public.start_game_round(text, boolean) to authenticated, service_role;
grant execute on function public.get_game_round(uuid) to authenticated, service_role;
grant execute on function public.answer_game_item(uuid, uuid, integer) to authenticated, service_role;
grant execute on function public.delete_game_round(uuid) to authenticated, service_role;
grant execute on function public.get_game_overview() to authenticated, service_role;
grant execute on function public.start_drawing() to authenticated, service_role;
grant execute on function public.reroll_drawing_word(uuid) to authenticated, service_role;
grant execute on function public.submit_drawing(uuid, jsonb) to authenticated, service_role;
grant execute on function public.guess_drawing(uuid, text) to authenticated, service_role;
grant execute on function public.give_up_drawing(uuid) to authenticated, service_role;
grant execute on function public.delete_drawing(uuid) to authenticated, service_role;
grant execute on function public.get_drawing(uuid) to authenticated, service_role;

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
  foreach t in array array['game_rounds', 'drawing_challenges'] loop
    if not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
