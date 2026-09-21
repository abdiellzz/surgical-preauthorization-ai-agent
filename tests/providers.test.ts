import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { getAIProvider } from '@/lib/ai/provider';
import { SYSTEM_PROMPT } from '@/lib/ai/prompts';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('Configured provider adapters', () => {
  for (const [name, host] of [
    ['openai', 'api.openai.com'],
    ['gemini', 'generativelanguage.googleapis.com'],
    ['groq', 'api.groq.com'],
    ['openrouter', 'openrouter.ai'],
  ]) {
    it(`${name} uses only configured endpoint and validates JSON`, async () => {
      vi.stubEnv('AI_PROVIDER', name);
      vi.stubEnv('AI_MODEL', 'test-model');
      vi.stubEnv(`${name.toUpperCase()}_API_KEY`, 'fictional-test-key');
      const fetchMock = vi.fn().mockResolvedValue(
        Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  facts: [],
                  ambiguous: true,
                  concerns: ['Missing procedure code'],
                }),
              },
            },
          ],
        }),
      );
      vi.stubGlobal('fetch', fetchMock);
      const result = await getAIProvider()!.extractMedicalRequest('Fictional report');
      expect(result.ambiguous).toBe(true);
      expect(new URL(fetchMock.mock.calls[0][0]).hostname).toBe(host);
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages[0].content).toContain(
        SYSTEM_PROMPT,
      );
    });
  }
});
