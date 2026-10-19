-- Wrong passwords at the owner's door (src/lib/owner/throttle.ts), one row each, so every server instance
-- counts the same tries. Rows older than a day are deleted as new ones come in. Closed to the public keys
-- like the bookings table; the website uses the service key from the server only.

create table if not exists owner_login_failures (
  ip text not null,
  at timestamptz not null default now()
);

create index if not exists owner_login_failures_ip on owner_login_failures (ip, at);
alter table owner_login_failures enable row level security;
