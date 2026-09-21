'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AuthorizationResult, CaseData, Decision } from '@/lib/types';
export const labels: Record<Decision, string> = {
  PRE_APPROVED: 'Pre-approved',
  DOCUMENTS_REQUIRED: 'Documents required',
  HUMAN_REVIEW_REQUIRED: 'Human review',
  NOT_COVERED: 'Not covered',
  WAITING_PERIOD_NOT_COMPLETED: 'Waiting period',
};
export function Badge({ decision }: { decision?: Decision }) {
  return (
    <span className={`badge ${decision ?? ''}`}>
      {decision ? labels[decision] : 'Pending analysis'}
    </span>
  );
}
export function Dashboard({ reviewOnly = false }: { reviewOnly?: boolean }) {
  const [cases, setCases] = useState<CaseData[]>([]);
  const [results, setResults] = useState<Record<string, AuthorizationResult>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [insurance, setInsurance] = useState('');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('REQ-001');
  const [demoOpen, setDemoOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(true);
  const [persistence, setPersistence] = useState('');
  const [lastRun, setLastRun] = useState<AuthorizationResult | null>(null);
  useEffect(() => {
    let active = true;
    fetch('/api/requests')
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        if (active) {
          setCases(data.cases);
          setResults(
            Object.fromEntries(data.results.map((r: AuthorizationResult) => [r.requestId, r])),
          );
          setDemo(data.demo);
          setPersistence(data.persistence);
        }
      })
      .catch(() => {
        if (active) setError('Unable to load requests. Please refresh and try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function run(id: string) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id }),
      });
      if (!response.ok) throw new Error();
      const result: AuthorizationResult = await response.json();
      setResults((prev) => ({ ...prev, [id]: result }));
      setLastRun(result);
    } catch {
      setError('Unable to analyze this request. Please try again or send it for human review.');
    } finally {
      setBusy(false);
    }
  }
  const values = Object.values(results);
  const count = (decision: Decision) => values.filter((r) => r.decision === decision).length;
  const average = values.length
    ? (values.reduce((n, r) => n + r.processingTimeMs, 0) / values.length / 1000).toFixed(3) + 's'
    : '—';
  const filtered = cases.filter(
    (c) =>
      (!reviewOnly || results[c.request.id]?.requiresHumanReview) &&
      (!status || (results[c.request.id]?.decision ?? 'PENDING') === status) &&
      (!insurance || c.patient.insuranceCompany === insurance) &&
      (!date || c.request.requestedDate === date) &&
      `${c.request.id} ${c.patient.name} ${c.request.procedureName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SURGICAL PRE-AUTHORIZATION</div>
          <h1>{reviewOnly ? 'Human review queue' : 'Authorization overview'}</h1>
          <p className="subtitle">
            {reviewOnly
              ? 'Resolve uncertainty with a clear view of the source evidence.'
              : 'A clearer path from request to administrative decision.'}
          </p>
        </div>
        {!reviewOnly && (
          <button disabled={loading} onClick={() => setDemoOpen(!demoOpen)}>
            ▷ {demo ? 'Run Demo Case' : 'Analyze request'}
          </button>
        )}
      </div>
      {!reviewOnly && (
        <div className="stats">
          {[
            ['Total requests', cases.length, 'In this workspace'],
            ['Pre-approved', count('PRE_APPROVED'), 'All requirements met'],
            ['Documents required', count('DOCUMENTS_REQUIRED'), 'Awaiting documentation'],
            ['Human review', count('HUMAN_REVIEW_REQUIRED'), 'Needs clarification'],
            ['Not covered', count('NOT_COVERED'), 'Policy coverage check'],
            ['Avg. processing time', average, 'Measured server analysis'],
          ].map(([label, value, note]) => (
            <div className="stat" key={label}>
              <div className="stat-label">{label}</div>
              <div className="stat-value">{value}</div>
              <div className="stat-note">{note}</div>
            </div>
          ))}
        </div>
      )}
      <div className="info-strip">
        <span>◇</span>
        <div>
          <strong>Every decision has a paper trail.</strong>
          <br />
          Deterministic policy checks, source references, and a timestamped audit timeline.{' '}
          {demo
            ? 'Five fictional cases. No API keys needed.'
            : 'Connected to Notion. Fictional records only.'}
        </div>
      </div>
      {demoOpen && (
        <section className="panel demo-panel">
          <h2 style={{ marginBottom: 15 }}>Choose a demonstration</h2>
          <div className="demo-controls">
            <select
              aria-label="Demo case"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {cases.map((c, i) => (
                <option value={c.request.id} key={c.request.id}>
                  Case {i + 1} —{' '}
                  {demo
                    ? [
                        'Pre-approved',
                        'Missing documents',
                        'Waiting period',
                        'Excluded procedure',
                        'Human review',
                      ][i]
                    : c.request.procedureName}
                </option>
              ))}
            </select>
            <button disabled={busy} onClick={() => run(selected)}>
              {busy ? 'Analyzing…' : 'Run analysis →'}
            </button>
          </div>
          {lastRun && (
            <p className="subtitle" role="status" style={{ marginTop: 15 }}>
              <Badge decision={lastRun.decision} /> Analysis completed in{' '}
              {(lastRun.processingTimeMs / 1000).toFixed(3)} seconds.{' '}
              <Link className="table-link" href={`/requests/${lastRun.requestId}`}>
                Open case →
              </Link>
            </p>
          )}
        </section>
      )}
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>
            {reviewOnly ? 'Requests requiring clarification' : 'Surgical requests'}{' '}
            <span className="count">{filtered.length}</span>
          </h2>
          <span className="subtitle">{demo ? 'Synthetic dataset' : 'Notion workspace'}</span>
        </div>
        <div className="filters">
          <input
            type="search"
            aria-label="Search requests"
            placeholder="Search request, patient or procedure…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending analysis</option>
            {Object.entries(labels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by insurance"
            value={insurance}
            onChange={(e) => setInsurance(e.target.value)}
          >
            <option value="">All insurers</option>
            {[...new Set(cases.map((c) => c.patient.insuranceCompany))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <input
            type="date"
            aria-label="Filter by date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {(search || status || insurance || date) && (
            <button
              className="secondary"
              onClick={() => {
                setSearch('');
                setStatus('');
                setInsurance('');
                setDate('');
              }}
            >
              Clear
            </button>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  'Request ID',
                  'Patient / Procedure',
                  'Hospital / Insurance',
                  'Requested',
                  'Status',
                  'Action',
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.request.id}>
                  <td className="request-id">{c.request.id}</td>
                  <td>
                    {c.patient.name.replace(' (fictitious)', '')}
                    <small>{c.request.procedureName}</small>
                  </td>
                  <td>
                    {c.request.hospital.replace(' · Demo', '')}
                    <small>{c.patient.insuranceCompany.replace(' · Demo', '')}</small>
                  </td>
                  <td>{c.request.requestedDate}</td>
                  <td>
                    <Badge decision={results[c.request.id]?.decision} />
                  </td>
                  <td>
                    <Link className="table-link" href={`/requests/${c.request.id}`}>
                      View case ↗
                    </Link>
                    {!results[c.request.id] && !reviewOnly && (
                      <button
                        className="secondary"
                        disabled={busy}
                        style={{ marginLeft: 10, padding: '6px 8px', fontSize: 10 }}
                        onClick={() => run(c.request.id)}
                      >
                        Analyze
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(loading || !filtered.length) && (
          <div className="empty">
            {loading
              ? 'Loading requests…'
              : reviewOnly
                ? 'No analyzed cases need review. Run Case 5 from the overview to demonstrate this flow.'
                : 'No matching requests.'}
          </div>
        )}
        <div className="section-note">
          {persistence || 'Connecting…'} · Results appear only after running the analysis.
          {demo && ' Temporary results may reset when the server restarts.'}
        </div>
      </section>
    </>
  );
}
