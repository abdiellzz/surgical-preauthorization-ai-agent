import type { CaseData } from '@/lib/types';
import type { AIProvider } from './provider';
import { extractionSchema } from './schemas';
import { containsInjection } from '@/lib/security/sanitize';
export async function interpretDocuments(
  data: CaseData,
  provider: AIProvider | null,
): Promise<CaseData> {
  const issues = [...(data.issues ?? [])];
  for (const kind of ['request', 'policy'] as const) {
    const record = data[kind];
    const text = record?.unstructuredText;
    if (!text?.trim()) continue;
    if (containsInjection(text)) {
      issues.push('Untrusted document contains instructions; administrative review required.');
      continue;
    }
    if (!provider) {
      issues.push('Document interpretation requires a configured AI provider.');
      continue;
    }
    try {
      const extracted = extractionSchema.parse(
        await (kind === 'request'
          ? provider.extractMedicalRequest(text)
          : provider.extractPolicyInformation(text)),
      );
      if (extracted.ambiguous || extracted.concerns.length || !extracted.facts.length)
        issues.push('Document interpretation is ambiguous or incomplete.');
      for (const fact of extracted.facts) {
        if (!text.includes(fact.quote) || !fact.quote.includes(String(fact.value)))
          issues.push('Extracted fact lacks verifiable source evidence.');
        const existing = (record as unknown as Record<string, unknown>)[fact.field];
        if (existing === undefined || String(existing) !== String(fact.value))
          issues.push(
            `Extracted ${fact.field} conflicts with or is absent from the structured record.`,
          );
      }
    } catch {
      issues.push('AI extraction failed validation or is unavailable.');
    }
  }
  // AI may flag uncertainty, but never fills missing contractual facts or overrides records.
  return { ...data, issues: [...new Set(issues)] };
}
