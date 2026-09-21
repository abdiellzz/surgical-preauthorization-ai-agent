import { z } from 'zod';
import { analyzeSchema } from '@/lib/schemas';
import { guard } from '@/lib/security/guard';
import { apiError, HttpError, json, readInput } from '@/lib/security/http';
import { getCase, listResults, persist } from '@/lib/repository';
import { analyze } from '@/lib/analyze';
import { audit } from '@/lib/audit/logger';
import { publicResult } from '@/lib/presentation';
import { safeLog } from '@/lib/security/logging';
const inputSchema = analyzeSchema
  .extend({ action: z.enum(['REQUEST_DOCUMENTS', 'SEND_TO_REVIEW']) })
  .strict();
export async function POST(request: Request) {
  try {
    await guard(request, true);
    const input = await readInput(request, inputSchema);
    if (!(await getCase(input.requestId))) throw new HttpError(404, 'Request not found.');
    const previous =
      (await listResults()).find((r) => r.requestId === input.requestId) ??
      (await analyze(input.requestId));
    if (!previous) throw new HttpError(404, 'Request not found.');
    const result = structuredClone(previous);
    if (input.action === 'REQUEST_DOCUMENTS') {
      if (!result.missingDocuments.length)
        throw new HttpError(400, 'No missing documents to request.');
      audit(result.timeline, 'DOCUMENT_REQUEST_RECORDED', {
        count: result.missingDocuments.length,
      });
    } else {
      if (result.requiresHumanReview)
        throw new HttpError(400, 'Request is already in the review queue.');
      result.decision = 'HUMAN_REVIEW_REQUIRED';
      result.requiresHumanReview = true;
      result.reason = 'An analyst requested administrative verification. ' + previous.reason;
      audit(result.timeline, 'ADMINISTRATIVE_REVIEW_REQUESTED', {
        previousDecision: previous.decision,
      });
    }
    await persist(result, result.timeline.slice(-1));
    return json({
      result: publicResult(result),
      message:
        input.action === 'REQUEST_DOCUMENTS'
          ? 'Document request recorded in the audit log. No external message was sent.'
          : 'Request added to the administrative review queue.',
    });
  } catch (error) {
    safeLog({ event: 'ACTION_FAILED' });
    return apiError(error);
  }
}
