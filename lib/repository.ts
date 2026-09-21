import 'server-only';
import { demoCases } from '@/data/demo/cases';
import type { AuthorizationResult, CaseData } from './types';
import * as notion from './notion/requests';
import * as db from './supabase/server';
import { dataSource } from './security/config';
export const isDemo = () => dataSource() === 'demo';
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
  if (isDemo()) return [...memory.values()];
  if (!db.configured()) throw new Error('DATABASE_REQUIRED');
  return db.getResults();
}
export async function persist(result: AuthorizationResult, events = result.timeline) {
  if (isDemo()) memory.set(result.requestId, result);
  else if (db.configured()) await db.saveResult(result, events);
  else throw new Error('DATABASE_REQUIRED');
}
