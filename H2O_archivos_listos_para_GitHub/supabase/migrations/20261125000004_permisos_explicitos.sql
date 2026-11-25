-- ─────────────────────────────────────────────────────────────
-- Permisos explícitos por tabla para usuarios con sesión.
-- Este proyecto no concede permisos por defecto al rol "authenticated",
-- así que se otorgan solo los necesarios (RLS sigue filtrando por usuario).
-- Se quitan TRUNCATE/TRIGGER/REFERENCES: TRUNCATE se salta RLS.
-- ─────────────────────────────────────────────────────────────
revoke truncate, trigger, references on all tables in schema public from authenticated, anon;

grant select on public.profiles to authenticated;               -- update: solo columnas permitidas (migración 1)
grant select, insert on public.bottles to authenticated;        -- update: solo columnas permitidas; sin delete (borrado suave)
grant select, insert, delete on public.intake_entries to authenticated;
grant select, insert, update on public.pets to authenticated;
grant select on public.shop_items to authenticated;
grant select on public.inventory to authenticated;              -- solo se compra vía buy_item()
grant select, insert, update, delete on public.pet_equipment to authenticated;
grant select on public.reward_events to authenticated;          -- solo se escribe vía claim_rewards()/buy_item()
grant select on public.streak_freezes to authenticated;

-- Tablas futuras: sin permisos automáticos para anon
alter default privileges in schema public revoke all on tables from anon;
