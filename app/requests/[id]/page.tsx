import { notFound } from 'next/navigation';
import { getCase, listResults } from '@/lib/repository';
import { CaseDetail } from '@/components/case-detail';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^REQ-[A-Za-z0-9-]{1,60}$/.test(id)) notFound();
  const data = await getCase(id);
  if (!data) notFound();
  const results = await listResults();
  return <CaseDetail data={data} initialResult={results.find((r) => r.requestId === id) ?? null} />;
}
