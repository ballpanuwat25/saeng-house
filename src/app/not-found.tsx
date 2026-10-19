// Any address the site does not have, and the ones it hides on purpose (/film outside film mode, a demo
// email for a ref that is not in the book): a ticket on the booking slip's paper, with the seal on the stub,
// in place of the framework's white page, with the home page's lamp following the pointer behind it. The way home is the lantern-red button, as everywhere else.
// The root layout starts the page with is-loading, but that only holds the page still while .loader is on
// it (globals.css), and there is none here, so this page scrolls like any other.
import type { Metadata } from 'next';
import Link from 'next/link';
import { hotel } from '@/content/site';
import Lamp from '@/components/Lamp';

export const metadata: Metadata = { title: `Not here · ${hotel.name}`, robots: { index: false } };

export default function NotFound() {
  return (
    <>
      <Lamp />
      <main className="lost wrap">
        <div className="ticket">
          <div className="ticket-main">
            <p className="ticket-head">
              <span>{hotel.name}</span>
              <span>404</span>
            </p>
            <h1>There is no room at this address.</h1>
            <p>The link may be old, or it was cut short when it was copied.</p>
            <div className="lost-act">
              <Link className="btn" href="/">Back to the house</Link>
              <Link href="/#book">Book a room</Link>
            </div>
          </div>
          <div className="ticket-stub lost-stub">
            <p>Talat Noi, Bangkok</p>
            <svg className="lost-seal" viewBox="0 0 100 100" aria-hidden="true">
              <rect x="4" y="4" width="92" height="92" rx="6" className="seal-ink" />
              <rect x="11" y="11" width="78" height="78" rx="3" className="seal-line" />
              <text x="50" y="62" textAnchor="middle" className="seal-word">{hotel.wordmark}</text>
            </svg>
          </div>
        </div>
      </main>
    </>
  );
}
