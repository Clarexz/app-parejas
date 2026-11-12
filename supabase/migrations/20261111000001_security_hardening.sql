-- =============================================================================
-- Fase 12 (parte 2): endurecimiento tras la auditoría de RLS y RPC.
--
-- Hallazgos de la auditoría (todas las tablas de public tienen RLS, toda función
-- security definer fija search_path = '', anon no ejecuta nada de public ni lee
-- tablas, private no es accesible desde la app):
--   * public.couple_spicy_active(uuid) se podía llamar desde la app con el id de
--     cualquier pareja y decía si las dos personas activaron las picantes. Solo la
--     usan funciones security definer (question_visible, pick_daily_question,
--     set_spicy_opt_in, start_game_round y el trigger sync_spicy_on_join), así que
--     se le quita el permiso a authenticated.
-- Las invariantes quedan como prueba permanente en supabase/tests/security_audit.sql.
-- =============================================================================

revoke all on function public.couple_spicy_active(uuid) from public, anon, authenticated;
grant execute on function public.couple_spicy_active(uuid) to service_role;
