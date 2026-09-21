import { z } from 'zod';
import { guard } from '@/lib/security/guard';
import { apiError, json } from '@/lib/security/http';
import { isDemo, listCases, listResults } from '@/lib/repository';
import { database } from '@/lib/supabase/server';
export async function GET(request: Request) {
  try {
    await guard(request);
    const allowed = new Set((await listCases()).map((c) => c.request.id));
    const events = isDemo()
      ? (await listResults()).flatMap((r) =>
          r.timeline.map((event, index) => ({
            id: `${r.requestId}-${index}`,
            request_id: r.requestId,
            event: event.event,
            created_at: event.createdAt,
          })),
        )
      : z
          .array(
            z.object({
              id: z.uuid(),
              request_id: z.string().regex(/^REQ-[A-Za-z0-9-]{1,60}$/),
              event: z.string().max(100),
              created_at: z.iso.datetime({ offset: true }),
            }),
          )
          .max(500)
          .parse(
            await database(
              'audit_logs?select=id,request_id,event,created_at&order=created_at.desc&limit=500',
            ),
          );
    return json({
      events: events
        .filter((e) => allowed.has(e.request_id))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      demo: isDemo(),
    });
  } catch (error) {
    return apiError(error);
  }
}
