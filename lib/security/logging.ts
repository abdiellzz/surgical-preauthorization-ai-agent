import 'server-only';
import { z } from 'zod';
const entry = z.object({
  event: z.enum([
    'ANALYSIS_FAILED',
    'REQUESTS_FAILED',
    'LOGIN_FAILED',
    'LOGIN_SUCCEEDED',
    'LOGOUT_SUCCEEDED',
    'AUTH_FAILED',
    'ACTION_FAILED',
  ]),
  requestId: z
    .string()
    .regex(/^REQ-[A-Za-z0-9-]{1,60}$/)
    .optional(),
  status: z.number().int().min(100).max(599).optional(),
});
export function safeLog(input: unknown) {
  const parsed = entry.safeParse(input);
  if (!parsed.success) return;
  // Unknown fields are stripped. Error objects, headers and source text are never serialized.
  console.info(JSON.stringify({ ...parsed.data, timestamp: new Date().toISOString() }));
}
