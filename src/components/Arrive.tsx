import { arrival, facts } from '@/content/site';

export default function Arrive() {
  return (
    <section className="arrive wrap" aria-label="Arriving">
      <p className="say">{arrival}</p>
      <dl className="ledger">
        {facts.map((f) => (
          <div key={f.label}>
            <dt>
              {f.figure}
              {f.unit && <small>{f.unit}</small>}
            </dt>
            <dd>{f.label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
