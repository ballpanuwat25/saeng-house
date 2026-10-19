'use client';

import { useRouter } from 'next/navigation';
import DatePicker from '@/components/DatePicker';

// opens the rack at any night the owner picks, from the same date picker as the booking ticket
export default function RackJump({ from }: { from: string }) {
  const router = useRouter();
  return (
    <span className="rack-jump">
      <span aria-hidden>Starting</span>
      <DatePicker value={from} align="end" label="Start the rack on" onChange={(day) => router.push(`/owner/rooms?from=${day}`)} />
    </span>
  );
}
