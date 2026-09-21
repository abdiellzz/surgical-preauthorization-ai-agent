import 'server-only';
import type { AuthorizationResult } from '@/lib/types';
export function configured() {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}
async function database(path: string, body?: unknown): Promise<unknown> {
  if (!configured()) throw new Error('DATABASE_CONFIGURATION');
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('DATABASE_UNAVAILABLE');
  return response.status === 204 ? null : response.json();
}
export async function saveResult(result: AuthorizationResult) {
  await database('rpc/save_authorization', { result, events: result.timeline });
}
export async function getResults(): Promise<AuthorizationResult[]> {
  const rows = (await database(
    'authorization_results?select=payload&order=created_at.desc&limit=1000',
  )) as { payload: AuthorizationResult }[];
  return rows.map((row) => row.payload);
}
