// Everything the homepage says, in one place. Sections read from here; nothing is typed twice.
// In headlines, a word between asterisks is set in the italic serif: 'Tea in the *hall*'.

export type Photo = { src: string; width: number; height: number; alt: string };

export type Room = {
  id: 'lattice' | 'moon' | 'roof';
  name: string;
  pricePerNight: number;
  blurb: string;
  spec: string;
  photo: Photo;
};

export type LatLon = readonly [lat: number, lon: number];
// `at` is where the walk ends; scripts/build-map.mjs routes it along real streets and times it
export type Place = { name: string; note: string; at: LatLon };

// `part` is the piece of the warehouse front the fact is written beside
export type Fact = { figure: string; unit?: string; label: string; part: 'gable' | 'rooms' | 'door' | 'street' };

export const hotel = {
  wordmark: 'แสง',
  // for visitors who cannot read the Thai mark
  wordmarkGloss: 'saeng · light',
  built: '1922',
  name: 'Saeng House',
  rooms: 12,
  fromPrice: 4800,
  address: ['1102 Soi Wanit 2, Talat Noi', 'Samphanthawong, Bangkok 10100'],
  phone: '+66 2 639 0022',
  line: '@saenghouse',
} as const;

export const hero = {
  headline: ['A *lantern-lit* house', 'on the Chao Phraya.'],
  text: 'Twelve rooms in a 1922 spice warehouse in Talat Noi, six minutes on foot to Si Phraya pier. From ฿4,800 a night, breakfast included.',
  action: 'See tonight’s rooms',
  hint: { pointer: 'Move to light the corridor', touch: 'Drag to light the corridor' },
};

export const heroPhoto = {
  large: '/images/hero-lanterns.jpg',
  small: '/images/hero-lanterns-sm.jpg',
  // the same photo with the front lanterns painted out, for the cut-outs to swing over
  plate: '/images/hero-plate.jpg',
  // which pixels belong to which front lantern (scripts/cut-lanterns.py)
  mask: '/images/hero-cut-mask.png',
  // the lanterns themselves, drawn whole (scripts/build-lantern-sprites.py)
  sprites: '/images/hero-lantern-sprites.png',
  alt: 'A narrow corridor hung with rows of glowing red paper lanterns at night',
};

export const arrival =
  'You come in through the folding doors, walk the corridor of lanterns and climb the teak stairs. The building went up in 1922 to store spices for traders from Shantou. Today it keeps twelve rooms and one long table for tea.';

export const facts: Fact[] = [
  { figure: 'Spice store', label: 'the gable still carries its year', part: 'gable' },
  { figure: '12', label: 'rooms above the tea hall', part: 'rooms' },
  { figure: '14:00', label: 'check-in at the folding doors, out by noon', part: 'door' },
  { figure: '6', unit: 'min', label: 'on foot to Si Phraya pier', part: 'street' },
];

// each section's `time` is what the header clock reads when that section reaches the middle of the screen
export const roomsSection = { time: '18:30', title: 'Up to your *room*', action: 'Book this room' };

export const rooms: Room[] = [
  {
    id: 'lattice',
    name: 'The Lattice Room',
    pricePerNight: 4800,
    blurb: 'A full wall of carved teak lattice. At night a lamp behind it lays the pattern across the floorboards and the bed.',
    spec: '28 m² · king bed · second floor',
    photo: { src: '/images/room-lattice.jpg', width: 1200, height: 1500, alt: 'A low bed beside a wall of carved teak lattice, its shadow pattern across the floorboards, lamps lit at night' },
  },
  {
    id: 'moon',
    name: 'The Moon Window',
    pricePerNight: 6900,
    blurb: 'A round window as wide as the bed, facing the river and the lights of the far bank. A red carpet, and the carved cabinets the warehouse always had.',
    spec: '36 m² · king bed · third floor',
    photo: { src: '/images/room-moon.jpg', width: 1200, height: 1500, alt: 'A bed under a paper lantern in front of a large round window onto the river at night, carved cabinets and a red carpet' },
  },
  {
    id: 'roof',
    name: 'The Roof Room',
    pricePerNight: 9500,
    blurb: 'Old carved doors from a Teochew shrine behind the bed, and a terrace of your own on the roof, lanterns lit, the river beyond.',
    spec: '42 m² · king bed and sofa bed · fourth floor, private roof terrace',
    photo: { src: '/images/room-roof.jpg', width: 1200, height: 1500, alt: 'A bed against old carved shrine doors, timber doors open onto a lantern-lit roof terrace over the river' },
  },
];

export const tea = {
  time: '20:00',
  title: 'Tea in the *hall*',
  text: 'After dinner we brew oolong from an old shop on Song Wat Road at the warehouse’s original long table. Any guest can sit there until midnight.',
  main: { src: '/images/tea-pour.jpg', width: 1600, height: 1200, alt: 'Hands in red sleeves pouring tea from a white porcelain pot' } satisfies Photo,
  detail: { src: '/images/tea-set.jpg', width: 900, height: 1200, alt: 'A red and white porcelain tea set on a round tray' } satisfies Photo,
};

export const walk = {
  time: '21:00',
  title: 'Out the *door*',
  note: 'Walking times from the front door at an easy pace.',
  // a real point on Soi Wanit 2; the hotel itself is invented
  hotelAt: [13.7331, 100.5131] as LatLon,
  places: [
    { name: 'So Heng Tai Mansion', note: 'A Hokkien courtyard house, more than two hundred years old', at: [13.73362, 100.51211] },
    { name: 'Chow Sue Kong Shrine', note: 'A riverside shrine, lit until nine', at: [13.73442, 100.51171] },
    { name: 'Si Phraya Pier', note: 'Cross-river ferries until 23:00', at: [13.72943, 100.51294] },
    { name: 'Song Wat Road', note: 'Small bars in old spice warehouses', at: [13.73669, 100.51009] },
    { name: 'Yaowarat', note: 'Street food until one in the morning', at: [13.73832, 100.51253] },
  ] satisfies Place[],
};

export const booking = {
  time: '22:00',
  title: 'Book your *night*',
  photo: { src: '/images/yaowarat-night.jpg', width: 2800, height: 1583, alt: 'Yaowarat at night, red neon signs in Chinese characters on both sides of the road' } satisfies Photo,
  maxNights: 14,
  defaultNights: 2,
  daysAhead: 7,
  action: 'Hold this room',
  sent: 'Request received. We confirm on LINE within the hour. (Demo: nothing was sent.)',
};

// the evening the page tells, start to end; the clock in the header maps scroll onto it
export const evening = { startHour: 18, endHour: 23 } as const;

export const closing = { time: '23:00', text: 'The corridor dims to the one lantern outside your door.' };

export const credits =
  'A fictional hotel made for a portfolio. Photographs from Unsplash: Nicolas Spehler (lantern corridor), Thai Nguyen Anh and Didi Paul (tea), Bradrey Nassel (Yaowarat). The rooms and the hero lanterns were generated with Google Gemini. Map data © OpenStreetMap contributors.';
