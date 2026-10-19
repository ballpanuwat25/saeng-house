'use client';

// The Register's search box. It looks as the owner types, a moment after they stop, so there is no button
// to press; the box itself stays put with the text and the caret in it, and only the sheet below changes.
// A search can take a moment on a big book, so meanwhile a lantern-red rule runs under the box and the old
// results fade back. Without JavaScript it is a plain form: Enter sends it.
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

const PAUSE_MS = 350;

export default function FindBox({ q, month }: { q: string; month?: string }) {
  const router = useRouter();
  const [text, setText] = useState(q);
  const [finding, startFinding] = useTransition();
  const asked = useRef(q);

  const find = (value: string) => {
    const wanted = value.trim().replace(/\s+/g, ' ');
    if (wanted === asked.current) return;
    asked.current = wanted;
    const params = new URLSearchParams();
    if (wanted) params.set('q', wanted);
    if (month) params.set('month', month);
    const query = params.toString();
    startFinding(() => router.replace(`/owner/register${query ? `?${query}` : ''}`, { scroll: false }));
  };

  // the address may change by other means (the Register tab, the back button), so the box follows it; the
  // answer to its own search is left alone, since the owner may have typed on while it came
  useEffect(() => {
    if (q === asked.current) return;
    asked.current = q;
    setText(q);
  }, [q]);

  useEffect(() => {
    const wait = setTimeout(() => find(text), PAUSE_MS);
    return () => clearTimeout(wait);
    // find reads only the latest text and month
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // the fade is on the page, as with a tab that is loading (Pending.tsx), but it spares the box itself
  useEffect(() => {
    if (!finding) return;
    const root = document.documentElement;
    root.dataset.finding = '';
    return () => {
      delete root.dataset.finding;
    };
  }, [finding]);

  return (
    <form
      className="owner-find"
      role="search"
      action="/owner/register"
      onSubmit={(e) => {
        e.preventDefault();
        find(text);
      }}
    >
      <label htmlFor="find">Find a booking by ref, name, email or contact</label>
      <div>
        <input id="find" name="q" type="search" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" spellCheck={false} />
        {month && <input type="hidden" name="month" value={month} />}
        <span className="link-pending" data-on={finding || undefined} aria-hidden />
      </div>
    </form>
  );
}
