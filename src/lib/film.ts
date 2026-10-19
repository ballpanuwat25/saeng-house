// Film mode: the stage the portfolio video is recorded from (src/app/film). It needs the public demo's book,
// because each take throws the bookings away and lays the demo's year down again, and it is never meant for
// visitors, so it opens only on the dev server or where FILM_MODE=1 is set by hand for a recording.
import { isDemo } from '@/lib/demo';

export const filmOpen = () => isDemo() && (process.env.FILM_MODE === '1' || process.env.NODE_ENV === 'development');
