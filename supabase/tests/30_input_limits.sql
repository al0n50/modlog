-- Input limits found by stress-testing the live API. Everything rolls back.
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

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'alex@example.com');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
insert into public.vehicles (id, user_id, year, make, model, is_public)
values ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 2019, 'Subaru', 'WRX', true);

select pg_temp.fails($$insert into public.mods (vehicle_id, name) values ('40000000-0000-0000-0000-000000000001', repeat('A', 20000))$$, 'a 20,000-character mod name');
select pg_temp.fails($$insert into public.mods (vehicle_id, name, notes) values ('40000000-0000-0000-0000-000000000001', 'x', repeat('N', 200000))$$, '200 KB of notes');
select pg_temp.fails($$insert into public.vehicles (user_id, year, make, model) values ('00000000-0000-0000-0000-00000000000a', 2020, repeat('M', 5000), 'x')$$, 'a 5,000-character make');
select pg_temp.fails($$insert into public.mods (vehicle_id, name, status, url) values ('40000000-0000-0000-0000-000000000001', 'x', 'planned', 'javascript:alert(1)')$$, 'a javascript: product link');
select pg_temp.fails($$insert into public.mods (vehicle_id, name, status, url) values ('40000000-0000-0000-0000-000000000001', 'x', 'planned', 'data:text/html,hi')$$, 'a data: product link');
select pg_temp.fails($$insert into public.mods (vehicle_id, name, install_date) values ('40000000-0000-0000-0000-000000000001', 'x', '2999-01-01')$$, 'an install date in the future');
select pg_temp.fails($$update public.vehicles set cover_image = 'javascript:alert(1)' where id = '40000000-0000-0000-0000-000000000001'$$, 'a javascript: cover image');
select pg_temp.fails($$update public.profiles set bio = repeat('b', 501) where id = '00000000-0000-0000-0000-00000000000a'$$, 'a 501-character bio');

insert into public.mods (vehicle_id, name, brand, notes, install_date, status, url) values
  ('40000000-0000-0000-0000-000000000001', repeat('A', 120), repeat('B', 80), repeat('N', 2000), current_date, 'done', null),
  ('40000000-0000-0000-0000-000000000001', '🔥 Turbo ターボ — "quotes"', null, null, null, 'planned', 'https://store.example.com/turbo?ref=1');
update public.vehicles set cover_image = 'https://images.example.com/wrx.jpg' where id = '40000000-0000-0000-0000-000000000001';
select pg_temp.check((select count(*) = 2 from public.mods), 'normal and limit-length values, emoji and real links still save');

-- Public builds show their history to visitors; private ones don't
set local role anon;
set local request.jwt.claims = '{}';
select pg_temp.check((select count(*) = 2 from public.build_events), 'visitors can read a public build''s timeline');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
update public.vehicles set is_public = false where id = '40000000-0000-0000-0000-000000000001';
set local role anon;
set local request.jwt.claims = '{}';
select pg_temp.check((select count(*) = 0 from public.build_events), 'visitors cannot read a private build''s timeline');
rollback;
