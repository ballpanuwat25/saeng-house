# Saeng House: ideas and backlog

What is built and what comes next for the Saeng House homepage, a demo hotel site for the portfolio.
The rule behind every idea below: a feature earns its place only if it comes from this hotel's own story
(one evening, lantern light, a shophouse in Talat Noi). Effects that would fit any website stay out.

## Built

- **Hero.** The lantern corridor as a cinemagraph. Every lantern is drawn whole from generated sprites
  and swings from its cord on a breeze under a Photoshop ceiling with the lanterns removed, with a red glow
  that moves with it. A quick pointer sweep or a sideways finger drag nudges the nearby lanterns. The pointer
  is also a lamp that lights the corridor. See the README's Hero lanterns section for how it is built.
- **One evening, 18:00 to 23:00.** The header clock reads each section's own time as the section reaches
  the middle of the screen, a small lantern beside it burns brighter as the night goes on, and the ground
  darkens towards midnight. An oxblood lamp follows the pointer over every plain background below the hero.
- **Arrival.** The four facts are notes on a drawing of the warehouse front: the year on the gable, a window
  for each room (lit, dim or shuttered), check-in at the folding doors, the pier walk along the street.
- **Rooms.** Three rooms generated as one set in one building and one night, turning on their own until the
  visitor picks one. The chosen room is marked with the house lantern. The top room sells its roof terrace.
- **Tea**, a collage in the same night grade as every other photo.
- **Walking map** drawn from OpenStreetMap: real streets, the river, and each walk routed and timed along
  real streets from the hotel door.
- **Booking ticket** in the manner of an old Chinatown shop slip, stamped with a red แสง seal when sent.
  It does not send anything yet.
- **Footer.** A hanging neon sign that sputters on at 23:00, one letter that keeps buzzing.
- **Launch basics.** Lantern favicon and home-screen icon, a share image for link previews, WebP hero images
  (the phone download is about 1.2 MB), keyboard-friendly room tabs and a skip link.

## Next up (agreed)

1. **Deploy** to Vercel so the site has a public link.
2. **Real booking and an owner's dashboard.** The guest's request is saved and checked against real
   availability; the owner confirms or declines it in a small back office, blocks dates taken elsewhere
   (walk-ins, Agoda), and sees nights sold and income this month. The guest gets an email at each step.
   A public demo mode lets portfolio visitors try the back office on sample data that resets every night.
   Use Supabase (database and login); email first, since LINE Notify closed in 2025 and the LINE Messaging
   API needs a LINE OA. The back office should speak the site's language (a guest register, the building
   with lit windows), not a stock admin template. Out of scope until a real client: payments, channel
   manager sync, more than one property.
3. **Demo mode for recording the Fastwork video.** A URL flag (for example `?demo`) that scrolls the page
   on its own at a steady pace, pauses on each section, sweeps a fake pointer past the lanterns, and hides
   the hint text. Record it last, once the booking flow is in, so the video shows both sides.
4. **Case study page.** A short write-up of what was made and why: the real-street map, the redrawn
   lanterns, the evening clock. It helps a client see where the work is.

## Ideas to make it stand out

Ordered by how much they belong to this hotel and no other.

1. **Real Bangkok time.** Tie the evening clock to the actual time in Bangkok. In daytime the lanterns are
   off and the photo is lit like day; around dusk they come on one by one; late at night they dim. Show
   today's sunset time, computed from Talat Noi's coordinates with no API. A visitor sees a different site
   at a different hour.
2. **Booked rooms as dark windows.** Once real booking exists, the warehouse drawing in the arrival section
   shows tonight's booked rooms as lit windows and free ones dark.
3. **Ambient sound, off by default.** A small button for river water, a distant ferry horn and wind chimes.
   Needs free-to-use recordings or sound made in code.

Left out on purpose: lantern-shaped cursors, particles drifting across the screen, scrolling marquees.
These are what make a site read as AI-made.

## Before using it for a real client

- Replace the generated rooms and the stock photos with the hotel's own.
- Confirm the address, phone, prices and room facts; all of them are invented.
