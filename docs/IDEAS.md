# Saeng House: ideas and backlog

What is built and what comes next for the Saeng House homepage, a demo hotel site for the portfolio.
The rule behind every idea below: a feature earns its place only if it comes from this hotel's own story
(one evening, lantern light, a shophouse in Talat Noi). Effects that would fit any website stay out.

## Built (homepage, `feat/homepage`)

- Hero: the lantern corridor photo as a cinemagraph. Lanterns sway on a breeze, their paper breathes
  slowly, and the pointer is a lamp that lights the corridor. On wide screens the whole corridor shows as a
  tall picture right of centre with its own blurred colour filling the sides.
- The page tells one evening, 18:00 to 23:00. The clock in the header follows the scroll and the ground
  darkens towards midnight.
- An oxblood lamp follows the pointer over every plain background below the hero.
- Rooms: three rooms by one photographer, turning on their own every 3.5 seconds until the visitor picks one.
- Tea collage, walking list for the neighbourhood, booking card that totals the price.
  The booking card does not send anything yet.

## Next up (agreed)

1. **Real booking.** Availability per room and date, a request saved somewhere the hotel can read
   (email or a small database), a confirmation the guest receives. Decide first whether this is a request
   form the hotel answers by hand or a live calendar.
2. **Demo mode for recording the Fastwork video.** A URL flag (for example `?demo`) that scrolls the page
   on its own at a steady pace, pauses on each section, moves a fake pointer so the lamps and lanterns show,
   and hides the hint text. The goal is a clean screen recording without hand-scrolling jitter.

## Ideas to make it stand out

Ordered by how much they belong to this hotel and no other.

1. **Real Bangkok time.** Tie the evening clock to the actual time in Bangkok. In daytime the lanterns are
   off and the photo is lit like day; around dusk they come on one by one; late at night they dim. Show
   today's sunset time, computed from Talat Noi's coordinates with no API. A visitor sees a different site
   at a different hour. Recommended first.
2. **Pick a room from the shophouse.** A cutaway drawing of the four-storey shophouse made in code. Every
   room's window is visible; choosing a room lights its window and says which floor and whether it faces
   the river or the soi. Later, rooms already booked on the chosen date show as dark windows. Recommended
   together with idea 1.
3. **Talat Noi walking map.** A simple map in the site's tones. Pointing at a place in the walking list
   draws the route from the hotel door, with the minutes on foot.
4. **A red seal on the booking.** When the request is sent, a square Chinese-style seal reading แสง is
   stamped onto the card, like a receipt from an old shop. Small, memorable, quick to build.
5. **Ambient sound, off by default.** A small button for river water, a distant ferry horn and wind chimes.
   Needs free-to-use recordings or sound made in code.

Left out on purpose: lantern-shaped cursors, particles drifting across the screen, scrolling marquees.
These are what make a site read as AI-made.

## Before using it for a real client

- Replace every photo with the hotel's own. The current ones are Unsplash pictures of other places, and
  the moon-window "room" is really a hall.
- Confirm the address, phone, prices and room facts; all of them are invented.
- The hero photo is 2.2 MB at 3200px; consider AVIF for the large size.
