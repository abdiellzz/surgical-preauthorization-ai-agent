import 'server-only';
import { z } from 'zod';
import type { RuleResult } from '@/lib/types';
import { extractionSchema, explanationSchema, type Extraction } from './schemas';
import { SYSTEM_PROMPT } from './prompts';
import { sanitizeDocument } from '@/lib/security/sanitize';
export interface AIProvider {
  extractMedicalRequest(text: string): Promise<Extraction>;
  extractPolicyInformation(text: string): Promise<Extraction>;
  generateExplanation(rules: RuleResult[]): Promise<{ factorCodes: string[] }>;
}
const endpoints = {
  openai: 'https://api.openai.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};
export function getAIProvider(): AIProvider | null {
  const name = process.env.AI_PROVIDER;
  if (!name || name === 'none') return null;
  if (!(name in endpoints)) throw new Error('AI_CONFIGURATION');
  const provider = name as keyof typeof endpoints;
  const key = process.env[`${provider.toUpperCase()}_API_KEY`];
  const model = process.env.AI_MODEL;
  if (!key || !model) throw new Error('AI_CONFIGURATION');
  async function invoke<T>(schema: z.ZodType<T>, task: string, content: string): Promise<T> {
    const response = await fetch(`${endpoints[provider]}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `${SYSTEM_PROMPT}\nTask: ${task}\nJSON schema: ${JSON.stringify(z.toJSONSchema(schema))}`,
          },
          {
            role: 'user',
            content: JSON.stringify({ untrustedDocument: sanitizeDocument(content) }),
          },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error('AI_UNAVAILABLE');
    const envelope = z
      .object({ choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1) })
      .parse(await response.json());
    return schema.parse(JSON.parse(envelope.choices[0].message.content));
  }
  return {
    extractMedicalRequest: (text) =>
      invoke(
        extractionSchema,
        'Extract the explicit requested procedure code. Mark uncertainty.',
        text,
      ),
    extractPolicyInformation: (text) =>
      invoke(extractionSchema, 'Extract explicit policy facts only. Mark uncertainty.', text),
    generateExplanation: (rules) =>
      invoke(
        explanationSchema,
        'Select relevant factorCodes from the provided deterministic rules. Do not produce new claims.',
        JSON.stringify(rules),
      ),
  };
}
