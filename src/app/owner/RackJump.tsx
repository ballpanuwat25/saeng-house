'use client';

// opens the rack at any night the owner picks, from the same date picker as the booking ticket; the rack
// on screen stays while the new one loads, with the rule drawing under the date
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import DatePicker from '@/components/DatePicker';
import { Pending } from '@/app/owner/Pending';

export default function RackJump({ from }: { from: string }) {
  const router = useRouter();
  const [loading, start] = useTransition();
  return (
    <span className="rack-jump">
      <span aria-hidden>Starting</span>
      <DatePicker value={from} align="end" label="Start the rack on" onChange={(day) => start(() => router.push(`/owner/rooms?from=${day}`))} />
      <Pending on={loading} />
    </span>
  );
}
