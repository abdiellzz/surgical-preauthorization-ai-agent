import { NextResponse } from 'next/server';
import { guard } from '@/lib/security/guard';
import { apiError } from '@/lib/security/http';
import { cookieName, cookieOptions, revokeSession } from '@/lib/security/session';
import { safeLog } from '@/lib/security/logging';
export async function POST(request: Request) {
  try {
    const principal = await guard(request, true);
    if (principal.role !== 'demo') await revokeSession(request.headers);
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(cookieName(), '', { ...cookieOptions(), maxAge: 0 });
    safeLog({ event: 'LOGOUT_SUCCEEDED', status: 200 });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
