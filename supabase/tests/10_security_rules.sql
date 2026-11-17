-- Security rule tests. Each block acts as a real API role (anon or authenticated)
-- with a specific user id, exactly the way Supabase's API does. Everything rolls back.
begin;

create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FAILED: %', what; end if;
  raise notice 'ok - %', what;
end $$;
create function pg_temp.fails(sql text, what text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'FAILED (should have been blocked): %', what;
exception when others then
  if sqlerrm like 'FAILED%' then raise; end if;
  raise notice 'ok - blocked: % (%)', what, sqlerrm;
end $$;
grant execute on function pg_temp.check(boolean, text), pg_temp.fails(text, text) to anon, authenticated;

-- ── Sign-up creates a profile, with a unique username ───────────────
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alex@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'bri@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'alex@other.example');
select pg_temp.check((select count(*) = 3 from public.profiles), 'a profile is created for every sign-up');
select pg_temp.check((select username from public.profiles where id = '00000000-0000-0000-0000-00000000000c') = 'alex1',
                     'duplicate usernames get a number suffix');
select pg_temp.check(not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'),
                     'signed-in users cannot call the sign-up function directly');
select pg_temp.check(not has_function_privilege('anon', 'public.handle_new_user()', 'execute'),
                     'logged-out visitors cannot call the sign-up function directly');

-- ── User A: their own car and mods ──────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';

insert into public.vehicles (id, user_id, year, make, model, vin, body_class, specs)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
        2019, 'Subaru', 'WRX', 'JF1VA1A60K9800001', 'Sedan/Saloon', '{"drivetrain":"AWD"}');
select pg_temp.check((select count(*) = 1 from public.vehicles), 'A can add a car');
insert into public.mods (vehicle_id, name, category, price, status)
values ('10000000-0000-0000-0000-000000000001', 'Coilovers', 'Suspension', 1200, 'done'),
       ('10000000-0000-0000-0000-000000000001', 'Downpipe',  'Exhaust',     450, 'planned');
select pg_temp.check((select count(*) = 2 from public.mods), 'A can log done and planned mods');

select pg_temp.fails($$insert into public.vehicles (user_id, year, make, model)
  values ('00000000-0000-0000-0000-00000000000b', 2020, 'Honda', 'Civic')$$, 'A adding a car for B');
select pg_temp.fails($$insert into public.mods (vehicle_id, name, status)
  values ('10000000-0000-0000-0000-000000000001', 'X', 'someday')$$, 'a mod status other than done/planned');
select pg_temp.fails($$insert into public.mods (vehicle_id, name, price)
  values ('10000000-0000-0000-0000-000000000001', 'X', -5)$$, 'a negative price');
select pg_temp.fails($$insert into public.mods (vehicle_id, name, category)
  values ('10000000-0000-0000-0000-000000000001', 'X', 'Rockets')$$, 'an unknown category');
select pg_temp.fails($$insert into public.mods (vehicle_id, name) values ('10000000-0000-0000-0000-000000000001', '   ')$$, 'a blank mod name');
select pg_temp.fails($$insert into public.vehicles (user_id, year, make, model, vin)
  values ('00000000-0000-0000-0000-00000000000a', 2019, 'Subaru', 'WRX', 'jf1va1a60k98000I1')$$, 'a malformed VIN');
select pg_temp.fails($$insert into public.vehicles (user_id, year, make, model)
  values ('00000000-0000-0000-0000-00000000000a', 1700, 'Old', 'Cart')$$, 'a year before cars existed');

-- updated_at moves forward on edit
update public.mods set status = 'done', install_date = current_date where name = 'Downpipe';
select pg_temp.check((select status = 'done' from public.mods where name = 'Downpipe'), 'A can mark a planned mod as done');

-- ── User B: cannot see or touch A's private car ─────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select pg_temp.check((select count(*) = 0 from public.vehicles), 'B cannot see A''s private car');
select pg_temp.check((select count(*) = 0 from public.mods), 'B cannot see mods on A''s private car');
select pg_temp.fails($$insert into public.mods (vehicle_id, name) values ('10000000-0000-0000-0000-000000000001', 'Sneaky')$$,
                     'B adding a mod to A''s car');
update public.mods set name = 'Hacked' where vehicle_id = '10000000-0000-0000-0000-000000000001';
reset role;
select pg_temp.check((select count(*) = 0 from public.mods where name = 'Hacked'), 'B cannot edit A''s mods');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
delete from public.vehicles where id = '10000000-0000-0000-0000-000000000001';
reset role;
select pg_temp.check((select count(*) = 1 from public.vehicles), 'B cannot delete A''s car');

-- B cannot move their own mod onto A's car
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
insert into public.vehicles (id, user_id, year, make, model)
values ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 2021, 'Toyota', 'GR86');
insert into public.mods (id, vehicle_id, name) values ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'Intake');
select pg_temp.fails($$update public.mods set vehicle_id = '10000000-0000-0000-0000-000000000001'
  where id = '30000000-0000-0000-0000-000000000003'$$, 'B moving a mod onto A''s car');
select pg_temp.fails($$update public.vehicles set user_id = '00000000-0000-0000-0000-00000000000a'
  where id = '20000000-0000-0000-0000-000000000002'$$, 'B handing a car to A''s account');
select pg_temp.fails($$insert into public.reactions (vehicle_id, user_id, type)
  values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'fire')$$, 'B reacting to A''s private car');
select pg_temp.fails($$insert into public.follows (follower_id, following_id)
  values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b')$$, 'B creating a follow as A');
select pg_temp.fails($$insert into public.follows (follower_id, following_id)
  values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b')$$, 'following yourself');
update public.profiles set bio = 'pwned' where id = '00000000-0000-0000-0000-00000000000a';
reset role;
select pg_temp.check((select bio is distinct from 'pwned' from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
                     'B cannot edit A''s profile');
set local role authenticated;

-- ── A makes the car public; everyone can now see it ─────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
update public.vehicles set is_public = true where id = '10000000-0000-0000-0000-000000000001';

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select pg_temp.check((select count(*) = 1 from public.vehicles where user_id = '00000000-0000-0000-0000-00000000000a'),
                     'B can see A''s car once it is public');
insert into public.reactions (vehicle_id, user_id, type)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'fire');
select pg_temp.check(true, 'B can react to A''s public car');
select pg_temp.fails($$insert into public.reactions (vehicle_id, user_id, type)
  values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'poop')$$, 'an unknown reaction type');

set local role anon;
set local request.jwt.claims = '{}';
select pg_temp.check((select count(*) = 1 from public.vehicles), 'logged-out visitors see only the public car');
select pg_temp.check((select count(*) = 2 from public.mods), 'logged-out visitors see the public car''s mods');
select pg_temp.fails($$insert into public.vehicles (user_id, year, make, model)
  values ('00000000-0000-0000-0000-00000000000a', 2020, 'Honda', 'Civic')$$, 'a logged-out visitor adding a car');
select pg_temp.fails($$select count(*) from public.ai_requests$$, 'a logged-out visitor reading AI usage');

-- ── AI usage log: private to each user ──────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
insert into public.ai_requests default values;
insert into public.ai_requests default values;
select pg_temp.check((select count(*) = 2 from public.ai_requests), 'A''s AI requests are counted');
select pg_temp.fails($$insert into public.ai_requests (user_id) values ('00000000-0000-0000-0000-00000000000b')$$,
                     'A logging AI requests against B');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select pg_temp.check((select count(*) = 0 from public.ai_requests), 'B cannot see A''s AI usage');
select pg_temp.fails($$delete from public.ai_requests$$, 'deleting AI usage to dodge the limit');

-- ── Photos follow their car's privacy ──────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
update public.vehicles set is_public = false where id = '10000000-0000-0000-0000-000000000001';
insert into storage.objects (bucket_id, name, owner) values
  ('vehicle-photos', '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-000000000001/front.jpg',
   '00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) = 1 from storage.objects), 'A can see photos of their own private car');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select pg_temp.check((select count(*) = 0 from storage.objects), 'B cannot list photos of A''s private car');
select pg_temp.fails($$insert into storage.objects (bucket_id, name) values
  ('vehicle-photos', '00000000-0000-0000-0000-00000000000a/10000000-0000-0000-0000-000000000001/fake.jpg')$$,
  'B uploading into A''s photo folder');
set local role anon;
set local request.jwt.claims = '{}';
select pg_temp.check((select count(*) = 0 from storage.objects), 'logged-out visitors cannot list a private car''s photos');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
update public.vehicles set is_public = true where id = '10000000-0000-0000-0000-000000000001';
set local role anon;
set local request.jwt.claims = '{}';
select pg_temp.check((select count(*) = 1 from storage.objects), 'logged-out visitors can see a public car''s photos');

-- ── Photo bucket limits ─────────────────────────────────────────────
reset role;
select pg_temp.check((select file_size_limit = 5242880 and 'image/jpeg' = any(allowed_mime_types)
                      from storage.buckets where id = 'vehicle-photos'), 'photo uploads are limited to images up to 5 MB');

rollback;
