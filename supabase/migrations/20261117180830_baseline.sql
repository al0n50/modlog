-- Baseline: the ModLog schema as it existed in production on 2026-11-17,
-- captured from the live database (it was originally built by hand in the dashboard).
-- Idempotent, so it can be registered against the existing production database
-- and also builds a fresh database from scratch.

-- ── Tables ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique,
  display_name text,
  avatar_url   text,
  bio          text,
  created_at   timestamptz default now()
);

create table if not exists public.vehicles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  vin         text,
  year        integer not null,
  make        text not null,
  model       text not null,
  trim        text,
  color       text,
  cover_image text,
  is_public   boolean default false,
  created_at  timestamptz default now()
);

create table if not exists public.mods (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references public.vehicles (id) on delete cascade,
  name         text not null,
  category     text default 'Other',
  brand        text,
  part_number  text,
  price        numeric,
  install_date date,
  notes        text,
  created_at   timestamptz default now()
);

create table if not exists public.wishlist_items (
  id              uuid primary key default gen_random_uuid(),
  vehicle_id      uuid not null references public.vehicles (id) on delete cascade,
  name            text not null,
  category        text default 'Other',
  brand           text,
  estimated_price numeric,
  url             text,
  priority        integer default 0,
  created_at      timestamptz default now()
);

create table if not exists public.build_events (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references public.vehicles (id) on delete cascade,
  event_type  text not null,
  description text not null,
  metadata    jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);

create table if not exists public.vehicle_photos (
  id         uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  url        text not null,
  caption    text,
  is_cover   boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id)
);

create table if not exists public.reactions (
  id         uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null,
  unique (vehicle_id, user_id, type)
);

-- ── Row-level security ────────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.vehicles       enable row level security;
alter table public.mods           enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.build_events   enable row level security;
alter table public.vehicle_photos enable row level security;
alter table public.follows        enable row level security;
alter table public.reactions      enable row level security;

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users can manage their own vehicles" on public.vehicles;
create policy "Users can manage their own vehicles" on public.vehicles for all using (auth.uid() = user_id);
drop policy if exists "Public vehicles are viewable by everyone" on public.vehicles;
create policy "Public vehicles are viewable by everyone" on public.vehicles for select using (is_public = true);

drop policy if exists "Users can manage mods on their vehicles" on public.mods;
create policy "Users can manage mods on their vehicles" on public.mods for all
  using (exists (select 1 from public.vehicles where vehicles.id = mods.vehicle_id and vehicles.user_id = auth.uid()));
drop policy if exists "Public vehicles viewable with mods" on public.mods;
create policy "Public vehicles viewable with mods" on public.mods for select
  using (exists (select 1 from public.vehicles where vehicles.id = mods.vehicle_id and vehicles.is_public = true));

drop policy if exists "Users can manage wishlist on their vehicles" on public.wishlist_items;
create policy "Users can manage wishlist on their vehicles" on public.wishlist_items for all
  using (exists (select 1 from public.vehicles where vehicles.id = wishlist_items.vehicle_id and vehicles.user_id = auth.uid()));
drop policy if exists "Public vehicles wishlist viewable" on public.wishlist_items;
create policy "Public vehicles wishlist viewable" on public.wishlist_items for select
  using (exists (select 1 from public.vehicles where vehicles.id = wishlist_items.vehicle_id and vehicles.is_public = true));

drop policy if exists "Users can manage build events on their vehicles" on public.build_events;
create policy "Users can manage build events on their vehicles" on public.build_events for all
  using (exists (select 1 from public.vehicles where vehicles.id = build_events.vehicle_id and vehicles.user_id = auth.uid()));

drop policy if exists "Users can manage photos on their vehicles" on public.vehicle_photos;
create policy "Users can manage photos on their vehicles" on public.vehicle_photos for all
  using (exists (select 1 from public.vehicles where vehicles.id = vehicle_photos.vehicle_id and vehicles.user_id = auth.uid()));

drop policy if exists "Follows are publicly viewable" on public.follows;
create policy "Follows are publicly viewable" on public.follows for select using (true);
drop policy if exists "Users can manage their own follows" on public.follows;
create policy "Users can manage their own follows" on public.follows for all using (auth.uid() = follower_id);

drop policy if exists "Reactions are publicly viewable" on public.reactions;
create policy "Reactions are publicly viewable" on public.reactions for select using (true);
drop policy if exists "Users can manage their own reactions" on public.reactions;
create policy "Users can manage their own reactions" on public.reactions for all using (auth.uid() = user_id);

-- ── New-user trigger (creates a profile for every sign-up) ─────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
declare
  base_username text;
  final_username text;
  counter integer := 0;
begin
  base_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    split_part(new.email, '@', 1)
  );
  base_username := lower(regexp_replace(base_username, '\s+', '_', 'g'));
  final_username := base_username;

  while exists (select 1 from profiles where username = final_username) loop
    counter := counter + 1;
    final_username := base_username || counter::text;
  end loop;

  insert into profiles (id, username, display_name)
  values (
    new.id,
    final_username,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), base_username)
  );

  return new;
exception when others then
  raise warning 'handle_new_user failed: %', sqlerrm;
  return new;
end;
$function$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Storage: vehicle photos ───────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('vehicle-photos', 'vehicle-photos', true)
on conflict (id) do nothing;

drop policy if exists "Photos are publicly viewable" on storage.objects;
create policy "Photos are publicly viewable" on storage.objects for select
  using (bucket_id = 'vehicle-photos');
drop policy if exists "Users can upload their own photos" on storage.objects;
create policy "Users can upload their own photos" on storage.objects for insert
  with check (bucket_id = 'vehicle-photos' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "Users can delete their own photos" on storage.objects;
create policy "Users can delete their own photos" on storage.objects for delete
  using (bucket_id = 'vehicle-photos' and auth.uid()::text = (storage.foldername(name))[1]);
