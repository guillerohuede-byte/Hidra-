-- ─────────────────────────────────────────────────────────────
-- Hidra · Pruebas de metas por día, entrenamiento y perfil de hidratación
-- Crea usuarios de prueba y los borra al final. Ejecutar después de la migración 7.
-- ─────────────────────────────────────────────────────────────
create temp table r7 (n serial, prueba text, ok boolean, detalle text);
grant all on r7 to authenticated, anon;
grant usage on sequence r7_n_seq to authenticated, anon;
create or replace function pg_temp.como(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create or replace function pg_temp.chk(p text, ok boolean, d text default '') returns void language sql as $$
  insert into r7 (prueba, ok, detalle) values (p, coalesce(ok, false), d);
$$;

-- Datos reales existentes: se cuentan antes para comprobar que no cambian
create temp table antes as
select (select count(*) from public.intake_entries) e, (select count(*) from public.reward_events) r,
       (select count(*) from public.inventory) i, (select count(*) from public.pets) p,
       (select coalesce(sum(goal_ml), 0) from public.profiles) g;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000d4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dani.prueba@hidra.test', '{}'),
  ('00000000-0000-4000-8000-0000000000e5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'eli.prueba@hidra.test', '{}');

-- Días anteriores de Dani (como administrador): ayer 1.500 ml con meta 2.000 guardada ese día
insert into public.intake_entries (user_id, client_key, amount_ml, logged_at, local_date, source, imported)
values ('00000000-0000-4000-8000-0000000000d4', 'ayer', 1500, now() - interval '1 day',
        public.user_today('00000000-0000-4000-8000-0000000000d4') - 1, 'manual', true);
update public.intake_entries set imported = false where client_key = 'ayer';
insert into public.daily_goals (user_id, day, base_ml) values
  ('00000000-0000-4000-8000-0000000000d4', public.user_today('00000000-0000-4000-8000-0000000000d4') - 1, 2000);

select pg_temp.como('00000000-0000-4000-8000-0000000000d4');
update public.profiles set onboarded = true, goal_ml = 2000 where id = auth.uid();
insert into public.intake_entries (client_key, amount_ml, source) values ('hoy1', 1500, 'manual');
select count(*) from public.claim_rewards();
select pg_temp.chk('sin cumplir la meta (1.500 de 2.000) no hay premio de meta',
  not exists (select 1 from public.reward_events where kind = 'meta'));

-- Bajar la meta: vale para HOY, no para ayer
update public.profiles set goal_ml = 1000 where id = auth.uid();
select count(*) from public.claim_rewards();
select pg_temp.chk('bajar la meta cuenta para hoy',
  exists (select 1 from public.reward_events where key = 'goal:' || (public.game_summary() ->> 'today')));
select pg_temp.chk('bajar la meta NO da premio retroactivo de ayer',
  not exists (select 1 from public.reward_events where key = 'goal:' || ((public.game_summary() ->> 'today')::date - 1)));
select pg_temp.chk('la meta guardada de ayer no cambia',
  (select base_ml from public.daily_goals where day = (public.game_summary() ->> 'today')::date - 1) = 2000);
select pg_temp.chk('meta de hoy actualizada (1.000)', (public.game_summary() ->> 'today_goal_ml')::int = 1000);

-- Entrenamiento: ajuste solo hoy, alternar no duplica premios
update public.profiles set training_extra_ml = 500, goal_ml = 2000, goal_source = 'calculada' where id = auth.uid();
select public.set_training_today(true);
select pg_temp.chk('día de entrenamiento: meta = base + ajuste',
  (public.game_summary() ->> 'today_goal_ml')::int = 2500 and (public.game_summary() ->> 'training_today')::boolean);
create temp table premios_antes as select count(*) c from public.reward_events;
select public.set_training_today(false); select count(*) from public.claim_rewards();
select public.set_training_today(true);  select count(*) from public.claim_rewards();
select public.set_training_today(false); select count(*) from public.claim_rewards();
select pg_temp.chk('día de descanso: vuelve a la base', (public.game_summary() ->> 'today_goal_ml')::int = 2000);
select pg_temp.chk('alternar entrenamiento/descanso no duplica premios',
  (select count(*) from public.reward_events) = (select c from premios_antes));
select pg_temp.chk('entrenamiento no toca el día anterior',
  (select training from public.daily_goals where day = (public.game_summary() ->> 'today')::date - 1) = false);
do $$ begin
  insert into public.daily_goals (user_id, day, base_ml) values (auth.uid(), current_date - 5, 1000);
  perform pg_temp.chk('no se pueden escribir metas de días pasados', false);
exception when insufficient_privilege then perform pg_temp.chk('no se pueden escribir metas de días pasados', true);
end $$;
do $$ begin
  update public.daily_goals set base_ml = 1000;
  perform pg_temp.chk('no se pueden editar metas guardadas', false);
exception when insufficient_privilege then perform pg_temp.chk('no se pueden editar metas guardadas', true);
end $$;

-- Perfil de hidratación: persistencia y validación
insert into public.hydration_profiles (age_range, weight_kg, exercise_minutes, exercise_intensity, heat, recommended_base_ml, recommended_extra_ml)
values ('31-50', 70, 45, 'moderada', 'nunca', 2100, 400);
select pg_temp.chk('perfil de hidratación se guarda', (select weight_kg from public.hydration_profiles) = 70);
update public.hydration_profiles set weight_kg = 72.5;
select pg_temp.chk('perfil de hidratación se actualiza', (select weight_kg from public.hydration_profiles) = 72.5);
do $$ begin
  update public.hydration_profiles set weight_kg = 5;
  perform pg_temp.chk('peso inválido rechazado', false);
exception when check_violation then perform pg_temp.chk('peso inválido rechazado', true);
end $$;
do $$ begin
  update public.hydration_profiles set age_range = 'menor';
  perform pg_temp.chk('no se guardan perfiles de menores (meta manual)', false);
exception when check_violation then perform pg_temp.chk('no se guardan perfiles de menores (meta manual)', true);
end $$;

-- Cambiar la meta no borra nada
select pg_temp.chk('cambiar la meta conserva registros, premios y racha',
  (select count(*) from public.intake_entries) = 2 and (select count(*) from public.reward_events) >= 5
  and (public.game_summary() ->> 'current_streak')::int = 2);

-- Otro usuario no ve nada de Dani
select pg_temp.como('00000000-0000-4000-8000-0000000000e5');
select pg_temp.chk('RLS: no ve el perfil de hidratación ajeno', (select count(*) from public.hydration_profiles) = 0);
select pg_temp.chk('RLS: no ve metas diarias ajenas', (select count(*) from public.daily_goals) = 0);
do $$ begin
  insert into public.hydration_profiles (user_id, age_range, weight_kg, exercise_minutes, heat, recommended_base_ml)
  values ('00000000-0000-4000-8000-0000000000d4', '18-30', 80, 0, 'nunca', 2400);
  perform pg_temp.chk('RLS: no escribe el perfil de otro', false);
exception when insufficient_privilege then perform pg_temp.chk('RLS: no escribe el perfil de otro', true);
end $$;

reset role;
select set_config('role', 'anon', true);
do $$ begin
  perform public.set_training_today(true);
  perform pg_temp.chk('anónimo no puede marcar entrenamiento', false);
exception when insufficient_privilege then perform pg_temp.chk('anónimo no puede marcar entrenamiento', true);
end $$;
reset role;

delete from auth.users where id in ('00000000-0000-4000-8000-0000000000d4', '00000000-0000-4000-8000-0000000000e5');
select pg_temp.chk('datos reales existentes intactos',
  (select e from antes) = (select count(*) from public.intake_entries) and (select r from antes) = (select count(*) from public.reward_events)
  and (select i from antes) = (select count(*) from public.inventory) and (select p from antes) = (select count(*) from public.pets)
  and (select g from antes) = (select coalesce(sum(goal_ml), 0) from public.profiles));
select n, case when ok then 'PASA' else 'FALLA' end as resultado, prueba, detalle from r7 order by n;
