'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AuthorizationResult } from '@/lib/types';
import type { RequestSummary } from '@/lib/presentation';
interface Workspace {
  cases: RequestSummary[];
  results: Record<string, AuthorizationResult>;
  loading: boolean;
  error: string;
  busy: boolean;
  reload: () => Promise<void>;
  analyze: (id: string) => Promise<AuthorizationResult | null>;
  update: (result: AuthorizationResult) => void;
  demo: boolean;
}
const Context = createContext<Workspace | null>(null);
export function WorkspaceProvider({
  demo,
  children,
}: {
  demo: boolean;
  children: React.ReactNode;
}) {
  const [cases, setCases] = useState<RequestSummary[]>([]);
  const [results, setResults] = useState<Record<string, AuthorizationResult>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/requests', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setCases(data.cases);
      setResults(
        Object.fromEntries(data.results.map((r: AuthorizationResult) => [r.requestId, r])),
      );
    } catch {
      setError('Requests could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const task = Promise.resolve().then(() => reload());
    return () => { void task; };
  }, [reload]);
  const update = useCallback(
    (result: AuthorizationResult) =>
      setResults((prev) => ({ ...prev, [result.requestId]: result })),
    [],
  );
  async function analyze(id: string) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id }),
      });
      if (!response.ok) throw new Error();
      const result: AuthorizationResult = await response.json();
      update(result);
      return result;
    } catch {
      setError('Analysis could not be completed.');
      return null;
    } finally {
      setBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{ cases, results, loading, error, busy, reload, analyze, update, demo }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error('Workspace provider required');
  return value;
}
