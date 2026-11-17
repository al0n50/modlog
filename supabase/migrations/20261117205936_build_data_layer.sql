-- Phase 4: the database owns the build history, build summaries, and the 3D model catalog.

-- ── 1. Build timeline is written by the database ─────────────────────
-- Before: the app inserted timeline events itself after each change, so a failed second
-- request left gaps and any user could write made-up history. Now every change to a mod
-- records its own event, in the same transaction, and clients can no longer insert events.
create or replace function public.log_mod_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  label text;
begin
  if tg_op = 'INSERT' then
    label := case when coalesce(new.category, 'Other') <> 'Other' then new.category || ': ' else '' end || new.name;
    insert into public.build_events (vehicle_id, event_type, description, metadata)
    values (new.vehicle_id,
            case when new.status = 'planned' then 'mod_planned' else 'mod_added' end,
            case when new.status = 'planned' then 'Planned ' else 'Added ' end || label,
            jsonb_build_object('mod_id', new.id, 'category', new.category, 'price', new.price));
    return new;

  elsif tg_op = 'UPDATE' then
    if old.status = 'planned' and new.status = 'done' then
      insert into public.build_events (vehicle_id, event_type, description, metadata)
      values (new.vehicle_id, 'wishlist_promoted', 'Installed from wishlist: ' || new.name,
              jsonb_build_object('mod_id', new.id, 'category', new.category, 'price', new.price));
    end if;
    return new;

  else -- DELETE
    -- When the whole car is deleted its mods go with it; there's no timeline left to write to.
    if exists (select 1 from public.vehicles v where v.id = old.vehicle_id) then
      insert into public.build_events (vehicle_id, event_type, description, metadata)
      values (old.vehicle_id,
              case when old.status = 'planned' then 'plan_removed' else 'mod_removed' end,
              case when old.status = 'planned' then 'Dropped from plan: ' else 'Removed: ' end || old.name,
              jsonb_build_object('mod_id', old.id, 'category', old.category));
    end if;
    return old;
  end if;
end;
$$;
revoke execute on function public.log_mod_event() from public, anon, authenticated;

drop trigger if exists log_mod_event on public.mods;
create trigger log_mod_event
  after insert or delete or update of status on public.mods
  for each row execute function public.log_mod_event();

drop policy if exists build_events_insert_own on public.build_events;
revoke insert, update on public.build_events from anon, authenticated;

-- ── 2. Paint color and body style (what the 3D garage needs) ─────────
-- color: the car's paint as a hex color (e.g. #1E3A8A), used to paint body-style models.
update public.vehicles set color = null where color is not null and color !~ '^#[0-9A-Fa-f]{6}$';
alter table public.vehicles drop constraint if exists vehicles_color_hex;
alter table public.vehicles add constraint vehicles_color_hex check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');

-- NHTSA's body class ("Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)") → one of
-- the body styles there is a generic 3D model for.
create or replace function public.body_style_for(body_class text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when body_class is null or btrim(body_class) = ''                         then null
    when body_class ilike '%pickup%'                                           then 'pickup'
    when body_class ilike '%minivan%'                                          then 'minivan'
    when body_class ilike '%van%'                                              then 'van'
    when body_class ~* '(sport utility|crossover|\mSUV\M|\mCUV\M)'             then 'suv'
    when body_class ~* '(convertible|cabriolet|roadster)'                      then 'convertible'
    when body_class ilike '%wagon%'                                            then 'wagon'
    when body_class ~* '(hatchback|liftback)'                                  then 'hatchback'
    when body_class ilike '%coupe%'                                            then 'coupe'
    when body_class ~* '(sedan|saloon)'                                        then 'sedan'
    else null
  end
$$;

alter table public.vehicles add column if not exists body_style text;
alter table public.vehicles drop constraint if exists vehicles_body_style_known;
alter table public.vehicles add constraint vehicles_body_style_known check (
  body_style is null or body_style in ('sedan', 'coupe', 'convertible', 'hatchback', 'wagon', 'suv', 'pickup', 'minivan', 'van'));

-- Fill body_style from the VIN's body class unless the owner picked one.
create or replace function public.set_body_style()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.body_style is null
     or (tg_op = 'UPDATE' and new.body_class is distinct from old.body_class and new.body_style is not distinct from old.body_style) then
    new.body_style := coalesce(public.body_style_for(new.body_class), new.body_style);
  end if;
  return new;
end;
$$;
revoke execute on function public.set_body_style() from public, anon, authenticated;
drop trigger if exists set_body_style on public.vehicles;
create trigger set_body_style before insert or update of body_class, body_style on public.vehicles
  for each row execute function public.set_body_style();
update public.vehicles set body_style = public.body_style_for(body_class) where body_style is null;

-- ── 3. 3D model catalog (Option B) ───────────────────────────────────
-- 'exact'      — a model of a specific make/model/year range (popular cars)
-- 'body_style' — a generic shape for everything else, painted in the car's color
-- asset_path is the file's path in the car-models bucket; null until the file is uploaded.
create table if not exists public.car_models (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('exact', 'body_style')),
  make        text,
  model       text,
  year_from   integer,
  year_to     integer,
  body_style  text not null check (body_style in ('sedan', 'coupe', 'convertible', 'hatchback', 'wagon', 'suv', 'pickup', 'minivan', 'van')),
  asset_path  text,
  license     text,
  attribution text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint car_models_kind_fields check (
    (kind = 'exact' and make is not null and model is not null and year_from is not null
       and year_to is not null and year_from <= year_to)
    or (kind = 'body_style' and make is null and model is null and year_from is null and year_to is null)),
  constraint car_models_asset_needs_license check (asset_path is null or license is not null)
);
create unique index if not exists car_models_one_per_body_style on public.car_models (body_style) where kind = 'body_style';
create index if not exists car_models_exact_lookup on public.car_models (lower(make), lower(model)) where kind = 'exact';
drop trigger if exists set_updated_at on public.car_models;
create trigger set_updated_at before update on public.car_models for each row execute function public.set_updated_at();

alter table public.car_models enable row level security;
drop policy if exists car_models_select_all on public.car_models;
create policy car_models_select_all on public.car_models for select to anon, authenticated using (true);
-- Catalog is curated by the site owner (dashboard / service role); apps can only read it.
revoke insert, update, delete on public.car_models from anon, authenticated;

insert into public.car_models (kind, body_style)
select 'body_style', s from unnest(array['sedan', 'coupe', 'convertible', 'hatchback', 'wagon', 'suv', 'pickup', 'minivan', 'van']) s
on conflict do nothing;

-- The 3D model to show for a car: an exact model whose file is uploaded, otherwise the
-- car's body style (sedan when unknown). Security invoker: only cars you can see resolve.
create or replace function public.car_model_for(v_id uuid)
returns setof public.car_models
language sql
stable
security invoker
set search_path = ''
as $$
  select cm.*
  from public.vehicles v
  join public.car_models cm
    on (cm.kind = 'exact' and cm.asset_path is not null
        and lower(cm.make) = lower(v.make) and lower(cm.model) = lower(v.model)
        and v.year between cm.year_from and cm.year_to)
    or (cm.kind = 'body_style' and cm.body_style = coalesce(v.body_style, 'sedan'))
  where v.id = v_id
  order by (cm.kind = 'exact') desc, (cm.year_to - cm.year_from) asc nulls last
  limit 1
$$;

-- Model files: public to read (they're not personal), only the site owner uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('car-models', 'car-models', true, 52428800, array['model/gltf-binary'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── 4. Build summaries ───────────────────────────────────────────────
-- One row per car with what lists need (counts, totals, latest mods, owner), so feeds
-- don't download every mod of every car. security_invoker: the caller's privacy rules apply.
drop view if exists public.vehicle_summaries;
create view public.vehicle_summaries with (security_invoker = true) as
select
  v.id, v.user_id, v.year, v.make, v.model, v.trim, v.body_class, v.body_style, v.color,
  v.cover_image, v.is_public, v.created_at, v.updated_at,
  p.username, p.display_name, p.avatar_url,
  coalesce(s.done_count, 0)      as done_count,
  coalesce(s.planned_count, 0)   as planned_count,
  coalesce(s.total_spent, 0)     as total_spent,
  coalesce(s.planned_budget, 0)  as planned_budget,
  s.last_activity_at,
  coalesce(r.recent_mods, '[]'::jsonb) as recent_mods
from public.vehicles v
left join public.profiles p on p.id = v.user_id
left join lateral (
  select count(*) filter (where m.status = 'done')    as done_count,
         count(*) filter (where m.status = 'planned') as planned_count,
         sum(m.price) filter (where m.status = 'done')    as total_spent,
         sum(m.price) filter (where m.status = 'planned') as planned_budget,
         max(m.updated_at) as last_activity_at
  from public.mods m where m.vehicle_id = v.id
) s on true
left join lateral (
  select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'category', x.category) order by x.created_at desc) as recent_mods
  from (select m.id, m.name, m.category, m.created_at from public.mods m
        where m.vehicle_id = v.id and m.status = 'done' order by m.created_at desc limit 4) x
) r on true;

revoke all on public.vehicle_summaries from anon, authenticated;
grant select on public.vehicle_summaries to anon, authenticated;
create index if not exists mods_vehicle_done_recent_idx on public.mods (vehicle_id, created_at desc) where status = 'done';
