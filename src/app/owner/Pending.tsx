'use client';

// While the owner's click on a link is still being answered: the sheet they are reading stays up, and a
// lantern-red rule draws across under the link they pressed until the next one is ready. Keeping the old
// sheet, rather than clearing it for a loading line, keeps the page's height, its scrollbar and its
// scroll from jumping.
import Link from 'next/link';
import { useLinkStatus } from 'next/link';

export function Pending({ on }: { on?: boolean }) {
  const { pending } = useLinkStatus();
  return <span className="link-pending" data-on={on || pending || undefined} aria-hidden />;
}

export function PendingLink({ href, rel, children }: { href: string; rel?: string; children: React.ReactNode }) {
  return (
    <Link href={href} rel={rel}>
      {children}
      <Pending />
    </Link>
  );
}
