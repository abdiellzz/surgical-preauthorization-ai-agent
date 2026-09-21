// Run with Node >=24: npm run seed:notion. Only writes the five fictional fixtures.
import { demoCases } from '../data/demo/cases.ts';
const token = process.env.NOTION_API_KEY;
if (!token) throw new Error('Set NOTION_API_KEY in your shell. Never commit it.');
async function api(path, method = 'GET', body) {
  const response = await fetch(`https://api.notion.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2025-09-03',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`Notion returned HTTP ${response.status}`);
  return response.json();
}
for (const [entity, envName] of [
  ['patient', 'NOTION_PATIENTS_DATABASE_ID'],
  ['policy', 'NOTION_POLICIES_DATABASE_ID'],
  ['request', 'NOTION_REQUESTS_DATABASE_ID'],
]) {
  const id = process.env[envName];
  if (!id) throw new Error(`Missing ${envName}`);
  const db = await api(`databases/${id}`);
  if (db.data_sources.length !== 1) throw new Error('Use one data source per database.');
  const source = db.data_sources[0].id;
  for (const fixture of demoCases) {
    const record = fixture[entity];
    const existing = await api(`data_sources/${source}/query`, 'POST', {
      filter: { property: 'ID', title: { equals: record.id } },
    });
    if (existing.results.length) {
      console.log(`Skipped existing ${record.id}`);
      continue;
    }
    const chunks = JSON.stringify(record).match(/[\s\S]{1,1800}/g) ?? [];
    await api('pages', 'POST', {
      parent: { type: 'data_source_id', data_source_id: source },
      properties: {
        ID: { title: [{ text: { content: record.id } }] },
        Payload: { rich_text: chunks.map((content) => ({ text: { content } })) },
        ...(entity === 'request' ? { Status: { select: { name: 'Pending' } } } : {}),
      },
    });
    console.log(`Created fictional ${record.id}`);
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}
