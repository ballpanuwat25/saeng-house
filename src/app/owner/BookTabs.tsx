'use client';

// The tabs of the request book, plain links. They live in the book's layout and know the open tab from the
// address; while the next tab loads, the one pressed draws its rule (Pending.tsx). The layout is not rendered
// again on a move between tabs, so the number of waiting requests is asked for afresh on every move and
// once a minute, from /owner/waiting.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Waiting } from '@/lib/owner/waiting';
import { Pending } from '@/app/owner/Pending';

const TABS = [
  { href: '/owner', name: 'Requests' },
  { href: '/owner/rooms', name: 'Rooms' },
  { href: '/owner/register', name: 'Register' },
];

export default function BookTabs({ first }: { first: Waiting }) {
  const path = usePathname();
  const [waiting, setWaiting] = useState(first);

  // a server render (after Confirm, Decline or a reload) brings a fresh count of its own
  useEffect(() => setWaiting(first), [first]);

  useEffect(() => {
    const ask = new AbortController();
    const refresh = () =>
      fetch('/owner/waiting', { cache: 'no-store', signal: ask.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((w: Waiting | null) => w && setWaiting(w))
        .catch(() => {});
    refresh();
    const every = setInterval(refresh, 60_000);
    return () => {
      ask.abort();
      clearInterval(every);
    };
  }, [path]);

  return (
    <nav className="owner-tabs" aria-label="Request book">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={path === t.href ? 'page' : undefined}>
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
