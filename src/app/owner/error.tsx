'use client';

// What the owner sees when the request book cannot reach the bookings (Supabase down, a key changed, the
// network gone), on the same paper as the login, in place of the framework's blank error page. It says
// what the last click may or may not have done, because that is what the owner needs to know next.
import Link from 'next/link';

export default function OwnerError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="owner owner-door wrap">
      <div className="ticket">
        <div className="ticket-main owner-fault">
          <p className="ticket-head">
            <span>Saeng House</span>
            <span>Request book</span>
          </p>
          <h1>The book could not reach the bookings.</h1>
          <p>The database did not answer, so nothing on this page could be read. It is usually the connection, and it usually passes in a minute.</p>
          <p>If you had just pressed Confirm, Decline, Cancel or Save, it may or may not have gone through. Open the book again and look at that booking before you press anything twice; a request that was already answered cannot be answered again, so a second press does no harm.</p>
          <div className="owner-fault-act">
            <button className="btn" type="button" onClick={reset}>Try again</button>
            <Link href="/owner">Open the book</Link>
          </div>
          {error.digest && <p className="owner-fault-code">Error {error.digest}</p>}
        </div>
      </div>
    </main>
  );
}
