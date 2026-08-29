-- Lets Staff and Supervisor accounts be created by phone number instead of
-- email, and lets Supervisors (role 'operator') manage Staff/Supervisors the
-- same way Admins can. Run once in the Supabase SQL editor.

alter table profiles add column if not exists phone text;
alter table profiles add column if not exists name text;

-- Supervisors need to see other staff/supervisor profiles to manage them.
drop policy if exists "profiles: admin can read all" on profiles;
create policy "profiles: admin and operator can read all"
  on profiles for select
  using ((select role from current_profile()) in ('admin', 'operator'));

-- Supervisors need to toggle staff availability (admin-only before).
drop policy if exists "workers: admin can manage" on workers;
create policy "workers: admin and operator can manage"
  on workers for all
  using ((select role from current_profile()) in ('admin', 'operator'))
  with check ((select role from current_profile()) in ('admin', 'operator'));
