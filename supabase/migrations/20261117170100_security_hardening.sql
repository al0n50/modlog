-- Security hardening:
--  1. The sign-up trigger function runs as the database owner. Pin its search_path,
--     stop it from swallowing errors, and make it impossible to call through the API.
--  2. Replace broad "for all" rules with explicit per-action rules that check
--     ownership on both the old row (using) and the new row (with check).
--  3. Limit photo uploads to images of 5 MB or less.
--  4. Track AI advisor requests per user so the API can rate-limit them.

-- ── 1. Sign-up trigger ───────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  base_username  text;
  final_username text;
  counter        integer := 0;
begin
  base_username := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'driver'
  );
  base_username := lower(regexp_replace(base_username, '\s+', '_', 'g'));
  if base_username = '' then base_username := 'driver'; end if;
  final_username := base_username;

  while exists (select 1 from public.profiles where username = final_username) loop
    counter := counter + 1;
    final_username := base_username || counter::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    final_username,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), base_username)
  );
  -- No exception handler: if the profile can't be created, the sign-up fails
  -- instead of leaving an account with no profile (which breaks adding cars).
  return new;
end;
$function$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at()  from public, anon, authenticated;

-- ── 2. Explicit row-level security rules ─────────────────────────────
-- Helper: does the signed-in user own this vehicle? (stable, so Postgres caches it per statement)
create or replace function public.owns_vehicle(v_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (select 1 from public.vehicles v where v.id = v_id and v.user_id = (select auth.uid()))
$$;

create or replace function public.vehicle_is_public(v_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (select 1 from public.vehicles v where v.id = v_id and v.is_public)
$$;

-- profiles
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile"       on public.profiles;
drop policy if exists "Users can update their own profile"       on public.profiles;
create policy profiles_select_all on public.profiles for select to anon, authenticated using (true);
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- vehicles
drop policy if exists "Users can manage their own vehicles"      on public.vehicles;
drop policy if exists "Public vehicles are viewable by everyone" on public.vehicles;
create policy vehicles_select_own_or_public on public.vehicles for select to anon, authenticated
  using (is_public or user_id = (select auth.uid()));
create policy vehicles_insert_own on public.vehicles for insert to authenticated with check (user_id = (select auth.uid()));
create policy vehicles_update_own on public.vehicles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy vehicles_delete_own on public.vehicles for delete to authenticated using (user_id = (select auth.uid()));

-- mods
drop policy if exists "Users can manage mods on their vehicles" on public.mods;
drop policy if exists "Public vehicles viewable with mods"      on public.mods;
create policy mods_select_own_or_public on public.mods for select to anon, authenticated
  using (public.owns_vehicle(vehicle_id) or public.vehicle_is_public(vehicle_id));
create policy mods_insert_own on public.mods for insert to authenticated with check (public.owns_vehicle(vehicle_id));
create policy mods_update_own on public.mods for update to authenticated
  using (public.owns_vehicle(vehicle_id)) with check (public.owns_vehicle(vehicle_id));
create policy mods_delete_own on public.mods for delete to authenticated using (public.owns_vehicle(vehicle_id));

-- wishlist_items (deprecated, same rules as mods)
drop policy if exists "Users can manage wishlist on their vehicles" on public.wishlist_items;
drop policy if exists "Public vehicles wishlist viewable"           on public.wishlist_items;
create policy wishlist_select_own_or_public on public.wishlist_items for select to anon, authenticated
  using (public.owns_vehicle(vehicle_id) or public.vehicle_is_public(vehicle_id));
create policy wishlist_insert_own on public.wishlist_items for insert to authenticated with check (public.owns_vehicle(vehicle_id));
create policy wishlist_update_own on public.wishlist_items for update to authenticated
  using (public.owns_vehicle(vehicle_id)) with check (public.owns_vehicle(vehicle_id));
create policy wishlist_delete_own on public.wishlist_items for delete to authenticated using (public.owns_vehicle(vehicle_id));

-- build_events (owner-only, as before)
drop policy if exists "Users can manage build events on their vehicles" on public.build_events;
create policy build_events_select_own on public.build_events for select to authenticated using (public.owns_vehicle(vehicle_id));
create policy build_events_insert_own on public.build_events for insert to authenticated with check (public.owns_vehicle(vehicle_id));
create policy build_events_delete_own on public.build_events for delete to authenticated using (public.owns_vehicle(vehicle_id));

-- vehicle_photos (owner-only, as before)
drop policy if exists "Users can manage photos on their vehicles" on public.vehicle_photos;
create policy vehicle_photos_select_own on public.vehicle_photos for select to authenticated using (public.owns_vehicle(vehicle_id));
create policy vehicle_photos_insert_own on public.vehicle_photos for insert to authenticated with check (public.owns_vehicle(vehicle_id));
create policy vehicle_photos_update_own on public.vehicle_photos for update to authenticated
  using (public.owns_vehicle(vehicle_id)) with check (public.owns_vehicle(vehicle_id));
create policy vehicle_photos_delete_own on public.vehicle_photos for delete to authenticated using (public.owns_vehicle(vehicle_id));

-- follows
drop policy if exists "Follows are publicly viewable"      on public.follows;
drop policy if exists "Users can manage their own follows" on public.follows;
create policy follows_select_all on public.follows for select to anon, authenticated using (true);
create policy follows_insert_own on public.follows for insert to authenticated with check (follower_id = (select auth.uid()));
create policy follows_delete_own on public.follows for delete to authenticated using (follower_id = (select auth.uid()));

-- reactions: only on cars you can see
drop policy if exists "Reactions are publicly viewable"      on public.reactions;
drop policy if exists "Users can manage their own reactions" on public.reactions;
create policy reactions_select_all on public.reactions for select to anon, authenticated using (true);
create policy reactions_insert_own on public.reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and (public.vehicle_is_public(vehicle_id) or public.owns_vehicle(vehicle_id)));
create policy reactions_delete_own on public.reactions for delete to authenticated using (user_id = (select auth.uid()));

-- ── 3. Photo uploads: images only, 5 MB max ──────────────────────────
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
where id = 'vehicle-photos';

-- ── 4. AI advisor usage log (for rate limiting) ──────────────────────
create table if not exists public.ai_requests (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.ai_requests enable row level security;
create index if not exists ai_requests_user_recent_idx on public.ai_requests (user_id, created_at desc);

drop policy if exists ai_requests_select_own on public.ai_requests;
drop policy if exists ai_requests_insert_own on public.ai_requests;
create policy ai_requests_select_own on public.ai_requests for select to authenticated using (user_id = (select auth.uid()));
create policy ai_requests_insert_own on public.ai_requests for insert to authenticated with check (user_id = (select auth.uid()));
revoke update, delete on public.ai_requests from anon, authenticated;
revoke all on public.ai_requests from anon;
