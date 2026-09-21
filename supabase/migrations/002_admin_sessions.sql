-- Apply after 001_initial.sql. Opaque session tokens are never stored, only SHA-256 hashes.
create table public.admin_sessions (
  token_hash text primary key check (length(token_hash) = 64),
  credential_version text not null,
  role text not null check (role = 'admin'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index admin_sessions_expiry on public.admin_sessions(expires_at);
alter table public.admin_sessions enable row level security;
revoke all on public.admin_sessions from public, anon, authenticated;
grant select, insert, delete on public.admin_sessions to service_role;
-- Expired sessions are always rejected by the server. Periodically delete them with a scheduled DB job:
-- delete from public.admin_sessions where expires_at < now();
