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

The arrival date is chosen on the house's own calendar (`src/components/DatePicker.tsx`) rather than the browser's, which looks different in every browser: cream ticket paper, the chosen day stamped in lantern red like the seal, past days shut, and the arrow keys, Page Up and Page Down to move. The owner's Rooms tab uses the same picker. The ticket checks which rooms are free for the chosen nights, takes the guest's name and email, saves the request and emails the guest that their room is held. The house has 5 Lattice, 4 Moon Window and 3 Roof rooms (`count` in `src/content/site.ts`); a request holds its room until the owner declines it.

Where the bookings go depends on what is set up:

- **Nothing set up, on your machine:** bookings go to `.data/bookings.json` and each email is written to `.data/outbox/` as a page to open in a browser. Delete `.data/` to start over.
- **Nothing set up, on Vercel:** the ticket is a demo. It stamps the seal and sends nothing.
- **Supabase and Resend set up:** bookings live in Supabase and emails are sent. Run the files in `supabase/migrations` once each, in order (`0001` to `0004`), in the Supabase SQL editor, then set these in Vercel (Project, Settings, Environment Variables) and in `.env.local` for your machine:

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<the secret key (sb_secret_...) or the legacy service_role key, from Project Settings, API Keys>
RESEND_API_KEY=<from resend.com>
BOOKING_FROM="Saeng House <bookings@your-domain>"
```

The site talks to Supabase's REST endpoint with `fetch`, so no Supabase package is needed. Use these two names exactly, not the `NEXT_PUBLIC_SUPABASE_URL` and publishable key from Supabase's Next.js guide: the table is closed to the publishable key by row-level security, so with it every booking is refused, and a `NEXT_PUBLIC_` name would send the secret key to every visitor's browser. The service key never reaches the browser: only the server routes in `src/app/api` and the owner's actions use it. Until a domain is verified in Resend, it only delivers to your own address.

### The owner's request book

The owner answers requests at `/owner`. The book has three tabs, all plain links.

**Requests** (`/owner`) has two sheets: requests waiting for an answer and confirmed stays still to come, nearest first. Neither is paged, because a stay leaves this tab on its checkout morning. Each request has two answers:

- **Confirm** marks it confirmed and emails the guest a confirmation.
- **Decline** asks why first: full that night, could not reach the guest, room closed for repairs, or something else (written out for the guest). It frees the room and emails the guest a note worded from the reason. When the house is full, the email lists the other room kinds still free for the same nights, each with a link back to the booking ticket.

A request can only be answered once, so a second click never sends a second email. Each waiting request says how long it has waited, in lantern red once it is past the hour the guest's email promises.

The owner can also:

- **Add a booking** taken by phone, on LINE or at the door, from the link above the sheets. It goes through the same check that the nights are free as a guest's request, so the rack and the register stay true, and is confirmed at once. The email may be left out, but there has to be an email, a phone or a LINE name.
- **Change or cancel** a confirmed stay, from the entry on the Confirmed sheet. A change picks other nights or another room under the same check (the stay's own nights do not count against it), and works out the price again; a guest already staying can be given more nights. Cancelling frees the room. Either can email the guest, if there is an address.

When the book cannot reach the bookings (Supabase down, a key changed), it shows a page on the same paper saying what the last click may have done and how to try again, instead of the framework's error page.

**Rooms** (`/owner/rooms`) is the room rack old front desks kept on the wall: a line for each of the 12 rooms, a column for each night, four weeks at a time from tonight (`?from=2026-11-01` for another start), with links to the four weeks either side. Each stay that holds a room is a strip across its nights, with the guest's surname: confirmed stays in ink, requests still waiting edged in lantern red. Guests book a kind of room rather than a numbered one, so the rack deals each kind's stays onto its lines itself, first free line by arrival. The nights each kind is full are listed above the rack. Hovering or focusing a strip brings up a note on the same ticket paper with the guest's full name, the ref, the room, the nights, the total and where the request stands, since a one-night strip only has room for a couple of letters; on a phone the first tap shows the note and the second opens the stay. A strip links to the stay on the Requests or Register tab, and the date picker beside the links starts the rack on any night. On a phone the rack scrolls sideways inside the paper, with the room kinds pinned on the left.

**Register** (`/owner/register`) keeps every stay a month at a time, so the page stays the same size after years of bookings. `?month=2026-11` opens a month (this month without it), with links to the months either side. It lists the stays that arrive that month and what became of each, and rules off the month's figures at the top of the sheet:

- room-nights sold: nights of confirmed stays that fall in the month, so a stay across the month end is split between the two pages
- revenue from those nights, at the price the guest was quoted
- occupancy per room kind: nights sold divided by the number of rooms of that kind times the days in the month
- how many requests for arrivals that month were declined, by reason

The search box (`?q=`) looks for a ref, guest name, email or contact across every month, newest request first, and shows at most 50.

On your machine with nothing set, the password is `saeng-dev`. On a deployed site, set both of these (and in `.env.local` to change them locally), or the request book stays shut:

```bash
OWNER_PASSWORD=<a long password for the owner>
OWNER_SESSION_SECRET=<a random string, e.g. from: openssl rand -base64 32>
```

A login lasts 14 days in an httpOnly cookie signed with the secret; changing the secret signs everyone out. With Supabase, run `supabase/migrations/0002_owner.sql`, `0003_register.sql` and `0004_change_stay.sql` once after `0001`. The first adds the decline reason to the table; the second adds the columns and indexes the register filters on (a `check_out` date, and a `search_text` column under a trigram index), so a month or a search reads only its own rows; the third adds the function that moves a confirmed stay under the same lock as a new request.

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
