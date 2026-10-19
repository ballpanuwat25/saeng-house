// The request book's three tabs share this page: the header and its tabs stay while the sheet below
// changes, and loading.tsx fills the sheet's place while the next one is read.
import { BookTop } from '@/app/owner/book';

export const dynamic = 'force-dynamic';

export default function Book({ children }: { children: React.ReactNode }) {
  return (
    <main className="owner wrap">
      <BookTop />
      {children}
    </main>
  );
}
