// Renders a headline from site content: words between asterisks become the italic serif.
export default function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*[^*]+\*)/).map((part, i) =>
        part.startsWith('*') ? <em key={i}>{part.slice(1, -1)}</em> : part,
      )}
    </>
  );
}
