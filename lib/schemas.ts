import { z } from 'zod';
const text = z.string().trim().min(1).max(500);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const patientSchema = z.object({
  id: text,
  name: text,
  dateOfBirth: date,
  insuranceCompany: text,
  policyNumber: text,
  policyStartDate: date,
});
export const documentSchema = z.object({
  id: text,
  type: text,
  name: text,
  url: z
    .string()
    .max(2000)
    .refine((v) => v === '' || /^https:\/\//.test(v)),
  status: z.enum(['PRESENT', 'MISSING', 'INVALID']),
});
export const requestSchema = z.object({
  id: text,
  patientId: text,
  hospital: text,
  doctor: text,
  specialty: text,
  procedureName: text,
  procedureCode: text,
  diagnosis: text,
  requestedDate: date,
  documents: z.array(documentSchema).max(100),
  createdAt: z.iso.datetime(),
  unstructuredText: z.string().max(30000).optional(),
});
export const policySchema = z.object({
  id: text,
  patientId: text,
  provider: text,
  plan: text,
  status: z.enum(['ACTIVE', 'INACTIVE', 'UNKNOWN']),
  startDate: date,
  endDate: date,
  waitingPeriodDays: z.number().int().min(0).max(36500),
  coveredProcedures: z.array(text).max(1000),
  excludedProcedures: z.array(text).max(1000),
  coveragePercentage: z.number().min(0).max(100),
  deductible: z.number().min(0),
  preAuthorizationRequired: z.boolean(),
  requiredDocuments: z.array(text).max(100),
  unstructuredText: z.string().max(30000).optional(),
});
export const analyzeSchema = z
  .object({ requestId: z.string().regex(/^REQ-[A-Za-z0-9-]{1,60}$/) })
  .strict();
