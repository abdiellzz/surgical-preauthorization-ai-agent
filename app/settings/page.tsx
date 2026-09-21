import { headers } from 'next/headers';
import { authorize } from '@/lib/security/session';
import { PageHeader, Field } from '@/components/ui';
export default async function Page() {
  const principal = await authorize(await headers());
  const demo = principal.role === 'demo';
  return (
    <>
      <PageHeader title="Settings" description="Workspace access and administrative preferences." />
      <section className="panel settings-panel">
        <h2>Workspace</h2>
        <dl className="field-grid">
          <Field label="Name" value="PreAuth Operations" />
          <Field
            label="Environment"
            value={demo ? 'Public fictional demo' : 'Protected administrative workspace'}
          />
          <Field label="Role" value={demo ? 'Demo analyst' : 'Administrator'} />
          <Field label="Data policy" value="Fictional data only" />
        </dl>
      </section>
      <section className="panel settings-panel">
        <h2>Access & sessions</h2>
        <dl className="field-grid">
          <Field
            label="Authentication"
            value={demo ? 'Not required for isolated demo fixtures' : 'Server-validated session'}
          />
          <Field
            label="Session lifetime"
            value={demo ? 'No authenticated session' : '1 hour; no automatic renewal'}
          />
          <Field
            label="Session storage"
            value={demo ? 'Not applicable' : 'HttpOnly cookie; hashed token in database'}
          />
          <Field
            label="Results storage"
            value={demo ? 'Temporary server memory' : 'Supabase PostgreSQL'}
          />
        </dl>
        <p>
          Workspace configuration is managed by the deployment administrator. Use the user menu to
          sign out of an authenticated session.
        </p>
      </section>
    </>
  );
}
