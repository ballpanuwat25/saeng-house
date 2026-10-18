import Image from 'next/image';
import { tea } from '@/content/site';
import Rich from '@/components/Rich';

export default function Tea() {
  return (
    <section className="tea wrap" id="tea" aria-labelledby="tea-h">
      <div className="tea-grid">
        <figure className="photo big">
          <Image src={tea.main.src} alt={tea.main.alt} fill sizes="(max-width: 860px) 100vw, 65vw" />
        </figure>
        <div className="txt">
          <h2 id="tea-h">
            <time>{tea.time}</time> <Rich text={tea.title} />
          </h2>
          <p>{tea.text}</p>
        </div>
        <figure className="photo small">
          <Image src={tea.detail.src} alt={tea.detail.alt} fill sizes="(max-width: 860px) 60vw, 33vw" />
        </figure>
      </div>
    </section>
  );
}
