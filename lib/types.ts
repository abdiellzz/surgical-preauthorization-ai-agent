export type Decision =
  | 'PRE_APPROVED'
  | 'DOCUMENTS_REQUIRED'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'NOT_COVERED'
  | 'WAITING_PERIOD_NOT_COMPLETED';
export interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  insuranceCompany: string;
  policyNumber: string;
  policyStartDate: string;
}
export interface Document {
  id: string;
  type: string;
  name: string;
  url: string;
  status: 'PRESENT' | 'MISSING' | 'INVALID';
}
export interface SurgicalRequest {
  id: string;
  patientId: string;
  hospital: string;
  doctor: string;
  specialty: string;
  procedureName: string;
  procedureCode: string;
  diagnosis: string;
  requestedDate: string;
  documents: Document[];
  createdAt: string;
  unstructuredText?: string;
}
export interface Policy {
  id: string;
  patientId: string;
  provider: string;
  plan: string;
  status: 'ACTIVE' | 'INACTIVE' | 'UNKNOWN';
  startDate: string;
  endDate: string;
  waitingPeriodDays: number;
  coveredProcedures: string[];
  excludedProcedures: string[];
  coveragePercentage: number;
  deductible: number;
  preAuthorizationRequired: boolean;
  requiredDocuments: string[];
  unstructuredText?: string;
}
export interface CaseData {
  patient: Patient;
  request: SurgicalRequest;
  policy: Policy | null;
  issues?: string[];
}
export interface RuleResult {
  passed: boolean;
  code: string;
  reason: string;
  evidence?: unknown;
}
export interface AuditEvent {
  event: string;
  createdAt: string;
  details: Record<string, string | number | boolean>;
}
export interface AuthorizationResult {
  requestId: string;
  decision: Decision;
  confidence: number;
  coverage: { covered: boolean; percentage: number | null; deductible: number | null };
  waitingPeriod: { required: number | null; elapsed: number | null; remaining: number | null };
  documents: Document[];
  missingDocuments: string[];
  reason: string;
  requiresHumanReview: boolean;
  sources: string[];
  createdAt: string;
  decisionFactors: RuleResult[];
  processingTimeMs: number;
  timeline: AuditEvent[];
}
