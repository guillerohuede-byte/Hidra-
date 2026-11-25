-- Las funciones de trigger no se pueden llamar desde la API (los triggers siguen funcionando).
-- Las RPC del juego solo para usuarios con sesión (validan auth.uid() por dentro).
revoke execute on function public.intake_before_insert() from public, anon, authenticated;
revoke execute on function public.profiles_check_selected() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.claim_rewards() from anon;
revoke execute on function public.buy_item(text, uuid) from anon;
revoke execute on function public.game_summary() from anon;
revoke execute on function public.import_local(jsonb) from anon;
