'use server';
// The owner's actions. Each one checks the session itself as well as the middleware, since an action is
// a public endpoint once it is built.
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { availability, isDeclineReason } from '@/lib/booking/model';
import { confirmedMail, declinedMail, sendMail } from '@/lib/booking/mail';
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

const done = (ref: string, what: string, ok: boolean) => redirect(`/owner?${new URLSearchParams({ done: ref, what, ...(!ok && { mail: 'failed' }) })}`);

export async function confirmBooking(form: FormData) {
  const store = await storeForOwner();
  const ref = String(form.get('ref'));
  const booking = await store.setStatus(ref, { status: 'confirmed' });
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
  const booking = await store.setStatus(ref, { status: 'declined', decline });
  if (!booking) redirect('/owner');
  // counted after the decline has freed its own room, though only the other room kinds are offered
  const free = availability(await store.taken(booking.checkIn, booking.nights), booking.checkIn, booking.nights);
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
  done(ref, 'declined', await mailed(booking.guest.email, declinedMail(booking, decline, free, origin), `${ref}-declined`));
}
