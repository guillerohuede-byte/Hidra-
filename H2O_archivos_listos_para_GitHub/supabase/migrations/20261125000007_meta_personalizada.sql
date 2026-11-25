-- ─────────────────────────────────────────────────────────────
-- Hidra · Migración 7: meta personalizada, días de entrenamiento y metas por día
-- • hydration_profiles: respuestas del cálculo (sin datos médicos), solo del dueño.
-- • profiles.training_extra_ml / goal_source: ajuste de días de entrenamiento y origen de la meta.
-- • daily_goals: la meta de CADA día queda guardada. Los premios de meta se evalúan con la
--   meta de ese día, así cambiar la meta nunca altera días pasados ni da premios retroactivos.
-- • set_training_today(): marca/desmarca HOY como día de entrenamiento (nunca días pasados).
-- No modifica registros, rachas, Gotitas, compras, mascotas ni logros existentes.
-- ─────────────────────────────────────────────────────────────

-- 1. Perfil: ajuste de entrenamiento y origen de la meta
alter table public.profiles
  add column training_extra_ml integer not null default 0 check (training_extra_ml between 0 and 2000),
  add column goal_source text not null default 'manual' check (goal_source in ('manual', 'calculada'));
grant update (training_extra_ml, goal_source) on public.profiles to authenticated;

-- 2. Respuestas del cálculo (para volver a calcular). Sin diagnósticos ni datos médicos.
create table public.hydration_profiles (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  age_range text not null check (age_range in ('18-30', '31-50', '51-70', '71+')),
  weight_kg numeric(5, 1) not null check (weight_kg between 30 and 250),
  exercise_minutes smallint not null check (exercise_minutes in (0, 20, 45, 75, 105)),
  exercise_intensity text check (exercise_intensity in ('suave', 'moderada', 'intensa')),
  heat text not null check (heat in ('nunca', 'a_veces', 'frecuente')),
  method_version text not null default 'v1' check (char_length(method_version) <= 10),
  recommended_base_ml integer not null check (recommended_base_ml between 1000 and 6000),
  recommended_extra_ml integer not null default 0 check (recommended_extra_ml between 0 and 2000),
  updated_at timestamptz not null default now(),
  check (exercise_minutes = 0 or exercise_intensity is not null)
);
alter table public.hydration_profiles enable row level security;
create policy "hidratación propia: leer" on public.hydration_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "hidratación propia: crear" on public.hydration_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "hidratación propia: editar" on public.hydration_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "hidratación propia: borrar" on public.hydration_profiles for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.hydration_profiles to authenticated;
revoke all on public.hydration_profiles from anon;
create trigger hydration_profiles_touch before update on public.hydration_profiles
  for each row execute function public.touch_updated_at();

-- 3. Meta guardada por día (solo lectura para el usuario; la escriben las funciones)
create table public.daily_goals (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  base_ml integer not null check (base_ml between 1000 and 6000),
  extra_ml integer not null default 0 check (extra_ml between 0 and 2000),
  training boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.daily_goals enable row level security;
create policy "metas diarias propias: leer" on public.daily_goals for select to authenticated using ((select auth.uid()) = user_id);
grant select on public.daily_goals to authenticated;
revoke all on public.daily_goals from anon;

-- Guarda la meta del día (si aún no existe) con la meta actual del perfil
create or replace function public._ensure_day_goal(p_uid uuid, p_day date)
returns void language sql security definer set search_path = '' as $$
  insert into public.daily_goals (user_id, day, base_ml, extra_ml, training)
  select id, p_day, goal_ml, training_extra_ml, false from public.profiles where id = p_uid
  on conflict (user_id, day) do nothing;
$$;
revoke execute on function public._ensure_day_goal(uuid, date) from public, anon, authenticated;

-- Meta de un día: la guardada ese día; si no hay (días sin registros), la actual
create or replace function public.goal_for(p_uid uuid, p_day date)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select base_ml + case when training then extra_ml else 0 end from public.daily_goals where user_id = p_uid and day = p_day),
    (select goal_ml from public.profiles where id = p_uid),
    2000);
$$;
revoke execute on function public.goal_for(uuid, date) from public, anon, authenticated;

-- Cada día con registros guarda su meta en el momento del primer registro
create or replace function public.intake_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not new.imported then perform public._ensure_day_goal(new.user_id, new.local_date); end if;
  return null;
end;
$$;
revoke execute on function public.intake_after_insert() from public, anon, authenticated;
create trigger intake_snapshot_goal after insert on public.intake_entries
  for each row execute function public.intake_after_insert();

-- Cambiar la meta o el ajuste de entrenamiento afecta HOY (y días futuros), nunca días anteriores
create or replace function public.profiles_goal_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.daily_goals (user_id, day, base_ml, extra_ml, training)
  values (new.id, public.user_today(new.id), new.goal_ml, new.training_extra_ml, false)
  on conflict (user_id, day) do update set base_ml = excluded.base_ml, extra_ml = excluded.extra_ml;
  return null;
end;
$$;
revoke execute on function public.profiles_goal_changed() from public, anon, authenticated;
create trigger profiles_goal_changed after update of goal_ml, training_extra_ml on public.profiles
  for each row when (old.goal_ml is distinct from new.goal_ml or old.training_extra_ml is distinct from new.training_extra_ml)
  execute function public.profiles_goal_changed();

-- Hoy entreno / hoy descanso (solo el día de hoy)
create or replace function public.set_training_today(p_training boolean)
returns json language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_today date;
begin
  if v_uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if p_training is null then raise exception 'Datos inválidos' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 42));
  v_today := public.user_today(v_uid);
  perform public._ensure_day_goal(v_uid, v_today);
  update public.daily_goals set training = p_training where user_id = v_uid and day = v_today;
  return json_build_object('day', v_today, 'training', p_training, 'goal_ml', public.goal_for(v_uid, v_today));
end;
$$;
revoke execute on function public.set_training_today(boolean) from public, anon;
grant execute on function public.set_training_today(boolean) to authenticated;

-- 4. Premios: la meta se compara con la meta de cada día
create or replace function public.claim_rewards()
returns setof public.reward_events
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
  v_goal int;
  v_onboarded boolean;
  v_start bigint;
  v_n int;
  v_sum int;
  v_k int;
  v_cur int;
  v_shields int;
  v_week date;
  v_xp int;
  v_level int;
  v_lvl int;
  r record;
begin
  if v_uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 42));

  select goal_ml, onboarded into v_goal, v_onboarded from public.profiles where id = v_uid;
  if not found then return; end if;
  v_today := public.user_today(v_uid);
  perform public._ensure_day_goal(v_uid, v_today); -- la meta de hoy queda guardada
  v_week := date_trunc('week', v_today)::date; -- lunes
  select coalesce(max(id), 0) into v_start from public.reward_events where user_id = v_uid;

  -- Bienvenida (una vez, al terminar el onboarding)
  if v_onboarded then
    perform public._grant(v_uid, 'welcome', 'bienvenida', '¡Bienvenida a Hidra!', 50, 0);
  end if;

  -- Recompensa diaria por volver (una por día, pequeña a propósito)
  perform public._grant(v_uid, 'login:' || v_today, 'diaria', 'Recompensa diaria', 5, 5);

  -- Escudo de Gota automático: cubre AYER si ayer no hubo registro y la racha venía viva
  select coalesce(sum(shields), 0) into v_shields from public.reward_events where user_id = v_uid;
  if v_shields > 0
     and not exists (select 1 from public.intake_entries where user_id = v_uid and local_date = v_today - 1 and not imported)
     and not exists (select 1 from public.streak_freezes where user_id = v_uid and day = v_today - 1)
     and (exists (select 1 from public.intake_entries where user_id = v_uid and local_date = v_today - 2 and not imported)
          or exists (select 1 from public.streak_freezes where user_id = v_uid and day = v_today - 2))
  then
    insert into public.streak_freezes (user_id, day) values (v_uid, v_today - 1) on conflict do nothing;
    perform public._grant(v_uid, 'freeze:' || (v_today - 1), 'escudo', 'Escudo de Gota protegió tu racha', 0, 0, -1);
  end if;

  -- Registros de hoy y de ayer (ayer por si cumpliste justo antes de medianoche)
  for r in select gs::date as d from generate_series(v_today - 1, v_today, interval '1 day') as gs loop
    select count(*), coalesce(sum(amount_ml), 0) into v_n, v_sum
      from public.intake_entries where user_id = v_uid and local_date = r.d and not imported;
    -- XP por registrar: máximo 6 registros premiados por día (no incentiva tomar de más)
    for v_k in 1 .. least(v_n, 6) loop
      perform public._grant(v_uid, 'drink:' || r.d || ':' || v_k, 'registro', 'Registro de agua', 2, 10);
    end loop;
    if v_sum >= public.goal_for(v_uid, r.d) then -- meta de ESE día (no la actual)
      perform public._grant(v_uid, 'goal:' || r.d, 'meta', 'Meta diaria cumplida', 20, 50);
    end if;
  end loop;

  -- Misiones diarias
  select count(*), coalesce(sum(amount_ml), 0) into v_n, v_sum
    from public.intake_entries where user_id = v_uid and local_date = v_today and not imported;
  if v_n >= 3 then perform public._grant(v_uid, 'm:d:registro3:' || v_today, 'mision', 'Misión: 3 registros hoy', 10, 15); end if;
  if v_sum >= public.goal_for(v_uid, v_today) then perform public._grant(v_uid, 'm:d:meta:' || v_today, 'mision', 'Misión: cumple tu meta', 10, 15); end if;
  if exists (select 1 from public.intake_entries where user_id = v_uid and local_date = v_today and source = 'nfc' and not imported) then
    perform public._grant(v_uid, 'm:d:nfc:' || v_today, 'mision', 'Misión: registra con tu sticker', 10, 15);
  end if;

  -- Misiones semanales (lunes a domingo)
  if (select count(distinct local_date) from public.intake_entries
      where user_id = v_uid and not imported and local_date between v_week and v_week + 6) >= 5 then
    perform public._grant(v_uid, 'm:w:dias5:' || v_week, 'mision', 'Misión semanal: 5 días con registro', 40, 40);
  end if;
  if (select count(*) from (select local_date from public.intake_entries
      where user_id = v_uid and not imported and local_date between v_week and v_week + 6
      group by local_date having sum(amount_ml) >= public.goal_for(v_uid, local_date)) x) >= 3 then
    perform public._grant(v_uid, 'm:w:metas3:' || v_week, 'mision', 'Misión semanal: 3 metas cumplidas', 40, 40);
  end if;
  if (select count(*) from public.intake_entries
      where user_id = v_uid and not imported and source = 'nfc' and local_date between v_week and v_week + 6) >= 3 then
    perform public._grant(v_uid, 'm:w:nfc3:' || v_week, 'mision', 'Misión semanal: 3 registros con sticker', 30, 30);
  end if;
  if (select count(*) from public.reward_events where user_id = v_uid
      and key in ('m:w:dias5:' || v_week, 'm:w:metas3:' || v_week, 'm:w:nfc3:' || v_week)) = 3 then
    perform public._grant(v_uid, 'm:w:todas:' || v_week, 'mision', '¡Todas las misiones de la semana!', 50, 50);
  end if;

  -- Logros permanentes
  if exists (select 1 from public.intake_entries where user_id = v_uid and not imported) then
    perform public._grant(v_uid, 'a:primer-registro', 'logro', 'Logro: primer registro', 10, 20);
  end if;
  if exists (select 1 from public.intake_entries where user_id = v_uid and not imported and source = 'nfc') then
    perform public._grant(v_uid, 'a:primer-nfc', 'logro', 'Logro: primera toma con sticker', 15, 20);
  end if;
  if (select count(*) from public.reward_events where user_id = v_uid and kind = 'meta') >= 5 then
    perform public._grant(v_uid, 'a:metas5', 'logro', 'Logro: 5 metas cumplidas', 30, 50);
  end if;
  if (select count(distinct local_date) from public.intake_entries where user_id = v_uid and not imported) >= 7 then
    perform public._grant(v_uid, 'a:semana', 'logro', 'Logro: 7 días registrando', 30, 50);
  end if;
  if exists (select 1 from public.inventory where user_id = v_uid and source = 'compra') then
    perform public._grant(v_uid, 'a:primera-prenda', 'logro', 'Logro: primer accesorio', 10, 20);
  end if;

  -- Hitos de racha (una vez cada uno)
  select current_streak into v_cur from public.streak_stats(v_uid, v_today);
  if v_cur >= 3 then perform public._grant(v_uid, 'streak:3', 'racha', 'Racha de 3 días', 15, 30); end if;
  if v_cur >= 7 then perform public._grant(v_uid, 'streak:7', 'racha', 'Racha de 7 días + Escudo de Gota', 40, 60, 1); end if;
  if v_cur >= 14 then perform public._grant(v_uid, 'streak:14', 'racha', 'Racha de 14 días', 60, 80); end if;
  if v_cur >= 30 then
    if public._grant(v_uid, 'streak:30', 'racha', 'Racha de 30 días + Escudo + Medalla', 120, 120, 1) then
      perform public._give_item(v_uid, 'medalla-water-club');
    end if;
  end if;
  if v_cur >= 60 then perform public._grant(v_uid, 'streak:60', 'racha', 'Racha de 60 días', 200, 150); end if;
  if v_cur >= 100 then
    if public._grant(v_uid, 'streak:100', 'racha', 'Racha de 100 días + Corona de Gotas', 400, 200) then
      perform public._give_item(v_uid, 'corona-gotas');
    end if;
  end if;

  -- Niveles (al final: usan toda la XP acumulada)
  select coalesce(sum(xp), 0) into v_xp from public.reward_events where user_id = v_uid;
  v_level := public.level_for_xp(v_xp);
  for v_lvl in 2 .. v_level loop
    if public._grant(v_uid, 'level:' || v_lvl, 'nivel', '¡Subiste al nivel ' || v_lvl || '!', 10 * v_lvl, 0) then
      if v_lvl = 5 then perform public._give_item(v_uid, 'bufanda-marejada'); end if;
      if v_lvl = 10 then perform public._give_item(v_uid, 'capa-tsunami'); end if;
    end if;
  end loop;

  return query select * from public.reward_events where user_id = v_uid and id > v_start order by id;
end;
$$;

create or replace function public.game_summary()
returns json language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
  v_xp int; v_g int; v_sh int; v_level int;
  s record;
begin
  if v_uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  v_today := public.user_today(v_uid);
  select coalesce(sum(xp), 0), coalesce(sum(gotitas), 0), coalesce(sum(shields), 0)
    into v_xp, v_g, v_sh from public.reward_events where user_id = v_uid;
  v_level := public.level_for_xp(v_xp);
  select * into s from public.streak_stats(v_uid, v_today);
  return json_build_object(
    'today', v_today,
    'xp', v_xp,
    'level', v_level,
    'level_xp_start', 50 * v_level * (v_level - 1),
    'level_xp_next', 50 * (v_level + 1) * v_level,
    'gotitas', v_g,
    'shields', v_sh,
    'current_streak', s.current_streak,
    'best_streak', s.best_streak,
    'active_today', s.active_today,
    'today_goal_ml', public.goal_for(v_uid, v_today),
    'base_goal_ml', (select goal_ml from public.profiles where id = v_uid),
    'training_extra_ml', (select training_extra_ml from public.profiles where id = v_uid),
    'training_today', coalesce((select training from public.daily_goals where user_id = v_uid and day = v_today), false),
    'freezes', coalesce((select json_agg(day order by day) from public.streak_freezes where user_id = v_uid), '[]'::json)
  );
end;
$$;

revoke execute on function public.claim_rewards() from public, anon;
grant execute on function public.claim_rewards() to authenticated;
revoke execute on function public.game_summary() from public, anon;
grant execute on function public.game_summary() to authenticated;

-- 5. Días anteriores con registros: quedan con la meta que el usuario tiene hoy
--    (así un cambio de meta futuro no reabre premios de días pasados).
insert into public.daily_goals (user_id, day, base_ml, extra_ml, training)
select distinct e.user_id, e.local_date, p.goal_ml, 0, false
from public.intake_entries e join public.profiles p on p.id = e.user_id
where not e.imported
on conflict (user_id, day) do nothing;
