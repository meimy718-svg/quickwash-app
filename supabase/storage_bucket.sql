-- Run this if the car-photos bucket wasn't created by the main schema.sql run.

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
