'use client';

// The tabs of the request book, plain links. They live in the book's layout and know the open tab from the
// address, so they turn over at the click while the next tab is still loading.
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/owner', name: 'Requests' },
  { href: '/owner/rooms', name: 'Rooms' },
  { href: '/owner/register', name: 'Register' },
];

export default function BookTabs({ waiting, late }: { waiting: number; late: boolean }) {
  const path = usePathname();
  return (
    <nav className="owner-tabs" aria-label="Request book">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={path === t.href ? 'page' : undefined}>
          {t.name}
          {t.href === '/owner' && waiting > 0 && (
            <span className="owner-tab-count" data-late={late || undefined}>
              {waiting}
              <span className="sr"> waiting{late ? ', some past the hour' : ''}</span>
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
