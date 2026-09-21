import { listCases, listResults, isDemo } from '@/lib/repository';
import { caseSummary, publicResult } from '@/lib/presentation';
import { guard } from '@/lib/security/guard';
import { json, apiError } from '@/lib/security/http';
import { safeLog } from '@/lib/security/logging';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    await guard(request);
    const [cases, results] = await Promise.all([listCases(), listResults()]);
    const allowed = new Set(cases.map((c) => c.request.id));
    return json({
      cases: cases.map(caseSummary),
      results: results.filter((r) => allowed.has(r.requestId)).map(publicResult),
      demo: isDemo(),
      persistence: isDemo() ? 'Temporary demo memory' : 'Supabase',
    });
  } catch (error) {
    safeLog({ event: 'REQUESTS_FAILED' });
    return apiError(error);
  }
}
