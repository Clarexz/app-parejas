-- =============================================================================
-- 20261105000000_events_lists_distance.sql
-- Fase 8: cuentas regresivas (events), listas compartidas (lists, list_items) y
-- distancia (locations).
--   * events: fechas propias de la pareja (kind custom) y visitas ("la próxima
--     vez que nos vemos", kind visit). Recurrencia anual opcional (no en visitas).
--     Los automáticos (aniversario, cumplemeses, cumpleaños, hitos de días) NO se
--     guardan: la app los deriva de couples/profiles (src/lib/events.ts).
--   * lists + list_items: listas de la pareja con ítems ordenados por position,
--     check con quién y cuándo lo marcó.
--   * locations: SOLO la última ubicación de cada quien, redondeada a 2 decimales
--     (~1 km) en el servidor, con la ciudad que calculó el celular. Compartir es
--     opt-in: sin fila = no compartes. Al salir de la pareja se borra.
--   * Todo es de la PAREJA: lo leen y editan los miembros ACTUALES
--     (couple_id = my_couple_id()). Escritura solo por RPC.
--   * Push de datos (kind `widget`) al otro miembro cuando cambian los eventos o
--     tu ubicación (redondeada), para que sus widgets se actualicen
--     (private.send_widget_push; sin aviso visible).
--   * Realtime en las cuatro tablas.
-- Errores (P0001): not_authenticated, no_couple, invalid_event, event_not_found,
--   invalid_list, list_not_found, invalid_item, item_not_found, invalid_order,
--   invalid_location.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'custom'
    constraint events_kind check (kind in ('custom', 'visit')),
  title text not null
    constraint events_title_length check (char_length(btrim(title)) between 1 and 60),
  emoji text
    constraint events_emoji_length check (emoji is null or char_length(emoji) between 1 and 16),
  date date not null,
  recurring_yearly boolean not null default false,
  note text
    constraint events_note_length check (note is null or char_length(note) between 1 and 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_visit_not_recurring check (not (kind = 'visit' and recurring_yearly))
);
comment on table public.events is 'Cuentas regresivas de la pareja (fechas propias y visitas). Se escriben con save_event()/delete_event().';

create index if not exists events_couple_date_idx on public.events (couple_id, date);

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'other'
    constraint lists_kind check (kind in ('trip', 'groceries', 'bucket', 'watch', 'places', 'other')),
  title text not null
    constraint lists_title_length check (char_length(btrim(title)) between 1 and 60),
  emoji text
    constraint lists_emoji_length check (emoji is null or char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.lists is 'Listas compartidas de la pareja. Se escriben con las RPC de listas.';

create index if not exists lists_couple_idx on public.lists (couple_id, updated_at desc);

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  done_by uuid references auth.users (id) on delete set null,
  list_id uuid not null references public.lists (id) on delete cascade,
  text text not null
    constraint list_items_text_length check (char_length(btrim(text)) between 1 and 200),
  done boolean not null default false,
  done_at timestamptz,
  position integer not null default 0
    constraint list_items_position_range check (position between 0 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint list_items_done_consistent check (done or (done_by is null and done_at is null))
);
comment on table public.list_items is 'Renglones de una lista (orden por position). Se escriben con las RPC de listas.';

create index if not exists list_items_list_idx on public.list_items (list_id, position);

create table if not exists public.locations (
  user_id uuid primary key references auth.users (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  lat double precision not null
    constraint locations_lat_range check (lat between -90 and 90),
  lng double precision not null
    constraint locations_lng_range check (lng between -180 and 180),
  city text
    constraint locations_city_length check (city is null or char_length(btrim(city)) between 1 and 80),
  updated_at timestamptz not null default now()
);
comment on table public.locations is 'Última ubicación aproximada (2 decimales) de quien comparte su distancia. Se escribe con set_my_location()/clear_my_location().';

create index if not exists locations_couple_idx on public.locations (couple_id);

-- -----------------------------------------------------------------------------
-- RLS: lectura para la pareja actual; sin escritura directa (solo las RPC).
-- -----------------------------------------------------------------------------

alter table public.events enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.locations enable row level security;

drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select to authenticated
  using (couple_id = (select public.my_couple_id()));

drop policy if exists lists_select on public.lists;
create policy lists_select on public.lists
  for select to authenticated
  using (couple_id = (select public.my_couple_id()));

drop policy if exists list_items_select on public.list_items;
create policy list_items_select on public.list_items
  for select to authenticated
  using (couple_id = (select public.my_couple_id()));

-- La ubicación solo se ve si su dueño sigue siendo miembro de tu pareja.
drop policy if exists locations_select on public.locations;
create policy locations_select on public.locations
  for select to authenticated
  using (
    couple_id = (select public.my_couple_id())
    and exists (
      select 1 from public.couple_members cm
      where cm.couple_id = locations.couple_id and cm.user_id = locations.user_id
    )
  );

revoke all on public.events, public.lists, public.list_items, public.locations from anon, authenticated;
grant select on public.events, public.lists, public.list_items, public.locations to authenticated;
grant all on public.events, public.lists, public.list_items, public.locations to service_role;

-- -----------------------------------------------------------------------------
-- Helpers internos
-- -----------------------------------------------------------------------------

-- Pareja de auth.uid(); lanza not_authenticated / no_couple.
create or replace function private.require_couple()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  select cm.couple_id into v_couple_id from public.couple_members cm where cm.user_id = v_uid;
  if v_couple_id is null then
    raise exception 'no_couple' using errcode = 'P0001';
  end if;
  return v_couple_id;
end;
$$;
comment on function private.require_couple() is 'Pareja de auth.uid() o error not_authenticated/no_couple (uso interno de las RPC).';

-- Push de SOLO datos al otro miembro para que sus widgets se refresquen. Mismo
-- canal que private.send_notification (pg_net → notify), con kind `widget` y
-- data.scope ('events' | 'distance'). Nunca lanza.
create or replace function private.send_widget_push(p_couple_id uuid, p_actor uuid, p_scope text)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_recipient uuid;
  v_tokens jsonb;
  v_request_id bigint;
begin
  select s.value into v_url from private.settings s where s.key = 'notify_url';
  select s.value into v_secret from private.settings s where s.key = 'notify_secret';
  if v_url is null or v_secret is null then
    return null;
  end if;

  select cm.user_id into v_recipient
  from public.couple_members cm
  where cm.couple_id = p_couple_id and cm.user_id <> p_actor
  limit 1;
  if v_recipient is null then
    return null;
  end if;

  select coalesce(jsonb_agg(pt.token order by pt.updated_at desc), '[]'::jsonb) into v_tokens
  from public.push_tokens pt where pt.user_id = v_recipient;
  if jsonb_array_length(v_tokens) = 0 then
    return null;
  end if;

  select net.http_post(
    url := v_url,
    body := jsonb_build_object(
      'kind', 'widget',
      'couple_id', p_couple_id,
      'actor', jsonb_build_object('id', p_actor, 'name', private.person_name(p_actor)),
      'recipient', jsonb_build_object('id', v_recipient, 'name', private.person_name(v_recipient)),
      'tokens', v_tokens,
      'prefs', '{}'::jsonb,
      'data', jsonb_build_object('scope', p_scope)
    ),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_secret),
    timeout_milliseconds := 10000
  ) into v_request_id;
  return v_request_id;
exception when others then
  raise warning 'send_widget_push(%): %', p_scope, sqlerrm;
  return null;
end;
$$;
comment on function private.send_widget_push(uuid, uuid, text) is 'Push de datos (sin aviso) al otro miembro para refrescar sus widgets.';

-- -----------------------------------------------------------------------------
-- RPC: eventos
-- -----------------------------------------------------------------------------

-- Crea (p_id null) o edita un evento de tu pareja. Las visitas no se repiten cada año.
create or replace function public.save_event(
  p_title text,
  p_date date,
  p_kind text default 'custom',
  p_emoji text default null,
  p_recurring_yearly boolean default false,
  p_note text default null,
  p_id uuid default null
)
returns public.events
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := private.require_couple();
  v_event public.events;
begin
  if p_date is null or p_date < date '1900-01-01' or p_date > date '2200-12-31'
    or coalesce(p_kind, '') not in ('custom', 'visit')
  then
    raise exception 'invalid_event' using errcode = 'P0001';
  end if;

  begin
    if p_id is null then
      insert into public.events (couple_id, created_by, kind, title, emoji, date, recurring_yearly, note)
      values (
        v_couple_id, v_uid, p_kind, btrim(coalesce(p_title, '')),
        nullif(btrim(coalesce(p_emoji, '')), ''), p_date, coalesce(p_recurring_yearly, false),
        nullif(btrim(coalesce(p_note, '')), '')
      )
      returning * into v_event;
    else
      update public.events e
      set kind = p_kind,
          title = btrim(coalesce(p_title, '')),
          emoji = nullif(btrim(coalesce(p_emoji, '')), ''),
          date = p_date,
          recurring_yearly = coalesce(p_recurring_yearly, false),
          note = nullif(btrim(coalesce(p_note, '')), ''),
          updated_at = now()
      where e.id = p_id and e.couple_id = v_couple_id
      returning * into v_event;
      if v_event.id is null then
        raise exception 'event_not_found' using errcode = 'P0001';
      end if;
    end if;
  exception when check_violation then
    raise exception 'invalid_event' using errcode = 'P0001';
  end;

  perform private.send_widget_push(v_couple_id, v_uid, 'events');
  return v_event;
end;
$$;
comment on function public.save_event(text, date, text, text, boolean, text, uuid) is 'Crea o edita una cuenta regresiva de la pareja de auth.uid().';

create or replace function public.delete_event(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
begin
  delete from public.events e where e.id = p_id and e.couple_id = v_couple_id;
  if not found then
    raise exception 'event_not_found' using errcode = 'P0001';
  end if;
  perform private.send_widget_push(v_couple_id, auth.uid(), 'events');
end;
$$;
comment on function public.delete_event(uuid) is 'Borra una cuenta regresiva de la pareja de auth.uid().';

-- -----------------------------------------------------------------------------
-- RPC: listas
-- -----------------------------------------------------------------------------

-- Crea (p_id null) o edita una lista de tu pareja.
create or replace function public.save_list(
  p_title text,
  p_kind text default 'other',
  p_emoji text default null,
  p_id uuid default null
)
returns public.lists
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
  v_list public.lists;
begin
  begin
    if p_id is null then
      insert into public.lists (couple_id, created_by, kind, title, emoji)
      values (
        v_couple_id, auth.uid(), coalesce(p_kind, 'other'), btrim(coalesce(p_title, '')),
        nullif(btrim(coalesce(p_emoji, '')), '')
      )
      returning * into v_list;
    else
      update public.lists l
      set kind = coalesce(p_kind, 'other'),
          title = btrim(coalesce(p_title, '')),
          emoji = nullif(btrim(coalesce(p_emoji, '')), ''),
          updated_at = now()
      where l.id = p_id and l.couple_id = v_couple_id
      returning * into v_list;
      if v_list.id is null then
        raise exception 'list_not_found' using errcode = 'P0001';
      end if;
    end if;
  exception when check_violation then
    raise exception 'invalid_list' using errcode = 'P0001';
  end;
  return v_list;
end;
$$;
comment on function public.save_list(text, text, text, uuid) is 'Crea o edita una lista de la pareja de auth.uid().';

create or replace function public.delete_list(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
begin
  delete from public.lists l where l.id = p_id and l.couple_id = v_couple_id;
  if not found then
    raise exception 'list_not_found' using errcode = 'P0001';
  end if;
end;
$$;
comment on function public.delete_list(uuid) is 'Borra una lista (y sus renglones) de la pareja de auth.uid().';

-- Bloquea la lista (de tu pareja) y marca su updated_at; lanza list_not_found.
create or replace function private.touch_list(p_list_id uuid, p_couple_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.lists l set updated_at = now()
  where l.id = p_list_id and l.couple_id = p_couple_id;
  if not found then
    raise exception 'list_not_found' using errcode = 'P0001';
  end if;
end;
$$;

-- Agrega un renglón al final de la lista.
create or replace function public.add_list_item(p_list_id uuid, p_text text)
returns public.list_items
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
  v_item public.list_items;
  v_position integer;
begin
  perform private.touch_list(p_list_id, v_couple_id);
  if (select count(*) from public.list_items li where li.list_id = p_list_id) >= 500 then
    raise exception 'invalid_item' using errcode = 'P0001';
  end if;
  select coalesce(max(li.position) + 1, 0) into v_position
  from public.list_items li where li.list_id = p_list_id;
  begin
    insert into public.list_items (couple_id, created_by, list_id, text, position)
    values (v_couple_id, auth.uid(), p_list_id, btrim(coalesce(p_text, '')), v_position)
    returning * into v_item;
  exception when check_violation then
    raise exception 'invalid_item' using errcode = 'P0001';
  end;
  return v_item;
end;
$$;
comment on function public.add_list_item(uuid, text) is 'Agrega un renglón al final de una lista de la pareja de auth.uid().';

-- Edita el texto de un renglón.
create or replace function public.update_list_item(p_id uuid, p_text text)
returns public.list_items
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
  v_item public.list_items;
begin
  begin
    update public.list_items li
    set text = btrim(coalesce(p_text, '')), updated_at = now()
    where li.id = p_id and li.couple_id = v_couple_id
    returning * into v_item;
  exception when check_violation then
    raise exception 'invalid_item' using errcode = 'P0001';
  end;
  if v_item.id is null then
    raise exception 'item_not_found' using errcode = 'P0001';
  end if;
  perform private.touch_list(v_item.list_id, v_couple_id);
  return v_item;
end;
$$;
comment on function public.update_list_item(uuid, text) is 'Edita el texto de un renglón de una lista de la pareja de auth.uid().';

-- Marca o desmarca un renglón (guarda quién y cuándo).
create or replace function public.set_list_item_done(p_id uuid, p_done boolean)
returns public.list_items
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
  v_item public.list_items;
begin
  update public.list_items li
  set done = coalesce(p_done, false),
      done_by = case when coalesce(p_done, false) then auth.uid() end,
      done_at = case when coalesce(p_done, false) then now() end,
      updated_at = now()
  where li.id = p_id and li.couple_id = v_couple_id
  returning * into v_item;
  if v_item.id is null then
    raise exception 'item_not_found' using errcode = 'P0001';
  end if;
  perform private.touch_list(v_item.list_id, v_couple_id);
  return v_item;
end;
$$;
comment on function public.set_list_item_done(uuid, boolean) is 'Marca o desmarca un renglón de una lista de la pareja de auth.uid().';

create or replace function public.delete_list_item(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
  v_list_id uuid;
begin
  delete from public.list_items li where li.id = p_id and li.couple_id = v_couple_id
  returning li.list_id into v_list_id;
  if v_list_id is null then
    raise exception 'item_not_found' using errcode = 'P0001';
  end if;
  perform private.touch_list(v_list_id, v_couple_id);
end;
$$;
comment on function public.delete_list_item(uuid) is 'Borra un renglón de una lista de la pareja de auth.uid().';

-- Borra los renglones marcados de una lista. Devuelve cuántos borró.
create or replace function public.clear_done_list_items(p_list_id uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
  v_count integer;
begin
  perform private.touch_list(p_list_id, v_couple_id);
  delete from public.list_items li where li.list_id = p_list_id and li.done;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
comment on function public.clear_done_list_items(uuid) is 'Borra los renglones marcados de una lista de la pareja de auth.uid().';

-- Reordena: p_ids debe traer EXACTAMENTE los renglones de la lista (sin repetidos);
-- quedan con position 0..n-1 en ese orden. Si alguien agregó o borró uno mientras
-- tanto, invalid_order (la app recarga y reintenta).
create or replace function public.reorder_list_items(p_list_id uuid, p_ids uuid[])
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_couple_id uuid := private.require_couple();
  v_count integer;
begin
  perform private.touch_list(p_list_id, v_couple_id);
  select count(*) into v_count from public.list_items li where li.list_id = p_list_id;
  if p_ids is null
    or coalesce(array_length(p_ids, 1), 0) <> v_count
    or (select count(distinct x) from unnest(p_ids) x) <> v_count
    or exists (
      select 1 from unnest(p_ids) x
      where not exists (select 1 from public.list_items li where li.id = x and li.list_id = p_list_id)
    )
  then
    raise exception 'invalid_order' using errcode = 'P0001';
  end if;
  update public.list_items li
  set position = o.ord - 1, updated_at = now()
  from unnest(p_ids) with ordinality as o(id, ord)
  where li.id = o.id and li.list_id = p_list_id and li.position <> o.ord - 1;
end;
$$;
comment on function public.reorder_list_items(uuid, uuid[]) is 'Reordena todos los renglones de una lista de la pareja de auth.uid().';

-- -----------------------------------------------------------------------------
-- RPC: distancia
-- -----------------------------------------------------------------------------

-- Guarda tu última ubicación, redondeada a 2 decimales (~1 km), y la ciudad que
-- calculó el celular. Solo avisa al widget de tu pareja si cambió lo redondeado o
-- la ciudad.
create or replace function public.set_my_location(
  p_lat double precision,
  p_lng double precision,
  p_city text default null
)
returns public.locations
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := private.require_couple();
  v_lat double precision;
  v_lng double precision;
  v_city text := nullif(btrim(coalesce(p_city, '')), '');
  v_old public.locations;
  v_row public.locations;
begin
  if p_lat is null or p_lng is null or p_lat = 'NaN'::double precision or p_lng = 'NaN'::double precision
    or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180
    or (v_city is not null and char_length(v_city) > 80)
  then
    raise exception 'invalid_location' using errcode = 'P0001';
  end if;
  v_lat := round(p_lat::numeric, 2)::double precision;
  v_lng := round(p_lng::numeric, 2)::double precision;

  select * into v_old from public.locations l where l.user_id = v_uid;

  insert into public.locations as l (user_id, couple_id, lat, lng, city, updated_at)
  values (v_uid, v_couple_id, v_lat, v_lng, v_city, now())
  on conflict (user_id) do update
    set couple_id = excluded.couple_id,
        lat = excluded.lat,
        lng = excluded.lng,
        city = excluded.city,
        updated_at = excluded.updated_at
  returning * into v_row;

  if v_old.user_id is null
    or v_old.couple_id <> v_couple_id
    or v_old.lat <> v_lat
    or v_old.lng <> v_lng
    or v_old.city is distinct from v_city
  then
    perform private.send_widget_push(v_couple_id, v_uid, 'distance');
  end if;
  return v_row;
end;
$$;
comment on function public.set_my_location(double precision, double precision, text) is 'Guarda la ubicación aproximada de auth.uid() (opt-in de distancia).';

-- Deja de compartir: borra tu ubicación.
create or replace function public.clear_my_location()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  delete from public.locations l where l.user_id = v_uid returning l.couple_id into v_couple_id;
  if v_couple_id is not null then
    perform private.send_widget_push(v_couple_id, v_uid, 'distance');
  end if;
end;
$$;
comment on function public.clear_my_location() is 'Borra la ubicación de auth.uid() (deja de compartir la distancia).';

-- Al salir de una pareja se borra tu ubicación (no queda visible para nadie).
create or replace function private.clear_location_on_leave()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.locations l where l.user_id = old.user_id;
  return null;
end;
$$;

drop trigger if exists couple_members_clear_location on public.couple_members;
create trigger couple_members_clear_location
  after delete on public.couple_members
  for each row execute function private.clear_location_on_leave();

-- -----------------------------------------------------------------------------
-- Permisos de funciones
-- -----------------------------------------------------------------------------

revoke all on function private.require_couple() from public, anon, authenticated;
revoke all on function private.send_widget_push(uuid, uuid, text) from public, anon, authenticated;
revoke all on function private.touch_list(uuid, uuid) from public, anon, authenticated;
revoke all on function private.clear_location_on_leave() from public, anon, authenticated;
revoke all on function public.save_event(text, date, text, text, boolean, text, uuid) from public, anon;
revoke all on function public.delete_event(uuid) from public, anon;
revoke all on function public.save_list(text, text, text, uuid) from public, anon;
revoke all on function public.delete_list(uuid) from public, anon;
revoke all on function public.add_list_item(uuid, text) from public, anon;
revoke all on function public.update_list_item(uuid, text) from public, anon;
revoke all on function public.set_list_item_done(uuid, boolean) from public, anon;
revoke all on function public.delete_list_item(uuid) from public, anon;
revoke all on function public.clear_done_list_items(uuid) from public, anon;
revoke all on function public.reorder_list_items(uuid, uuid[]) from public, anon;
revoke all on function public.set_my_location(double precision, double precision, text) from public, anon;
revoke all on function public.clear_my_location() from public, anon;

grant execute on function public.save_event(text, date, text, text, boolean, text, uuid) to authenticated, service_role;
grant execute on function public.delete_event(uuid) to authenticated, service_role;
grant execute on function public.save_list(text, text, text, uuid) to authenticated, service_role;
grant execute on function public.delete_list(uuid) to authenticated, service_role;
grant execute on function public.add_list_item(uuid, text) to authenticated, service_role;
grant execute on function public.update_list_item(uuid, text) to authenticated, service_role;
grant execute on function public.set_list_item_done(uuid, boolean) to authenticated, service_role;
grant execute on function public.delete_list_item(uuid) to authenticated, service_role;
grant execute on function public.clear_done_list_items(uuid) to authenticated, service_role;
grant execute on function public.reorder_list_items(uuid, uuid[]) to authenticated, service_role;
grant execute on function public.set_my_location(double precision, double precision, text) to authenticated, service_role;
grant execute on function public.clear_my_location() to authenticated, service_role;

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
  foreach t in array array['events', 'lists', 'list_items', 'locations'] loop
    if not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
