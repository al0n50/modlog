-- Photos follow their car's privacy.
-- Before: anyone, even logged out, could list every file in the photo bucket, which
-- exposed private cars' photos and every user's and car's ID (photo paths are
-- <user id>/<car id>/<file>). Now a photo can be listed/read through the API only by
-- its owner, or by anyone once its car is public.
-- (The bucket itself is still public, so a photo's direct link keeps working for
-- whoever already has it. Moving to a private bucket with signed links is tracked
-- separately.)
drop policy if exists "Photos are publicly viewable" on storage.objects;
drop policy if exists photos_select_own_or_public_car on storage.objects;
create policy photos_select_own_or_public_car on storage.objects for select
  using (
    bucket_id = 'vehicle-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or case
           when (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
           then public.vehicle_is_public(((storage.foldername(name))[2])::uuid)
           else false
         end
    )
  );
