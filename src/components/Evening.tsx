'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { evening } from '@/content/site';
import { onHeroReady } from '@/lib/hero-load';

// Page-wide behaviour of the one-evening story: scroll moves the clock from 18:00 to 23:00 and darkens
// the ground, an oxblood lamp follows the pointer below the hero, smooth scrolling and entrances.
const DUSK = [28, 17, 13], NIGHT = [8, 5, 5];
const pad = (n: number) => String(n).padStart(2, '0');

// an element's place on the page from layout alone, so an entrance animation's offset does not count
function pageTop(el: HTMLElement) {
  let y = 0;
  for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop;
  return y;
}

// where to scroll so the booking heading and the whole ticket sit centred in the space under the header,
// or, on a screen too short for both, so the whole ticket shows
function bookingInView() {
  const head = document.getElementById('top')!.offsetHeight;
  const title = document.getElementById('book-h')!, ticket = document.querySelector<HTMLElement>('.ticket')!;
  const top = pageTop(title), bottom = pageTop(ticket) + ticket.offsetHeight;
  const room = innerHeight - head, block = bottom - top;
  if (block <= room) return top - head - (room - block) / 2;
  return Math.min(pageTop(ticket) - head - 12, bottom - innerHeight + 12);
}
const minutesOf = (hhmm: string) => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5);

// the clock reads each section's own time (its data-time) as the section reaches the middle of the
// screen, and runs evenly between them
function clockAt(y: number, max: number) {
  const marks: [number, number][] = [[0, evening.startHour * 60]];
  for (const el of document.querySelectorAll<HTMLElement>('[data-time]')) {
    const at = Math.min(max, el.getBoundingClientRect().top + scrollY - innerHeight / 2);
    if (at > marks.at(-1)![0]) marks.push([at, minutesOf(el.dataset.time!)]);
  }
  if (max > marks.at(-1)![0]) marks.push([max, evening.endHour * 60]);
  const i = marks.findIndex(([at]) => at >= y);
  if (i <= 0) return marks[Math.max(0, i)][1];
  const [[a, ma], [b, mb]] = [marks[i - 1], marks[i]];
  return Math.round(ma + ((y - a) / (b - a)) * (mb - ma));
}

export default function Evening() {
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hero = document.getElementById('hero')!;
    const top = document.getElementById('top')!;
    const clock = document.getElementById('clock')!;
    const clockT = document.getElementById('clock-t')!;
    const glow = document.getElementById('glow')!;
    const root = document.documentElement;

    const onScroll = () => {
      const max = root.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      const mins = clockAt(Math.min(scrollY, max), max);
      clockT.textContent = `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
      clock.style.setProperty('--lit', String((mins - evening.startHour * 60) / ((evening.endHour - evening.startHour) * 60)));
      const ground = `rgb(${DUSK.map((v, i) => Math.round(v + (NIGHT[i] - v) * p))})`;
      document.body.style.backgroundColor = ground;
      root.style.setProperty('--ground', ground);
      const past = hero.getBoundingClientRect().bottom < 80;
      clock.classList.toggle('on', past);
      top.classList.toggle('solid', past);
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    onScroll();

    // below the hero: an oxblood lamp follows the pointer over the dark ground
    const lamp = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2, moved: 0 };
    const onPointer = (e: PointerEvent) => {
      lamp.tx = e.clientX;
      lamp.ty = e.clientY;
      lamp.moved = performance.now();
    };
    addEventListener('pointermove', onPointer, { passive: true });
    let raf = 0;
    const tick = (now: number) => {
      const show = hero.getBoundingClientRect().bottom < innerHeight * 0.5;
      glow.classList.toggle('on', show);
      if (show) {
        if (now - lamp.moved > 2500 && !reduce) {
          const t = now / 1000;
          lamp.tx = innerWidth * (0.5 + 0.32 * Math.sin(t * 0.23));
          lamp.ty = innerHeight * (0.5 + 0.25 * Math.sin(t * 0.31 + 1));
        }
        const k = reduce ? 1 : 0.08;
        lamp.x += (lamp.tx - lamp.x) * k;
        lamp.y += (lamp.ty - lamp.y) * k;
        glow.style.setProperty('--gx', `${lamp.x}px`);
        glow.style.setProperty('--gy', `${lamp.y}px`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    gsap.registerPlugin(ScrollTrigger);
    let lenis: Lenis | null = null;
    const raf2 = (t: number) => lenis?.raf(t * 1000);
    const onAnchor = (ev: MouseEvent) => {
      const a = (ev.target as Element).closest('a[href^="#"]');
      const id = a?.getAttribute('href');
      if (!id || id.length < 2 || !document.querySelector(id)) return;
      const target = id === '#book' ? bookingInView() : null;
      if (!lenis && target === null) return;
      ev.preventDefault();
      if (lenis) lenis.scrollTo(target ?? id, { offset: target === null && id !== '#home' ? -72 : 0 });
      else scrollTo(0, target!);
    };
    // the sign over the door comes on as the footer arrives; with reduced motion it is simply on
    const sign = document.querySelector('.sign')!;
    const lightSign = ScrollTrigger.create({ trigger: '.foot', start: 'top 75%', once: true, onEnter: () => sign.classList.add('lit') });

    let stopIntroWait = () => {};
    let stopScrollWait = () => {};
    if (!reduce) {
      lenis = new Lenis({ lerp: 0.09 });
      lenis.stop();
      stopScrollWait = onHeroReady(() => lenis?.start());
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(raf2);
      gsap.ticker.lagSmoothing(0);
    }
    document.addEventListener('click', onAnchor);

    const ctx = gsap.context(() => {
      if (reduce) return;
      const intro = gsap.from('.hero h1 span, .hero p, .hero .btn', { y: 26, opacity: 0, duration: 1.2, stagger: 0.09, ease: 'power3.out', delay: 0.55, paused: true });
      stopIntroWait = onHeroReady(() => intro.play());
      const enter = (sel: string, trigger: string, start = 'top 80%') =>
        gsap.from(sel, { y: 30, opacity: 0, duration: 1, stagger: 0.09, ease: 'power3.out', scrollTrigger: { trigger, start, once: true } });
      enter('.arrive .say, .facade, .front .fact', '.arrive');
      gsap.from('.facade .win:not(.shut) .pane', { opacity: 0, duration: 0.5, stagger: { each: 0.07, from: 'random' }, delay: 0.5, scrollTrigger: { trigger: '.front', start: 'top 75%', once: true } });
      enter('.rooms h2, .names li, .detail > *, .stage', '.rooms');
      enter('.tea .big, .tea .txt > *, .tea .small', '.tea');
      enter('.map, .walk h2, .walk li, .walk .note', '.walk');
      enter('.book > h2, .ticket', '.book', 'top 70%');
      enter('.foot .cols p, .credits', '.foot', 'top 90%');
      // each picture opens from a slightly larger crop as it arrives
      gsap.utils.toArray<HTMLElement>('.photo:not(.stage) img').forEach((img) =>
        gsap.fromTo(img, { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img.closest('.photo'), start: 'top bottom', end: 'center center', scrub: true } }),
      );
      gsap.to('.book > .bg', { yPercent: 3, ease: 'none', scrollTrigger: { trigger: '.book', start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      removeEventListener('pointermove', onPointer);
      document.removeEventListener('click', onAnchor);
      cancelAnimationFrame(raf);
      stopIntroWait();
      stopScrollWait();
      ctx.revert();
      lightSign.kill();
      gsap.ticker.remove(raf2);
      lenis?.destroy();
    };
  }, []);

  return null;
}
