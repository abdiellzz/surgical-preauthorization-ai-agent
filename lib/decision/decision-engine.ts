import type { Decision, RuleResult } from '@/lib/types';
export function determineAuthorizationDecision(rules: RuleResult[]): Decision {
  const passed = (code: string) => rules.find(r => r.code === code)?.passed === true;
  if (!passed('DATA_COMPLETENESS') || !passed('POLICY_STATUS')) return 'HUMAN_REVIEW_REQUIRED';
  if (!passed('EXCLUSIONS') || !passed('COVERAGE')) return 'NOT_COVERED';
  if (!passed('WAITING_PERIOD')) return 'WAITING_PERIOD_NOT_COMPLETED';
  if (!passed('DOCUMENTS')) return 'DOCUMENTS_REQUIRED';
  return 'PRE_APPROVED';
}
