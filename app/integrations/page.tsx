import { headers } from 'next/headers';
import { authorize } from '@/lib/security/session';
import { isDemo } from '@/lib/repository';
import { PageHeader } from '@/components/ui';
import { Database, FileText, Network, ShieldCheck } from 'lucide-react';
export default async function Page() {
  await authorize(await headers());
  const demo = isDemo();
  const integrations = [
    {
      name: 'Notion',
      description: 'Patient, policy and request records.',
      icon: FileText,
      configured: !!process.env.NOTION_API_KEY && !!process.env.NOTION_REQUESTS_DATABASE_ID,
    },
    {
      name: 'Supabase',
      description: 'Authorization results, audit events and sessions.',
      icon: Database,
      configured: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    {
      name: 'AI provider',
      description: 'Optional extraction from unstructured documents.',
      icon: Network,
      configured:
        !!process.env.AI_PROVIDER && process.env.AI_PROVIDER !== 'none' && !!process.env.AI_MODEL,
    },
  ];
  return (
    <>
      <PageHeader
        title="Integrations"
        description="Data sources and services used by this workspace."
      />
      <div className="workspace-notice">
        <ShieldCheck size={18} />
        <p>
          {demo
            ? 'Demo mode is isolated. External services are not accessed, even if credentials exist.'
            : 'Credentials are managed on the server. Configuration does not confirm service availability.'}
        </p>
      </div>
      <section className="panel">
        {integrations.map(({ name, description, icon: Icon, configured }) => (
          <div className="integration-row" key={name}>
            <span className="integration-icon">
              <Icon size={23} />
            </span>
            <div>
              <h2>{name}</h2>
              <p>{description}</p>
            </div>
            <span className="status-badge PENDING">
              {demo
                ? 'Not used in demo'
                : configured
                  ? 'Configured · not verified'
                  : 'Not configured'}
            </span>
          </div>
        ))}
      </section>
      <section className="panel settings-panel">
        <h2>Connection management</h2>
        <p>
          Add credentials in your deployment environment and apply both Supabase migrations before
          enabling Notion mode. Integration secrets, database IDs and provider configuration are
          never displayed here.
        </p>
        <p>
          New requests enter through the connected Notion Requests database. Use fictional data
          only.
        </p>
      </section>
    </>
  );
}
