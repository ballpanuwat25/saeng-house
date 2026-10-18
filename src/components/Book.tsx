import Image from 'next/image';
import { booking } from '@/content/site';
import Rich from '@/components/Rich';
import BookingCard from '@/components/BookingCard';

export default function Book() {
  return (
    <section className="book wrap" id="book" aria-labelledby="book-h">
      <div className="bg">
        <Image src={booking.photo.src} alt={booking.photo.alt} fill sizes="100vw" style={{ objectFit: 'cover', objectPosition: '60% 50%' }} />
      </div>
      <h2 id="book-h">
        <time>{booking.time}</time>
        <br />
        <Rich text={booking.title} />
      </h2>
      <BookingCard />
    </section>
  );
}
