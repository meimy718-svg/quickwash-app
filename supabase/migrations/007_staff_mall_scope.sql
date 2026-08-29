-- Restricts Staff to belonging to one mall/location, and restricts
-- Supervisors to only see/manage the Staff at their own assigned mall.
-- Admins keep full visibility and management across every mall.
-- Run once in the Supabase SQL editor.

alter table workers add column if not exists location text;

-- Replace the old blanket "any authenticated user can read all workers" and
-- "admin/operator can manage all workers" policies with location-scoped ones.
drop policy if exists "workers: staff can read" on workers;
drop policy if exists "workers: admin and operator can manage" on workers;

create policy "workers: admin can manage"
  on workers for all
  using ((select role from current_profile()) = 'admin')
  with check ((select role from current_profile()) = 'admin');

create policy "workers: operator can manage own location"
  on workers for all
  using (
    (select role from current_profile()) = 'operator'
    and location = (select location from current_profile())
  )
  with check (
    (select role from current_profile()) = 'operator'
    and location = (select location from current_profile())
  );

-- IMPORTANT: existing Staff rows have no location yet, so they'll be
-- invisible to every Supervisor (though still visible to Admins) until you
-- assign one. Go to /admin -> Staff -> Edit for each existing staff member
-- and give them a location, or run something like:
--   update workers set location = 'Level2-GateA' where location is null;
