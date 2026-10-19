-- The owner's request book (src/app/owner). A declined request keeps why it was declined, so the owner can
-- look back at it. The website reads and updates the table through Supabase's REST endpoint with the service
-- key, which row-level security does not stop; the public keys still see nothing.

alter table bookings
  add column if not exists decline_reason text check (decline_reason in ('full', 'unreachable', 'repairs', 'other')),
  add column if not exists decline_note   text;

create index if not exists bookings_status on bookings (status, check_in);
