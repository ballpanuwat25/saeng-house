// Bookings in Supabase, through two database functions (supabase/migrations/0001_bookings.sql). The
// check and the save happen inside one database call, under a lock per room kind, so two guests cannot
// both take the last room. Talks to Supabase's REST endpoint directly with the service key; this runs on
// the server only.
import { newRef, nightsOf, roomOf, totalOf, type Booking, type BookingStatus, type RoomId, type Taken } from '@/lib/booking/model';
import type { BookingStore } from '@/lib/booking/store';

type Row = {
  ref: string; room_id: RoomId; check_in: string; nights: number; status: BookingStatus; total: number;
  guest_name: string; guest_email: string; guest_contact: string; note: string; created_at: string;
};

const toBooking = (r: Row): Booking => ({
  ref: r.ref, roomId: r.room_id, checkIn: r.check_in, nights: r.nights, status: r.status, total: r.total,
  guest: { name: r.guest_name, email: r.guest_email, contact: r.guest_contact }, note: r.note, createdAt: r.created_at,
});

export function supabaseStore(url: string, key: string): BookingStore {
  const rpc = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Supabase ${fn} answered ${res.status}: ${await res.text()}`);
    return res.json();
  };

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
  };
}
