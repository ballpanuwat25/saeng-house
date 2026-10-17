// Everything the homepage says, in one place. Sections read from here; nothing is typed twice.

export type Photo = { src: string; width: number; height: number; alt: string };

export type Room = {
  id: 'lattice' | 'moon' | 'carved';
  name: string;
  pricePerNight: number;
  blurb: string;
  spec: string;
  photo: Photo;
};

export type Place = { name: string; walkMinutes: number; note: string };

export type Fact = { label: string; value: string };

export const hotel = {
  name: 'แสง',
  fullName: 'แสง ตลาดน้อย',
  rooms: 12,
  floors: 4,
  fromPrice: 4800,
  address: ['1102 ซอยวานิช 2 แขวงตลาดน้อย', 'เขตสัมพันธวงศ์ กรุงเทพฯ 10100'],
  phone: '02 639 0022',
  line: '@saenghouse',
} as const;

export const heroPhoto = {
  large: '/images/hero-lanterns.jpg',
  small: '/images/hero-lanterns-sm.jpg',
  alt: 'ทางเดินแคบประดับโคมแดงเรียงยาวในยามค่ำ',
};

export const facts: Fact[] = [
  { label: 'ห้องพัก', value: `${hotel.rooms} ห้อง ใน ${hotel.floors} ชั้น` },
  { label: 'เช็กอิน / เช็กเอาต์', value: '14:00 / 12:00' },
  { label: 'ถึงท่าเรือสี่พระยา', value: 'เดิน 6 นาที' },
  { label: 'ถึงสุวรรณภูมิ', value: 'ราว 45 นาที' },
];

export const rooms: Room[] = [
  {
    id: 'lattice',
    name: 'ห้องบานฉลุ',
    pricePerNight: 4800,
    blurb: 'หน้าต่างไม้ฉลุลายจีนทั้งแนว แสงเช้าลอดลายลงบนพื้นไม้ ต้นไม้ในกระถางมุมห้อง',
    spec: '28 ตร.ม. · เตียงคิง · ชั้น 2',
    photo: { src: '/images/room-lattice.jpg', width: 1200, height: 1500, alt: 'หน้าต่างไม้ฉลุลายจีนกับต้นไม้ในกระถาง แสงลอดเข้ามาในห้องไม้' },
  },
  {
    id: 'moon',
    name: 'ห้องหน้าต่างจันทร์',
    pricePerNight: 6900,
    blurb: 'หน้าต่างวงกลมบานใหญ่หันออกเจ้าพระยา พรมแดงทั้งห้อง ตู้ไม้ฉลุจากโกดังเดิม',
    spec: '36 ตร.ม. · เตียงคิง · ชั้น 3',
    photo: { src: '/images/room-moon.jpg', width: 1200, height: 1500, alt: 'ห้องพักสไตล์จีน หน้าต่างวงกลมบานใหญ่ พรมแดง' },
  },
  {
    id: 'carved',
    name: 'ห้องเตียงฉลุ',
    pricePerNight: 9500,
    blurb: 'เตียงไม้แกะสลักลงรักปิดทองแบบบ้านจีนโบราณ ตู้ไม้แดงคู่กัน และระเบียงส่วนตัวบนดาดฟ้า',
    spec: '42 ตร.ม. · เตียงฉลุ และโซฟาเบด · ชั้น 4',
    photo: { src: '/images/room-carved.jpg', width: 1200, height: 1500, alt: 'เตียงไม้แกะสลักสีแดงทองแบบจีนโบราณ มีตู้ไม้แดงข้างกัน' },
  },
];

export const tea = {
  time: '20:00',
  title: 'ชาที่โถงชั้นล่าง',
  text: 'หลังอาหารเย็น เราชงชาอูหลงจากร้านเก่าบนถนนทรงวาดที่โต๊ะไม้ยาวตัวเดิมของโกดัง แขกทุกห้องนั่งได้จนเที่ยงคืน',
  main: { src: '/images/tea-pour.jpg', width: 1600, height: 1200, alt: 'มือในแขนเสื้อสีแดงรินชาจากกาน้ำชากระเบื้องขาว' } satisfies Photo,
  detail: { src: '/images/tea-set.jpg', width: 900, height: 1200, alt: 'ชุดน้ำชาลายแดงขาวบนถาดกลม' } satisfies Photo,
};

export const walk = {
  time: '21:00',
  title: 'ออกไปเดินเล่น',
  photo: { src: '/images/balcony.jpg', width: 1200, height: 1500, alt: 'โคมแดงห้อยเรียงตามระเบียงไม้ของตึกเก่ายามค่ำ' } satisfies Photo,
  places: [
    { name: 'บ้านโซวเฮงไถ่', walkMinutes: 2, note: 'คฤหาสน์จีนสี่ประสานอายุกว่า 200 ปี' },
    { name: 'ศาลเจ้าโจวซือกง', walkMinutes: 3, note: 'ศาลเจ้าฮกเกี้ยนริมน้ำ เปิดไฟถึงสามทุ่ม' },
    { name: 'ท่าเรือสี่พระยา', walkMinutes: 6, note: 'เรือข้ามฟากไปไอคอนสยามถึง 23:00' },
    { name: 'ถนนทรงวาด', walkMinutes: 8, note: 'บาร์เล็กๆ ในโกดังเก่า' },
    { name: 'เยาวราช', walkMinutes: 12, note: 'ร้านข้างทางเปิดถึงตีหนึ่ง' },
  ] satisfies Place[],
};

export const booking = {
  time: '22:00',
  title: 'จองคืนของคุณ',
  photo: { src: '/images/yaowarat-night.jpg', width: 2800, height: 1583, alt: 'ถนนเยาวราชยามค่ำ ป้ายไฟอักษรจีนสีแดงเรียงสองฝั่งถนน' } satisfies Photo,
  maxNights: 14,
  defaultNights: 2,
  daysAhead: 7,
};

// the evening the page tells, start to end; the clock in the header maps scroll onto it
export const evening = { startHour: 18, endHour: 23 } as const;

export const credits =
  'โรงแรมสมมติสำหรับงานตัวอย่าง · ภาพจาก Unsplash: Nicolas Spehler (ทางเดินโคมแดง), MChe Lee (ห้องพักทั้งสาม), Thai Nguyen Anh, Didi Paul (ชา), Shane Hebzynski (ระเบียงโคม), Bradrey Nassel (เยาวราช)';
