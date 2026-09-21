import type { CaseData, Decision } from '@/lib/types';
export const expectedDecisions: Decision[] = ['PRE_APPROVED', 'DOCUMENTS_REQUIRED', 'WAITING_PERIOD_NOT_COMPLETED', 'NOT_COVERED', 'HUMAN_REVIEW_REQUIRED'];
const procedures = ['Knee Arthroscopy', 'Appendectomy', 'Elective Bariatric Surgery', 'Cosmetic Rhinoplasty', 'Shoulder Arthroscopy'];
export const demoCases: CaseData[] = procedures.map((procedureName, i) => {
  const n = String(i + 1).padStart(3, '0');
  const startDate = i === 2 ? '2026-08-01' : '2026-01-01';
  const code = `DEMO-${n}`;
  return {
    patient: { id: `PAT-${n}`, name: ['Elena Rivera', 'Mateo Torres', 'Sofía Méndez', 'Lucas Vega', 'Isabel Cruz'][i] + ' (fictitious)', dateOfBirth: '1988-04-12', insuranceCompany: i % 2 ? 'Isthmus Assurance · Demo' : 'Pacific Health · Demo', policyNumber: `POL-${n}`, policyStartDate: startDate },
    request: { id: `REQ-${n}`, patientId: `PAT-${n}`, hospital: i % 2 ? 'Central Hospital · Demo' : 'Pacific Medical Center · Demo', doctor: 'Dr. Alex Moreno (fictitious)', specialty: 'Surgery', procedureName, procedureCode: code, diagnosis: 'Synthetic administrative demonstration only', requestedDate: '2026-09-20', createdAt: '2026-09-20T09:00:00Z', documents: ['Medical Report', 'Surgical Order', 'Pre-operative Laboratory'].map((type, d) => ({ id: `DOC-${n}-${d}`, type, name: type, url: '', status: i === 1 && d === 2 ? 'MISSING' : 'PRESENT' })) },
    policy: { id: `POL-${n}`, patientId: `PAT-${n}`, provider: i % 2 ? 'Isthmus Assurance · Demo' : 'Pacific Health · Demo', plan: 'Surgical Care Demo', status: 'ACTIVE', startDate, endDate: '2026-12-31', waitingPeriodDays: 180, coveredProcedures: i === 3 ? [] : [code], excludedProcedures: i >= 3 ? [code] : [], coveragePercentage: 80, deductible: 250, preAuthorizationRequired: true, requiredDocuments: ['Medical Report', 'Surgical Order', 'Pre-operative Laboratory'] },
  };
});
