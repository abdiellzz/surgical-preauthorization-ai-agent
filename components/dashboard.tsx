'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ClipboardList,
  CheckCircle2,
  FileWarning,
  ShieldAlert,
  XCircle,
  Timer,
  Plus,
  Play,
  ArrowRight,
  RotateCw,
  Search,
} from 'lucide-react';
import { useWorkspace } from './workspace-context';
import { RequestTable } from './request-table';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  PageHeader,
  StatCard,
  StatusBadge,
  formatDate,
  formatTime,
} from './ui';
import type { AuthorizationResult, Decision } from '@/lib/types';
export function Dashboard({
  reviewOnly = false,
  requestsOnly = false,
}: {
  reviewOnly?: boolean;
  requestsOnly?: boolean;
}) {
  const { cases, results, loading, error, busy, reload, analyze, demo } = useWorkspace();
  const params = useSearchParams();
  const [demoOpen, setDemoOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState('REQ-001');
  const [last, setLast] = useState<AuthorizationResult | null>(null);
  const [queueSearch, setQueueSearch] = useState('');
  const values = Object.values(results);
  const count = (decision: Decision) => values.filter((r) => r.decision === decision).length;
  const percentage = (n: number) =>
    cases.length ? `${Math.round((n / cases.length) * 100)}% of total requests` : 'No requests yet';
  const average = values.length
    ? formatTime(values.reduce((n, r) => n + r.processingTimeMs, 0) / values.length)
    : '—';
  const queue = cases.filter(
    (c) =>
      results[c.id]?.requiresHumanReview &&
      `${c.id} ${c.patient}`.toLowerCase().includes(queueSearch.toLowerCase()),
  );
  async function run() {
    const result = await analyze(selected);
    if (result) setLast(result);
  }
  return (
    <>
      <PageHeader
        title={
          reviewOnly ? 'Human Review Queue' : requestsOnly ? 'Requests' : 'Authorization Overview'
        }
        description={
          reviewOnly
            ? 'Cases requiring manual administrative verification.'
            : requestsOnly
              ? 'Review and manage surgical pre-authorization requests.'
              : 'Monitor surgical pre-authorization requests and administrative decisions.'
        }
        actions={
          <>
            <button
              className="button secondary"
              onClick={() => void reload()}
              disabled={loading}
              aria-label="Refresh requests"
            >
              <RotateCw size={15} />
              <span className="refresh-label">Refresh</span>
            </button>
            {!reviewOnly && (
              <>
                <button className="button secondary" onClick={() => setNewOpen(true)}>
                  <Plus size={16} />
                  New Request
                </button>
                <button className="button" disabled={loading} onClick={() => setDemoOpen(true)}>
                  <Play size={15} />
                  {demo ? 'Run Demo' : 'Analyze Request'}
                </button>
              </>
            )}
          </>
        }
      />
      {!reviewOnly && !requestsOnly && (
        <div className="stats">
          <StatCard
            label="Total Requests"
            value={cases.length}
            note={`${cases.length - values.length} pending analysis`}
            icon={ClipboardList}
          />
          <StatCard
            label="Pre-Approved"
            value={count('PRE_APPROVED')}
            note={percentage(count('PRE_APPROVED'))}
            icon={CheckCircle2}
          />
          <StatCard
            label="Documents Required"
            value={count('DOCUMENTS_REQUIRED')}
            note="Awaiting documentation"
            icon={FileWarning}
          />
          <StatCard
            label="Human Review"
            value={count('HUMAN_REVIEW_REQUIRED')}
            note="Administrative verification"
            icon={ShieldAlert}
          />
          <StatCard
            label="Not Covered"
            value={count('NOT_COVERED')}
            note="Outside policy coverage"
            icon={XCircle}
          />
          <StatCard
            label="Avg. Processing Time"
            value={average}
            note="Measured analysis duration"
            icon={Timer}
          />
        </div>
      )}
      {demo && !reviewOnly && (
        <div className="workspace-notice">
          <span className="notice-label">DEMO</span>
          <p>Five fictional requests. Run a case to review the result and its supporting checks.</p>
          <button className="text-button" onClick={() => setDemoOpen(true)}>
            Select a case
            <ArrowRight size={14} />
          </button>
        </div>
      )}
      {error && <ErrorState message={error} retry={() => void reload()} />}
      {loading ? (
        <LoadingState />
      ) : reviewOnly ? (
        <section className="panel">
          <div className="panel-heading">
            <div className="section-title">
              <h2>Awaiting verification</h2>
              <span className="count">{queue.length}</span>
            </div>
            <span className="muted small-text">Administrative priority only</span>
          </div>
          <div className="filter-bar">
            <div className="table-search">
              <Search size={16} />
              <input
                aria-label="Search review queue"
                placeholder="Search request or patient"
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="table-scroll" tabIndex={0} aria-label="Review queue table">
            <table>
              <thead>
                <tr>
                  {['Request', 'Patient', 'Issue', 'Submitted', 'Priority', 'Action'].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queue.map((c) => (
                  <tr key={c.id}>
                    <td className="request-id">{c.id}</td>
                    <td>{c.patient}</td>
                    <td className="issue-cell">{results[c.id].reason}</td>
                    <td>{formatDate(c.submitted)}</td>
                    <td>
                      <span className="priority-badge">Needs verification</span>
                    </td>
                    <td>
                      <Link className="table-link" href={`/requests/${c.id}`}>
                        Review
                        <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!queue.length && (
            <EmptyState
              title="No requests awaiting review"
              description="Cases requiring clarification will appear here after analysis or an administrative referral."
            />
          )}
        </section>
      ) : (
        <RequestTable
          key={params.get('q') ?? ''}
          cases={cases}
          results={results}
          initialSearch={params.get('q') ?? ''}
        />
      )}
      <Modal
        title={demo ? 'Run a demo case' : 'Analyze a request'}
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
      >
        <p className="modal-description">
          Select a request. The backend will run every policy check and record the result.
        </p>
        <label className="form-label" htmlFor="demo-case">
          Request
        </label>
        <select
          id="demo-case"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setLast(null);
          }}
        >
          {cases.map((c, i) => (
            <option value={c.id} key={c.id}>
              {c.id} ·{' '}
              {demo
                ? [
                    'Pre-approved',
                    'Missing documents',
                    'Waiting period',
                    'Excluded procedure',
                    'Human review',
                  ][i]
                : c.procedure}
            </option>
          ))}
        </select>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {last && (
          <div className="demo-result" role="status">
            <StatusBadge decision={last.decision} />
            <p>Analysis completed in {formatTime(last.processingTimeMs)}.</p>
            <Link
              className="table-link"
              href={`/requests/${last.requestId}`}
              onClick={() => setDemoOpen(false)}
            >
              View Request
              <ArrowRight size={14} />
            </Link>
          </div>
        )}
        <div className="modal-actions">
          <button className="button secondary" onClick={() => setDemoOpen(false)}>
            Close
          </button>
          <button className="button" disabled={busy || !cases.length} onClick={() => void run()}>
            {busy ? 'Analyzing request…' : 'Analyze Request'}
          </button>
        </div>
      </Modal>
      <Modal title="New request" open={newOpen} onClose={() => setNewOpen(false)}>
        <p className="modal-description">
          {demo
            ? 'This demo uses five fictional requests. Request intake is managed through the connected Notion database in integrated mode.'
            : 'Create the fictional request in your connected Notion Requests database with Status set to Pending. Then refresh the request list.'}
        </p>
        <div className="intake-note">
          <ClipboardList size={22} />
          <div>
            <strong>Notion request intake</strong>
            <p>
              Patient, procedure, policy reference and required documents are validated before
              analysis.
            </p>
          </div>
        </div>
        <div className="modal-actions">
          <Link href="/integrations" className="button secondary" onClick={() => setNewOpen(false)}>
            View Integrations
          </Link>
          <button
            className="button"
            onClick={() => {
              setNewOpen(false);
              if (demo) setDemoOpen(true);
              else void reload();
            }}
          >
            {demo ? 'Choose Demo Request' : 'Refresh Requests'}
          </button>
        </div>
      </Modal>
    </>
  );
}
