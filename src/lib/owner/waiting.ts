// How many requests are waiting for the owner's answer, and whether any is late. The guest's email promises
// an answer within the hour, so a request waiting longer than that is late.
import { bangkokToday } from '@/lib/booking/model';
import { bookingStore } from '@/lib/booking/store';

export const late = (sentAt: string, now: number) => now - Date.parse(sentAt) > 36e5;

export type Waiting = { count: number; late: boolean };

export async function waitingNow(): Promise<Waiting> {
  const store = bookingStore();
  if (!store) return { count: 0, late: false };
  const now = Date.now();
  const waiting = await store.stays({ from: bangkokToday(), status: ['requested'] });
  return { count: waiting.length, late: waiting.some((b) => late(b.createdAt, now)) };
}
