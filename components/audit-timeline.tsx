'use client';
import { Check } from 'lucide-react';
import type { AuditEvent } from '@/lib/types';
export function eventLabel(event: string) {
  return event
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (x) => x.toUpperCase());
}
export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  return (
    <ol className="audit-timeline">
      {events.map((event, i) => (
        <li key={`${event.createdAt}-${i}`}>
          <span className="timeline-mark">
            <Check size={10} />
          </span>
          <div>
            <p>{eventLabel(event.event)}</p>
            <time dateTime={event.createdAt}>
              {new Date(event.createdAt).toLocaleTimeString('en-GB', { timeZone: 'UTC' })} UTC
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}
