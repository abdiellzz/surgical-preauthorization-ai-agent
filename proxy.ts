import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
export function proxy(request: NextRequest) {
  // Integrated deployments protect both HTML and APIs. The browser uses native Basic Auth.
  if (process.env.DATA_SOURCE !== 'notion') return NextResponse.next();
  const password = process.env.ADMIN_PASSWORD;
  const expected = password ? `Basic ${Buffer.from(`admin:${password}`).toString('base64')}` : '';
  const provided = request.headers.get('authorization') ?? '';
  if (
    !expected ||
    Buffer.byteLength(provided) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  )
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Administrative demo", charset="UTF-8"',
        'Cache-Control': 'no-store',
      },
    });
  return NextResponse.next();
}
export const config = {
  matcher: ['/dashboard/:path*', '/requests/:path*', '/review/:path*', '/api/:path*'],
};
