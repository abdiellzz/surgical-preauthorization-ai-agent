'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RotateCw, Search } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState, PageHeader, formatDate } from './ui';
import { eventLabel } from './audit-timeline';
export function AuditLog() {
  const [events, setEvents] = useState<
    { id: string; request_id: string; event: string; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [demo, setDemo] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/audit');
      if (!response.ok) throw new Error();
      const data = await response.json();
      setEvents(data.events);
      setDemo(data.demo);
    } catch {
      setError('Audit events could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const task = Promise.resolve().then(() => load());
    return () => { void task; };
  }, [load]);
  const filtered = events.filter((e) =>
    `${e.request_id} ${e.event}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Timestamped administrative events and decision history."
        actions={
          <button className="button secondary" onClick={() => void load()}>
            <RotateCw size={15} />
            Refresh
          </button>
        }
      />
      {error && <ErrorState message={error} retry={() => void load()} />}
      <section className="panel">
        <div className="panel-heading">
          <h2>Activity</h2>
          <span className="muted small-text">
            {demo ? 'Latest demo analysis per request' : 'Latest 500 workspace events'}
          </span>
        </div>
        <div className="filter-bar">
          <div className="table-search">
            <Search size={16} />
            <input
              aria-label="Search audit events"
              placeholder="Search request or event"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {loading ? (
          <LoadingState />
        ) : !filtered.length ? (
          <EmptyState
            title="No audit events found"
            description="Run an analysis or adjust your search."
          />
        ) : (
          <div className="table-scroll" tabIndex={0} aria-label="Audit event table">
            <table>
              <thead>
                <tr>
                  <th>Timestamp (UTC)</th>
                  <th>Request</th>
                  <th>Event</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <time dateTime={e.created_at}>
                        {formatDate(e.created_at)}{' '}
                        <span className="muted">
                          {new Date(e.created_at).toLocaleTimeString('en-GB', { timeZone: 'UTC' })}
                        </span>
                      </time>
                    </td>
                    <td>
                      <Link className="request-id" href={`/requests/${e.request_id}`}>
                        {e.request_id}
                      </Link>
                    </td>
                    <td>{eventLabel(e.event)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
