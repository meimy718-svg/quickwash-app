-- Lets Admin/Supervisor define the list of services (name + price) customers
-- pick from at booking time, instead of a hardcoded Basic/Premium/Full Detail.
-- Run once in the Supabase SQL editor.

create table if not exists services (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price numeric not null,
  available boolean default true,
  created_at timestamp with time zone default now()
);

alter table services enable row level security;

-- Public read (customers on /book have no login) — nothing sensitive in a
-- service name/price.
create policy "services: public can read"
  on services for select
  using (true);

create policy "services: admin and operator can manage"
  on services for all
  using ((select role from current_profile()) in ('admin', 'operator'))
  with check ((select role from current_profile()) in ('admin', 'operator'));
