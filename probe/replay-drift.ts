// Wide drift check: replays N random old sequences from experimentos.jsonl against the ORIGINAL, exactly as recorded
// (method, path, auth, content type, body), and compares status + body with what was logged.
// CLI: node --env-file=.env probe/replay-drift.ts [--n 30] [--seed 1] [--max-len 25]
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { send, type Step, type Auth } from './send.ts';
const arg = (k: string, d: number) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
const N = arg('n', 30), maxLen = arg('max-len', 25);
let s = arg('seed', 1);
const rnd = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
type Line = { id: number; seq: string; request: unknown; status: number; response: unknown; method?: string; path?: string; auth?: string; content_type?: string | null };
const log: Line[] = readFileSync('experimentos.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const bySeq = new Map<string, Line[]>();
for (const l of log) { if (!bySeq.has(l.seq)) bySeq.set(l.seq, []); bySeq.get(l.seq)!.push(l); }
const excluded = /^(s1|s12|s17|s21|drift|replay|s37|s38|s39|reg_|canary|s4[3-9])/;
const only = process.argv.includes('--seqs') ? process.argv[process.argv.indexOf('--seqs') + 1].split(',') : null; // explicit list: whole seqs, in order, no filters
const eligible = [...bySeq.entries()].filter(([seq, ls]) =>
  !excluded.test(seq) && ls[0].path === '/__reset' && ls.length <= maxLen && ls.length >= 3 &&
  !ls.some((l) => /^\s*halt/i.test((l.request as { m?: string } | null)?.m ?? '')) && !ls.slice(1).some((l) => l.path === '/__reset'));
const picked: [string, Line[]][] = only ? only.map((q) => [q, bySeq.get(q)!] as [string, Line[]]) : [];
while (!only && picked.length < Math.min(N, eligible.length)) { const e = eligible.splice(Math.floor(rnd() * eligible.length), 1)[0]; picked.push(e); }
console.log(`eligible pool picked ${picked.length}: ${picked.map(([q]) => q).join(' ')}`);
let diffs = 0, steps = 0;
for (const [orig, ls] of picked) {
  const seq = `replay_${orig}`;
  await send(seq, { hipotesis: `v2: drift amplio: reset antes de repetir ${orig} (ids ${ls[0].id}-${ls.at(-1)!.id})`, path: '/__reset' });
  let seqDiff = 0;
  for (const l of ls.slice(1)) {
    const st: Step = { hipotesis: `v2: drift amplio: repetición exacta del id ${l.id} (${orig})`, method: l.method, path: l.path };
    if (l.auth?.startsWith('header:')) st.authHeader = l.auth.slice(7); else if (l.auth) st.auth = l.auth as Auth;
    if (l.content_type !== undefined) st.contentType = l.content_type;
    if (typeof l.request === 'string') st.raw = l.request; else if (l.request !== null) st.body = l.request;
    st.conclude = (g) => (g.status === l.status && isDeepStrictEqual(g.response, l.response) ? `sin cambios frente al id ${l.id}` : `CAMBIO frente al id ${l.id}: antes ${l.status} ${JSON.stringify(l.response)}`);
    const g = await send(seq, st);
    steps++;
    if (g.status !== l.status || !isDeepStrictEqual(g.response, l.response)) { diffs++; seqDiff++; console.log(`  DIFF ${orig} id ${l.id} -> ${g.id}: antes ${l.status} ${JSON.stringify(l.response)} ahora ${g.status} ${JSON.stringify(g.response)}`); }
  }
  console.log(`${orig}: ${ls.length - 1} pasos, ${seqDiff} diferencias`);
}
console.log(`\n${picked.length} secuencias, ${steps} pasos, ${diffs} diferencias`);
if (diffs) process.exit(1);
