import type { AuthorizationResult, CaseData } from './types';
export function caseSummary(data: CaseData) {
  return {
    id: data.request.id,
    patient: data.patient.name.replace(' (fictitious)', ''),
    procedure: data.request.procedureName,
    hospital: data.request.hospital.replace(' · Demo', ''),
    insurance: data.patient.insuranceCompany.replace(' · Demo', ''),
    submitted: data.request.requestedDate,
  };
}
export type RequestSummary = ReturnType<typeof caseSummary>;
export function publicCase(data: CaseData) {
  return {
    patient: {
      id: data.patient.id,
      name: data.patient.name,
      policyNumber: data.patient.policyNumber,
      insuranceCompany: data.patient.insuranceCompany,
    },
    request: {
      id: data.request.id,
      hospital: data.request.hospital,
      doctor: data.request.doctor,
      procedureName: data.request.procedureName,
      procedureCode: data.request.procedureCode,
      requestedDate: data.request.requestedDate,
      documents: data.request.documents.map((d) => ({ id: d.id, type: d.type, status: d.status })),
    },
    policy: data.policy
      ? {
          plan: data.policy.plan,
          status: data.policy.status,
          startDate: data.policy.startDate,
          endDate: data.policy.endDate,
          waitingPeriodDays: data.policy.waitingPeriodDays,
          coveragePercentage: data.policy.coveragePercentage,
          deductible: data.policy.deductible,
          requiredDocuments: data.policy.requiredDocuments,
        }
      : null,
  };
}
export type PublicCase = ReturnType<typeof publicCase>;
export function publicResult(result: AuthorizationResult): AuthorizationResult {
  return {
    ...result,
    documents: result.documents.map((d) => ({
      id: d.id,
      type: d.type,
      status: d.status,
      name: d.type,
      url: '',
    })),
    decisionFactors: result.decisionFactors.map(({ passed, code, reason }) => ({
      passed,
      code,
      reason,
    })),
  };
}
