// The request book's three tabs share this page: the header and its tabs stay while the sheet below
// changes. There is no loading.tsx on purpose: the sheet being read stays up until the next is ready, with
// a rule drawing under the link that was pressed (Pending.tsx), so the page never empties and jumps.
import { BookTop } from '@/app/owner/book';
import StayFocus from '@/app/owner/StayFocus';

export const dynamic = 'force-dynamic';

export default function Book({ children }: { children: React.ReactNode }) {
  return (
    <main className="owner wrap">
      <BookTop />
      <StayFocus />
      {children}
    </main>
  );
}
