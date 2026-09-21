'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  FileText,
  Play,
  Send,
  ShieldCheck,
  Clock3,
} from 'lucide-react';
import type { AuthorizationResult } from '@/lib/types';
import type { PublicCase } from '@/lib/presentation';
import { useWorkspace } from './workspace-context';
import { AuditTimeline } from './audit-timeline';
import {
  DetailSection,
  ErrorState,
  Field,
  PageHeader,
  StatusBadge,
  formatDate,
  formatTime,
  labels,
} from './ui';
function DecisionPanel({ result }: { result: AuthorizationResult | null }) {
  return (
    <section className={`decision-panel ${result?.decision ?? 'PENDING'}`}>
      <div className="decision-title">
        <ShieldCheck size={23} />
        <div>
          <span className="overline">Authorization Result</span>
          <h2>{result ? labels[result.decision] : 'Pending analysis'}</h2>
        </div>
        {result && <StatusBadge decision={result.decision} />}
      </div>
      <p>
        {result?.reason ?? 'Analyze this request to evaluate the policy and required documents.'}
      </p>
      {result && (
        <>
          <h3>Decision factors</h3>
          <ul className="factor-list">
            {result.decisionFactors.map((f) => (
              <li key={f.code}>
                {f.passed ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}
                <div>
                  <strong>
                    {f.code
                      .replaceAll('_', ' ')
                      .toLowerCase()
                      .replace(/^./, (x) => x.toUpperCase())}
                  </strong>
                  <span>{f.reason}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="decision-time">
            <Clock3 size={14} />
            Analysis completed in {formatTime(result.processingTimeMs)}
          </div>
        </>
      )}
    </section>
  );
}
function DocumentChecklist({
  data,
  requestDocuments,
  busy,
}: {
  data: PublicCase;
  requestDocuments: () => void;
  busy: boolean;
}) {
  const types = [
    ...new Set([
      ...(data.policy?.requiredDocuments ?? []),
      ...data.request.documents.map((d) => d.type),
    ]),
  ];
  return (
    <div className="document-list">
      {types.map((type) => {
        const present = data.request.documents.some(
          (d) => d.type === type && d.status === 'PRESENT',
        );
        const required = data.policy?.requiredDocuments.includes(type);
        return (
          <div className="document-row" key={type}>
            <FileText size={19} />
            <div className="document-name">
              <strong>{type}</strong>
              <span>
                {present
                  ? 'Document on file'
                  : required
                    ? 'Required document missing'
                    : 'Not available'}
              </span>
            </div>
            <span className={`document-status ${present ? 'available' : 'missing'}`}>
              {present ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}{' '}
              {present ? 'Available' : 'Missing'}
            </span>
            {!present && required && (
              <button className="text-button" disabled={busy} onClick={requestDocuments}>
                Request Document
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
export function CaseDetail({
  data,
  initialResult,
}: {
  data: PublicCase;
  initialResult: AuthorizationResult | null;
}) {
  const workspace = useWorkspace();
  const [result, setResult] = useState(initialResult);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const busy = actionBusy || workspace.busy;
  async function analyze() {
    setError('');
    setNotice('');
    const next = await workspace.analyze(data.request.id);
    if (next) setResult(next);
    else setError('Analysis could not be completed.');
  }
  async function action(action: 'SEND_TO_REVIEW' | 'REQUEST_DOCUMENTS') {
    setActionBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/requests/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: data.request.id, action }),
      });
      if (!response.ok) throw new Error();
      const body = await response.json();
      setResult(body.result);
      workspace.update(body.result);
      setNotice(body.message);
    } catch {
      setError('The administrative action could not be recorded.');
    } finally {
      setActionBusy(false);
    }
  }
  const required = result?.waitingPeriod.required ?? data.policy?.waitingPeriodDays;
  const elapsed = result?.waitingPeriod.elapsed;
  const progress =
    required !== undefined && required !== null && elapsed !== undefined && elapsed !== null
      ? required === 0
        ? 100
        : Math.min(100, Math.max(0, (elapsed / required) * 100))
      : 0;
  const completed = result?.waitingPeriod.remaining === 0;
  return (
    <>
      <Link className="back-link" href="/requests">
        <ArrowLeft size={15} />
        Back to Requests
      </Link>
      <PageHeader
        title={data.request.id}
        description={data.request.procedureName}
        actions={
          <>
            <button
              className="button secondary"
              disabled={busy || result?.requiresHumanReview}
              onClick={() => void action('SEND_TO_REVIEW')}
            >
              <Send size={15} />
              Send to Review
            </button>
            <button className="button" disabled={busy} onClick={() => void analyze()}>
              <Play size={15} />
              {busy ? 'Analyzing request…' : result ? 'Retry Analysis' : 'Analyze Request'}
            </button>
          </>
        }
      />
      {error && <ErrorState message={error} retry={() => void analyze()} />}{' '}
      {notice && (
        <div className="notice-success" role="status">
          <CheckCircle2 size={17} />
          {notice}
        </div>
      )}
      <div className="case-layout">
        <div className="case-main">
          <DecisionPanel result={result} />
          <div className="panel detail-panel">
            <DetailSection title="Patient Information">
              <dl className="field-grid">
                <Field label="Patient" value={data.patient.name} />
                <Field label="Insurance" value={data.patient.insuranceCompany} />
                <Field label="Policy number" value={data.patient.policyNumber} />
                <Field label="Plan" value={data.policy?.plan} />
              </dl>
            </DetailSection>
            <DetailSection title="Procedure">
              <dl className="field-grid">
                <Field label="Procedure" value={data.request.procedureName} />
                <Field label="Procedure code" value={data.request.procedureCode} />
                <Field label="Hospital" value={data.request.hospital} />
                <Field label="Doctor" value={data.request.doctor} />
              </dl>
            </DetailSection>
            <DetailSection title="Coverage Analysis">
              <dl className="field-grid">
                <Field
                  label="Policy coverage"
                  value={
                    result
                      ? result.coverage.covered
                        ? 'Covered'
                        : 'Not confirmed / excluded'
                      : 'Awaiting analysis'
                  }
                />
                <Field label="Policy status" value={data.policy?.status} />
                <Field
                  label="Coverage percentage"
                  value={data.policy ? `${data.policy.coveragePercentage}%` : null}
                />
                <Field
                  label="Deductible · demo USD"
                  value={data.policy ? `$${data.policy.deductible.toFixed(2)}` : null}
                />
              </dl>
              <div className="waiting-period">
                <div className="section-heading">
                  <h3>Waiting period</h3>
                  <span className={`document-status ${completed ? 'available' : 'missing'}`}>
                    {result
                      ? completed
                        ? 'Completed'
                        : 'Not completed / unknown'
                      : 'Awaiting analysis'}
                  </span>
                </div>
                <dl className="waiting-fields">
                  <Field
                    label="Policy started"
                    value={data.policy ? formatDate(data.policy.startDate) : null}
                  />
                  <Field
                    label="Waiting period"
                    value={required != null ? `${required} days` : null}
                  />
                  <Field label="Elapsed" value={elapsed != null ? `${elapsed} days` : null} />
                  <Field
                    label="Remaining"
                    value={
                      result?.waitingPeriod.remaining != null
                        ? `${result.waitingPeriod.remaining} days`
                        : null
                    }
                  />
                </dl>
                <progress aria-label="Waiting period progress" max={100} value={progress} />
              </div>
            </DetailSection>
            <DetailSection
              title="Documents"
              action={<span className="muted small-text">Administrative inventory</span>}
            >
              <DocumentChecklist
                data={data}
                busy={busy}
                requestDocuments={() => void action('REQUEST_DOCUMENTS')}
              />
              <p className="section-footnote">
                Document presence does not confirm clinical adequacy or authenticity.
              </p>
            </DetailSection>
          </div>
        </div>
        <aside className="case-aside">
          <section className="panel summary-panel">
            <h2>Request Summary</h2>
            <dl className="summary-fields">
              <Field label="Status" value={<StatusBadge decision={result?.decision} />} />
              <Field label="Processing time" value={formatTime(result?.processingTimeMs)} />
              <Field label="Policy" value={data.patient.policyNumber} />
              <Field label="Submitted" value={formatDate(data.request.requestedDate)} />
              <Field
                label="Review"
                value={
                  result?.requiresHumanReview ? 'Requires manual review' : 'No review requested'
                }
              />
            </dl>
          </section>
          <section className="panel summary-panel">
            <h2>Audit Timeline</h2>
            {result ? (
              <AuditTimeline events={result.timeline} />
            ) : (
              <p className="muted">Events appear after analysis.</p>
            )}
            <Link href="/audit" className="table-link">
              View Audit Logs
              <ArrowRight size={14} />
            </Link>
          </section>
          {result && (
            <section className="source-note">
              <h3>Source references</h3>
              {result.sources.map((s) => (
                <p key={s}>{s}</p>
              ))}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
