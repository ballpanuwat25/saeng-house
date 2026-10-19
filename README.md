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

The full-size sources live in `design/photos-src/` (kept out of git), except the generated rooms in `scripts/assets/rooms`. Every photo except the hero gets the
same warm night grade so pictures from different photographers read as one set. After changing a source:

```bash
python scripts/export-photos.py
```

Photo credits (all Unsplash License): Nicolas Spehler (lantern corridor), Thai Nguyen Anh and Didi Paul (tea),
Shane Hebzynski (lantern balcony), Bradrey Nassel (Yaowarat). The three rooms and the hero lanterns were
generated with Google Gemini; the room sources are in `scripts/assets/rooms`.

## Booking

The ticket checks which rooms are free for the chosen nights, takes the guest's name and email, saves the request and emails the guest that their room is held. The house has 5 Lattice, 4 Moon Window and 3 Roof rooms (`count` in `src/content/site.ts`); a request holds its room until the owner declines it.

Where the bookings go depends on what is set up:

- **Nothing set up, on your machine:** bookings go to `.data/bookings.json` and each email is written to `.data/outbox/` as a page to open in a browser. Delete `.data/` to start over.
- **Nothing set up, on Vercel:** the ticket is a demo. It stamps the seal and sends nothing.
- **Supabase and Resend set up:** bookings live in Supabase and emails are sent. Run `supabase/migrations/0001_bookings.sql` once in the Supabase SQL editor, then set these in Vercel (Project, Settings, Environment Variables) and in `.env.local` for your machine:

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key, from Project Settings, API>
RESEND_API_KEY=<from resend.com>
BOOKING_FROM="Saeng House <bookings@your-domain>"
```

The service key never reaches the browser: only the server routes in `src/app/api` use it. Until a domain is verified in Resend, it only delivers to your own address.

## What's next

See [docs/IDEAS.md](docs/IDEAS.md) for the backlog: real booking, a demo mode for recording the Fastwork
video, and the ideas that make the site stand out.

## Hero lanterns

The hero lanterns are drawn whole and swing over the ceiling with the lanterns removed. The sources live in `scripts/assets`:

- `hero-plate.jpg` is the photo with every lantern removed and the ceiling drawn in (Photoshop).
- `lanterns/big-1.png` and `lanterns/mid-1.png` are single generated lanterns on flat green (Gemini). The big red one hangs at the front, the pale one everywhere else.
- `hero-lanterns-cut.png` is the original lanterns cut from the photo (Photoshop). Only the tiny ones at the far end of the corridor are still taken from it, and they stay still.

`src/content/hero-lanterns.json` holds each lantern's centre and size in the photo, which set where each drawn lantern goes, how big it is and where it hangs from. After changing any source, rebuild (needs Python with numpy and Pillow):

```bash
python scripts/build-lantern-sprites.py
python scripts/cut-lanterns.py --preview
```

The first keys the green out of the lanterns into `public/images/hero-lantern-sprites.webp`. The second writes `public/images/hero-plate.webp` and `public/images/hero-cut-mask.png`; `--preview` also writes `scripts/.cache/plate-preview.png`.

## Share image and icons

`src/app/opengraph-image.png` is the picture link previews show. It is a screenshot of the live hero with the name set in the site's own fonts; remake it after the hero changes, with the site running:

```bash
node scripts/make-share-image.mjs http://localhost:3000
```

The browser icon is `src/app/icon.svg` and the home-screen icon `src/app/apple-icon.png`, both the house lantern.

## Walking map

The Talat Noi map is drawn from OpenStreetMap. `npm run map` rebuilds `src/content/talat-noi-map.ts` from the places in `src/content/site.ts`, routing and timing each walk along real streets. Add `-- --refresh` to download the streets again.
