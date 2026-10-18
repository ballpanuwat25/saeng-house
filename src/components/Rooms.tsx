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

  return (
    <section ref={section} className="rooms wrap" id="rooms" aria-labelledby="rooms-h">
      <div className="rooms-grid">
        <div className="pick">
          <h2 id="rooms-h">
            <time>{roomsSection.time}</time> <Rich text={roomsSection.title} />
          </h2>
          <ul className="names" role="tablist" aria-label="Rooms">
            {rooms.map((r, i) => (
              <li key={r.id}>
                <button type="button" role="tab" aria-selected={i === shown} onClick={() => choose(i)}>
                  <span className="n">{r.name}</span>
                  <span className="p">฿{r.pricePerNight.toLocaleString('en-US')}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="detail" role="tabpanel">
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
