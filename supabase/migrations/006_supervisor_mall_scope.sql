-- Restricts Supervisors to only see/manage bookings at their own assigned
-- mall/location. Admins keep full visibility across every mall, and can
-- still view "all locations" or drill into one at a time in the app UI.
-- Run once in the Supabase SQL editor.

alter table profiles add column if not exists location text;

-- bookings: split the old combined operator/admin policies so operators are
-- scoped to their own location and admins are not.
drop policy if exists "bookings: operator/admin can read all" on bookings;
drop policy if exists "bookings: operator/admin can update all" on bookings;

create policy "bookings: admin can read all"
  on bookings for select
  using ((select role from current_profile()) = 'admin');

create policy "bookings: operator can read own location"
  on bookings for select
  using (
    (select role from current_profile()) = 'operator'
    and location = (select location from current_profile())
  );

create policy "bookings: admin can update all"
  on bookings for update
  using ((select role from current_profile()) = 'admin')
  with check ((select role from current_profile()) = 'admin');

create policy "bookings: operator can update own location"
  on bookings for update
  using (
    (select role from current_profile()) = 'operator'
    and location = (select location from current_profile())
  )
  with check (
    (select role from current_profile()) = 'operator'
    and location = (select location from current_profile())
  );
