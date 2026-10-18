import { closing, credits, hotel } from '@/content/site';

export default function Footer() {
  return (
    <footer className="foot wrap">
      <p className="mark-big" aria-hidden="true">{hotel.wordmark}</p>
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
