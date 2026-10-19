// Where bookings live. With Supabase keys set they live in Supabase; on a developer's machine without
// keys they live in a local file, so the whole flow can be tried; on a deployed site without keys there is
// no store and the ticket stays a demo.
import type { Booking, BookingRequest, BookingStatus, Decline, RoomId, Taken } from '@/lib/booking/model';
import { fileStore } from '@/lib/booking/file-store';
import { supabaseStore } from '@/lib/booking/supabase-store';

export type RequestResult = { ok: true; booking: Booking } | { ok: false; fullOn: string[] };
// a confirmed stay moved to other nights or another kind of room; null when there is no such confirmed stay
export type MoveResult = RequestResult | null;
export type Stay = { roomId: RoomId; checkIn: string; nights: number };

export interface BookingStore {
  // for each room kind, how many rooms are held on each night of the stay
  taken(checkIn: string, nights: number): Promise<Taken>;
  // checks the nights are free and saves the request in one step, so two guests cannot take the last room
  request(req: BookingRequest): Promise<RequestResult>;
  // bookings with at least one night on or after `from` and before `until` (open ended without it),
  // optionally only those in the given states, in no particular order; the request book sorts them
  stays(filter: StayFilter): Promise<Booking[]>;
  // bookings whose ref, guest name, email or contact contain `q`, ignoring case, newest request first
  search(q: string, limit: number): Promise<Booking[]>;
  // moves a booking on from the state `from`: answers a request that is still waiting, or cancels a
  // confirmed stay. Returns null when there is no such booking in that state, so a second click on Confirm
  // or Cancel cannot send the guest a second email.
  setStatus(ref: string, change: Change, from: BookingStatus): Promise<Booking | null>;
  // moves a confirmed stay to other nights or another kind of room, checking the new nights are free (not
  // counting the stay itself) and saving in one step, like request; the price is worked out again
  move(ref: string, stay: Stay): Promise<MoveResult>;
  // throws every booking away and puts these in their place; only the public demo's nightly reset uses it
  replaceAll(bookings: Booking[]): Promise<void>;
}

export type StayFilter = { from: string; until?: string; status?: readonly BookingStatus[] };

// a decline always carries its reason, a confirmation or a cancellation never does
export type Change = { status: 'confirmed' } | { status: 'cancelled' } | { status: 'declined'; decline: Decline };

export function bookingStore(): BookingStore | null {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VERCEL } = process.env;
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) return supabaseStore(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  return VERCEL ? null : fileStore();
}
