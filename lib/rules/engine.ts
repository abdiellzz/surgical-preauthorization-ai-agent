import type { CaseData, RuleResult } from '@/lib/types';
export function dateMs(value: unknown): number {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const time = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : NaN;
}
const rule = (passed: boolean, code: string, reason: string, evidence?: unknown): RuleResult => ({
  passed,
  code,
  reason,
  evidence,
});
export function checkDataCompleteness({
  patient,
  request,
  policy: p,
  issues = [],
}: CaseData): RuleResult {
  const problems = [...issues];
  if (!p) problems.push('Policy is missing.');
  if (p) {
    if (
      ![
        p.id,
        p.provider,
        p.plan,
        patient.id,
        patient.name,
        patient.policyNumber,
        request.id,
        request.hospital,
        request.doctor,
        request.procedureName,
        request.procedureCode,
      ].every((x) => typeof x === 'string' && x.trim())
    )
      problems.push('Required identity or procedure fields are missing.');
    if (
      ![
        p.startDate,
        p.endDate,
        request.requestedDate,
        patient.policyStartDate,
        patient.dateOfBirth,
      ].every((x) => Number.isFinite(dateMs(x)))
    )
      problems.push('Dates are missing or invalid.');
    if (dateMs(p.endDate) < dateMs(p.startDate)) problems.push('Policy dates conflict.');
    if (
      p.patientId !== patient.id ||
      request.patientId !== patient.id ||
      patient.policyNumber !== p.id ||
      patient.policyStartDate !== p.startDate ||
      patient.insuranceCompany !== p.provider
    )
      problems.push('Patient and policy records conflict.');
    if (
      !Number.isInteger(p.waitingPeriodDays) ||
      p.waitingPeriodDays < 0 ||
      !Number.isFinite(p.coveragePercentage) ||
      p.coveragePercentage < 0 ||
      p.coveragePercentage > 100 ||
      !Number.isFinite(p.deductible) ||
      p.deductible < 0 ||
      typeof p.preAuthorizationRequired !== 'boolean'
    )
      problems.push('Policy terms are incomplete or invalid.');
    if (
      ![p.coveredProcedures, p.excludedProcedures, p.requiredDocuments].every(
        (x) => Array.isArray(x) && x.every((v) => typeof v === 'string' && v.trim()),
      )
    )
      problems.push('Policy lists must be explicitly provided.');
    if (p.coveredProcedures?.some((x) => p.excludedProcedures?.includes(x)))
      problems.push('Procedure is both covered and excluded.');
    if (!Array.isArray(request.documents)) problems.push('Document inventory is missing.');
  }
  return rule(
    problems.length === 0,
    'DATA_COMPLETENESS',
    problems.length ? problems.join(' ') : 'Critical fields are complete and consistent.',
    problems,
  );
}
export function checkPolicyStatus({ policy: p, request }: CaseData) {
  const ok =
    !!p &&
    p.status === 'ACTIVE' &&
    dateMs(request.requestedDate) >= dateMs(p.startDate) &&
    dateMs(request.requestedDate) <= dateMs(p.endDate);
  return rule(
    ok,
    'POLICY_STATUS',
    ok
      ? 'Policy is active on the request date.'
      : 'Policy is inactive, outside its effective dates, or unknown.',
  );
}
export function checkCoverage({ policy: p, request }: CaseData) {
  const ok = p?.coveredProcedures?.includes(request.procedureCode) === true;
  return rule(
    ok,
    'COVERAGE',
    ok ? 'Exact procedure code is explicitly covered.' : 'Procedure code is not listed as covered.',
    { procedureCode: request.procedureCode },
  );
}
export function checkExclusions({ policy: p, request }: CaseData) {
  const excluded = p?.excludedProcedures?.includes(request.procedureCode) === true;
  return rule(
    !excluded && !!p && Array.isArray(p.excludedProcedures),
    'EXCLUSIONS',
    excluded ? 'Procedure code is explicitly excluded.' : 'No explicit exclusion found.',
  );
}
export function waitingPeriod(data: CaseData) {
  const required = data.policy?.waitingPeriodDays ?? null;
  const delta = (dateMs(data.request.requestedDate) - dateMs(data.policy?.startDate)) / 86400000;
  const elapsed = Number.isFinite(delta) ? delta : null;
  return {
    required,
    elapsed,
    remaining: required !== null && elapsed !== null ? Math.max(0, required - elapsed) : null,
  };
}
export function checkWaitingPeriod(data: CaseData) {
  const w = waitingPeriod(data);
  const ok = w.elapsed !== null && w.required !== null && w.elapsed >= w.required;
  return rule(
    ok,
    'WAITING_PERIOD',
    ok
      ? `${w.elapsed} days elapsed; ${w.required} required.`
      : `Waiting period is incomplete or cannot be calculated.`,
    w,
  );
}
export function missingDocuments({ policy, request }: CaseData) {
  return (policy?.requiredDocuments ?? []).filter(
    (type) => !request.documents?.some((d) => d.type === type && d.status === 'PRESENT'),
  );
}
export function checkRequiredDocuments(data: CaseData) {
  const missing = missingDocuments(data);
  const ok = !!data.policy && Array.isArray(data.policy.requiredDocuments) && missing.length === 0;
  return rule(
    ok,
    'DOCUMENTS',
    ok
      ? 'All required documents are present.'
      : `Missing or invalid: ${missing.join(', ') || 'document requirements'}.`,
    missing,
  );
}
export function runRules(data: CaseData): RuleResult[] {
  return [
    checkDataCompleteness,
    checkPolicyStatus,
    checkCoverage,
    checkExclusions,
    checkWaitingPeriod,
    checkRequiredDocuments,
  ].map((fn) => fn(data));
}
