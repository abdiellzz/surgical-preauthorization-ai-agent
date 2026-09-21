const windows = new Map<string, { count: number; expires: number }>();
export function allowRequest(key: string, now = Date.now()): boolean {
  for (const [id, value] of windows) if (value.expires <= now) windows.delete(id);
  let entry = windows.get(key);
  if (!entry) {
    if (windows.size >= 10000) return false;
    entry = { count: 0, expires: now + 60000 };
    windows.set(key, entry);
  }
  return ++entry.count <= 30;
}
