-- Adds device-based recognition so returning customers can see their booking
-- history and re-book a previous car without re-entering everything.
-- Run this once in the Supabase SQL editor against the existing project.

alter table bookings add column if not exists device_id text;

create index if not exists bookings_device_id_idx on bookings (device_id);
