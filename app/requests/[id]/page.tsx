import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getCase, listResults } from '@/lib/repository';
import { authorize } from '@/lib/security/session';
import { publicCase, publicResult } from '@/lib/presentation';
import { CaseDetail } from '@/components/case-detail';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await authorize(await headers());
  const { id } = await params;
  if (!/^REQ-[A-Za-z0-9-]{1,60}$/.test(id)) notFound();
  const data = await getCase(id);
  if (!data) notFound();
  const result = (await listResults()).find((r) => r.requestId === id);
  return (
    <CaseDetail data={publicCase(data)} initialResult={result ? publicResult(result) : null} />
  );
}
