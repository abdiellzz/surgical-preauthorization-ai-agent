import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { POST } from '@/app/api/analyze/route';
import { GET } from '@/app/api/requests/route';
import { expectedDecisions } from '@/data/demo/cases';
beforeEach(() => {
  vi.stubEnv('DATA_SOURCE', 'demo');
  vi.stubEnv('AI_PROVIDER', 'none');
  vi.stubEnv('SUPABASE_URL', '');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
});
const request = (body: unknown) =>
  new Request('http://localhost/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
    body: JSON.stringify(body),
  });
describe('Real analysis API pipeline', () => {
  expectedDecisions.forEach((decision, i) =>
    it(`analyzes and stores case ${i + 1}`, async () => {
      const requestId = `REQ-00${i + 1}`;
      const response = await POST(request({ requestId }));
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.decision).toBe(decision);
      expect(result.processingTimeMs).toBeGreaterThan(0);
      expect(result.timeline.some((e: { event: string }) => e.event === 'DECISION_GENERATED')).toBe(
        true,
      );
      expect(result.decisionFactors).toHaveLength(6);
      const saved = await (await GET(new Request('http://localhost/api/requests'))).json();
      expect(
        saved.results.find((r: { requestId: string }) => r.requestId === requestId).decision,
      ).toBe(decision);
    }),
  );
  it('rejects arbitrary input fields', async () =>
    expect((await POST(request({ requestId: 'REQ-001', decision: 'PRE_APPROVED' }))).status).toBe(
      400,
    ));
  it('rejects invalid JSON', async () =>
    expect(
      (
        await POST(
          new Request('http://localhost/api/analyze', {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: 'http://localhost' },
            body: '{',
          }),
        )
      ).status,
    ).toBe(400));
  it('returns 404 for unknown request', async () =>
    expect((await POST(request({ requestId: 'REQ-999' }))).status).toBe(404));
  it('rejects cross-origin mutation', async () =>
    expect(
      (
        await POST(
          new Request('http://localhost/api/analyze', {
            method: 'POST',
            headers: { origin: 'https://untrusted.example' },
            body: '{"requestId":"REQ-001"}',
          }),
        )
      ).status,
    ).toBe(403));
});
