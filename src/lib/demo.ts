// The public demo of the site, for the portfolio: DEMO_MODE=1 on the deployment. Everything works as on a
// real site, against a real database, with three differences that keep strangers' play harmless:
// - no email leaves the site; each one can be read on the web instead, at mailPath(),
// - anyone can open the owner's book from the login page, without a password,
// - the bookings are thrown away every night and a fresh year of them is put in their place
//   (src/app/api/demo/reset), so the book always has something to show and never fills up for good.

export const isDemo = () => process.env.DEMO_MODE === '1';

// the emails the site would send, one page each in the demo (src/app/demo/mail)
export const MAIL_KINDS = ['received', 'owner', 'confirmed', 'declined', 'changed', 'cancelled'] as const;
export type MailKind = (typeof MAIL_KINDS)[number];
export const isMailKind = (v: string): v is MailKind => (MAIL_KINDS as readonly string[]).includes(v);

export const mailPath = (ref: string, kind: MailKind) => `/demo/mail/${encodeURIComponent(ref)}/${kind}`;
