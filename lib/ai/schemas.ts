import { z } from 'zod';
export const extractionSchema = z
  .object({
    facts: z
      .array(
        z
          .object({
            field: z.enum([
              'procedureCode',
              'status',
              'startDate',
              'endDate',
              'waitingPeriodDays',
              'coveragePercentage',
              'deductible',
            ]),
            value: z.union([z.string().max(500), z.number()]),
            quote: z.string().min(1).max(1000),
          })
          .strict(),
      )
      .max(30),
    ambiguous: z.boolean(),
    concerns: z.array(z.string().max(300)).max(10),
  })
  .strict();
export type Extraction = z.infer<typeof extractionSchema>;
export const explanationSchema = z
  .object({
    factorCodes: z
      .array(
        z.enum([
          'DATA_COMPLETENESS',
          'POLICY_STATUS',
          'COVERAGE',
          'EXCLUSIONS',
          'WAITING_PERIOD',
          'DOCUMENTS',
        ]),
      )
      .min(1)
      .max(6),
  })
  .strict();
export function parseExtraction(content: string): Extraction {
  return extractionSchema.parse(JSON.parse(content));
}
