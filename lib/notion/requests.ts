import 'server-only';
import { requestSchema, patientSchema, policySchema } from '@/lib/schemas';
import type { AuthorizationResult, CaseData } from '@/lib/types';
import { dataSource, findById, notion, payload, query } from './client';
export async function getPatient(id: string) {
  return patientSchema.parse(await findById('NOTION_PATIENTS_DATABASE_ID', id));
}
export async function getPolicy(id: string) {
  const raw = await findById('NOTION_POLICIES_DATABASE_ID', id);
  const parsed = policySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
export async function getSurgicalRequest(id: string) {
  return requestSchema.parse(await findById('NOTION_REQUESTS_DATABASE_ID', id));
}
export async function getPendingRequests() {
  const pages = await query('NOTION_REQUESTS_DATABASE_ID', {
    property: 'Status',
    select: { equals: 'Pending' },
  });
  return pages.map((p) => requestSchema.parse(payload(p)));
}
export async function getCase(id: string): Promise<CaseData> {
  const request = await getSurgicalRequest(id);
  const patient = await getPatient(request.patientId);
  const policy = await getPolicy(patient.policyNumber);
  return { request, patient, policy };
}
export async function saveAuthorizationResult(result: AuthorizationResult) {
  const source = await dataSource('NOTION_RESULTS_DATABASE_ID');
  const summary = JSON.stringify({
    requestId: result.requestId,
    decision: result.decision,
    reason: result.reason,
    createdAt: result.createdAt,
  });
  const chunks = summary.match(/[\s\S]{1,1800}/g) ?? [];
  await notion('pages', {
    parent: { type: 'data_source_id', data_source_id: source },
    properties: {
      ID: { title: [{ text: { content: result.requestId } }] },
      Payload: { rich_text: chunks.map((content) => ({ text: { content } })) },
    },
  });
}
