'use client';

// "Just in" on a request that arrived while the owner had the book open, so the one the count went up for
// is easy to find among the others. Compared with when this page was loaded, which a reload resets; once
// the request is answered it leaves the sheet anyway. Drawn after the page is running, since the server
// cannot know when the owner opened it.
import { useEffect, useState } from 'react';

export default function JustIn({ sent }: { sent: string }) {
  const [fresh, setFresh] = useState(false);
  useEffect(() => setFresh(Date.parse(sent) > performance.timeOrigin), [sent]);
  return fresh ? <em className="entry-new">Just in</em> : null;
}
