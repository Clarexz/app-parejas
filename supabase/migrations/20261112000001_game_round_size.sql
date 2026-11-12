-- =============================================================================
-- 20261112000001_game_round_size.sql
-- Fase 10: rondas de juegos de 10, 15 o 20 ítems (antes fijo en 10).
--   * game_rounds_item_count: hasta 20 ítems por ronda.
--   * start_game_round(p_game, p_spicy, p_size default 10): p_size en (10, 15, 20).
--     La versión de 2 argumentos se elimina. Si ya hay una ronda abierta del juego se
--     devuelve esa, sin importar el tamaño pedido. Con un banco chico se usan los
--     ítems que haya (al menos 1).
-- Errores nuevos (P0001): invalid_round_size.
-- Nada más asume 10: game_round_json, answer_game_item y los avisos usan
-- cardinality(item_ids) o no mencionan el tamaño.
-- =============================================================================

do $$
begin
  if exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'game_rounds_item_count' and conrelid = 'public.game_rounds'::regclass
  ) then
    alter table public.game_rounds drop constraint game_rounds_item_count;
  end if;
  alter table public.game_rounds
    add constraint game_rounds_item_count check (cardinality(item_ids) between 1 and 20);
end;
$$;

drop function if exists public.start_game_round(text, boolean);

create or replace function public.start_game_round(
  p_game text,
  p_spicy boolean default false,
  p_size integer default 10
)
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
  v_size integer := coalesce(p_size, 10);
  v_round public.game_rounds;
  v_ids uuid[];
begin
  select * into v_pair from private.require_pair();
  if p_game is null or p_game not in ('wyr', 'nhie', 'most_likely', 'agree') then
    raise exception 'invalid_game' using errcode = 'P0001';
  end if;
  if v_size not in (10, 15, 20) then
    raise exception 'invalid_round_size' using errcode = 'P0001';
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
    limit v_size
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
comment on function public.start_game_round(text, boolean, integer) is 'Inicia (o devuelve la abierta de) una ronda de 10, 15 o 20 ítems del juego para la pareja de auth.uid().';

revoke all on function public.start_game_round(text, boolean, integer) from public, anon;
grant execute on function public.start_game_round(text, boolean, integer) to authenticated, service_role;
