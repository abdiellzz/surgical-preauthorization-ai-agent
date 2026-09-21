import 'server-only';
import { z } from 'zod';
import { authConfig, dataSource } from './config';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function readBoundedJson(
  response: Request | Response,
  maxBytes: number,
): Promise<unknown> {
  if (Number(response.headers.get('content-length') ?? 0) > maxBytes)
    throw new HttpError(413, 'Payload too large.');
  const reader = response.body?.getReader();
  if (!reader) throw new HttpError(400, 'Invalid JSON.');
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, 'Payload too large.');
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(parts).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Invalid JSON.');
  }
}
export async function readInput<T>(
  request: Request,
  schema: z.ZodType<T>,
  limit = 2048,
): Promise<T> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
    throw new HttpError(415, 'JSON content type required.');
  const parsed = schema.safeParse(await readBoundedJson(request, limit));
  if (!parsed.success) throw new HttpError(400, 'Invalid request.');
  return parsed.data;
}
export function checkOrigin(request: Request) {
  const expected = dataSource() === 'notion' ? authConfig().origin : new URL(request.url).origin;
  // Required on every mutation, including login: no Origin-less cookie-authenticated writes.
  if (
    request.headers.get('origin') !== expected ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new HttpError(403, 'Invalid origin.');
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  });
}
export function apiError(error: unknown) {
  return error instanceof HttpError
    ? json({ error: error.message }, error.status)
    : json({ error: 'Unable to complete the analysis.' }, 503);
}
