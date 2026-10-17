import Image from 'next/image';
import { walk } from '@/content/site';

export default function Walk() {
  return (
    <section className="walk wrap" id="walk" aria-labelledby="walk-h">
      <figure className="photo">
        <Image src={walk.photo.src} alt={walk.photo.alt} fill sizes="(max-width: 860px) 100vw, 40vw" />
      </figure>
      <div className="list">
        <h2 id="walk-h">
          <time>{walk.time}</time> {walk.title}
        </h2>
        <ol>
          {walk.places.map((p) => (
            <li key={p.name}>
              <b>{p.name}</b>
              <span>{p.walkMinutes} นาที</span>
              <small>{p.note}</small>
            </li>
          ))}
        </ol>
        <p className="note">เวลาเดินโดยประมาณ จากประตูหน้าบ้าน</p>
      </div>
    </section>
  );
}
