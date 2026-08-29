-- Lets a customer describe how they'll hand over their key when they choose
-- "Drop at info desk" (e.g. "leaving it with security guard Raj").
-- Run once in the Supabase SQL editor.

alter table bookings add column if not exists key_handover_note text;
