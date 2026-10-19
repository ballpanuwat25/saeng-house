// How many requests are waiting for the owner's answer, and whether any is late. The guest's email promises
// an answer within the hour, so a request waiting longer than that is late.
import { bangkokToday } from '@/lib/booking/model';
import { bookingStore } from '@/lib/booking/store';

export const late = (sentAt: string, now: number) => now - Date.parse(sentAt) > 36e5;

// `newest` is when the latest of them was sent, so the book can tell a new request from one answered
// elsewhere even when the count comes out the same
export type Waiting = { count: number; late: boolean; newest: string };

export async function waitingNow(): Promise<Waiting> {
  const store = bookingStore();
  if (!store) return { count: 0, late: false, newest: '' };
  const now = Date.now();
  const waiting = await store.stays({ from: bangkokToday(), status: ['requested'] });
  const newest = waiting.reduce((at, b) => (b.createdAt > at ? b.createdAt : at), '');
  return { count: waiting.length, late: waiting.some((b) => late(b.createdAt, now)), newest };
}
