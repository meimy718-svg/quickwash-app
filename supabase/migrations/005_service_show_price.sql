-- Lets Admin/Supervisor hide a service's price from customers on /book,
-- per service, while still tracking the price internally.
-- Run once in the Supabase SQL editor.

alter table services add column if not exists show_price boolean default true;
