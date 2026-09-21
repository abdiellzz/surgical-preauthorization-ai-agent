import { listCases, listResults, isDemo } from '@/lib/repository';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const [cases, results] = await Promise.all([listCases(), listResults()]);
    return Response.json(
      {
        cases,
        results,
        demo: isDemo(),
        persistence: process.env.SUPABASE_URL ? 'Supabase' : 'Temporary demo memory',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json({ error: 'Unable to load requests. Please try again.' }, { status: 503 });
  }
}
