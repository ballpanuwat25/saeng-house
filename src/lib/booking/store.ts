// Where bookings live. With Supabase keys set they live in Supabase; on a developer's machine without
// keys they live in a local file, so the whole flow can be tried; on a deployed site without keys there is
// no store and the ticket stays a demo.
import type { Booking, BookingRequest, Taken } from '@/lib/booking/model';
import { fileStore } from '@/lib/booking/file-store';
import { supabaseStore } from '@/lib/booking/supabase-store';

export type RequestResult = { ok: true; booking: Booking } | { ok: false; fullOn: string[] };

export interface BookingStore {
  // for each room kind, how many rooms are held on each night of the stay
  taken(checkIn: string, nights: number): Promise<Taken>;
  // checks the nights are free and saves the request in one step, so two guests cannot take the last room
  request(req: BookingRequest): Promise<RequestResult>;
}

export function bookingStore(): BookingStore | null {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VERCEL } = process.env;
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) return supabaseStore(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  return VERCEL ? null : fileStore();
}
