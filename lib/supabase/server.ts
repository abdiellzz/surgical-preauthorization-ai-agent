import 'server-only';
import type { AuthorizationResult } from '@/lib/types';
import { z } from 'zod';
import { authorizationResultSchema } from '@/lib/schemas';
import { readBoundedJson } from '@/lib/security/http';
export function configured() {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}
export async function database(path: string, body?: unknown, method?: 'DELETE'): Promise<unknown> {
  if (!configured()) throw new Error('DATABASE_CONFIGURATION');
  const base = z.url().safeParse(process.env.SUPABASE_URL);
  if (!base.success) throw new Error('DATABASE_CONFIGURATION');
  const url = new URL(base.data);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error('DATABASE_CONFIGURATION');
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    method: method ?? (body ? 'POST' : 'GET'),
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
    redirect: 'error',
  });
  if (!response.ok) throw new Error('DATABASE_UNAVAILABLE');
  return response.status === 204 || response.status === 201
    ? null
    : readBoundedJson(response, 4000000);
}
export async function saveResult(result: AuthorizationResult, events = result.timeline) {
  await database('rpc/save_authorization', { result, events });
}
export async function getResults(): Promise<AuthorizationResult[]> {
  const rows = z
    .array(z.object({ payload: authorizationResultSchema }))
    .max(1000)
    .parse(await database('authorization_results?select=payload&order=created_at.desc&limit=1000'));
  return rows.map((row) => row.payload);
}
