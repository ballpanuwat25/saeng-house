// Where bookings live. With Supabase keys set they live in Supabase; on a developer's machine without
// keys they live in a local file, so the whole flow can be tried; on a deployed site without keys there is
// no store and the ticket stays a demo.
import type { Booking, BookingRequest, Decline, Taken } from '@/lib/booking/model';
import { fileStore } from '@/lib/booking/file-store';
import { supabaseStore } from '@/lib/booking/supabase-store';

export type RequestResult = { ok: true; booking: Booking } | { ok: false; fullOn: string[] };

export interface BookingStore {
  // for each room kind, how many rooms are held on each night of the stay
  taken(checkIn: string, nights: number): Promise<Taken>;
  // checks the nights are free and saves the request in one step, so two guests cannot take the last room
  request(req: BookingRequest): Promise<RequestResult>;
  // every booking, in no particular order; the owner's request book sorts them
  list(): Promise<Booking[]>;
  // answers a request that is still waiting. Returns null when there is no such request or it was already
  // answered, so a second click on Confirm cannot send the guest a second email.
  setStatus(ref: string, answer: Answer): Promise<Booking | null>;
}

// a decline always carries its reason, a confirmation never does
export type Answer = { status: 'confirmed' } | { status: 'declined'; decline: Decline };

export function bookingStore(): BookingStore | null {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VERCEL } = process.env;
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) return supabaseStore(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  return VERCEL ? null : fileStore();
}
