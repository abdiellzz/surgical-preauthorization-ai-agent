'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { AuthorizationResult, CaseData } from '@/lib/types';
import { Badge, labels } from './dashboard';
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <span className="field-value">{value ?? 'Unknown'}</span>
    </div>
  );
}
export function CaseDetail({
  data,
  initialResult,
}: {
  data: CaseData;
  initialResult: AuthorizationResult | null;
}) {
  const [result, setResult] = useState(initialResult);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: data.request.id }),
      });
      if (!response.ok) throw new Error();
      setResult(await response.json());
    } catch {
      setError('Unable to analyze this request. Please try again or send it for human review.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back" href="/dashboard">
        ← All requests
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{data.request.id} · CASE WORKSPACE</div>
          <h1>{data.request.procedureName}</h1>
          <p className="subtitle">Review the evidence behind every administrative check.</p>
        </div>
        <button disabled={busy} onClick={run}>
          {busy ? 'Analyzing…' : result ? 'Re-run analysis' : 'Analyze request'}
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {result ? (
        <section className="decision-card" aria-live="polite">
          <Badge decision={result.decision} />
          <h2>{labels[result.decision]}</h2>
          <p>
            <strong>Why?</strong> {result.reason}
          </p>
          <div className="processing">
            Analysis completed in {(result.processingTimeMs / 1000).toFixed(3)} seconds ·{' '}
            {result.decisionFactors.length} policy checks · Administrative result only
          </div>
        </section>
      ) : (
        <div className="info-strip">
          This request has not been analyzed. Run the analysis to calculate coverage, waiting
          period, and document requirements.
        </div>
      )}
      <div className="detail-grid">
        <section className="panel card-content">
          <h3>Patient</h3>
          <div className="field-grid">
            <Field label="Name" value={data.patient.name} />
            <Field label="Policy number" value={data.patient.policyNumber} />
            <Field label="Insurance" value={data.patient.insuranceCompany} />
            <Field label="Plan" value={data.policy?.plan} />
          </div>
        </section>
        <section className="panel card-content">
          <h3>Procedure</h3>
          <div className="field-grid">
            <Field label="Hospital" value={data.request.hospital} />
            <Field label="Doctor" value={data.request.doctor} />
            <Field label="Procedure code" value={data.request.procedureCode} />
            <Field label="Requested date" value={data.request.requestedDate} />
          </div>
        </section>
        <section className="panel card-content">
          <h3>Coverage</h3>
          <div className="field-grid">
            <Field
              label="Coverage check"
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
              label="Deductible (demo USD)"
              value={data.policy ? `$${data.policy.deductible.toFixed(2)}` : null}
            />
          </div>
        </section>
        <section className="panel card-content">
          <h3>Waiting period</h3>
          <div className="field-grid">
            <Field label="Policy start" value={data.policy?.startDate} />
            <Field
              label="Days required"
              value={result?.waitingPeriod.required ?? data.policy?.waitingPeriodDays}
            />
            <Field label="Days elapsed" value={result?.waitingPeriod.elapsed} />
            <Field label="Days remaining" value={result?.waitingPeriod.remaining} />
            <Field
              label="Status"
              value={
                !result
                  ? 'Awaiting analysis'
                  : result.waitingPeriod.remaining === null
                    ? 'Unknown'
                    : result.waitingPeriod.remaining === 0
                      ? 'Completed'
                      : 'Not completed'
              }
            />
          </div>
        </section>
        <section className="panel card-content">
          <h3>Document checklist</h3>
          {[
            ...new Set([
              ...(data.policy?.requiredDocuments ?? []),
              ...data.request.documents.map((d) => d.type),
            ]),
          ].map((type) => {
            const present = data.request.documents.some(
              (d) => d.type === type && d.status === 'PRESENT',
            );
            return (
              <div className="check" key={type}>
                <span>{type}</span>
                <span className={present ? 'pass' : 'fail'}>
                  {present ? '✓ Present' : '✗ Required'}
                </span>
              </div>
            );
          })}
          <p className="subtitle" style={{ marginTop: 18 }}>
            Presence is an administrative inventory check, not a clinical assessment of document
            content.
          </p>
        </section>
        <section className="panel card-content">
          <h3>Analysis timeline</h3>
          {result ? (
            <div className="timeline">
              {result.timeline.map((e, i) => (
                <div className="timeline-item" key={i}>
                  {e.event.replaceAll('_', ' ').toLowerCase()}
                  <time>
                    {new Date(e.createdAt).toLocaleTimeString('en-GB', { timeZone: 'UTC' })} UTC
                  </time>
                </div>
              ))}
            </div>
          ) : (
            <p className="subtitle">The timeline will be recorded when analysis begins.</p>
          )}
        </section>
        <section className="panel card-content span-two">
          <h3>Analysis & decision factors</h3>
          <p className="subtitle">
            Rules determine the result. AI is used only when unstructured text requires
            interpretation.
          </p>
          {result?.decisionFactors.map((r) => (
            <div className="rule" key={r.code}>
              <strong className={r.passed ? 'pass' : 'fail'}>
                {r.passed ? '✓' : '○'} {r.code.replaceAll('_', ' ')}
              </strong>
              <p>{r.reason}</p>
            </div>
          ))}
          {result && (
            <p className="subtitle" style={{ marginTop: 18 }}>
              Sources: {result.sources.join(' · ')}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
