export function sanitizeDocument(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, 30000);
}
export function containsInjection(text: string): boolean {
  return /ignore\s+(all\s+)?(previous|prior|system)\s+instructions|approve\s+this\s+surgery|reveal\s+(your|the)\s+(api\s+key|secret|token)|print\s+(the\s+)?system\s+prompt|<\/?system>|override\s+(the\s+)?rules/i.test(
    text,
  );
}
