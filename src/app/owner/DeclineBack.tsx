'use client';

// The way out of declining: folds the Decline panel shut, which brings Confirm back, and puts the focus on
// the panel's heading where the owner opened it. Without JavaScript the heading itself still folds it.
export default function DeclineBack() {
  return (
    <button
      type="button"
      className="decline-back"
      onClick={(e) => {
        const panel = e.currentTarget.closest('details');
        if (!panel) return;
        panel.open = false;
        panel.querySelector('summary')?.focus();
      }}
    >
      Don&rsquo;t decline
    </button>
  );
}
