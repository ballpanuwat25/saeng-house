-- The owner moving a confirmed stay to other nights or another kind of room (src/app/owner). Like
-- request_booking, the check and the save happen in one transaction under the lock for the new room kind, so
-- a guest booking at the same moment cannot take the room the stay is moving into. The stay's own nights
-- are left out of the count, so moving a stay by a night does not find it in its own way.

create or replace function move_booking(
  p_ref text, p_room text, p_capacity int, p_check_in date, p_nights int, p_total int
) returns json
language plpgsql as $$
declare
  full_on date[];
  saved bookings;
begin
  perform pg_advisory_xact_lock(hashtext('booking:' || p_room));
  select array_agg(n::date order by n) into full_on
  from generate_series(p_check_in, p_check_in + p_nights - 1, interval '1 day') n
  where (
    select count(*) from bookings b
    where b.room_id = p_room and b.ref <> p_ref and b.status in ('requested', 'confirmed')
      and n::date >= b.check_in and n::date < b.check_in + b.nights
  ) >= p_capacity;
  if full_on is not null then
    return json_build_object('ok', false, 'full_on', full_on);
  end if;
  update bookings set room_id = p_room, check_in = p_check_in, nights = p_nights, total = p_total
  where ref = p_ref and status = 'confirmed'
  returning * into saved;
  if not found then
    return json_build_object('ok', false, 'missing', true);
  end if;
  return json_build_object('ok', true, 'booking', row_to_json(saved));
end;
$$;

revoke all on function move_booking from anon, authenticated;
