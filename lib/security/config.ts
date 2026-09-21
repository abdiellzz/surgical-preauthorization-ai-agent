import 'server-only';
import { z } from 'zod';
export function dataSource(): 'demo' | 'notion' {
  const parsed = z.enum(['demo', 'notion']).safeParse(process.env.DATA_SOURCE ?? 'demo');
  if (!parsed.success) throw new Error('INVALID_SERVER_CONFIGURATION');
  return parsed.data;
}
export function authConfig() {
  const parsed = z
    .object({ password: z.string().min(12).max(256), secret: z.string().min(32), origin: z.url() })
    .safeParse({
      password: process.env.ADMIN_PASSWORD,
      secret: process.env.APP_SECRET,
      origin: process.env.APP_ORIGIN,
    });
  if (!parsed.success) throw new Error('INVALID_SERVER_CONFIGURATION');
  const url = new URL(parsed.data.origin);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')
  )
    throw new Error('INVALID_SERVER_CONFIGURATION');
  return { ...parsed.data, origin: url.origin };
}
