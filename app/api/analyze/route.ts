import { analyzeSchema } from '@/lib/schemas';
import { analyze } from '@/lib/analyze';
import { guard } from '@/lib/security/guard';
import { readInput, json, apiError } from '@/lib/security/http';
import { safeLog } from '@/lib/security/logging';
import { publicResult } from '@/lib/presentation';
export const runtime = 'nodejs';
export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    await guard(request, true);
    const input = await readInput(request, analyzeSchema);
    const result = await analyze(input.requestId);
    return result ? json(publicResult(result)) : json({ error: 'Request not found.' }, 404);
  } catch (error) {
    safeLog({ event: 'ANALYSIS_FAILED' });
    return apiError(error);
  }
}
