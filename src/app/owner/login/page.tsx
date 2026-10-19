import type { Metadata } from 'next';
import { hotel } from '@/content/site';
import { ownerConfig } from '@/lib/owner/session';
import { LOGIN } from '@/lib/owner/throttle';
import { isDemo } from '@/lib/demo';
import { demoLogin, login } from '@/app/owner/actions';
import Busy from '@/app/owner/Busy';

export const metadata: Metadata = { title: `Owner · ${hotel.name}`, robots: { index: false } };

export default async function OwnerLogin({ searchParams }: { searchParams: Promise<{ wrong?: string; shut?: string }> }) {
  const { wrong, shut } = await searchParams;
  const bad = Boolean(wrong || shut);
  const open = ownerConfig() !== null;

  // the public demo: anyone may look inside, so the ticket says what they will find and lets them in
  if (isDemo() && open) {
    return (
      <main className="owner owner-door wrap">
        <form className="ticket" action={demoLogin}>
          <div className="ticket-main">
            <p className="ticket-head">
              <span>{hotel.name}</span>
              <span>Request book</span>
            </p>
            <h1 className="door-title">The owner&rsquo;s side, open to look around.</h1>
            <p className="door-note">
              Requests sent from the booking ticket land here. Confirm or decline them, add a booking taken by phone, move or cancel a stay, and see the
              month&rsquo;s figures and the room rack. No email goes out to anyone; each one can be read on the page instead.
            </p>
            <p className="door-note">The book is cleared every night and filled with a fresh year of made-up bookings.</p>
          </div>
          <div className="ticket-stub">
            <Busy label="Open the demo book" busy="Opening…" />
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="owner owner-door wrap">
      <form className="ticket" action={login}>
        <div className="ticket-main">
          <p className="ticket-head">
            <span>{hotel.name}</span>
            <span>Request book</span>
          </p>
          <div className="field">
            <label htmlFor="password">The owner&rsquo;s password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus disabled={!open} />
          </div>
          <p className={`msg${bad ? ' bad' : ''}`} role={bad ? 'alert' : undefined}>
            {!open
              ? 'The book stays shut until OWNER_PASSWORD and OWNER_SESSION_SECRET are set.'
              : shut
                ? `Too many wrong tries from here. Wait ${LOGIN.minutes} minutes, then try again.`
                : wrong
                  ? 'That is not the password.'
                  : 'For the house only.'}
          </p>
        </div>
        <div className="ticket-stub">
          <Busy label="Open the book" busy="Opening…" disabled={!open} />
        </div>
      </form>
    </main>
  );
}
