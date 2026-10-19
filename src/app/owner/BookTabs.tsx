'use client';

// The tabs of the request book, plain links. They live in the book's layout and know the open tab from the
// address; while the next tab loads, the one pressed draws its rule (Pending.tsx). The layout is not rendered
// again on a move between tabs, so the requests waiting are asked for afresh from /owner/waiting on every
// move, every 15 seconds, and whenever the owner comes back to the window. When they differ from what the
// open sheet was drawn with, a request has come in or been answered elsewhere, and the sheet is drawn again
// from the server, so a guest's request shows up without a reload. Forms the owner is filling in keep what
// is typed in them, since only the server's part of the page is redrawn.
//
// No link in the book prefetches. The sheets have no loading.tsx, so a prefetch brings back only the route,
// not the sheet; a click on a prefetched link then skips the server and shows the copy of that sheet the
// browser kept from its last visit, so a request that came in since would be missing while the count above
// already has it. Without the prefetch every move asks the server for the sheet as it is now.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Waiting } from '@/lib/owner/waiting';
import { Pending } from '@/app/owner/Pending';

const TABS = [
  { href: '/owner', name: 'Requests' },
  { href: '/owner/rooms', name: 'Rooms' },
  { href: '/owner/register', name: 'Register' },
];

export default function BookTabs({ first }: { first: Waiting }) {
  const path = usePathname();
  const router = useRouter();
  const [waiting, setWaiting] = useState(first);
  // what the sheet on screen was drawn with
  const drawn = useRef(first);

  // a server render (after Confirm, Decline, a redraw or a reload) brings a fresh count of its own
  useEffect(() => {
    setWaiting(first);
    drawn.current = first;
  }, [first]);

  useEffect(() => {
    const ask = new AbortController();
    const check = () =>
      fetch('/owner/waiting', { cache: 'no-store', signal: ask.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((w: Waiting | null) => {
          if (!w) return;
          setWaiting(w);
          if (w.count !== drawn.current.count || w.newest !== drawn.current.newest) {
            drawn.current = w;
            router.refresh();
          }
        })
        .catch(() => {});
    const back = () => document.visibilityState === 'visible' && check();
    check();
    const every = setInterval(check, 15_000);
    addEventListener('focus', back);
    document.addEventListener('visibilitychange', back);
    return () => {
      ask.abort();
      clearInterval(every);
      removeEventListener('focus', back);
      document.removeEventListener('visibilitychange', back);
    };
  }, [path, router]);

  return (
    <nav className="owner-tabs" aria-label="Request book">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} prefetch={false} aria-current={path === t.href ? 'page' : undefined}>
          {t.name}
          {t.href === '/owner' && waiting.count > 0 && (
            <span className="owner-tab-count" data-late={waiting.late || undefined}>
              {waiting.count}
              <span className="sr"> waiting{waiting.late ? ', some past the hour' : ''}</span>
            </span>
          )}
          <Pending />
        </Link>
      ))}
    </nav>
  );
}
