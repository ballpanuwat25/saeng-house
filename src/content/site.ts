// Everything the homepage says, in one place. Sections read from here; nothing is typed twice.
// In headlines, a word between asterisks is set in the italic serif: 'Tea in the *hall*'.

export type Photo = { src: string; width: number; height: number; alt: string };

export type Room = {
  id: 'lattice' | 'moon' | 'carved';
  name: string;
  pricePerNight: number;
  blurb: string;
  spec: string;
  photo: Photo;
};

// x, y on the walking map's 600 × 720 drawing
export type MapPoint = readonly [x: number, y: number];
export type Place = { name: string; walkMinutes: number; note: string; at: MapPoint };

export type Fact = { figure: string; unit?: string; label: string };

export const hotel = {
  wordmark: 'แสง',
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
  alt: 'A narrow corridor hung with rows of glowing red paper lanterns at night',
};

export const arrival =
  'You come in through the folding doors, walk the corridor of lanterns and climb the teak stairs. The building went up in 1922 to store spices for traders from Shantou. Today it keeps twelve rooms and one long table for tea.';

export const facts: Fact[] = [
  { figure: '12', label: 'rooms over four floors' },
  { figure: '1922', label: 'built as a spice warehouse' },
  { figure: '6', unit: 'min', label: 'on foot to Si Phraya pier' },
  { figure: '14:00', label: 'check-in, check-out at noon' },
];

export const roomsSection = { time: '18:30', title: 'Up to your *room*', action: 'Book this room' };

export const rooms: Room[] = [
  {
    id: 'lattice',
    name: 'The Lattice Room',
    pricePerNight: 4800,
    blurb: 'A full wall of carved teak lattice. Morning light comes through it and lays the pattern across the floorboards.',
    spec: '28 m² · king bed · second floor',
    photo: { src: '/images/room-lattice.jpg', width: 1200, height: 1500, alt: 'Carved Chinese lattice windows with potted plants in a wooden room' },
  },
  {
    id: 'moon',
    name: 'The Moon Window',
    pricePerNight: 6900,
    blurb: 'A round window as wide as the bed, facing the river. Red carpet, and the carved cabinets the warehouse always had.',
    spec: '36 m² · king bed · third floor',
    photo: { src: '/images/room-moon.jpg', width: 1200, height: 1500, alt: 'A Chinese-style room with a large round window and a red carpet' },
  },
  {
    id: 'carved',
    name: 'The Carved Bed',
    pricePerNight: 9500,
    blurb: 'A lacquered and gilded canopy bed in the old Chinese manner, a red cabinet beside it, and a terrace of your own on the roof.',
    spec: '42 m² · canopy bed and sofa bed · fourth floor',
    photo: { src: '/images/room-carved.jpg', width: 1200, height: 1500, alt: 'A carved red and gold Chinese canopy bed beside a red cabinet' },
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
  note: 'Walking times from the front door, give or take a minute. Map not to scale.',
  hotelAt: [318, 402] as MapPoint,
  places: [
    { name: 'So Heng Tai Mansion', walkMinutes: 2, note: 'A Hokkien courtyard house, more than two hundred years old', at: [250, 452] },
    { name: 'Chow Sue Kong Shrine', walkMinutes: 3, note: 'A riverside shrine, lit until nine', at: [196, 520] },
    { name: 'Si Phraya Pier', walkMinutes: 6, note: 'Cross-river ferries until 23:00', at: [262, 640] },
    { name: 'Song Wat Road', walkMinutes: 8, note: 'Small bars in old spice warehouses', at: [318, 214] },
    { name: 'Yaowarat', walkMinutes: 12, note: 'Street food until one in the morning', at: [478, 108] },
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
  'A fictional hotel made for a portfolio. Photographs from Unsplash: Nicolas Spehler (lantern corridor), MChe Lee (all three rooms), Thai Nguyen Anh and Didi Paul (tea), Bradrey Nassel (Yaowarat).';
