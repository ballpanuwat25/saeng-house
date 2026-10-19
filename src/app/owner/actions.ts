'use server';
// The owner's actions. Each one checks the session itself as well as the middleware, since an action is
// a public endpoint once it is built.
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { availability, bangkokToday, isDeclineReason, parseOwnerBooking, parseRoomStay } from '@/lib/booking/model';
import { cancelledMail, changedMail, confirmedMail, declinedMail, sendMail } from '@/lib/booking/mail';
import { bookingStore } from '@/lib/booking/store';
import { newSession, ownerConfig, passwordMatches, SESSION_COOKIE, SESSION_DAYS, sessionValid } from '@/lib/owner/session';

export async function login(form: FormData) {
  const config = ownerConfig();
  if (!config || !(await passwordMatches(config, String(form.get('password') ?? '')))) redirect('/owner/login?wrong=1');
  (await cookies()).set(SESSION_COOKIE, await newSession(config), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/owner', maxAge: SESSION_DAYS * 86400,
  });
  redirect('/owner');
}

export async function logout() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: '/owner' });
  redirect('/owner/login');
}

async function storeForOwner() {
  if (!(await sessionValid(ownerConfig(), (await cookies()).get(SESSION_COOKIE)?.value))) redirect('/owner/login');
  const store = bookingStore();
  if (!store) redirect('/owner');
  return store;
}

// the guest's email goes out after the status is saved; if it fails the owner is told and can write by hand
async function mailed(to: string, mail: { subject: string; html: string }, tag: string) {
  try {
    await sendMail(to, mail, tag);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

// back to the book with a line saying what happened; `mail` is whether the guest's email went out, or 'none'
// when the owner chose not to send one or there is no address to send it to
type Mailed = boolean | 'none';
const done = (ref: string, what: string, mail: Mailed) =>
  redirect(`/owner?${new URLSearchParams({ done: ref, what, ...(mail === 'none' ? { mail: 'none' } : !mail && { mail: 'failed' }) })}`);

// the owner's choice to email the guest, which only counts when there is an address
const wantsMail = (form: FormData, email: string) => form.get('mail') === 'on' && email !== '';

const fullOn = (dates: string[]) =>
  `That room is full on ${dates.map((d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })).join(', ')}.`;

// what the forms that use useActionState get back when something is wrong; on success they are redirected
export type FormState = { error: string } | null;

export async function confirmBooking(form: FormData) {
  const store = await storeForOwner();
  const ref = String(form.get('ref'));
  const booking = await store.setStatus(ref, { status: 'confirmed' }, 'requested');
  if (!booking) redirect('/owner');
  done(ref, 'confirmed', await mailed(booking.guest.email, confirmedMail(booking), `${ref}-confirmed`));
}

export async function declineBooking(form: FormData) {
  const store = await storeForOwner();
  const ref = String(form.get('ref'));
  const reason = form.get('reason');
  const note = String(form.get('note') ?? '').trim().slice(0, 600);
  // "other" is only fair to the guest with the reason written out
  if (!isDeclineReason(reason) || (reason === 'other' && !note)) redirect(`/owner?${new URLSearchParams({ declining: ref, why: isDeclineReason(reason) ? 'note' : 'reason' })}#${ref}`);
  const decline = { reason, note: reason === 'other' ? note : '' };
  const booking = await store.setStatus(ref, { status: 'declined', decline }, 'requested');
  if (!booking) redirect('/owner');
  // counted after the decline has freed its own room, though only the other room kinds are offered
  const free = availability(await store.taken(booking.checkIn, booking.nights), booking.checkIn, booking.nights);
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
  done(ref, 'declined', await mailed(booking.guest.email, declinedMail(booking, decline, free, origin), `${ref}-declined`));
}

// a confirmed stay the guest or the house calls off; it frees the room
export async function cancelStay(form: FormData) {
  const store = await storeForOwner();
  const ref = String(form.get('ref'));
  const booking = await store.setStatus(ref, { status: 'cancelled' }, 'confirmed');
  if (!booking) redirect('/owner');
  done(ref, 'cancelled', wantsMail(form, booking.guest.email) ? await mailed(booking.guest.email, cancelledMail(booking), `${ref}-cancelled`) : 'none');
}

// a confirmed stay moved to other nights or another kind of room
export async function changeStay(_: FormState, form: FormData): Promise<FormState> {
  const store = await storeForOwner();
  const ref = String(form.get('ref'));
  // a guest already staying may be given more nights, keeping the arrival day that has passed
  const was = String(form.get('was') ?? '');
  const today = bangkokToday();
  const stay = parseRoomStay(Object.fromEntries(form), was && was < today ? was : today);
  if (!stay.ok) return { error: stay.error };
  const moved = await store.move(ref, stay.value);
  if (!moved) return { error: 'This stay is no longer confirmed, so it cannot be changed. Open the book again to see where it stands.' };
  if (!moved.ok) return { error: fullOn(moved.fullOn) };
  const { booking } = moved;
  done(ref, 'moved', wantsMail(form, booking.guest.email) ? await mailed(booking.guest.email, changedMail(booking), `${ref}-changed`) : 'none');
  return null;
}

// a booking taken by phone, on LINE or as a walk-in: saved the way a guest's request is, under the same
// check that the nights are free, then confirmed at once
export async function addBooking(_: FormState, form: FormData): Promise<FormState> {
  const store = await storeForOwner();
  const parsed = parseOwnerBooking(Object.fromEntries(form));
  if (!parsed.ok) return { error: parsed.error };
  const held = await store.request(parsed.value);
  if (!held.ok) return { error: fullOn(held.fullOn) };
  const booking = (await store.setStatus(held.booking.ref, { status: 'confirmed' }, 'requested')) ?? held.booking;
  const { ref } = booking;
  done(ref, 'added', wantsMail(form, booking.guest.email) ? await mailed(booking.guest.email, confirmedMail(booking), `${ref}-confirmed`) : 'none');
  return null;
}
