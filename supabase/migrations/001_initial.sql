create table public.application_users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'reviewer' check (role in ('reviewer','admin')),
  created_at timestamptz not null default now()
);
create table public.authorization_results (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique,
  decision text not null check (decision in ('PRE_APPROVED','DOCUMENTS_REQUIRED','HUMAN_REVIEW_REQUIRED','NOT_COVERED','WAITING_PERIOD_NOT_COMPLETED')),
  confidence double precision not null check (confidence between 0 and 1),
  reason text not null,
  missing_documents jsonb not null default '[]',
  requires_human_review boolean not null,
  processing_time_ms double precision not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), request_id text not null,
  event text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create index audit_request_time on public.audit_logs(request_id, created_at);
alter table public.application_users enable row level security;
alter table public.authorization_results enable row level security;
alter table public.audit_logs enable row level security;
-- No anonymous/authenticated access. Only the server-side service role accesses the prototype.
revoke all on public.application_users, public.authorization_results, public.audit_logs from anon, authenticated;
create or replace function public.save_authorization(result jsonb, events jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
 insert into authorization_results(request_id,decision,confidence,reason,missing_documents,requires_human_review,processing_time_ms,payload,created_at)
 values(result->>'requestId',result->>'decision',(result->>'confidence')::double precision,result->>'reason',result->'missingDocuments',(result->>'requiresHumanReview')::boolean,(result->>'processingTimeMs')::double precision,result,(result->>'createdAt')::timestamptz)
 on conflict(request_id) do update set decision=excluded.decision,confidence=excluded.confidence,reason=excluded.reason,missing_documents=excluded.missing_documents,requires_human_review=excluded.requires_human_review,processing_time_ms=excluded.processing_time_ms,payload=excluded.payload,created_at=excluded.created_at;
 insert into audit_logs(request_id,event,details,created_at)
 select result->>'requestId',value->>'event',value->'details',(value->>'createdAt')::timestamptz from jsonb_array_elements(events);
end;
$$;
revoke all on function public.save_authorization(jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.save_authorization(jsonb,jsonb) to service_role;
