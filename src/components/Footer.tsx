import { closing, credits, hotel } from '@/content/site';

const letters = [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(hotel.wordmark)].map((s) => s.segment);

export default function Footer() {
  return (
    <footer className="foot wrap" data-time={closing.time}>
      {/* a shop sign in the manner of the neon over Yaowarat; it sputters on at 23:00 and one letter never settles */}
      <div className="sign" aria-hidden="true">
        <p className="neon">
          {letters.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </p>
        <p className="neon-gloss">{hotel.wordmarkGloss}</p>
      </div>
      <div className="cols">
        <p>
          <strong>{hotel.name}</strong>
          {hotel.address[0]}
          <br />
          {hotel.address[1]}
        </p>
        <p>
          <strong>Contact</strong>
          {hotel.phone}
          <br />
          LINE {hotel.line}
        </p>
        <p>
          <strong>{closing.time}</strong>
          {closing.text}
          <br />
          <a className="link" href="#home">Back to the top</a>
        </p>
      </div>
      <p className="credits">{credits}</p>
    </footer>
  );
}
