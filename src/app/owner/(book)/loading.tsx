// While a tab reads the bookings: a line saying so and a lantern-red rule drawing across, shown only after
// a moment so a quick tab does not flash it
export default function Opening() {
  return (
    <p className="owner-loading" role="status">
      Opening the book…
    </p>
  );
}
