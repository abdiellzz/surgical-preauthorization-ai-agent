import { describe, expect, it, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';
import { allowRequest } from '@/lib/security/rate-limit';
import { sanitizeDocument } from '@/lib/security/sanitize';
afterEach(() => vi.unstubAllEnvs());
describe('Security boundaries', () => {
  it('rate limits repeated calls and resets the time window', () => {
    for (let i = 0; i < 30; i++) expect(allowRequest('unit-test', 1000)).toBe(true);
    expect(allowRequest('unit-test', 1000)).toBe(false);
    expect(allowRequest('unit-test', 61000)).toBe(true);
  });
  it('strips control characters and limits document size', () => {
    expect(sanitizeDocument('a\u0000b')).toBe('ab');
    expect(sanitizeDocument('x'.repeat(40000))).toHaveLength(30000);
  });
  it('protects integrated mode when the password is missing', () => {
    vi.stubEnv('DATA_SOURCE', 'notion');
    vi.stubEnv('ADMIN_PASSWORD', '');
    expect(proxy(new NextRequest('https://demo.example/api/requests')).status).toBe(401);
  });
  it('accepts the configured administrative credential only', () => {
    vi.stubEnv('DATA_SOURCE', 'notion');
    vi.stubEnv('ADMIN_PASSWORD', 'synthetic-test-password');
    expect(proxy(new NextRequest('https://demo.example/dashboard')).status).toBe(401);
    expect(
      proxy(
        new NextRequest('https://demo.example/dashboard', {
          headers: {
            authorization:
              'Basic ' + Buffer.from('admin:synthetic-test-password').toString('base64'),
          },
        }),
      ).status,
    ).toBe(200);
  });
});
