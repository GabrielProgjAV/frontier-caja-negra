// Validates experimentos.jsonl against the README format. Read-only: it reports, never edits the log.
// CLI: node probe/validate-log.ts [file]   (exit 1 if any problem)
import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'experimentos.jsonl';
const text = readFileSync(file, 'utf8');
const problems: string[] = [];
const bad = (n: number, msg: string) => problems.push(`line ${n}: ${msg}`);

const lines = text.split('\n');
if (lines.at(-1) === '') lines.pop();
else problems.push('file does not end with a newline (last line may be truncated)');

const seen = new Set<unknown>();
let prev = 0;
lines.forEach((raw, i) => {
  const n = i + 1;
  let l: Record<string, unknown>;
  try { l = JSON.parse(raw); } catch { return bad(n, `invalid or truncated JSON: ${raw.slice(0, 80)}`); }
  if (typeof l !== 'object' || l === null || Array.isArray(l)) return bad(n, 'not a JSON object');
  for (const k of ['id', 'seq', 'x_req', 'hipotesis', 'request', 'status', 'response']) if (!(k in l)) bad(n, `missing field "${k}"`);
  if (!Number.isInteger(l.id)) bad(n, `id is not an integer: ${JSON.stringify(l.id)}`);
  else {
    if (seen.has(l.id)) bad(n, `duplicate id ${l.id}`);
    if (l.id !== prev + 1) bad(n, `id ${l.id} is not consecutive (previous ${prev})`);
    seen.add(l.id);
    prev = l.id as number;
  }
  if (typeof l.seq !== 'string' || !l.seq) bad(n, 'seq is not a non-empty string');
  if (typeof l.hipotesis !== 'string' || !l.hipotesis) bad(n, 'hipotesis is not a non-empty string');
  if (!Number.isInteger(l.status)) bad(n, `status is not an integer: ${JSON.stringify(l.status)}`);
  if ('conclusion' in l && typeof l.conclusion !== 'string') bad(n, 'conclusion is not a string');
});

console.log(`${file}: ${lines.length} lines, last id ${prev}, ${problems.length} problem(s)`);
for (const p of problems) console.log('  ' + p);
process.exitCode = problems.length ? 1 : 0;
