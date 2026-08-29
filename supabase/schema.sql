-- 4OR CarSpa database schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists locations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  qr_code_url text,
  created_at timestamp with time zone default now()
);

create table if not exists workers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text,
  email text unique,
  available boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists services (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price numeric not null,
  available boolean default true,
  show_price boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists bookings (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text not null,
  car_number text not null,
  car_color text not null,
  parking_slot text not null,
  wash_type text not null,
  key_option text not null,
  key_status text default 'none',
  status text default 'pending',
  location text not null,
  otp text not null,
  worker_id uuid references workers(id),
  photos_before text[],
  photos_after text[],
  device_id text,
  key_handover_note text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists bookings_device_id_idx on bookings (device_id);

-- profiles: links a Supabase Auth user to a 4OR CarSpa role (admin / operator / worker).
-- Needed because auth.users alone has no concept of role, and /dashboard, /worker and
-- /admin each need to know who is allowed in and (for workers) which worker row they are.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  phone text,
  name text,
  role text not null check (role in ('admin', 'operator', 'worker')),
  worker_id uuid references workers(id),
  -- Operators (Supervisors) are scoped to one mall/location; admins see all.
  location text,
  created_at timestamp with time zone default now()
);

-- ============================================================
-- REALTIME
-- ============================================================

alter publication supabase_realtime add table bookings;

-- ============================================================
-- updated_at trigger for bookings
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists bookings_set_updated_at on bookings;
create trigger bookings_set_updated_at
  before update on bookings
  for each row
  execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table locations enable row level security;
alter table workers enable row level security;
alter table services enable row level security;
alter table bookings enable row level security;
alter table profiles enable row level security;

-- Helper: current user's role/worker_id, read from profiles.
create or replace function current_profile()
returns profiles as $$
  select * from profiles where id = auth.uid();
$$ language sql stable security definer;

-- profiles ---------------------------------------------------
create policy "profiles: user can read own row"
  on profiles for select
  using (id = auth.uid());

create policy "profiles: admin and operator can read all"
  on profiles for select
  using ((select role from current_profile()) in ('admin', 'operator'));

create policy "profiles: admin can manage"
  on profiles for all
  using ((select role from current_profile()) = 'admin')
  with check ((select role from current_profile()) = 'admin');

-- locations ----------------------------------------------------
create policy "locations: staff can read"
  on locations for select
  using (auth.role() = 'authenticated');

create policy "locations: admin can manage"
  on locations for all
  using ((select role from current_profile()) = 'admin')
  with check ((select role from current_profile()) = 'admin');

-- workers ------------------------------------------------------
create policy "workers: staff can read"
  on workers for select
  using (auth.role() = 'authenticated');

create policy "workers: admin and operator can manage"
  on workers for all
  using ((select role from current_profile()) in ('admin', 'operator'))
  with check ((select role from current_profile()) in ('admin', 'operator'));

-- services -------------------------------------------------------
-- Public read (customers on /book have no login) — nothing sensitive in a
-- service name/price.
create policy "services: public can read"
  on services for select
  using (true);

create policy "services: admin and operator can manage"
  on services for all
  using ((select role from current_profile()) in ('admin', 'operator'))
  with check ((select role from current_profile()) in ('admin', 'operator'));

-- bookings -------------------------------------------------------
-- Anyone (including anonymous customers on /book) can create a booking.
create policy "bookings: anyone can insert"
  on bookings for insert
  to anon, authenticated
  with check (true);

-- Admins can read every booking, across every mall/location.
create policy "bookings: admin can read all"
  on bookings for select
  using ((select role from current_profile()) = 'admin');

-- Operators (Supervisors) can only read bookings at their assigned location.
create policy "bookings: operator can read own location"
  on bookings for select
  using (
    (select role from current_profile()) = 'operator'
    and location = (select location from current_profile())
  );

-- Workers can only read bookings assigned to them.
create policy "bookings: worker can read own"
  on bookings for select
  using (
    (select role from current_profile()) = 'worker'
    and worker_id = (select worker_id from current_profile())
  );

-- Admins can update any booking, across every mall/location.
create policy "bookings: admin can update all"
  on bookings for update
  using ((select role from current_profile()) = 'admin')
  with check ((select role from current_profile()) = 'admin');

-- Operators (Supervisors) can only update bookings at their assigned location.
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

-- Workers can update only bookings assigned to them (status, key_status, photos).
create policy "bookings: worker can update own"
  on bookings for update
  using (
    (select role from current_profile()) = 'worker'
    and worker_id = (select worker_id from current_profile())
  )
  with check (
    (select role from current_profile()) = 'worker'
    and worker_id = (select worker_id from current_profile())
  );

-- ============================================================
-- STORAGE
-- ============================================================

insert into storage.buckets (id, name, public)
values ('car-photos', 'car-photos', true)
on conflict (id) do nothing;

create policy "car-photos: public read"
  on storage.objects for select
  using (bucket_id = 'car-photos');

create policy "car-photos: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'car-photos');
