-- Services now belong to one mall each, so price and availability can differ
-- per mall, and a service doesn't have to exist at every mall. Supervisors
-- can only manage services at their own mall; admins manage all.
-- Run once in the Supabase SQL editor.

alter table services add column if not exists mall text;

drop policy if exists "services: public can read" on services;
drop policy if exists "services: admin and operator can manage" on services;

-- Customers on /book (anonymous) need to read services to build the picker;
-- the app filters to their mall client-side.
create policy "services: anon can read"
  on services for select
  to anon
  using (true);

create policy "services: admin can manage"
  on services for all
  using ((select role from current_profile()) = 'admin')
  with check ((select role from current_profile()) = 'admin');

create policy "services: operator can manage own mall"
  on services for all
  using (
    (select role from current_profile()) = 'operator'
    and mall = (select location from current_profile())
  )
  with check (
    (select role from current_profile()) = 'operator'
    and mall = (select location from current_profile())
  );

-- IMPORTANT: existing services have no mall yet, so they'll disappear from
-- /book (and from Supervisors' Services list) until assigned. Run something
-- like this after checking your actual mall name(s):
--   update services set mall = 'NEXUS' where mall is null;
