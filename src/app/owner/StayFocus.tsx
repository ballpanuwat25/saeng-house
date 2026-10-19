'use client';

// When the address points at one stay (#SH-XXXXX), as a strip on the rack or a line in the register does,
// the stay is brought to the middle of the window and washed in lantern red for a moment, so the owner's
// eye lands on it rather than on whichever line happens to sit at the top. It lives in the book's layout,
// so it answers every move between tabs.
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function StayFocus() {
  const path = usePathname();
  useEffect(() => {
    const show = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const stay = id ? document.getElementById(id) : null;
      if (!stay?.classList.contains('entry')) return;
      const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
      stay.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
      // taken off and put back, so a second visit to the same stay washes it again
      stay.removeAttribute('data-flash');
      void stay.offsetWidth;
      stay.setAttribute('data-flash', '');
    };
    // after the page is drawn and Next.js has made its own jump to the stay
    const wait = setTimeout(show, 80);
    addEventListener('hashchange', show);
    return () => {
      clearTimeout(wait);
      removeEventListener('hashchange', show);
    };
  }, [path]);
  return null;
}
