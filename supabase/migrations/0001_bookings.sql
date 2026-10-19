-- Saeng House bookings. Run once in the Supabase SQL editor (or with the Supabase CLI).
-- The website talks to these two functions with the service key from the server only; the table is closed
-- to the public keys by row-level security with no policies.

create table if not exists bookings (
  ref           text primary key,
  room_id       text not null check (room_id in ('lattice', 'moon', 'roof')),
  check_in      date not null,
  nights        int  not null check (nights between 1 and 14),
  status        text not null default 'requested' check (status in ('requested', 'confirmed', 'declined', 'cancelled')),
  total         int  not null,
  guest_name    text not null,
  guest_email   text not null,
  guest_contact text not null default '',
  note          text not null default '',
  created_at    timestamptz not null default now()
);

create index if not exists bookings_stay on bookings (room_id, check_in);
alter table bookings enable row level security;

-- for each room kind, how many rooms are held on each night from p_from to p_until (both included)
create or replace function taken_nights(p_from date, p_until date)
returns table (room_id text, night date, taken int)
language sql stable as $$
  select b.room_id, n::date as night, count(*)::int as taken
  from bookings b, generate_series(b.check_in, b.check_in + b.nights - 1, interval '1 day') n
  where b.status in ('requested', 'confirmed') and n::date between p_from and p_until
  group by b.room_id, n::date;
$$;

-- checks the nights are free and saves the request in one transaction, under a lock per room kind, so two
-- guests cannot both take the last room. The house's room counts live in the website, which passes them in.
create or replace function request_booking(
  p_ref text, p_room text, p_capacity int, p_check_in date, p_nights int, p_total int,
  p_name text, p_email text, p_contact text, p_note text
) returns json
language plpgsql as $$
declare
  full_on date[];
  saved bookings;
begin
  perform pg_advisory_xact_lock(hashtext('booking:' || p_room));
  select array_agg(night order by night) into full_on
  from taken_nights(p_check_in, p_check_in + p_nights - 1)
  where room_id = p_room and taken >= p_capacity;
  if full_on is not null then
    return json_build_object('ok', false, 'full_on', full_on);
  end if;
  insert into bookings (ref, room_id, check_in, nights, total, guest_name, guest_email, guest_contact, note)
  values (p_ref, p_room, p_check_in, p_nights, p_total, p_name, p_email, p_contact, p_note)
  returning * into saved;
  return json_build_object('ok', true, 'booking', row_to_json(saved));
end;
$$;

revoke all on function request_booking from anon, authenticated;
revoke all on function taken_nights from anon, authenticated;
