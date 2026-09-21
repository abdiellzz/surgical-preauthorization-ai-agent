import 'server-only';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { database } from '@/lib/supabase/server';
import { authConfig, dataSource } from './config';
import { HttpError } from './http';
export const SESSION_SECONDS = 3600;
export const cookieName = () =>
  process.env.NODE_ENV === 'production' ? '__Host-preauth_session' : 'preauth_session';
export const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: SESSION_SECONDS,
});
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
function fingerprint() {
  const config = authConfig();
  return createHmac('sha256', config.secret).update(config.password).digest('hex');
}
export function validPassword(value: string) {
  const { password, secret } = authConfig();
  return timingSafeEqual(
    createHmac('sha256', secret).update(value).digest(),
    createHmac('sha256', secret).update(password).digest(),
  );
}
export async function createSession() {
  const token = randomBytes(32).toString('base64url');
  await database('admin_sessions', {
    token_hash: hash(token),
    credential_version: fingerprint(),
    role: 'admin',
    expires_at: new Date(Date.now() + SESSION_SECONDS * 1000).toISOString(),
  });
  return token;
}
export function tokenFromHeaders(headers: Headers) {
  const pair = (headers.get('cookie') ?? '')
    .split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(cookieName() + '='));
  const token = pair?.slice(cookieName().length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
export async function resolveSession(headers: Headers) {
  const token = tokenFromHeaders(headers);
  if (!token) return null;
  const rows = z
    .array(
      z.object({
        role: z.literal('admin'),
        expires_at: z.iso.datetime({ offset: true }),
        credential_version: z.string(),
      }),
    )
    .parse(
      await database(
        `admin_sessions?token_hash=eq.${hash(token)}&select=role,expires_at,credential_version&limit=1`,
      ),
    );
  const row = rows[0];
  if (!row || Date.parse(row.expires_at) <= Date.now() || row.credential_version !== fingerprint())
    return null;
  return { id: 'admin', role: row.role };
}
export async function revokeSession(headers: Headers) {
  const token = tokenFromHeaders(headers);
  if (token) await database(`admin_sessions?token_hash=eq.${hash(token)}`, undefined, 'DELETE');
}
export async function authorize(headers: Headers) {
  if (dataSource() === 'demo') return { id: 'demo', role: 'demo' as const };
  const session = await resolveSession(headers);
  if (!session || session.role !== 'admin') throw new HttpError(401, 'Authentication required.');
  return session;
}
