import { z } from 'zod';
import { NextResponse } from 'next/server';
import { checkOrigin, readInput, apiError, HttpError } from '@/lib/security/http';
import { clientKey, limit } from '@/lib/security/guard';
import {
  cookieName,
  cookieOptions,
  createSession,
  revokeSession,
  validPassword,
} from '@/lib/security/session';
import { dataSource } from '@/lib/security/config';
import { safeLog } from '@/lib/security/logging';
const schema = z.object({ password: z.string().min(1).max(256) }).strict();
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    limit(`login:${clientKey(request.headers)}`, 5);
    if (dataSource() === 'demo') throw new HttpError(400, 'Demo access does not require a login.');
    const { password } = await readInput(request, schema);
    if (!validPassword(password)) throw new HttpError(401, 'Invalid credentials.');
    await revokeSession(request.headers);
    const token = await createSession();
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(cookieName(), token, cookieOptions());
    safeLog({ event: 'LOGIN_SUCCEEDED', status: 200 });
    return response;
  } catch (error) {
    safeLog({ event: 'LOGIN_FAILED', status: error instanceof HttpError ? error.status : 503 });
    return apiError(error);
  }
}
