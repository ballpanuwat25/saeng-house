'use client';

// A form's button that says what it is doing while the form's action runs (saving, then emailing the
// guest, which can take a couple of seconds) and cannot be pressed twice meanwhile
import { useFormStatus } from 'react-dom';

export default function Busy({ label, busy, disabled }: { label: string; busy: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending || disabled} aria-busy={pending || undefined}>
      {pending ? busy : label}
    </button>
  );
}
