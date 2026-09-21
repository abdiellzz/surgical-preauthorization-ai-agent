import 'server-only';
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { authorize } from './session';
import { allowRequest } from './rate-limit';
import { checkOrigin, HttpError } from './http';
export function clientKey(headers: Headers) {
  // Opt in only behind a proxy that overwrites this header; never trust arbitrary forwarded headers.
  const address = process.env.TRUST_PROXY_IP === 'true' ? headers.get('x-real-ip') : null;
  return createHash('sha256')
    .update(address && isIP(address) ? address : 'shared-untrusted-network')
    .digest('hex');
}
export function limit(key: string, maximum = 10) {
  if (!allowRequest(key, Date.now(), maximum))
    throw new HttpError(429, 'Too many requests. Try again in one minute.');
}
export async function guard(request: Request, mutation = false) {
  if (mutation) checkOrigin(request);
  const principal = await authorize(request.headers);
  limit(
    `${mutation ? 'write' : 'read'}:${principal.role === 'demo' ? clientKey(request.headers) : principal.id}`,
    mutation ? 10 : 120,
  );
  return principal;
}
