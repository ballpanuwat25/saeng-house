-- The owner's register (src/app/owner/register): one month of stays at a time, and a search across every
-- month. Both run as filters in the database, so the page reads a month or 50 rows however long the house
-- has been taking bookings.

-- the morning the guest leaves, so a stay that overlaps a month can be found with plain column filters
alter table bookings add column if not exists check_out date generated always as (check_in + nights) stored;

-- the month query bounds check_in on its own; the older indexes lead with room_id or status
create index if not exists bookings_check_in on bookings (check_in);

-- everything the search box looks in, as one column under one trigram index, so a search for part of a
-- name or an email (ilike '%...%') does not read the whole table
create extension if not exists pg_trgm with schema extensions;
alter table bookings add column if not exists search_text text
  generated always as (ref || ' ' || guest_name || ' ' || guest_email || ' ' || guest_contact) stored;
create index if not exists bookings_search on bookings using gin (search_text extensions.gin_trgm_ops);
create index if not exists bookings_created on bookings (created_at desc);
