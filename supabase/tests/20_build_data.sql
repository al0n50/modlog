-- Phase 4 tests: timeline written by the database, build summaries, 3D model catalog.
-- Acts as real API roles, like 10_security_rules.sql. Everything rolls back.
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

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alex@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'bri@example.com');

-- ── Timeline: written by the database ───────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
insert into public.vehicles (id, user_id, year, make, model, body_class, color, is_public)
values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
        2019, 'Subaru', 'WRX', 'Sedan/Saloon', '#1E3A8A', true);
insert into public.mods (id, vehicle_id, name, category, price, status) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Coilovers', 'Suspension', 1200, 'done'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Downpipe',  'Exhaust',     450, 'planned'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Tune',      'Engine',      600, 'planned');
update public.mods set status = 'done', price = 420 where id = '30000000-0000-0000-0000-000000000002';
update public.mods set notes = 'just a note' where id = '30000000-0000-0000-0000-000000000001';
delete from public.mods where id = '30000000-0000-0000-0000-000000000003';

select pg_temp.check((select array_agg(event_type order by created_at, event_type) from public.build_events)
  @> array['mod_added', 'mod_planned', 'wishlist_promoted', 'plan_removed'],
  'adding, planning, installing and dropping mods each write a timeline event');
select pg_temp.check((select count(*) = 5 from public.build_events), 'editing other details does not add events');
select pg_temp.check((select description from public.build_events where event_type = 'mod_added') = 'Added Suspension: Coilovers',
  'events describe the mod');
select pg_temp.fails($$insert into public.build_events (vehicle_id, event_type, description)
  values ('20000000-0000-0000-0000-000000000001', 'mod_added', 'Added a 1000hp turbo')$$, 'writing made-up timeline history');
select pg_temp.check(not has_function_privilege('authenticated', 'public.log_mod_event()', 'execute'),
  'the timeline function cannot be called directly');

-- ── Build summaries ─────────────────────────────────────────────────
select pg_temp.check((select done_count = 2 and planned_count = 0 and total_spent = 1620 and username = 'alex'
                      and jsonb_array_length(recent_mods) = 2
                      from public.vehicle_summaries where id = '20000000-0000-0000-0000-000000000001'),
  'a car''s summary has its counts, total spent, latest mods and owner');

insert into public.vehicles (id, user_id, year, make, model)
values ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 2021, 'Toyota', 'Supra');
select pg_temp.check((select count(*) = 2 from public.vehicle_summaries), 'owners see summaries of all their cars');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select pg_temp.check((select count(*) = 1 from public.vehicle_summaries), 'other users see only public cars'' summaries');
set local role anon;
set local request.jwt.claims = '{}';
select pg_temp.check((select array_agg(model) = array['WRX'] from public.vehicle_summaries),
  'logged-out visitors see only public cars'' summaries');

-- ── Paint color and body style ──────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select pg_temp.fails($$update public.vehicles set color = 'red' where id = '20000000-0000-0000-0000-000000000001'$$,
  'a paint color that is not a hex color');
select pg_temp.check((select body_style = 'sedan' from public.vehicles where id = '20000000-0000-0000-0000-000000000001'),
  'body style is filled in from the VIN''s body class');
select pg_temp.check(public.body_style_for('Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)') = 'suv'
  and public.body_style_for('Hatchback/Liftback/Notchback') = 'hatchback'
  and public.body_style_for('Pickup') = 'pickup' and public.body_style_for('Minivan') = 'minivan'
  and public.body_style_for('Cargo Van') = 'van' and public.body_style_for('Convertible/Cabriolet') = 'convertible'
  and public.body_style_for('Coupe') = 'coupe' and public.body_style_for('Wagon') = 'wagon'
  and public.body_style_for('Crossover Utility Vehicle (CUV)') = 'suv' and public.body_style_for('') is null,
  'NHTSA body classes map to the right body style');
update public.vehicles set body_style = 'coupe' where id = '20000000-0000-0000-0000-000000000002';
select pg_temp.check((select body_style = 'coupe' from public.vehicles where id = '20000000-0000-0000-0000-000000000002'),
  'owners can pick a body style for cars without a VIN');

-- ── 3D model catalog (Option B) ─────────────────────────────────────
select pg_temp.check((select count(*) = 9 from public.car_models where kind = 'body_style'), 'every body style has a catalog entry');
select pg_temp.check((select body_style = 'sedan' and kind = 'body_style'
                      from public.car_model_for('20000000-0000-0000-0000-000000000001')),
  'a car without an exact model gets its body style''s model');
select pg_temp.fails($$insert into public.car_models (kind, make, model, year_from, year_to, body_style)
  values ('exact', 'Subaru', 'WRX', 2015, 2021, 'sedan')$$, 'users adding to the 3D model catalog');

reset role;
insert into public.car_models (kind, make, model, year_from, year_to, body_style, asset_path, license)
values ('exact', 'Subaru', 'WRX', 2015, 2021, 'sedan', 'exact/subaru-wrx-2015.glb', 'CC-BY-4.0'),
       ('exact', 'Subaru', 'WRX', 2022, 2026, 'sedan', null, null);
select pg_temp.fails($$insert into public.car_models (kind, make, model, year_from, year_to, body_style, asset_path)
  values ('exact', 'Mazda', 'MX-5', 2016, 2024, 'convertible', 'exact/mx5.glb')$$, 'a model file without a license');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select pg_temp.check((select kind = 'exact' and asset_path = 'exact/subaru-wrx-2015.glb'
                      from public.car_model_for('20000000-0000-0000-0000-000000000001')),
  'a popular car gets its exact model (make and model match regardless of capitals)');
update public.vehicles set year = 2023 where id = '20000000-0000-0000-0000-000000000001';
select pg_temp.check((select kind = 'body_style' from public.car_model_for('20000000-0000-0000-0000-000000000001')),
  'an exact model whose file is not uploaded yet falls back to the body style');
select pg_temp.check((select body_style = 'coupe' from public.car_model_for('20000000-0000-0000-0000-000000000002')),
  'a manually entered car uses the body style its owner picked');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
select pg_temp.check((select count(*) = 0 from public.car_model_for('20000000-0000-0000-0000-000000000002')),
  'the model lookup does not reveal private cars');
reset role;
select pg_temp.check((select public and 'model/gltf-binary' = any(allowed_mime_types) from storage.buckets where id = 'car-models'),
  '3D model files have their own bucket, limited to .glb files');

-- ── Deleting a car ──────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
delete from public.vehicles where id = '20000000-0000-0000-0000-000000000001';
select pg_temp.check((select count(*) = 0 from public.build_events), 'deleting a car removes its mods and timeline without errors');

rollback;
