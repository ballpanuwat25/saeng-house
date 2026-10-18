'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { rooms, roomsSection } from '@/content/site';
import Rich from '@/components/Rich';
import { CHOOSE_ROOM } from '@/components/BookingCard';

// the rooms take turns on their own while the section is on screen; a click picks one and stops the turns
const TURN_MS = 3500;

type Mode = 'auto' | 'chosen';

export default function Rooms() {
  const [shown, setShown] = useState(0);
  const [mode, setMode] = useState<Mode>('auto');
  const [onScreen, setOnScreen] = useState(false);
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.4 });
    if (section.current) io.observe(section.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (mode !== 'auto' || !onScreen || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setShown((i) => (i + 1) % rooms.length), TURN_MS);
    return () => clearInterval(id);
  }, [mode, onScreen]);

  const choose = (i: number) => {
    setMode('chosen');
    setShown(i);
  };
  const room = rooms[shown];
  // tabs take one stop in the tab order; the arrow keys move between them, as screen readers expect
  const onKeys = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? rooms.length - 1 : step === undefined ? null : (shown + step + rooms.length) % rooms.length;
    if (to === null) return;
    e.preventDefault();
    choose(to);
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[to].focus();
  };

  return (
    <section ref={section} className="rooms wrap" id="rooms" aria-labelledby="rooms-h" data-time={roomsSection.time}>
      <div className="rooms-grid">
        <div className="pick">
          <h2 id="rooms-h">
            <Rich text={roomsSection.title} />
          </h2>
          <ul className="names" role="tablist" aria-label="Rooms" onKeyDown={onKeys}>
            {rooms.map((r, i) => (
              <li key={r.id} role="presentation">
                <button
                  type="button"
                  role="tab"
                  id={`room-tab-${r.id}`}
                  aria-selected={i === shown}
                  aria-controls="room-panel"
                  tabIndex={i === shown ? 0 : -1}
                  onClick={() => choose(i)}
                >
                  <span className="n">{r.name}</span>
                  <span className="p">฿{r.pricePerNight.toLocaleString('en-US')}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="detail" role="tabpanel" id="room-panel" aria-labelledby={`room-tab-${room.id}`}>
            <p>{room.blurb}</p>
            <span className="spec">{room.spec}</span>
            <a className="link" href="#book" onClick={() => dispatchEvent(new CustomEvent(CHOOSE_ROOM, { detail: room.id }))}>
              {roomsSection.action}
            </a>
          </div>
        </div>
        <figure className="photo stage" aria-live="polite">
          <AnimatePresence initial={false}>
            <motion.div
              key={room.id}
              className="shot"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: [0.45, 0, 0.55, 1] }}
            >
              <Image src={room.photo.src} alt={room.photo.alt} fill sizes="(max-width: 860px) 100vw, 55vw" />
            </motion.div>
          </AnimatePresence>
        </figure>
      </div>
    </section>
  );
}
