-- Limits on what can be stored, found by stress-testing the live API:
-- a 20,000-character mod name, 200 KB of notes, a 5,000-character make, a javascript:
-- product link and an install date in 2999 were all accepted. The app wraps or blocks
-- these on screen, but the database is the one place every client goes through.

alter table public.vehicles drop constraint if exists vehicles_text_lengths;
alter table public.vehicles add constraint vehicles_text_lengths check (
  length(make) <= 60 and length(model) <= 60 and coalesce(length(trim), 0) <= 60);
alter table public.vehicles drop constraint if exists vehicles_cover_url;
alter table public.vehicles add constraint vehicles_cover_url check (
  cover_image is null or (cover_image ~* '^https?://\S+$' and length(cover_image) <= 2048));

alter table public.mods drop constraint if exists mods_text_lengths;
alter table public.mods add constraint mods_text_lengths check (
  length(name) <= 120 and coalesce(length(brand), 0) <= 80
  and coalesce(length(part_number), 0) <= 80 and coalesce(length(notes), 0) <= 2000);
-- Product links must be web links (blocks javascript:, data: and the like)
alter table public.mods drop constraint if exists mods_url_http;
alter table public.mods add constraint mods_url_http check (
  url is null or (url ~* '^https?://\S+$' and length(url) <= 2048));
-- Installed on a real day: not before cars existed, not in the future (a day of slack for time zones)
alter table public.mods drop constraint if exists mods_install_date_range;
alter table public.mods add constraint mods_install_date_range check (
  install_date is null or install_date between date '1886-01-01' and current_date + 1);

alter table public.profiles drop constraint if exists profiles_text_lengths;
alter table public.profiles add constraint profiles_text_lengths check (
  length(username) <= 40 and coalesce(length(display_name), 0) <= 60 and coalesce(length(bio), 0) <= 500);

-- Public builds show their history too (the mods behind it are already public)
drop policy if exists build_events_select_own on public.build_events;
drop policy if exists build_events_select_own_or_public on public.build_events;
create policy build_events_select_own_or_public on public.build_events for select to anon, authenticated
  using (public.owns_vehicle(vehicle_id) or public.vehicle_is_public(vehicle_id));
