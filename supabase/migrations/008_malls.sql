-- Adds "Mall" as the real top-level entity: a mall can have several QR
-- locations/gates under it. Supervisors and Staff are now scoped to a whole
-- mall (using the same profiles.location / workers.location columns, which
-- now hold a mall name instead of a single gate name), not one specific gate.
-- Run once in the Supabase SQL editor.

create table if not exists malls (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamp with time zone default now()
);

alter table malls enable row level security;

create policy "malls: public can read"
  on malls for select
  using (true);

create policy "malls: admin can manage"
  on malls for all
  using ((select role from current_profile()) = 'admin')
  with check ((select role from current_profile()) = 'admin');

-- Each QR location/gate now belongs to one mall.
alter table locations add column if not exists mall text;

-- Denormalized onto bookings at booking time, so RLS can scope by mall
-- without a subquery join through locations on every row.
alter table bookings add column if not exists mall text;

-- Re-scope operator (Supervisor) bookings policies from "exact gate match"
-- to "same mall" — a supervisor now covers every gate under their mall.
drop policy if exists "bookings: operator can read own location" on bookings;
drop policy if exists "bookings: operator can update own location" on bookings;

create policy "bookings: operator can read own mall"
  on bookings for select
  using (
    (select role from current_profile()) = 'operator'
    and mall = (select location from current_profile())
  );

create policy "bookings: operator can update own mall"
  on bookings for update
  using (
    (select role from current_profile()) = 'operator'
    and mall = (select location from current_profile())
  )
  with check (
    (select role from current_profile()) = 'operator'
    and mall = (select location from current_profile())
  );

-- ============================================================
-- ONE-TIME CLEANUP — run these manually, after adding your malls in /admin
-- ============================================================
-- 1. Create your mall(s) in /admin -> Malls, e.g. 'Phoenix Mall'.
-- 2. Assign each existing location/gate to a mall:
--      update locations set mall = 'Phoenix Mall' where mall is null;
-- 3. Backfill mall onto existing bookings from their location's mall:
--      update bookings b set mall = l.mall
--      from locations l where l.name = b.location and b.mall is null;
-- 4. Re-point existing Supervisor/Staff location values from a gate name to
--    the mall name (they currently hold something like 'Level2-GateA'):
--      update profiles set location = 'Phoenix Mall' where role = 'operator';
--      update workers set location = 'Phoenix Mall' where location is not null;
