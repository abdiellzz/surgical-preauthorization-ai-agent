import 'server-only';
import { demoCases } from '@/data/demo/cases';
import type { AuthorizationResult, CaseData } from './types';
import * as notion from './notion/requests';
import * as db from './supabase/server';
export const isDemo = () => process.env.DATA_SOURCE !== 'notion';
const globalStore = globalThis as typeof globalThis & {
  authorizationResults?: Map<string, AuthorizationResult>;
};
const memory = (globalStore.authorizationResults ??= new Map());
export async function getCase(id: string): Promise<CaseData | null> {
  return isDemo()
    ? structuredClone(demoCases.find((c) => c.request.id === id) ?? null)
    : notion.getCase(id);
}
export async function listCases(): Promise<CaseData[]> {
  if (isDemo()) return structuredClone(demoCases);
  const requests = await notion.getPendingRequests();
  return Promise.all(requests.map((r) => notion.getCase(r.id)));
}
export async function listResults(): Promise<AuthorizationResult[]> {
  if (db.configured()) return db.getResults();
  if (!isDemo()) throw new Error('DATABASE_REQUIRED');
  return [...memory.values()];
}
export async function persist(result: AuthorizationResult) {
  if (db.configured()) await db.saveResult(result);
  else if (!isDemo()) throw new Error('DATABASE_REQUIRED');
  else memory.set(result.requestId, result);
}
