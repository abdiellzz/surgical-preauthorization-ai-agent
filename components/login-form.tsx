'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, LockKeyhole } from 'lucide-react';
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = new FormData(form).get('password');
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      form.reset();
      if (!response.ok) throw new Error();
      router.push('/dashboard');
    } catch {
      setError(
        'Sign in could not be completed. Check your credentials or contact the administrator.',
      );
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <Activity size={25} />
          PreAuth
        </div>
        <h1>Sign in to your workspace</h1>
        <p>Administrative access to connected requests.</p>
        <form onSubmit={submit}>
          <label htmlFor="password">Administrator password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={256}
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={busy}>
            <LockKeyhole size={16} />
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="small-text">Sessions expire after one hour. Fictional data only.</p>
        <Link href="/dashboard" className="table-link">
          Return to workspace
        </Link>
      </section>
    </main>
  );
}
