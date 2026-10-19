'use client';

// While the owner's click on a link is still being answered: the sheet they are reading stays up but
// fades back, and a lantern-red rule draws across under the link they pressed until the next one is ready.
// Keeping the old sheet, rather than clearing it for a loading line, keeps the page's height, its
// scrollbar and its scroll from jumping.
import Link from 'next/link';
import { useLinkStatus } from 'next/link';
import { useEffect } from 'react';

export function Pending({ on }: { on?: boolean }) {
  const { pending } = useLinkStatus();
  const loading = Boolean(on || pending);
  // the fade is on the page, not the link, so the mark goes on the root for the stylesheet to read
  useEffect(() => {
    if (!loading) return;
    const root = document.documentElement;
    root.dataset.turning = '';
    return () => {
      delete root.dataset.turning;
    };
  }, [loading]);
  return <span className="link-pending" data-on={loading || undefined} aria-hidden />;
}

export function PendingLink({ href, rel, children }: { href: string; rel?: string; children: React.ReactNode }) {
  return (
    // not prefetched, so the sheet it opens is read fresh (BookTabs.tsx says why)
    <Link href={href} rel={rel} prefetch={false}>
      {children}
      <Pending />
    </Link>
  );
}
