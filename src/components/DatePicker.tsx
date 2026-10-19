'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// A date picker on the same cream paper as the booking ticket, in place of the browser's own calendar,
// which looks different in every browser and nothing like the house. The chosen day is stamped in lantern
// red like the seal on a sent ticket. The calendar floats over the page from a portal, because the ticket
// is cut out with a mask that would clip anything hanging below it.
//
// Keyboard: the arrow keys move a day or a week, Page Up and Page Down a month, Home and End to the ends of
// the week; Enter picks, Escape closes.

// `today` is the day marked as today; without it, the browser's own date
type Props = { id?: string; value: string; min?: string; today?: string; onChange: (iso: string) => void; align?: 'start' | 'end'; label?: string };

const DAY = 864e5;
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (day: string, n: number) => iso(new Date(utc(day).getTime() + n * DAY));
const firstOf = (day: string) => `${day.slice(0, 7)}-01`;
const addMonths = (day: string, n: number) => {
  const d = utc(day);
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d.getUTCDate(), last));
  return iso(first);
};
const spoken = (day: string, opts: Intl.DateTimeFormatOptions) => utc(day).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });
// "Fri 30 Oct", with the year only when it is not this one, so the field stays on one line on a phone
const face = (day: string, today: string) =>
  [spoken(day, { weekday: 'short' }), +day.slice(8), spoken(day, { month: 'short' }), day.slice(0, 4) !== today.slice(0, 4) && day.slice(0, 4)].filter(Boolean).join(' ');
const localToday = () => {
  const now = new Date();
  return iso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
};

// the weeks to draw for a month, Monday first, with blanks before the 1st and after the last day
function weeksOf(month: string) {
  const offset = (utc(month).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate();
  const cells: (string | null)[] = [...Array<null>(offset).fill(null), ...Array.from({ length: days }, (_, i) => addDays(month, i))];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

export default function DatePicker({ id, value, min, today: given, onChange, align = 'start', label }: Props) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(value); // the day the keyboard is on
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const [here, setHere] = useState('');
  const today = given ?? here;
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const month = firstOf(cursor || value || today || '2000-01-01');

  useEffect(() => setHere(localToday()), []);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    setAt(null);
    if (refocus) trigger.current?.focus();
  }, []);

  // below the field, or above it when there is no room below; kept inside the window on a phone
  const place = useCallback(() => {
    const t = trigger.current?.getBoundingClientRect();
    const p = panel.current;
    if (!t || !p) return;
    const width = p.offsetWidth;
    const height = p.offsetHeight;
    const left = Math.min(Math.max(16, align === 'end' ? t.right - width : t.left), innerWidth - width - 16);
    const below = t.bottom + 8;
    const top = below + height > innerHeight - 8 && t.top - height - 8 > 8 ? t.top - height - 8 : below;
    setAt({ top, left });
  }, [align]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, month, place]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panel.current?.contains(target) && !trigger.current?.contains(target)) close(false);
    };
    let frame = 0;
    const follow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    document.addEventListener('pointerdown', away);
    addEventListener('scroll', follow, true);
    addEventListener('resize', follow);
    return () => {
      document.removeEventListener('pointerdown', away);
      removeEventListener('scroll', follow, true);
      removeEventListener('resize', follow);
      cancelAnimationFrame(frame);
    };
  }, [open, close, place]);

  // the keyboard's day takes the focus once the calendar is placed and whenever that day moves, not each
  // time the calendar follows a scroll, which would pull the focus off the month buttons
  const placed = at !== null;
  useEffect(() => {
    if (open && placed) panel.current?.querySelector<HTMLButtonElement>(`[data-day="${cursor}"]`)?.focus();
  }, [open, placed, cursor]);

  const allowed = (day: string) => !min || day >= min;
  const move = (day: string) => setCursor(min && day < min ? min : day);
  const pick = (day: string) => {
    if (!allowed(day)) return;
    onChange(day);
    close(true);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const weekday = (utc(cursor).getUTCDay() + 6) % 7;
    const to: Record<string, () => string> = {
      ArrowLeft: () => addDays(cursor, -1),
      ArrowRight: () => addDays(cursor, 1),
      ArrowUp: () => addDays(cursor, -7),
      ArrowDown: () => addDays(cursor, 7),
      PageUp: () => addMonths(cursor, -1),
      PageDown: () => addMonths(cursor, 1),
      Home: () => addDays(cursor, -weekday),
      End: () => addDays(cursor, 6 - weekday),
    };
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (to[e.key]) {
      e.preventDefault();
      move(to[e.key]());
    }
  };

  const before = addMonths(month, -1);
  const canGoBack = !min || addDays(month, -1) >= min;

  return (
    <>
      <button
        ref={trigger}
        id={id}
        type="button"
        className="date-pick"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label && value ? `${label}: ${spoken(value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` : label}
        onClick={() => {
          if (open) return close(false);
          setCursor(value || today);
          setOpen(true);
        }}
      >
        {value ? face(value, today) : ' '}
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            className="cal"
            role="dialog"
            aria-label={label ?? 'Choose a date'}
            style={at ? { top: at.top, left: at.left } : { visibility: 'hidden', top: 0, left: 0 }}
            onKeyDown={onKey}
          >
            <div className="cal-head">
              <button type="button" aria-label={`Back to ${spoken(before, { month: 'long', year: 'numeric' })}`} disabled={!canGoBack} onClick={() => move(addMonths(cursor, -1))}>‹</button>
              <p aria-live="polite">{spoken(month, { month: 'long', year: 'numeric' })}</p>
              <button type="button" aria-label={`On to ${spoken(addMonths(month, 1), { month: 'long', year: 'numeric' })}`} onClick={() => move(addMonths(cursor, 1))}>›</button>
            </div>
            <div className="cal-days" role="grid">
              <div role="row" className="cal-week">
                {WEEKDAYS.map((w, i) => (
                  <span key={i} role="columnheader" className="cal-wd">{w}</span>
                ))}
              </div>
              {weeksOf(month).map((week, w) => (
                <div key={w} role="row" className="cal-week">
                  {week.map((day, i) =>
                    day ? (
                      <button
                        key={day}
                        type="button"
                        role="gridcell"
                        data-day={day}
                        tabIndex={day === cursor ? 0 : -1}
                        disabled={!allowed(day)}
                        aria-selected={day === value}
                        aria-current={day === today ? 'date' : undefined}
                        aria-label={spoken(day, { weekday: 'long', day: 'numeric', month: 'long' })}
                        onClick={() => pick(day)}
                      >
                        {+day.slice(8)}
                      </button>
                    ) : (
                      <span key={`blank-${i}`} aria-hidden />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
