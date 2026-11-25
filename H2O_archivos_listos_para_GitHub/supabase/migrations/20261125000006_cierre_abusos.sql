-- ─────────────────────────────────────────────────────────────
-- H2O · Migración 6: cierre de abusos detectados en la revisión de producción
-- 1. La racha solo cuenta días registrados en la app (no importados):
--    antes, import_local con días inventados regalaba hitos de racha.
-- 2. import_local con límites (por llamada, por cuenta, fechas) y tolerante a datos malformados.
-- 3. Un registro "con sticker" (nfc) debe indicar una botella de la cuenta.
-- ─────────────────────────────────────────────────────────────

create or replace function public.streak_stats(p_uid uuid, p_today date)
returns table (current_streak integer, best_streak integer, active_today boolean)
language sql stable security definer set search_path = '' as $$
  with days as (
    select distinct local_date as d from public.intake_entries where user_id = p_uid and local_date <= p_today and not imported
    union
    select day from public.streak_freezes where user_id = p_uid and day <= p_today
  ),
  g as (select d, d - (row_number() over (order by d))::int as grp from days),
  runs as (select max(d) as e, count(*)::int as n from g group by grp)
  select
    coalesce((select n from runs where e >= p_today - 1 order by e desc limit 1), 0),
    coalesce((select max(n) from runs), 0),
    exists (select 1 from days where d = p_today);
$$;

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
  v_week := date_trunc('week', v_today)::date; -- lunes
  select coalesce(max(id), 0) into v_start from public.reward_events where user_id = v_uid;

  -- Bienvenida (una vez, al terminar el onboarding)
  if v_onboarded then
    perform public._grant(v_uid, 'welcome', 'bienvenida', '¡Bienvenida a H2O!', 50, 0);
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
    if v_sum >= v_goal then
      perform public._grant(v_uid, 'goal:' || r.d, 'meta', 'Meta diaria cumplida', 20, 50);
    end if;
  end loop;

  -- Misiones diarias
  select count(*), coalesce(sum(amount_ml), 0) into v_n, v_sum
    from public.intake_entries where user_id = v_uid and local_date = v_today and not imported;
  if v_n >= 3 then perform public._grant(v_uid, 'm:d:registro3:' || v_today, 'mision', 'Misión: 3 registros hoy', 10, 15); end if;
  if v_sum >= v_goal then perform public._grant(v_uid, 'm:d:meta:' || v_today, 'mision', 'Misión: cumple tu meta', 10, 15); end if;
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
      group by local_date having sum(amount_ml) >= v_goal) x) >= 3 then
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

create or replace function public.import_local(p_payload jsonb)
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  b jsonb; e jsonb;
  v_owner uuid;
  v_name text; v_try int;
  v_b_new int := 0; v_b_had int := 0; v_conflicts text[] := '{}';
  v_e_new int := 0; v_e_skip int := 0;
  v_rows int;
  v_bottle text;
  v_ts timestamptz;
  v_created timestamptz;
  v_date date;
  v_cap int; v_amt int;
  v_today date;
  v_room int;
begin
  if v_uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if jsonb_typeof(p_payload) <> 'object' then raise exception 'Datos inválidos' using errcode = '22023'; end if;
  if jsonb_typeof(coalesce(p_payload -> 'entries', '[]')) <> 'array' or jsonb_typeof(coalesce(p_payload -> 'bottles', '[]')) <> 'array' then
    raise exception 'Datos inválidos' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(p_payload -> 'entries', '[]')) > 5000 or jsonb_array_length(coalesce(p_payload -> 'bottles', '[]')) > 50 then
    raise exception 'Demasiados registros' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 42));
  v_today := public.user_today(v_uid);
  -- Tope total por cuenta: la importación es para traer el historial, no para llenar la base
  select 5000 - count(*) into v_room from public.intake_entries where user_id = v_uid and imported;

  -- Botellas (mismo código = mismo sticker)
  for b in select * from jsonb_array_elements(coalesce(p_payload -> 'bottles', '[]')) loop
    continue when jsonb_typeof(b) <> 'object' or coalesce(b ->> 'id', '') !~ '^B[A-Z2-9]{7}$';
    select user_id into v_owner from public.bottles where id = b ->> 'id';
    if found then
      if v_owner = v_uid then v_b_had := v_b_had + 1; else v_conflicts := v_conflicts || (b ->> 'id'); end if;
      continue;
    end if;
    v_name := left(btrim(coalesce(nullif(btrim(b ->> 'name'), ''), 'Mi botella')), 26);
    v_try := 1;
    while exists (select 1 from public.bottles where user_id = v_uid and deleted_at is null and lower(btrim(name)) = lower(v_name)) loop
      v_try := v_try + 1;
      v_name := left(btrim(coalesce(nullif(btrim(b ->> 'name'), ''), 'Mi botella')), 26) || ' (' || v_try || ')';
    end loop;
    v_cap := case when (b ->> 'capacityMl') ~ '^\d{1,5}$' then least(greatest((b ->> 'capacityMl')::int, 50), 5000) else 750 end;
    v_amt := case when (b ->> 'defaultAmountMl') ~ '^\d{1,5}$' then least(greatest((b ->> 'defaultAmountMl')::int, 1), v_cap, 3000) else least(250, v_cap) end;
    begin
      v_created := least(coalesce((b ->> 'createdAt')::timestamptz, now()), now());
    exception when others then v_created := now();
    end;
    insert into public.bottles (id, user_id, name, capacity_ml, default_amount_ml, color, tag_linked_at, created_at)
    values (
      b ->> 'id', v_uid, v_name, v_cap, v_amt,
      case when (b ->> 'color') ~ '^#[0-9a-fA-F]{6}$' then b ->> 'color' else '#1f78ee' end,
      case when (b ->> 'tagLinkedAt') is not null then now() end,
      v_created
    );
    v_b_new := v_b_new + 1;
  end loop;

  -- Registros (no dan premios ni cuentan para la racha: solo historial)
  for e in select * from jsonb_array_elements(coalesce(p_payload -> 'entries', '[]')) loop
    if jsonb_typeof(e) <> 'object' or coalesce(e ->> 'id', '') = ''
       or coalesce(e ->> 'date', '') !~ '^\d{4}-\d{2}-\d{2}$'
       or coalesce(e ->> 'amountMl', '') !~ '^\d{1,4}$'
       or (e ->> 'amountMl')::int not between 1 and 3000 then
      v_e_skip := v_e_skip + 1; continue;
    end if;
    begin
      v_date := (e ->> 'date')::date;
    exception when others then v_e_skip := v_e_skip + 1; continue;
    end;
    if v_date < v_today - 400 or v_date > v_today then v_e_skip := v_e_skip + 1; continue; end if;
    if exists (select 1 from public.intake_entries where user_id = v_uid and client_key = 'local:' || left(e ->> 'id', 70)) then
      v_e_skip := v_e_skip + 1; continue;
    end if;
    if v_room <= 0 then v_e_skip := v_e_skip + 1; continue; end if;
    v_bottle := e ->> 'bottleId';
    if v_bottle is not null and not exists (select 1 from public.bottles where id = v_bottle and user_id = v_uid) then
      v_bottle := null;
    end if;
    begin
      v_ts := least(coalesce((e ->> 'timestamp')::timestamptz, v_date::timestamptz), now());
    exception when others then v_ts := least(v_date::timestamptz, now());
    end;
    insert into public.intake_entries (user_id, client_key, amount_ml, logged_at, local_date, source, imported, bottle_id, bottle_name)
    values (
      v_uid, 'local:' || left(e ->> 'id', 70), (e ->> 'amountMl')::int, v_ts, v_date,
      case when e ->> 'source' = 'nfc' then 'nfc' else 'manual' end,
      true, v_bottle, left(e ->> 'bottleName', 30)
    )
    on conflict (user_id, client_key) do nothing;
    get diagnostics v_rows = row_count;
    if v_rows = 1 then v_e_new := v_e_new + 1; v_room := v_room - 1; else v_e_skip := v_e_skip + 1; end if;
  end loop;

  -- Meta
  if (p_payload ->> 'goalMl') ~ '^\d{1,5}$' and (p_payload ->> 'goalMl')::int between 1000 and 6000 then
    update public.profiles set goal_ml = (p_payload ->> 'goalMl')::int where id = v_uid;
  end if;
  update public.profiles set local_import_done_at = now() where id = v_uid;

  return json_build_object(
    'bottles_imported', v_b_new, 'bottles_already', v_b_had, 'bottles_conflict', to_json(v_conflicts),
    'entries_imported', v_e_new, 'entries_skipped', v_e_skip
  );
end;
$$;

alter table public.intake_entries
  add constraint intake_nfc_requires_bottle check (imported or source <> 'nfc' or bottle_id is not null);

-- Mantener permisos (create or replace los conserva; se repiten por claridad)
revoke execute on function public.streak_stats(uuid, date) from public, anon, authenticated;
revoke execute on function public.claim_rewards() from public, anon;
grant execute on function public.claim_rewards() to authenticated;
revoke execute on function public.import_local(jsonb) from public, anon;
grant execute on function public.import_local(jsonb) to authenticated;
