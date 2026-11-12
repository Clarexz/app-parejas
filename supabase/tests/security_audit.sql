-- Auditoría permanente de seguridad del esquema (Fase 12). La corre el CI después de
-- aplicar todas las migraciones, así que una migración nueva que olvide RLS, el
-- search_path o los revoke truena aquí.
-- Se ejecuta con: psql -v ON_ERROR_STOP=1 -f supabase/tests/security_audit.sql

do $$
declare
  v_bad text;
begin
  -- 1) Toda tabla de public tiene RLS.
  select string_agg(c.relname, ', ') into v_bad
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity;
  assert v_bad is null, 'tablas de public sin RLS: ' || v_bad;

  -- 2) Toda función security definer de public/private fija search_path = ''.
  select string_agg(p.oid::regprocedure::text, ', ') into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where p.prosecdef and n.nspname in ('public', 'private')
    and not coalesce(p.proconfig, '{}') && array['search_path=""', 'search_path='];
  assert v_bad is null, 'security definer sin search_path vacío: ' || v_bad;

  -- 3) anon no ejecuta ninguna función de public.
  select string_agg(p.oid::regprocedure::text, ', ') into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute');
  assert v_bad is null, 'funciones de public ejecutables por anon: ' || v_bad;

  -- 4) anon no tiene ningún privilegio sobre tablas de public.
  select string_agg(distinct table_name, ', ') into v_bad
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'anon';
  assert v_bad is null, 'tablas de public con privilegios para anon: ' || v_bad;

  -- 5) La app no entra al schema private.
  assert not has_schema_privilege('authenticated', 'private', 'usage'),
    'authenticated no debe usar el schema private';
  assert not has_schema_privilege('anon', 'private', 'usage'),
    'anon no debe usar el schema private';

  -- 6) authenticated no escribe tablas completas: todo pasa por RPC, salvo las columnas
  --    permitidas (perfil propio, datos de la pareja y preferencias de avisos).
  select string_agg(distinct table_name || ':' || privilege_type, ', ') into v_bad
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'authenticated'
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
    and table_name <> 'notification_prefs';
  assert v_bad is null, 'escritura directa de authenticated en: ' || v_bad;

  select string_agg(distinct table_name || '.' || column_name || ':' || privilege_type, ', ')
  into v_bad
  from information_schema.column_privileges
  where table_schema = 'public' and grantee = 'authenticated'
    and privilege_type in ('INSERT', 'UPDATE')
    and table_name not in ('profiles', 'couples', 'notification_prefs');
  assert v_bad is null, 'columnas escribibles inesperadas: ' || v_bad;

  select string_agg(column_name, ', ') into v_bad
  from information_schema.column_privileges
  where table_schema = 'public' and grantee = 'authenticated' and privilege_type = 'UPDATE'
    and table_name = 'couples'
    and column_name not in ('photo_path', 'anniversary_date', 'timezone');
  assert v_bad is null, 'columnas de couples escribibles de más: ' || v_bad;

  select string_agg(column_name, ', ') into v_bad
  from information_schema.column_privileges
  where table_schema = 'public' and grantee = 'authenticated' and privilege_type = 'UPDATE'
    and table_name = 'profiles'
    and column_name not in ('display_name', 'nickname', 'birthday', 'avatar_path', 'story_archive');
  assert v_bad is null, 'columnas de profiles escribibles de más (fruit va por set_fruit): ' || v_bad;

  -- 7) Funciones internas que no deben llamarse desde la app.
  assert not has_function_privilege('authenticated', 'public.couple_spicy_active(uuid)', 'execute'),
    'couple_spicy_active no debe estar expuesta a la app';

  -- 8) Las únicas políticas de escritura en storage son de avatars (update/delete de tu
  --    propia foto); stories, memorias y audios solo se insertan y los borra la limpieza.
  select string_agg(policyname, ', ') into v_bad
  from pg_policies
  where schemaname = 'storage' and cmd in ('UPDATE', 'DELETE') and policyname not like 'avatars\_%';
  assert v_bad is null, 'políticas de update/delete inesperadas en storage: ' || v_bad;
end;
$$;
