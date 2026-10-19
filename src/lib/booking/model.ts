// The booking model shared by the API routes, the stores and the emails. A booking holds one room of a
// kind for a run of nights; a night is the date the guest goes to sleep, so a stay from the 25th for two
// nights takes the nights of the 25th and the 26th and checks out on the 27th.
import { booking as bookingCopy, rooms, type Room } from '@/content/site';

export type RoomId = Room['id'];
export type BookingStatus = 'requested' | 'confirmed' | 'declined' | 'cancelled';
// a request holds its room from the moment it is sent until the owner declines it or it is cancelled
export const HOLDING: readonly BookingStatus[] = ['requested', 'confirmed'];

export type Guest = { name: string; email: string; contact: string };
export type BookingRequest = { roomId: RoomId; checkIn: string; nights: number; guest: Guest; note: string };
export type Booking = BookingRequest & { ref: string; status: BookingStatus; total: number; createdAt: string; decline?: Decline };

// why the owner turned a request down; the guest's email is worded from it
export const DECLINE_REASONS = ['full', 'unreachable', 'repairs', 'other'] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];
export type Decline = { reason: DeclineReason; note: string };
export const isDeclineReason = (v: unknown): v is DeclineReason => DECLINE_REASONS.includes(v as DeclineReason);

// how many rooms of each kind are free on each night of a stay
export type Availability = Record<RoomId, { left: number; fullOn: string[] }>;

const DAY = 864e5;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const roomOf = (id: RoomId) => rooms.find((r) => r.id === id)!;
export const isRoomId = (v: unknown): v is RoomId => rooms.some((r) => r.id === v);

// the hotel's own today: a guest booking at 23:30 in London is already booking for tomorrow in Bangkok
export const bangkokToday = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);

export function nightsOf(checkIn: string, nights: number) {
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  return Array.from({ length: nights }, (_, i) => new Date(start + i * DAY).toISOString().slice(0, 10));
}

export const addDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
export const checkOutOf = addDays;

export const totalOf = (roomId: RoomId, nights: number) => roomOf(roomId).pricePerNight * nights;

// what a store returns for a stay: for each room kind, how many are taken on each night
export type Taken = Record<RoomId, Record<string, number>>;

export function availability(taken: Taken, checkIn: string, nights: number): Availability {
  const days = nightsOf(checkIn, nights);
  return Object.fromEntries(
    rooms.map((r) => {
      const free = days.map((d) => r.count - (taken[r.id]?.[d] ?? 0));
      return [r.id, { left: Math.max(0, Math.min(...free)), fullOn: days.filter((_, i) => free[i] <= 0) }];
    }),
  ) as Availability;
}

// short and easy to read out over the phone: no 0/O or 1/I
const REF_LETTERS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const newRef = () => 'SH-' + Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => REF_LETTERS[b % 32]).join('');

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseStay(input: { checkIn?: unknown; nights?: unknown }): Parsed<{ checkIn: string; nights: number }> {
  const { checkIn, nights } = input;
  if (typeof checkIn !== 'string' || !ISO.test(checkIn) || Number.isNaN(Date.parse(checkIn))) return { ok: false, error: 'Choose an arrival date.' };
  if (checkIn < bangkokToday()) return { ok: false, error: 'That date has already passed in Bangkok.' };
  const n = Number(nights);
  if (!Number.isInteger(n) || n < 1 || n > bookingCopy.maxNights) return { ok: false, error: `Stays run from 1 to ${bookingCopy.maxNights} nights.` };
  return { ok: true, value: { checkIn, nights: n } };
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');

export function parseRequest(body: unknown): Parsed<BookingRequest> {
  const b = (body ?? {}) as Record<string, unknown>;
  const stay = parseStay(b);
  if (!stay.ok) return stay;
  if (!isRoomId(b.roomId)) return { ok: false, error: 'Choose a room.' };
  const g = (b.guest ?? {}) as Record<string, unknown>;
  const guest = { name: text(g.name, 80), email: text(g.email, 120).toLowerCase(), contact: text(g.contact, 60) };
  if (guest.name.length < 2) return { ok: false, error: 'Tell us your name.' };
  if (!EMAIL.test(guest.email)) return { ok: false, error: 'That email address does not look right.' };
  return { ok: true, value: { roomId: b.roomId, ...stay.value, guest, note: text(b.note, 500) } };
}
