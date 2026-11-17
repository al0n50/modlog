-- v1 data model: an exact car, and one list of mods that are either done or planned.
-- Backward compatible: existing columns keep working, and nothing is dropped.

-- ── Shared: keep updated_at current ──────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── Vehicles: the exact car ──────────────────────────────────────────
alter table public.vehicles
  add column if not exists body_class text,                       -- e.g. "Coupe", "Sport Utility Vehicle (SUV)"; drives the 3D model
  add column if not exists specs      jsonb not null default '{}'::jsonb,  -- engine, drivetrain, transmission, doors… from the VIN decode
  add column if not exists updated_at timestamptz not null default now();

update public.vehicles set vin = upper(trim(vin)) where vin is not null;
update public.vehicles set vin = null where vin = '';

alter table public.vehicles
  drop constraint if exists vehicles_year_range,
  add  constraint vehicles_year_range   check (year between 1886 and 2100),
  drop constraint if exists vehicles_make_present,
  add  constraint vehicles_make_present  check (length(btrim(make)) > 0),
  drop constraint if exists vehicles_model_present,
  add  constraint vehicles_model_present check (length(btrim(model)) > 0),
  drop constraint if exists vehicles_vin_format,
  add  constraint vehicles_vin_format    check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  drop constraint if exists vehicles_specs_object,
  add  constraint vehicles_specs_object  check (jsonb_typeof(specs) = 'object');

-- ── Mods: one table for done and planned work ────────────────────────
alter table public.mods
  add column if not exists status     text not null default 'done',
  add column if not exists url        text,
  add column if not exists priority   integer not null default 1,
  add column if not exists updated_at timestamptz not null default now();

-- Move any planned items from the old wishlist table into mods (no rows are deleted).
insert into public.mods (id, vehicle_id, name, category, brand, price, url, priority, status, created_at)
select w.id, w.vehicle_id, w.name, coalesce(w.category, 'Other'), w.brand, w.estimated_price, w.url,
       greatest(1, least(coalesce(w.priority, 1), 3)), 'planned', coalesce(w.created_at, now())
from public.wishlist_items w
on conflict (id) do nothing;

update public.mods set category = 'Other'
where category is null or category not in
  ('Engine','Suspension','Exterior','Interior','Wheels & Tires','Audio','Lighting','Brakes','Exhaust','Transmission','Other');

alter table public.mods
  alter column category set not null,
  drop constraint if exists mods_status_valid,
  add  constraint mods_status_valid   check (status in ('done', 'planned')),
  drop constraint if exists mods_category_valid,
  add  constraint mods_category_valid check (category in
    ('Engine','Suspension','Exterior','Interior','Wheels & Tires','Audio','Lighting','Brakes','Exhaust','Transmission','Other')),
  drop constraint if exists mods_name_present,
  add  constraint mods_name_present   check (length(btrim(name)) > 0),
  drop constraint if exists mods_price_nonnegative,
  add  constraint mods_price_nonnegative check (price is null or price >= 0),
  drop constraint if exists mods_priority_range,
  add  constraint mods_priority_range check (priority between 1 and 3);

comment on table public.wishlist_items is
  'Deprecated: planned mods now live in public.mods with status = ''planned''. Kept until removal is approved.';

-- ── Other rules ──────────────────────────────────────────────────────
alter table public.reactions
  drop constraint if exists reactions_type_valid,
  add  constraint reactions_type_valid check (type in ('fire', 'wrench', 'eye'));

alter table public.follows
  drop constraint if exists follows_not_self,
  add  constraint follows_not_self check (follower_id <> following_id);

-- ── updated_at triggers ──────────────────────────────────────────────
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.vehicles;
create trigger set_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.mods;
create trigger set_updated_at before update on public.mods     for each row execute function public.set_updated_at();

-- ── Indexes on the links between tables (Postgres does not add these) ─
create index if not exists vehicles_user_id_idx        on public.vehicles (user_id);
create index if not exists vehicles_public_recent_idx  on public.vehicles (created_at desc) where is_public;
create index if not exists mods_vehicle_status_idx     on public.mods (vehicle_id, status);
create index if not exists wishlist_items_vehicle_idx  on public.wishlist_items (vehicle_id);
create index if not exists build_events_vehicle_idx    on public.build_events (vehicle_id, created_at desc);
create index if not exists vehicle_photos_vehicle_idx  on public.vehicle_photos (vehicle_id);
create index if not exists reactions_user_idx          on public.reactions (user_id);
create index if not exists follows_following_idx       on public.follows (following_id);
