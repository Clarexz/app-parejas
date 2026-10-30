-- =============================================================================
-- 20261031000000_moods.sql
-- Fase 2: mood de cada persona.
--   * Tabla `moods` (historial; el más reciente de cada quien es su mood actual).
--   * Se escribe solo con la RPC `set_mood` (pone pareja, usuario y fecha del
--     servidor); se lee con RLS: solo los moods de los miembros ACTUALES de tu
--     pareja (si alguien sale y entra otra persona, no ve el historial anterior).
--   * Realtime para ver el mood de tu pareja al instante.
-- =============================================================================

create table if not exists public.moods (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Un emoji (puede ocupar varios code points: 👩‍❤️‍👨, ❤️‍🔥, banderas…).
  emoji text not null
    constraint moods_emoji_length check (char_length(emoji) between 1 and 16 and emoji !~ '[[:space:]]'),
  note text
    constraint moods_note_length check (note is null or char_length(btrim(note)) between 1 and 80),
  created_at timestamptz not null default now()
);
comment on table public.moods is 'Historial de moods; el último de cada persona es su mood actual. Se escribe con set_mood().';

create index if not exists moods_couple_created_idx on public.moods (couple_id, created_at desc);
create index if not exists moods_user_created_idx on public.moods (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- RLS: lectura para la pareja; sin escritura directa (solo la RPC).
-- -----------------------------------------------------------------------------

alter table public.moods enable row level security;

drop policy if exists moods_select_current_members on public.moods;
create policy moods_select_current_members on public.moods
  for select to authenticated
  using (
    couple_id = (select public.my_couple_id())
    and user_id in (
      select cm.user_id
      from public.couple_members cm
      where cm.couple_id = (select public.my_couple_id())
    )
  );

revoke all on public.moods from anon, authenticated;
grant select on public.moods to authenticated;
grant all on public.moods to service_role;

-- -----------------------------------------------------------------------------
-- RPC
-- -----------------------------------------------------------------------------

-- Guarda el mood de auth.uid() en su pareja. Errores (P0001): not_authenticated,
-- no_couple, invalid_mood.
create or replace function public.set_mood(p_emoji text, p_note text default null)
returns public.moods
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid;
  v_emoji text := btrim(coalesce(p_emoji, ''));
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_mood public.moods;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select cm.couple_id into v_couple_id from public.couple_members cm where cm.user_id = v_uid;
  if v_couple_id is null then
    raise exception 'no_couple' using errcode = 'P0001';
  end if;

  if char_length(v_emoji) not between 1 and 16
    or v_emoji ~ '[[:space:]]'
    or (v_note is not null and char_length(v_note) > 80)
  then
    raise exception 'invalid_mood' using errcode = 'P0001';
  end if;

  insert into public.moods (couple_id, user_id, emoji, note)
  values (v_couple_id, v_uid, v_emoji, v_note)
  returning * into v_mood;

  return v_mood;
end;
$$;
comment on function public.set_mood(text, text) is 'Registra el mood actual de auth.uid() en su pareja.';

revoke all on function public.set_mood(text, text) from public, anon;
grant execute on function public.set_mood(text, text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Realtime (respeta la RLS de select)
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    raise notice 'No existe la publicación supabase_realtime; se omite Realtime.';
    return;
  end if;
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'moods'
  ) then
    alter publication supabase_realtime add table public.moods;
  end if;
end;
$$;
