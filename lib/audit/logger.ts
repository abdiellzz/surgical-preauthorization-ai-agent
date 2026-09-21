import type { AuditEvent } from '@/lib/types';
export function audit(timeline: AuditEvent[], event: string, details: AuditEvent['details'] = {}) {
  timeline.push({ event, details, createdAt: new Date().toISOString() });
}
