import 'server-only';
import { z } from 'zod';
const richText = z.array(
  z.object({
    plain_text: z.string().optional(),
    text: z.object({ content: z.string() }).optional(),
  }),
);
export const notionPageSchema = z.object({
  id: z.string(),
  properties: z.record(
    z.string(),
    z.object({ title: richText.optional(), rich_text: richText.optional() }).passthrough(),
  ),
});
export type NotionPage = z.infer<typeof notionPageSchema>;
export async function notion(path: string, body?: unknown): Promise<unknown> {
  if (!process.env.NOTION_API_KEY) throw new Error('NOTION_CONFIGURATION');
  const response = await fetch(`https://api.notion.com/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': '2025-09-03',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error('NOTION_UNAVAILABLE');
  return response.json();
}
export async function dataSource(envName: string): Promise<string> {
  const databaseId = process.env[envName];
  if (!databaseId || !/^[a-f0-9-]{32,36}$/i.test(databaseId))
    throw new Error('NOTION_DATABASE_CONFIGURATION');
  const db = z
    .object({ data_sources: z.array(z.object({ id: z.string() })) })
    .parse(await notion(`databases/${databaseId}`));
  if (db.data_sources.length !== 1) throw new Error('NOTION_AMBIGUOUS_DATA_SOURCE');
  return db.data_sources[0].id;
}
export async function query(envName: string, filter?: unknown): Promise<NotionPage[]> {
  const source = await dataSource(envName);
  let cursor: string | null = null;
  const pages: NotionPage[] = [];
  do {
    const result = z
      .object({
        results: z.array(notionPageSchema),
        has_more: z.boolean(),
        next_cursor: z.string().nullable(),
      })
      .parse(
        await notion(`data_sources/${source}/query`, {
          page_size: 100,
          ...(filter ? { filter } : {}),
          ...(cursor ? { start_cursor: cursor } : {}),
        }),
      );
    pages.push(...result.results);
    cursor = result.has_more ? result.next_cursor : null;
    if (pages.length > 1000) throw new Error('NOTION_QUERY_LIMIT');
  } while (cursor);
  return pages;
}
export function payload(page: NotionPage): unknown {
  const chunks = page.properties.Payload?.rich_text;
  if (!chunks) throw new Error('NOTION_PAYLOAD_MISSING');
  return JSON.parse(chunks.map((t) => t.plain_text ?? t.text?.content ?? '').join(''));
}
export async function findById(env: string, id: string): Promise<unknown | null> {
  const pages = await query(env, { property: 'ID', title: { equals: id } });
  if (pages.length > 1) throw new Error('NOTION_DUPLICATE_ID');
  if (!pages.length) return null;
  const record = payload(pages[0]);
  if (z.object({ id: z.literal(id) }).safeParse(record).success === false)
    throw new Error('NOTION_ID_CONFLICT');
  return record;
}
