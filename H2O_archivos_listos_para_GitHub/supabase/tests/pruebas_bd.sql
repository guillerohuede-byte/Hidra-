-- ─────────────────────────────────────────────────────────────
-- H2O · Pruebas de la base de datos (RLS, premios, compras, rachas, NFC)
-- Crea dos usuarios de prueba y los borra al final (no deja datos).
-- Si algo falla a mitad de camino, la transacción completa se revierte.
-- Ejecutar: pegar en el SQL editor de Supabase (o vía MCP execute_sql).
-- ─────────────────────────────────────────────────────────────
-- Dos usuarios de prueba (el trigger crea sus perfiles)
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana.prueba@h2o.test', '{"display_name":"Ana"}'),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'beto.prueba@h2o.test', '{}');

create temp table resultados (n serial, prueba text, ok boolean, detalle text);
grant all on resultados to authenticated, anon;
grant usage on sequence resultados_n_seq to authenticated, anon;

create or replace function pg_temp.como(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create or replace function pg_temp.chk(p text, ok boolean, d text default '') returns void language sql as $$
  insert into resultados (prueba, ok, detalle) values (p, coalesce(ok, false), d);
$$;

-- 1. Perfil creado automáticamente
select pg_temp.chk('perfil automático al registrarse',
  (select count(*) from public.profiles where id in ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000b2')) = 2);

-- ── Como ANA ──────────────────────────────────────────────────
select pg_temp.como('00000000-0000-4000-8000-0000000000a1');
update public.profiles set onboarded = true, goal_ml = 1000 where id = auth.uid();
insert into public.bottles (id, name, capacity_ml, default_amount_ml) values ('BANA2345', 'Botella de la U', 600, 250);
insert into public.pets (species, name) values ('capibara', 'Gotardo');

-- 2. Registro NFC: el servidor fija hora, día y nombre de botella
insert into public.intake_entries (client_key, amount_ml, source, bottle_id, local_date, logged_at)
values ('k1', 250, 'nfc', 'BANA2345', '2001-01-01', '2001-01-01');
select pg_temp.chk('servidor fija fecha (no se puede inventar)',
  (select local_date = (public.game_summary() ->> 'today')::date and logged_at > now() - interval '1 minute' and bottle_name = 'Botella de la U'
   from public.intake_entries where client_key = 'k1'));
select pg_temp.chk('sticker marcado como funcionando', (select tag_linked_at is not null from public.bottles where id = 'BANA2345'));

-- 3. Doble toque: misma client_key no duplica
do $$ begin
  insert into public.intake_entries (client_key, amount_ml, source) values ('k1', 250, 'manual');
  perform pg_temp.chk('doble toque rechazado', false);
exception when unique_violation then perform pg_temp.chk('doble toque rechazado', true);
end $$;

-- 4. Premios: claim es idempotente
select count(*) from public.claim_rewards();
select pg_temp.chk('claim_rewards otorga bienvenida, diaria, registro y logros',
  (select count(*) from public.reward_events where key in ('welcome', 'login:' || (public.game_summary() ->> 'today')::date, 'a:primer-registro', 'a:primer-nfc', 'm:d:nfc:' || (public.game_summary() ->> 'today')::date)) = 5);
select pg_temp.chk('claim_rewards repetido no da nada nuevo', (select count(*) from public.claim_rewards()) = 0);

-- 5. Anti-trampa: borrar y volver a registrar no da más premios
insert into public.intake_entries (client_key, amount_ml, source) values ('k2', 100, 'manual');
select public.claim_rewards();
delete from public.intake_entries where client_key = 'k2';
insert into public.intake_entries (client_key, amount_ml, source) values ('k3', 100, 'manual');
select pg_temp.chk('borrar y re-registrar no repite premio', (select count(*) from public.claim_rewards()) = 0);

-- 6. Tope diario de XP por registros (6)
insert into public.intake_entries (client_key, amount_ml, source)
  select 'tope' || g, 10, 'manual' from generate_series(1, 10) g;
select public.claim_rewards();
select pg_temp.chk('máximo 6 registros premiados por día',
  (select count(*) from public.reward_events where kind = 'registro') = 6);

-- 7. Meta cumplida una sola vez al día
insert into public.intake_entries (client_key, amount_ml, source) values ('k4', 900, 'manual');
select public.claim_rewards();
insert into public.intake_entries (client_key, amount_ml, source) values ('k5', 900, 'manual');
select public.claim_rewards();
select pg_temp.chk('meta premiada una vez por día', (select count(*) from public.reward_events where kind = 'meta') = 1);

-- 8. Compras
select (public.game_summary() ->> 'gotitas')::int;
select pg_temp.chk('saldo es suma del libro de premios',
  (public.game_summary() ->> 'gotitas')::int = (select sum(gotitas) from public.reward_events));
select public.buy_item('polera-glu', '11111111-1111-4111-8111-111111111111');
select pg_temp.chk('compra crea inventario', exists (select 1 from public.inventory where item_id = 'polera-glu'));
select public.buy_item('polera-glu', '11111111-1111-4111-8111-111111111111');
select pg_temp.chk('reintento de compra no cobra doble',
  (select count(*) from public.reward_events where kind = 'compra') = 1);
do $$ begin
  perform public.buy_item('polera-glu', gen_random_uuid());
  perform pg_temp.chk('no se compra dos veces lo mismo', false);
exception when others then perform pg_temp.chk('no se compra dos veces lo mismo', sqlerrm like 'Ya tienes%', sqlerrm);
end $$;
do $$ begin
  perform public.buy_item('corona-gotas', gen_random_uuid());
  perform pg_temp.chk('premios exclusivos no se compran', false);
exception when others then perform pg_temp.chk('premios exclusivos no se compran', sqlerrm like '%premio%', sqlerrm);
end $$;
do $$ begin
  perform public.buy_item('disfraz-gota', gen_random_uuid());
  perform pg_temp.chk('sin saldo no se compra', false);
exception when others then perform pg_temp.chk('sin saldo no se compra', sqlerrm like 'Te faltan%', sqlerrm);
end $$;

-- 9. Equipamiento: solo lo que tienes, en su espacio
insert into public.pet_equipment (slot, item_id) values ('top', 'polera-glu');
select pg_temp.chk('equipar prenda propia', exists (select 1 from public.pet_equipment where item_id = 'polera-glu'));
do $$ begin
  insert into public.pet_equipment (slot, item_id) values ('hat', 'jockey-ola');
  perform pg_temp.chk('no equipar lo que no tienes', false);
exception when insufficient_privilege then perform pg_temp.chk('no equipar lo que no tienes', true);
end $$;
do $$ begin
  insert into public.pet_equipment (slot, item_id) values ('hat', 'polera-glu');
  perform pg_temp.chk('no equipar en espacio equivocado', false);
exception when insufficient_privilege then perform pg_temp.chk('no equipar en espacio equivocado', true);
end $$;

-- 10. El navegador no puede escribirse premios ni Gotitas
do $$ begin
  insert into public.reward_events (user_id, key, kind, label, gotitas) values (auth.uid(), 'hack', 'x', 'x', 99999);
  perform pg_temp.chk('no se pueden inventar Gotitas', false);
exception when insufficient_privilege then perform pg_temp.chk('no se pueden inventar Gotitas', true);
end $$;
do $$ begin
  insert into public.inventory (user_id, item_id, source) values (auth.uid(), 'cadena-gota', 'compra');
  perform pg_temp.chk('no se puede regalar inventario', false);
exception when insufficient_privilege then perform pg_temp.chk('no se puede regalar inventario', true);
end $$;
do $$ begin
  update public.profiles set local_import_done_at = now() where id = auth.uid();
  perform pg_temp.chk('columnas protegidas del perfil', false);
exception when insufficient_privilege then perform pg_temp.chk('columnas protegidas del perfil', true);
end $$;

-- 11. Importación desde localStorage: idempotente
select public.import_local('{"bottles":[{"id":"BOLD2345","name":"Botella de la U","capacityMl":750,"defaultAmountMl":250}],
  "entries":[{"id":"loc-1","amountMl":300,"timestamp":"2026-11-20T15:00:00Z","date":"2026-11-20","source":"nfc","bottleId":"BOLD2345"},
             {"id":"loc-2","amountMl":200,"timestamp":"2026-11-21T15:00:00Z","date":"2026-11-21","source":"manual"}],
  "goalMl":1000}'::jsonb);
select pg_temp.chk('importación crea botella con mismo código (nombre repetido renombrado)',
  (select name from public.bottles where id = 'BOLD2345') = 'Botella de la U (2)');
select public.import_local('{"bottles":[{"id":"BOLD2345","name":"x"}],"entries":[{"id":"loc-1","amountMl":300,"date":"2026-11-20"}]}'::jsonb);
select pg_temp.chk('importar dos veces no duplica',
  (select count(*) from public.intake_entries where client_key like 'local:%') = 2 and (select count(*) from public.bottles where id = 'BOLD2345') = 1);
select pg_temp.chk('importados no dan premios',
  not exists (select 1 from public.reward_events where key like '%2026-11-20%' or key like '%2026-11-21%'));

-- ── Como BETO ─────────────────────────────────────────────────
select pg_temp.como('00000000-0000-4000-8000-0000000000b2');

-- 12. RLS: Beto no ve nada de Ana
select pg_temp.chk('RLS: no ve botellas ajenas (NFC privado)', (select count(*) from public.bottles where id = 'BANA2345') = 0);
select pg_temp.chk('RLS: no ve registros ajenos', (select count(*) from public.intake_entries) = 0);
select pg_temp.chk('RLS: no ve perfil ajeno', (select count(*) from public.profiles) = 1);
select pg_temp.chk('RLS: no ve inventario ni premios ajenos', (select count(*) from public.inventory) + (select count(*) from public.reward_events) = 0);
update public.bottles set name = 'robada' where id = 'BANA2345';
do $$ begin
  insert into public.intake_entries (client_key, amount_ml, source, bottle_id) values ('b1', 250, 'nfc', 'BANA2345');
  perform pg_temp.chk('no registra agua en botella ajena (sticker de otro)', false);
exception when insufficient_privilege then perform pg_temp.chk('no registra agua en botella ajena (sticker de otro)', true);
end $$;
do $$ begin
  update public.profiles set selected_bottle_id = 'BANA2345' where id = auth.uid();
  perform pg_temp.chk('no selecciona botella ajena', false);
exception when insufficient_privilege then perform pg_temp.chk('no selecciona botella ajena', true);
end $$;
select public.import_local('{"bottles":[{"id":"BANA2345","name":"mía"}],"entries":[]}'::jsonb) ->> 'bottles_conflict';
select pg_temp.chk('importar código de otro usuario se reporta como conflicto',
  (select count(*) from public.bottles) = 0);

-- 13. Zonas horarias: el día depende del perfil
update public.profiles set timezone = 'Pacific/Kiritimati' where id = auth.uid();
insert into public.intake_entries (client_key, amount_ml, source) values ('tz1', 100, 'manual');
update public.profiles set timezone = 'Pacific/Pago_Pago' where id = auth.uid();
insert into public.intake_entries (client_key, amount_ml, source) values ('tz2', 100, 'manual');
select pg_temp.chk('día local según zona horaria (UTC+14 vs UTC−11)',
  (select local_date from public.intake_entries where client_key = 'tz1') = (now() at time zone 'Pacific/Kiritimati')::date
  and (select local_date from public.intake_entries where client_key = 'tz2') = (now() at time zone 'Pacific/Pago_Pago')::date);
do $$ begin
  update public.profiles set timezone = 'Marte/Olympus' where id = auth.uid();
  perform pg_temp.chk('zona horaria inválida rechazada', false);
exception when check_violation then perform pg_temp.chk('zona horaria inválida rechazada', true);
end $$;
update public.profiles set timezone = 'America/Santiago' where id = auth.uid();

-- ── Rachas (como administrador, con días pasados) ─────────────
reset role;
delete from public.intake_entries where user_id = '00000000-0000-4000-8000-0000000000b2';
insert into public.intake_entries (user_id, client_key, amount_ml, logged_at, local_date, source, imported)
select '00000000-0000-4000-8000-0000000000b2', 'r' || g, 200, now() - (g || ' days')::interval,
       public.user_today('00000000-0000-4000-8000-0000000000b2') - g, 'manual', true
from generate_series(1, 8) g;

-- 14. Racha: 8 días seguidos hasta ayer, viva hoy
select pg_temp.chk('racha de 8 días sigue viva hoy',
  (select current_streak = 8 and best_streak = 8 and not active_today
   from public.streak_stats('00000000-0000-4000-8000-0000000000b2', public.user_today('00000000-0000-4000-8000-0000000000b2'))));
-- 15. Se pierde si faltó ayer (sin escudo)
select pg_temp.chk('sin registro ayer ni hoy: racha en 0, mejor racha se guarda',
  (select current_streak = 0 and best_streak = 8
   from public.streak_stats('00000000-0000-4000-8000-0000000000b2', public.user_today('00000000-0000-4000-8000-0000000000b2') + 2)));

-- 16. Hito de 7 días da un Escudo de Gota, y el escudo cubre un día perdido
select pg_temp.como('00000000-0000-4000-8000-0000000000b2');
select public.claim_rewards();
select pg_temp.chk('racha de 7 entrega Escudo de Gota', (public.game_summary() ->> 'shields')::int = 1);
reset role;
delete from public.intake_entries where user_id = '00000000-0000-4000-8000-0000000000b2' and client_key = 'r1'; -- "ayer" no registró
select pg_temp.como('00000000-0000-4000-8000-0000000000b2');
select public.claim_rewards();
select pg_temp.chk('escudo cubre ayer automáticamente y se gasta',
  (public.game_summary() ->> 'current_streak')::int = 8 and (public.game_summary() ->> 'shields')::int = 0);

-- 17. Nivel según XP
select pg_temp.chk('niveles: 0→1, 100→2, 300→3, 999→4, 1000→5',
  public.level_for_xp(0) = 1 and public.level_for_xp(100) = 2 and public.level_for_xp(300) = 3
  and public.level_for_xp(999) = 4 and public.level_for_xp(1000) = 5);

-- 18. Sin sesión no hay acceso
reset role;
select set_config('role', 'anon', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  perform count(*) from public.bottles;
  perform pg_temp.chk('anónimo sin acceso a tablas', false);
exception when insufficient_privilege then perform pg_temp.chk('anónimo sin acceso a tablas', true);
end $$;

reset role;
select pg_temp.chk('RLS: no modifica botella ajena', (select name from public.bottles where id = 'BANA2345') = 'Botella de la U');
delete from auth.users where id in ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000b2');
select n, case when ok then 'PASA' else 'FALLA' end as resultado, prueba, detalle from resultados order by n;
