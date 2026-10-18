# Saeng House (แสง ตลาดน้อย)

A demo homepage for a fictional 12-room hotel in a century-old shophouse in Talat Noi, Bangkok. It is a
portfolio piece: the page tells one evening at the hotel, from 18:00 to 23:00, lit by red lanterns.

Stack: Next.js 15 (App Router), Tailwind CSS 4, GSAP ScrollTrigger, Lenis, Motion, and raw WebGL2 for the hero.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. `npm run build` makes a production build.

## Where things live

- `src/content/site.ts` holds every word, price, room and photo the page shows. Change content there, not in the components.
- `src/lib/cinemagraph.ts` is the hero. It marks the 18 lanterns in the photo, swings each around its hanging point, and relights the corridor from the pointer.
- `src/components/Evening.tsx` owns page-wide behaviour: the evening clock, the darkening ground, the oxblood pointer glow, smooth scrolling and entrances.
- `src/app/globals.css` is the stylesheet, ported from the approved mockup.
- `public/images/` holds the web photos. They are generated, not edited by hand.

## Photos

The full-size sources live in `design/photos-src/` (kept out of git). Every photo except the hero gets the
same warm night grade so pictures from different photographers read as one set. After changing a source:

```bash
python scripts/export-photos.py
```

Photo credits (all Unsplash License): Nicolas Spehler (lantern corridor), MChe Lee (the three rooms),
Thai Nguyen Anh and Didi Paul (tea), Shane Hebzynski (lantern balcony), Bradrey Nassel (Yaowarat).

## What's next

See [docs/IDEAS.md](docs/IDEAS.md) for the backlog: real booking, a demo mode for recording the Fastwork
video, and the ideas that make the site stand out.

## Walking map

The Talat Noi map is drawn from OpenStreetMap. `npm run map` rebuilds `src/content/talat-noi-map.ts` from the places in `src/content/site.ts`, routing and timing each walk along real streets. Add `-- --refresh` to download the streets again.
