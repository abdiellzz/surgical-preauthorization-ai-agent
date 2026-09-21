import 'server-only';
import type { AuditEvent, AuthorizationResult } from './types';
import { audit } from './audit/logger';
import { getCase, isDemo, persist } from './repository';
import { getAIProvider } from './ai/provider';
import { interpretDocuments } from './ai/interpret';
import { explanationSchema } from './ai/schemas';
import { determineAuthorizationDecision } from './decision/decision-engine';
import { runRules, waitingPeriod, missingDocuments } from './rules/engine';
import { saveAuthorizationResult } from './notion/requests';
export async function analyze(requestId: string): Promise<AuthorizationResult | null> {
  const started = performance.now();
  const timeline: AuditEvent[] = [];
  audit(timeline, 'REQUEST_RECEIVED');
  let data = await getCase(requestId);
  if (!data) return null;
  audit(timeline, 'PATIENT_DATA_RETRIEVED');
  audit(timeline, 'POLICY_RETRIEVED', { present: !!data.policy });
  let provider: ReturnType<typeof getAIProvider> = null;
  try {
    provider = isDemo() ? null : getAIProvider();
  } catch {
    data.issues = ['AI provider configuration is invalid.'];
  }
  data = await interpretDocuments(data, provider);
  if (data.request.unstructuredText || data.policy?.unstructuredText)
    audit(timeline, 'AI_EXTRACTION_COMPLETED', { issues: data.issues?.length ?? 0 });
  let rules = runRules(data);
  // The explanation API returns rule references only; natural-language claims are rendered from code.
  if (provider && (data.request.unstructuredText || data.policy?.unstructuredText)) {
    try {
      explanationSchema.parse(await provider.generateExplanation(rules));
    } catch {
      data.issues = [...(data.issues ?? []), 'AI explanation failed validation.'];
      rules = runRules(data);
    }
  }
  for (const factor of rules) audit(timeline, `${factor.code}_CHECKED`, { passed: factor.passed });
  const decision = determineAuthorizationDecision(rules);
  audit(timeline, 'DECISION_GENERATED', { decision });
  if (decision === 'HUMAN_REVIEW_REQUIRED') audit(timeline, 'HUMAN_REVIEW_REQUESTED');
  const reason = (decision === 'PRE_APPROVED' ? rules : rules.filter((r) => !r.passed))
    .map((r) => r.reason)
    .join(' ');
  const result: AuthorizationResult = {
    requestId,
    decision,
    confidence: rules.find((r) => r.code === 'DATA_COMPLETENESS')!.passed ? 1 : 0,
    coverage: {
      covered:
        rules.find((r) => r.code === 'COVERAGE')!.passed &&
        rules.find((r) => r.code === 'EXCLUSIONS')!.passed,
      percentage: data.policy?.coveragePercentage ?? null,
      deductible: data.policy?.deductible ?? null,
    },
    waitingPeriod: waitingPeriod(data),
    documents: data.request.documents,
    missingDocuments: missingDocuments(data),
    reason,
    requiresHumanReview: decision === 'HUMAN_REVIEW_REQUIRED',
    sources: [
      isDemo() ? 'Fictional demonstration dataset' : 'Notion structured records',
      data.request.id,
      data.patient.id,
      data.policy?.id ?? 'Policy missing',
      'Deterministic rules v1',
    ],
    createdAt: new Date().toISOString(),
    decisionFactors: rules,
    processingTimeMs: 0,
    timeline,
  };
  if (!isDemo() && process.env.NOTION_RESULTS_DATABASE_ID) {
    try {
      await saveAuthorizationResult(result);
      audit(timeline, 'NOTION_RESULT_SAVED');
    } catch {
      audit(timeline, 'NOTION_RESULT_SYNC_FAILED');
    }
  }
  result.processingTimeMs = performance.now() - started;
  // Duration ends at the persistence boundary; writing the measurement cannot be included in itself.
  audit(timeline, 'ANALYSIS_COMPLETED', { processingTimeMs: result.processingTimeMs });
  await persist(result);
  return result;
}
