import type { Metadata } from 'next';
import { hotel } from '@/content/site';
import { ownerConfig } from '@/lib/owner/session';
import { login } from '@/app/owner/actions';

export const metadata: Metadata = { title: `Owner · ${hotel.name}`, robots: { index: false } };

export default async function OwnerLogin({ searchParams }: { searchParams: Promise<{ wrong?: string }> }) {
  const { wrong } = await searchParams;
  const open = ownerConfig() !== null;
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
          <p className={`msg${wrong ? ' bad' : ''}`} role={wrong ? 'alert' : undefined}>
            {!open ? 'The book stays shut until OWNER_PASSWORD and OWNER_SESSION_SECRET are set.' : wrong ? 'That is not the password.' : 'For the house only.'}
          </p>
        </div>
        <div className="ticket-stub">
          <button className="btn" type="submit" disabled={!open}>Open the book</button>
        </div>
      </form>
    </main>
  );
}
