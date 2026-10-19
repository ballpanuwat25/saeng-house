'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// The note that comes up over a strip on the room rack, on a scrap of the same ticket paper: who, which
// room, which nights, what it comes to and where it stands. A one-night strip only has room for a couple of
// letters of the name, so this is how the owner reads it. It shows on hover and on keyboard focus; on a
// touch screen the first tap shows it and a second tap opens the stay. It floats from a portal because the
// rack scrolls inside its paper, which would clip it.

export type Slip = { ref: string; name: string; room: string; nights: string; total: string; state: string; waiting: boolean; note: string };

type Shown = { slip: Slip; strip: HTMLElement; touch: boolean };

export default function RackSlips({ slips, children }: { slips: Record<string, Slip>; children: React.ReactNode }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const [at, setAt] = useState<{ top: number; left: number; below: boolean } | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const touched = useRef(false);

  const stripOf = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLElement>('.strip') : null);
  const show = (strip: HTMLElement | null, touch = false) => {
    const slip = strip && slips[strip.dataset.ref ?? ''];
    if (slip) setShown({ slip, strip: strip!, touch });
  };
  const hide = () => {
    setShown(null);
    setAt(null);
  };

  // above the strip, or below it when it sits too near the top of the window
  useLayoutEffect(() => {
    if (!shown || !card.current) return;
    const s = shown.strip.getBoundingClientRect();
    const { offsetWidth: w, offsetHeight: h } = card.current;
    const left = Math.min(Math.max(12, s.left + s.width / 2 - w / 2), innerWidth - w - 12);
    const below = s.top - h - 10 < 8;
    setAt({ top: below ? s.bottom + 10 : s.top - h - 10, left, below });
  }, [shown]);

  // the strip moves away under it on any scroll, so the note goes
  useEffect(() => {
    if (!shown) return;
    const away = (e: PointerEvent) => {
      if (!shown.strip.contains(e.target as Node)) hide();
    };
    addEventListener('scroll', hide, true);
    document.addEventListener('pointerdown', away);
    return () => {
      removeEventListener('scroll', hide, true);
      document.removeEventListener('pointerdown', away);
    };
  }, [shown]);

  const s = shown?.slip;

  return (
    <div
      className="rack-scroll"
      tabIndex={0}
      role="region"
      aria-label="Room rack, one line per room and one column per night"
      onPointerDown={(e) => (touched.current = e.pointerType === 'touch')}
      onPointerOver={(e) => e.pointerType !== 'touch' && show(stripOf(e.target))}
      onPointerOut={(e) => {
        if (e.pointerType !== 'touch' && stripOf(e.target) && stripOf(e.target) !== stripOf(e.relatedTarget)) hide();
      }}
      onFocus={(e) => !touched.current && show(stripOf(e.target))}
      onBlur={(e) => !touched.current && stripOf(e.target) && hide()}
      // the first tap on a strip reads it, the second opens it. Caught on the way down, before the strip's
      // own link sees the click and starts to navigate
      onClickCapture={(e) => {
        const strip = stripOf(e.target);
        if (strip && touched.current && shown?.strip !== strip) {
          e.preventDefault();
          e.stopPropagation();
          show(strip, true);
        }
      }}
    >
      {children}
      {s &&
        createPortal(
          <div
            ref={card}
            className="slip"
            data-waiting={s.waiting || undefined}
            data-below={at?.below || undefined}
            aria-hidden
            style={at ? { top: at.top, left: at.left } : { visibility: 'hidden', top: 0, left: 0 }}
          >
            <p className="slip-head">
              <b>{s.name}</b>
              <span>No. {s.ref}</span>
            </p>
            <p className="slip-room">{s.room}</p>
            <p>{s.nights}</p>
            {s.note && <p className="slip-note">&ldquo;{s.note}&rdquo;</p>}
            <p className="slip-foot">
              <span>{s.state}</span>
              <b>{s.total}</b>
            </p>
            {shown.touch && <p className="slip-tap">Tap the strip again to open it.</p>}
          </div>,
          document.body,
        )}
    </div>
  );
}
