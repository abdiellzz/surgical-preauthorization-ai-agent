import { analyzeSchema } from '@/lib/schemas';
import { analyze } from '@/lib/analyze';
import { allowRequest } from '@/lib/security/rate-limit';
export const runtime = 'nodejs';
export const maxDuration = 120;
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  if (!allowRequest('analyze-global'))
    return Response.json(
      { error: 'Too many requests. Please try again in a minute.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 2048)
      return Response.json({ error: 'Request too large.' }, { status: 413 });
    const raw = await request.text();
    if (raw.length > 2048) return Response.json({ error: 'Request too large.' }, { status: 413 });
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
    }
    const parsed = analyzeSchema.safeParse(json);
    if (!parsed.success) return Response.json({ error: 'Invalid request ID.' }, { status: 400 });
    const result = await analyze(parsed.data.requestId);
    return result
      ? Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
      : Response.json({ error: 'Request not found.' }, { status: 404 });
  } catch {
    console.error('ANALYSIS_FAILED');
    return Response.json(
      { error: 'Unable to analyze this request. Please try again or send it for human review.' },
      { status: 503 },
    );
  }
}
