// Replays recorded sequences against the DEPLOYED replacement (REPLACEMENT_URL + TEAM_TOKEN). NEVER calls the original.
// Same comparison as diff.ts (status + body), plus latency per step (the hidden set allows 5 s per step).
// CLI: node --env-file=.env probe/remote-diff.ts [file.jsonl ...] [--sample N] [--seed S]
//   --sample N: from each file keep whole sequences (random, seeded), at most N lines in total.
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

const BASE = process.env.REPLACEMENT_URL?.replace(/\/+$/, '');
const TOKEN = process.env.TEAM_TOKEN;
if (!BASE || !TOKEN) throw new Error('REPLACEMENT_URL / TEAM_TOKEN missing (run with --env-file=.env)');
const LIMIT_MS = 5000;
const GAP_MS = 120; // polite to the free instance; well under 10 req/s

const flag = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? Number(process.argv[i + 1]) : undefined; };
const sample = flag('sample');
let seed = flag('seed') ?? 1;
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function call(method: string, path: string, auth: string, request: unknown) {
  const headers: Record<string, string> = {};
  if (auth === 'ok') headers.authorization = `Bearer ${TOKEN}`;
  if (auth === 'wrong') headers.authorization = 'Bearer wrong-token';
  if (auth.startsWith('header:')) headers.authorization = auth.slice(7).replace('{T}', TOKEN!);
  const body = request == null || method === 'GET' ? undefined : typeof request === 'string' ? request : JSON.stringify(request);
  await sleep(GAP_MS);
  const t0 = performance.now();
  try {
    const res = await fetch(BASE + path, { method, headers, body, signal: AbortSignal.timeout(30000) });
    const text = await res.text();
    const ms = performance.now() - t0;
    let response: unknown;
    try { response = JSON.parse(text); } catch { response = text; }
    return { status: res.status, response, ms };
  } catch (e) {
    return { status: 0, response: `fetch failed: ${(e as Error).message}`, ms: performance.now() - t0 };
  }
}

const files = process.argv.slice(2).filter((a, i, all) => a.endsWith('.jsonl') && all[i - 1] !== '--sample' && all[i - 1] !== '--seed');
if (!files.length) files.push('pruebas/ejemplos.jsonl', 'experimentos.jsonl');
let allOk = true;
let worst = { ms: 0, what: '' };
for (const file of files) {
  let lines: any[] = readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  if (sample && lines.length > sample) {
    const bySeq = new Map<string, any[]>();
    for (const l of lines) bySeq.set(l.seq, [...(bySeq.get(l.seq) ?? []), l]);
    const seqs = [...bySeq.values()].sort(() => rnd() - 0.5);
    lines = [];
    for (const s of seqs) if (lines.length + s.length <= sample) lines.push(...s); // skips sequences that would overshoot
  }
  const stats: Record<string, [ok: number, total: number]> = {};
  const misses: string[] = [];
  const times: number[] = [];
  let seq: string | undefined;
  for (const l of lines) {
    if (l.seq !== seq) { seq = l.seq; const r = await call('POST', '/__reset', 'ok', null); times.push(r.ms); if (r.ms > worst.ms) worst = { ms: r.ms, what: `reset before ${l.seq}` }; }
    const method = l.method ?? 'POST', path = l.path ?? '/msg', auth = l.auth ?? 'ok';
    const m = l.request?.m;
    const key = path !== '/msg' || method !== 'POST' || auth !== 'ok' ? `${method} ${path} auth=${auth}`.slice(0, 40)
      : typeof l.request === 'string' ? '(raw body)' : typeof m === 'string' ? m.split(';')[0].toUpperCase() : '(m no string)';
    const got = await call(method, path, auth, l.request);
    times.push(got.ms);
    if (got.ms > worst.ms) worst = { ms: got.ms, what: `#${l.id} ${JSON.stringify(l.request).slice(0, 60)}` };
    const hit = got.status === l.status && isDeepStrictEqual(got.response, l.response);
    (stats[key] ??= [0, 0])[1]++;
    if (hit) stats[key][0]++;
    else misses.push(`  #${l.id} ${JSON.stringify(l.request)?.slice(0, 120)} expected ${l.status} ${JSON.stringify(l.response)} got ${got.status} ${JSON.stringify(got.response)}`);
  }
  const [ok, total] = Object.values(stats).reduce(([a, b], [c, d]) => [a + c, b + d], [0, 0]);
  if (ok !== total) allOk = false;
  const sorted = [...times].sort((a, b) => a - b);
  console.log(`\n${file}: ${ok}/${total} (${((100 * ok) / total).toFixed(1)}%) in ${new Set(lines.map((l) => l.seq)).size} sequences`);
  console.log(`  latency ms: max ${sorted.at(-1)!.toFixed(0)}, p95 ${sorted[Math.floor(sorted.length * 0.95)].toFixed(0)}, median ${sorted[Math.floor(sorted.length / 2)].toFixed(0)}; over ${LIMIT_MS} ms: ${times.filter((t) => t > LIMIT_MS).length}`);
  if (process.argv.includes('--by-command')) for (const [k, [o, t]] of Object.entries(stats).sort()) console.log(`  ${k.padEnd(28)} ${o}/${t}`);
  if (misses.length) console.log(` mismatches:\n${misses.join('\n')}`);
}
console.log(`\nmax latency overall: ${worst.ms.toFixed(0)} ms (${worst.what}) -> ${worst.ms > LIMIT_MS ? 'EXCEEDS' : 'within'} the ${LIMIT_MS} ms limit`);
process.exitCode = allOk && worst.ms <= LIMIT_MS ? 0 : 1;
