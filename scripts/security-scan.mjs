// Heuristic audit. Prints locations only, NEVER matching secret values or environment contents.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const patterns = [
  [
    'provider-key',
    /(?:sk-(?:proj-|or-v1-)?[A-Za-z0-9_-]{24,}|AIza[A-Za-z0-9_-]{30,}|gsk_[A-Za-z0-9]{24,}|(?:secret_|ntn_)[A-Za-z0-9]{25,})/g,
  ],
  ['jwt', /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g],
  ['github-token', /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/g],
  ['public-secret-variable', /NEXT_PUBLIC_[A-Z_]*(?:SERVICE_ROLE|API_KEY|SECRET|TOKEN)/g],
];
let findings = 0,
  files = 0;
function scan(text, location) {
  for (const [kind, pattern] of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      findings++;
      console.log(JSON.stringify({ location, kind }));
    }
  }
}
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next', '.vercel'].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(?:tsx?|mts|mjs|json|md|sql|ya?ml)$/.test(path) || entry.name.startsWith('.env')) {
      files++;
      scan(readFileSync(path, 'utf8'), path);
    }
  }
}
walk('.');
const commits = execFileSync('git', ['rev-list', '--all'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);
for (const commit of commits) {
  // git show's output stays in this process; only findings' paths are printed.
  const paths = execFileSync('git', ['ls-tree', '-r', '--name-only', commit], { encoding: 'utf8' })
    .trim()
    .split('\n');
  for (const path of paths.filter(
    (p) => /\.(tsx?|mts|mjs|json|md|sql|yml)$/.test(p) || p.startsWith('.env'),
  ))
    scan(
      execFileSync('git', ['show', `${commit}:${path}`], { encoding: 'utf8', maxBuffer: 10000000 }),
      `${commit.slice(0, 7)}:${path}`,
    );
}
console.log(
  JSON.stringify({
    files,
    commits: commits.length,
    findings,
    note: 'Heuristic scan; not proof of absence. Values never printed.',
  }),
);
if (findings) process.exitCode = 1;
