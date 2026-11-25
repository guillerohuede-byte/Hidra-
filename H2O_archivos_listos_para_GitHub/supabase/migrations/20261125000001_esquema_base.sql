-- ─────────────────────────────────────────────────────────────
-- H2O · Migración 1: esquema base, perfiles y Row Level Security
-- Todas las tablas con datos de usuarios tienen RLS: cada usuario
-- solo ve y modifica lo suyo. Las tablas de premios/inventario NO
-- se pueden escribir desde el navegador: solo mediante funciones
-- seguras (migración 3), que validan las reglas del juego.
-- ─────────────────────────────────────────────────────────────

-- PERFILES ────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 40),
  timezone text not null default 'America/Santiago',
  goal_ml integer not null default 2000 check (goal_ml between 1000 and 6000),
  onboarded boolean not null default false,
  reduce_motion boolean not null default false,
  selected_bottle_id text,
  local_import_done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Validar zona horaria IANA
create or replace function public.is_valid_timezone(tz text)
returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = tz);
$$;
alter table public.profiles add constraint profiles_timezone_valid check (public.is_valid_timezone(timezone));

-- Perfil automático al crear la cuenta
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 40), ''));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- BOTELLAS ────────────────────────────────────────────────────
-- El id ES el código del sticker NFC (ej. B7K3QX9M): único y permanente.
create table public.bottles (
  id text primary key check (id ~ '^B[A-Z2-9]{7}$'),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  capacity_ml integer not null check (capacity_ml between 50 and 5000),
  default_amount_ml integer not null check (default_amount_ml between 1 and 3000),
  color text not null default '#1f78ee' check (color ~ '^#[0-9a-fA-F]{6}$'),
  tag_linked_at timestamptz,
  deleted_at timestamptz, -- borrado suave: el código queda reservado y el sticker avisa "eliminada"
  created_at timestamptz not null default now(),
  constraint bottles_amount_le_capacity check (default_amount_ml <= capacity_ml)
);
create index bottles_user_idx on public.bottles (user_id);
create unique index bottles_user_name_uniq on public.bottles (user_id, lower(btrim(name))) where deleted_at is null;

alter table public.profiles
  add constraint profiles_selected_bottle_fk foreign key (selected_bottle_id)
  references public.bottles (id) on delete set null;

-- REGISTROS DE HIDRATACIÓN ───────────────────────────────────
create table public.intake_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  client_key text not null check (char_length(client_key) between 1 and 80), -- evita duplicados por reintentos/doble toque
  amount_ml integer not null check (amount_ml between 1 and 3000),
  logged_at timestamptz not null default now(),
  local_date date not null, -- día del usuario según SU zona horaria (lo calcula el servidor)
  source text not null check (source in ('manual', 'nfc')),
  imported boolean not null default false, -- vino de localStorage: no otorga premios
  bottle_id text references public.bottles (id) on delete set null,
  bottle_name text check (char_length(bottle_name) <= 30),
  created_at timestamptz not null default now(),
  unique (user_id, client_key)
);
create index intake_user_date_idx on public.intake_entries (user_id, local_date);

-- El servidor fija la hora y el día: el navegador no puede inventar fechas.
create or replace function public.intake_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare tz text;
begin
  if not new.imported then
    new.user_id := auth.uid();
    new.logged_at := now();
  end if;
  select p.timezone into tz from public.profiles p where p.id = new.user_id;
  if not new.imported or new.local_date is null then
    new.local_date := (new.logged_at at time zone coalesce(tz, 'America/Santiago'))::date;
  end if;
  if new.bottle_id is not null then
    select b.name into new.bottle_name from public.bottles b
      where b.id = new.bottle_id and b.user_id = new.user_id and (new.imported or b.deleted_at is null);
    if not found then
      raise exception 'La botella no pertenece a este usuario' using errcode = '42501';
    end if;
    -- Primer uso del sticker: queda marcado como "funcionando"
    if new.source = 'nfc' and not new.imported then
      update public.bottles set tag_linked_at = now() where id = new.bottle_id and tag_linked_at is null;
    end if;
  end if;
  return new;
end;
$$;
create trigger intake_before_insert before insert on public.intake_entries
  for each row execute function public.intake_before_insert();

-- La botella seleccionada debe ser del mismo usuario
create or replace function public.profiles_check_selected()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.selected_bottle_id is not null and not exists (
    select 1 from public.bottles b where b.id = new.selected_bottle_id and b.user_id = new.id and b.deleted_at is null
  ) then
    raise exception 'Botella no válida' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger profiles_check_selected before update of selected_bottle_id on public.profiles
  for each row execute function public.profiles_check_selected();

-- MASCOTA ─────────────────────────────────────────────────────
create table public.pets (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  species text not null check (species ~ '^[a-z]{2,20}$'),
  name text not null check (char_length(btrim(name)) between 1 and 20),
  color text not null default 'base' check (color ~ '^[a-z0-9-]{1,20}$'),
  created_at timestamptz not null default now()
);

-- CATÁLOGO DE LA TIENDA (lectura pública para usuarios con sesión) ──
create table public.shop_items (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  slot text not null check (slot in ('top', 'pants', 'jacket', 'shoes', 'hat', 'glasses', 'accessory', 'costume', 'consumable')),
  brand text not null,
  name text not null,
  price integer not null check (price >= 0),
  rarity text not null check (rarity in ('comun', 'rara', 'epica', 'legendaria')),
  purchasable boolean not null default true, -- false = solo por logros/rachas/niveles
  sort integer not null default 0,
  active boolean not null default true
);

-- INVENTARIO Y EQUIPAMIENTO ──────────────────────────────────
create table public.inventory (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null references public.shop_items (id),
  source text not null check (source in ('compra', 'premio')),
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table public.pet_equipment (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  slot text not null check (slot in ('top', 'pants', 'jacket', 'shoes', 'hat', 'glasses', 'accessory', 'costume')),
  item_id text not null references public.shop_items (id),
  primary key (user_id, slot)
);

-- LIBRO DE PREMIOS: Gotitas, experiencia y escudos ───────────
-- Cada premio tiene una clave única por usuario (ej. 'goal:2026-11-25'),
-- por eso no se puede cobrar dos veces el mismo premio.
create table public.reward_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  key text not null,
  kind text not null,
  label text not null,
  gotitas integer not null default 0,
  xp integer not null default 0 check (xp >= 0),
  shields integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);
create index reward_events_user_idx on public.reward_events (user_id, created_at desc);

-- Días cubiertos por un Escudo de Gota
create table public.streak_freezes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.bottles enable row level security;
alter table public.intake_entries enable row level security;
alter table public.pets enable row level security;
alter table public.shop_items enable row level security;
alter table public.inventory enable row level security;
alter table public.pet_equipment enable row level security;
alter table public.reward_events enable row level security;
alter table public.streak_freezes enable row level security;

-- Perfil: leer y editar solo el propio, y solo columnas no sensibles
create policy "perfil propio: leer" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "perfil propio: editar" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke update on public.profiles from authenticated, anon;
grant update (display_name, timezone, goal_ml, onboarded, reduce_motion, selected_bottle_id) on public.profiles to authenticated;

-- Botellas: CRUD propio (borrar = borrado suave con deleted_at)
create policy "botellas propias: leer" on public.bottles for select to authenticated using ((select auth.uid()) = user_id);
create policy "botellas propias: crear" on public.bottles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "botellas propias: editar" on public.bottles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke update on public.bottles from authenticated, anon;
grant update (name, capacity_ml, default_amount_ml, color, deleted_at) on public.bottles to authenticated;

-- Registros: leer, crear y borrar los propios (no se editan: se borran y se crean)
create policy "registros propios: leer" on public.intake_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "registros propios: crear" on public.intake_entries for insert to authenticated
  with check ((select auth.uid()) = user_id and imported = false);
create policy "registros propios: borrar" on public.intake_entries for delete to authenticated using ((select auth.uid()) = user_id);

-- Mascota
create policy "mascota propia: leer" on public.pets for select to authenticated using ((select auth.uid()) = user_id);
create policy "mascota propia: crear" on public.pets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "mascota propia: editar" on public.pets for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Catálogo: lectura para usuarios con sesión
create policy "catalogo: leer" on public.shop_items for select to authenticated using (active);

-- Inventario y premios: solo lectura (se escriben mediante funciones seguras)
create policy "inventario propio: leer" on public.inventory for select to authenticated using ((select auth.uid()) = user_id);
create policy "premios propios: leer" on public.reward_events for select to authenticated using ((select auth.uid()) = user_id);
create policy "escudos propios: leer" on public.streak_freezes for select to authenticated using ((select auth.uid()) = user_id);

-- Equipamiento: solo prendas que el usuario posee y que calzan en ese espacio
create policy "equipo propio: leer" on public.pet_equipment for select to authenticated using ((select auth.uid()) = user_id);
create policy "equipo propio: quitar" on public.pet_equipment for delete to authenticated using ((select auth.uid()) = user_id);
create policy "equipo propio: poner" on public.pet_equipment for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.inventory i where i.user_id = (select auth.uid()) and i.item_id = pet_equipment.item_id)
  and exists (select 1 from public.shop_items s where s.id = pet_equipment.item_id and s.slot = pet_equipment.slot)
);
create policy "equipo propio: cambiar" on public.pet_equipment for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.inventory i where i.user_id = (select auth.uid()) and i.item_id = pet_equipment.item_id)
    and exists (select 1 from public.shop_items s where s.id = pet_equipment.item_id and s.slot = pet_equipment.slot)
  );

-- Nada para usuarios sin sesión
revoke all on all tables in schema public from anon;
