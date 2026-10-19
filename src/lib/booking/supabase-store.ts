// Bookings in Supabase, through two database functions (supabase/migrations/0001_bookings.sql). The
// check and the save happen inside one database call, under a lock per room kind, so two guests cannot
// both take the last room. Talks to Supabase's REST endpoint directly with the service key; this runs on
// the server only.
import { addDays, newRef, nightsOf, roomOf, totalOf, type Booking, type BookingStatus, type DeclineReason, type RoomId, type Taken } from '@/lib/booking/model';
import { booking as bookingCopy } from '@/content/site';
import type { BookingStore } from '@/lib/booking/store';

type Row = {
  ref: string; room_id: RoomId; check_in: string; nights: number; status: BookingStatus; total: number;
  guest_name: string; guest_email: string; guest_contact: string; note: string; created_at: string;
  decline_reason: DeclineReason | null; decline_note: string | null;
};

const toBooking = (r: Row): Booking => ({
  ref: r.ref, roomId: r.room_id, checkIn: r.check_in, nights: r.nights, status: r.status, total: r.total,
  guest: { name: r.guest_name, email: r.guest_email, contact: r.guest_contact }, note: r.note, createdAt: r.created_at,
  ...(r.decline_reason && { decline: { reason: r.decline_reason, note: r.decline_note ?? '' } }),
});

export function supabaseStore(url: string, key: string): BookingStore {
  const rest = async <T>(route: string, method: string, body?: Record<string, unknown>): Promise<T> => {
    const res = await fetch(`${url}/rest/v1/${route}`, {
      method,
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: body && JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Supabase ${method} ${route} answered ${res.status}: ${await res.text()}`);
    return res.json();
  };
  const rpc = <T>(fn: string, args: Record<string, unknown>) => rest<T>(`rpc/${fn}`, 'POST', args);

  return {
    async taken(checkIn, nights) {
      const days = nightsOf(checkIn, nights);
      const rows = await rpc<{ room_id: RoomId; night: string; taken: number }[]>('taken_nights', { p_from: days[0], p_until: days.at(-1) });
      const taken = {} as Taken;
      for (const r of rows) (taken[r.room_id] ??= {})[r.night] = r.taken;
      return taken;
    },
    async request(req) {
      const out = await rpc<{ ok: boolean; booking?: Row; full_on?: string[] }>('request_booking', {
        p_ref: newRef(), p_room: req.roomId, p_capacity: roomOf(req.roomId).count, p_check_in: req.checkIn, p_nights: req.nights,
        p_total: totalOf(req.roomId, req.nights), p_name: req.guest.name, p_email: req.guest.email, p_contact: req.guest.contact, p_note: req.note,
      });
      return out.ok && out.booking ? { ok: true, booking: toBooking(out.booking) } : { ok: false, fullOn: out.full_on ?? [] };
    },
    async stays({ from, until, status }) {
      // check_out (0003_register.sql) gives the exact overlap; the lower bound on check_in, the earliest
      // arrival a stay of the longest length could have and still reach `from`, lets the check_in index
      // read only the window around the month instead of every stay before it
      const filters = new URLSearchParams({ select: '*', check_out: `gt.${from}` });
      filters.append('check_in', `gte.${addDays(from, 1 - bookingCopy.maxNights)}`);
      if (until) filters.append('check_in', `lt.${until}`);
      if (status) filters.set('status', `in.(${status.join(',')})`);
      return (await rest<Row[]>(`bookings?${filters}`, 'GET')).map(toBooking);
    },
    async search(q, limit) {
      // search_text (0003_register.sql) joins the four fields under one trigram index. PostgREST reads * as
      // the wildcard, and a backslash keeps the guest's own % or _ from acting as one
      const needle = q.replace(/\*/g, '').replace(/[\\%_]/g, '\\$&');
      const filters = new URLSearchParams({ select: '*', search_text: `ilike.*${needle}*`, order: 'created_at.desc', limit: String(limit) });
      return (await rest<Row[]>(`bookings?${filters}`, 'GET')).map(toBooking);
    },
    async setStatus(ref, answer) {
      // the status filter makes this a no-op on a request already answered, in the same statement as the update
      const decline = answer.status === 'declined' ? answer.decline : null;
      const rows = await rest<Row[]>(`bookings?ref=eq.${encodeURIComponent(ref)}&status=eq.requested`, 'PATCH', {
        status: answer.status, decline_reason: decline?.reason ?? null, decline_note: decline?.note ?? null,
      });
      return rows[0] ? toBooking(rows[0]) : null;
    },
  };
}
