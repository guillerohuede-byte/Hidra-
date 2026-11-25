-- ─────────────────────────────────────────────────────────────
-- H2O · Migración 3: reglas del juego (rachas, premios, compras, importación)
-- Todo premio se otorga aquí, en el servidor, con una clave única.
-- Las mismas reglas están documentadas en lib/game/rules.ts.
-- ─────────────────────────────────────────────────────────────

-- Día actual del usuario en su zona horaria
create or replace function public.user_today(p_uid uuid)
returns date language sql stable security definer set search_path = '' as $$
  select (now() at time zone coalesce((select timezone from public.profiles where id = p_uid), 'America/Santiago'))::date;
$$;

-- Racha: un día cuenta si tiene al menos un registro (o un Escudo de Gota).
-- La racha sigue viva hasta el final del día de hoy aunque hoy aún no registres.
create or replace function public.streak_stats(p_uid uuid, p_today date)
returns table (current_streak integer, best_streak integer, active_today boolean)
language sql stable security definer set search_path = '' as $$
  with days as (
    select distinct local_date as d from public.intake_entries where user_id = p_uid and local_date <= p_today
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

-- Nivel a partir de la experiencia total: nivel L requiere 50·L·(L−1) XP
create or replace function public.level_for_xp(p_xp integer)
returns integer language sql immutable set search_path = '' as $$
  select greatest(1, floor((1 + sqrt(1 + 8 * greatest(p_xp, 0) / 100.0)) / 2)::int);
$$;

-- Otorga un premio una sola vez (por clave). Devuelve true si es nuevo.
create or replace function public._grant(p_uid uuid, p_key text, p_kind text, p_label text, p_gotitas int, p_xp int, p_shields int default 0)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_id bigint;
begin
  insert into public.reward_events (user_id, key, kind, label, gotitas, xp, shields)
  values (p_uid, p_key, p_kind, p_label, p_gotitas, p_xp, p_shields)
  on conflict (user_id, key) do nothing
  returning id into v_id;
  return v_id is not null;
end;
$$;
revoke execute on function public._grant(uuid, text, text, text, int, int, int) from public, anon, authenticated;

create or replace function public._give_item(p_uid uuid, p_item text)
returns void language sql security definer set search_path = '' as $$
  insert into public.inventory (user_id, item_id, source) values (p_uid, p_item, 'premio') on conflict do nothing;
$$;
revoke execute on function public._give_item(uuid, text) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- claim_rewards(): evalúa TODAS las reglas y otorga lo pendiente.
-- La app la llama al abrir y después de cada registro. Es idempotente.
-- ─────────────────────────────────────────────────────────────
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
     and not exists (select 1 from public.intake_entries where user_id = v_uid and local_date = v_today - 1)
     and not exists (select 1 from public.streak_freezes where user_id = v_uid and day = v_today - 1)
     and (exists (select 1 from public.intake_entries where user_id = v_uid and local_date = v_today - 2)
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
revoke execute on function public.claim_rewards() from public, anon;
grant execute on function public.claim_rewards() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Resumen para la app: saldo, XP, nivel, racha, escudos
-- ─────────────────────────────────────────────────────────────
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
    'freezes', coalesce((select json_agg(day order by day) from public.streak_freezes where user_id = v_uid), '[]'::json)
  );
end;
$$;
revoke execute on function public.game_summary() from public, anon;
grant execute on function public.game_summary() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- buy_item(): compra atómica. El precio lo pone la base de datos.
-- p_request_id evita cobrar dos veces por doble toque (consumibles).
-- ─────────────────────────────────────────────────────────────
create or replace function public.buy_item(p_item_id text, p_request_id uuid)
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item public.shop_items;
  v_balance int;
  v_shields int;
begin
  if v_uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 42));

  select * into v_item from public.shop_items where id = p_item_id and active;
  if not found then raise exception 'Ese artículo no existe' using errcode = 'P0001'; end if;
  if not v_item.purchasable then raise exception 'Este artículo solo se consigue como premio' using errcode = 'P0001'; end if;

  -- Reintento de la misma compra: no cobra de nuevo
  if exists (select 1 from public.reward_events where user_id = v_uid and key = 'buy:' || p_item_id || ':' || p_request_id) then
    return json_build_object('ok', true, 'repeated', true);
  end if;

  select coalesce(sum(gotitas), 0), coalesce(sum(shields), 0) into v_balance, v_shields
    from public.reward_events where user_id = v_uid;
  if v_balance < v_item.price then
    raise exception 'Te faltan % Gotitas', v_item.price - v_balance using errcode = 'P0001';
  end if;

  if v_item.slot = 'consumable' then
    if v_shields >= 3 then raise exception 'Ya tienes el máximo de 3 escudos' using errcode = 'P0001'; end if;
    perform public._grant(v_uid, 'buy:' || p_item_id || ':' || p_request_id, 'compra', 'Compra: ' || v_item.name, -v_item.price, 0, 1);
  else
    if exists (select 1 from public.inventory where user_id = v_uid and item_id = p_item_id) then
      raise exception 'Ya tienes este artículo' using errcode = 'P0001';
    end if;
    insert into public.inventory (user_id, item_id, source) values (v_uid, p_item_id, 'compra');
    perform public._grant(v_uid, 'buy:' || p_item_id || ':' || p_request_id, 'compra', 'Compra: ' || v_item.name, -v_item.price, 0);
  end if;

  return json_build_object('ok', true, 'balance', v_balance - v_item.price);
end;
$$;
revoke execute on function public.buy_item(text, uuid) from public, anon;
grant execute on function public.buy_item(text, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- import_local(): trae botellas, registros y meta guardados en el
-- navegador (localStorage). Se puede repetir sin duplicar nada.
-- Los registros importados NO dan premios (sí cuentan en historial y racha).
-- ─────────────────────────────────────────────────────────────
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
begin
  if v_uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if jsonb_typeof(p_payload) <> 'object' then raise exception 'Datos inválidos' using errcode = '22023'; end if;
  if jsonb_array_length(coalesce(p_payload -> 'entries', '[]')) > 20000 then raise exception 'Demasiados registros' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 42));

  -- Botellas (mismo código = mismo sticker)
  for b in select * from jsonb_array_elements(coalesce(p_payload -> 'bottles', '[]')) loop
    continue when (b ->> 'id') !~ '^B[A-Z2-9]{7}$';
    select user_id into v_owner from public.bottles where id = b ->> 'id';
    if found then
      if v_owner = v_uid then v_b_had := v_b_had + 1; else v_conflicts := v_conflicts || (b ->> 'id'); end if;
      continue;
    end if;
    v_name := left(btrim(coalesce(b ->> 'name', 'Mi botella')), 26);
    v_try := 1;
    while exists (select 1 from public.bottles where user_id = v_uid and deleted_at is null and lower(btrim(name)) = lower(v_name)) loop
      v_try := v_try + 1;
      v_name := left(btrim(coalesce(b ->> 'name', 'Mi botella')), 26) || ' (' || v_try || ')';
    end loop;
    insert into public.bottles (id, user_id, name, capacity_ml, default_amount_ml, color, tag_linked_at, created_at)
    values (
      b ->> 'id', v_uid, v_name,
      least(greatest(coalesce((b ->> 'capacityMl')::int, 750), 50), 5000),
      least(greatest(coalesce((b ->> 'defaultAmountMl')::int, 250), 1), least(greatest(coalesce((b ->> 'capacityMl')::int, 750), 50), 5000), 3000),
      case when (b ->> 'color') ~ '^#[0-9a-fA-F]{6}$' then b ->> 'color' else '#1f78ee' end,
      case when (b ->> 'tagLinkedAt') is not null then now() end,
      coalesce((b ->> 'createdAt')::timestamptz, now())
    );
    v_b_new := v_b_new + 1;
  end loop;

  -- Registros
  for e in select * from jsonb_array_elements(coalesce(p_payload -> 'entries', '[]')) loop
    if (e ->> 'id') is null or (e ->> 'date') !~ '^\d{4}-\d{2}-\d{2}$'
       or coalesce((e ->> 'amountMl')::int, 0) not between 1 and 3000 then
      v_e_skip := v_e_skip + 1; continue;
    end if;
    v_bottle := e ->> 'bottleId';
    if v_bottle is not null and not exists (select 1 from public.bottles where id = v_bottle and user_id = v_uid) then
      v_bottle := null;
    end if;
    v_ts := least(coalesce((e ->> 'timestamp')::timestamptz, now()), now());
    insert into public.intake_entries (user_id, client_key, amount_ml, logged_at, local_date, source, imported, bottle_id, bottle_name)
    values (
      v_uid, 'local:' || left(e ->> 'id', 70), (e ->> 'amountMl')::int, v_ts,
      least((e ->> 'date')::date, public.user_today(v_uid)),
      case when e ->> 'source' = 'nfc' then 'nfc' else 'manual' end,
      true, v_bottle, left(e ->> 'bottleName', 30)
    )
    on conflict (user_id, client_key) do nothing;
    get diagnostics v_rows = row_count;
    if v_rows = 1 then v_e_new := v_e_new + 1; else v_e_skip := v_e_skip + 1; end if;
  end loop;

  -- Meta
  if (p_payload ->> 'goalMl') ~ '^\d+$' and (p_payload ->> 'goalMl')::int between 1000 and 6000 then
    update public.profiles set goal_ml = (p_payload ->> 'goalMl')::int where id = v_uid;
  end if;
  update public.profiles set local_import_done_at = now() where id = v_uid;

  return json_build_object(
    'bottles_imported', v_b_new, 'bottles_already', v_b_had, 'bottles_conflict', to_json(v_conflicts),
    'entries_imported', v_e_new, 'entries_skipped', v_e_skip
  );
end;
$$;
revoke execute on function public.import_local(jsonb) from public, anon;
grant execute on function public.import_local(jsonb) to authenticated;

-- Funciones internas: no expuestas por la API
revoke execute on function public.streak_stats(uuid, date) from public, anon, authenticated;
revoke execute on function public.user_today(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
