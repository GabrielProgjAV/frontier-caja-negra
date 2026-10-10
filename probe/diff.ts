// Replays recorded sequences against our LOCAL replacement (in-process server, never the original)
// and reports % exact match (status + body) per command. A new seq starts with POST /__reset.
// CLI: node probe/diff.ts [file.jsonl ...]   (default: pruebas/ejemplos.jsonl experimentos.jsonl). Versions: probe/v2.json.
import { existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { AddressInfo } from 'node:net';

process.env.TEAM_TOKEN = 'diff-token';
const { server } = await import('../src/server.ts');
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

async function call(method: string, path: string, auth: string, request: unknown) {
  const headers: Record<string, string> = {};
  if (auth === 'ok') headers.authorization = 'Bearer diff-token';
  if (auth === 'wrong') headers.authorization = 'Bearer wrong-token';
  if (auth.startsWith('header:')) headers.authorization = auth.slice(7).replace('{T}', 'diff-token'); // s19 header variants
  const body = request == null || method === 'GET' ? undefined : typeof request === 'string' ? request : JSON.stringify(request);
  const res = await fetch(base + path, { method, headers, body });
  const text = await res.text();
  let response: unknown;
  try { response = JSON.parse(text); } catch { response = text; }
  return { status: res.status, response };
}

// Versions: probe/v2.json gives the v1/v2 frontier (first experimentos.jsonl id recorded against v2) and the v1 ids
// whose behavior changed in v2 ("superseded", numbers or "a-b" ranges). Goal: 100 % on v2 lines AND on v1 lines that
// are not superseded. Superseded lines are still replayed (they build state) but only reported for information.
type V2 = { frontera: number | null; superseded: (number | string)[]; superseded_ejemplos: (number | string)[] };
const v2: V2 = existsSync('probe/v2.json') ? JSON.parse(readFileSync('probe/v2.json', 'utf8')) : { frontera: null, superseded: [], superseded_ejemplos: [] };
const idSet = (xs: (number | string)[] = []) => {
  const out = new Set<number>();
  for (const x of xs) {
    const [a, b = a] = String(x).split('-').map(Number);
    for (let i = a; i <= b; i++) out.add(i);
  }
  return out;
};
const versioning: Record<string, { frontera: number; superseded: Set<number> }> = {
  'experimentos.jsonl': { frontera: v2.frontera ?? Infinity, superseded: idSet(v2.superseded) },
  'ejemplos.jsonl': { frontera: Infinity, superseded: idSet(v2.superseded_ejemplos) }, // all v1 (morning examples)
};
type Bucket = 'v2' | 'v1' | 'v1 superseded';
const pct = ([o, t]: number[]) => `${o}/${t} (${t ? ((100 * o) / t).toFixed(1) : '-'}%)`;

const files = process.argv.length > 2 ? process.argv.slice(2) : ['pruebas/ejemplos.jsonl', 'experimentos.jsonl'];
let allOk = true;
for (const file of files) {
  const ver = versioning[basename(file)] ?? { frontera: Infinity, superseded: new Set<number>() };
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const stats: Record<string, [ok: number, total: number]> = {};
  const buckets: Record<Bucket, [ok: number, total: number]> = { v2: [0, 0], v1: [0, 0], 'v1 superseded': [0, 0] };
  const misses: string[] = [];
  const supMisses: number[] = [];
  const supSeqs = new Set(lines.filter((l) => ver.superseded.has(l.id)).map((l) => l.seq));
  let seq: string | undefined;
  for (const l of lines) {
    if (l.seq !== seq) { seq = l.seq; await call('POST', '/__reset', 'ok', null); }
    const method = l.method ?? 'POST', path = l.path ?? '/msg', auth = l.auth ?? 'ok';
    const m = l.request?.m;
    const key = path !== '/msg' || method !== 'POST' || auth !== 'ok' ? `${method} ${path} auth=${auth}`
      : typeof l.request === 'string' ? '(raw body)' : typeof m === 'string' ? m.split(';')[0].toUpperCase() : '(m no string)';
    const got = await call(method, path, auth, l.request);
    const hit = got.status === l.status && isDeepStrictEqual(got.response, l.response);
    const bucket: Bucket = l.id >= ver.frontera ? 'v2' : ver.superseded.has(l.id) ? 'v1 superseded' : 'v1';
    buckets[bucket][1]++;
    if (hit) buckets[bucket][0]++;
    if (bucket === 'v1 superseded') { if (!hit) supMisses.push(l.id); continue; }
    (stats[key] ??= [0, 0])[1]++;
    if (hit) stats[key][0]++;
    else misses.push(`  [${bucket}] #${l.id} ${JSON.stringify(l.request)} expected ${l.status} ${JSON.stringify(l.response)} got ${got.status} ${JSON.stringify(got.response)}`
      + (bucket === 'v1' && supSeqs.has(l.seq) ? `  (seq ${l.seq} has superseded lines: state may depend on them)` : ''));
  }
  const [ok, total] = Object.values(stats).reduce(([a, b], [c, d]) => [a + c, b + d], [0, 0]);
  if (ok !== total) allOk = false;
  console.log(`\n${file}: ${pct([ok, total])}  (v2 + v1 vigentes)`);
  if (ver.frontera !== Infinity) console.log(`  v2 (id >= ${ver.frontera})`.padEnd(30) + ' ' + pct(buckets.v2));
  console.log(`  v1 vigentes`.padEnd(30) + ' ' + pct(buckets.v1));
  if (buckets['v1 superseded'][1]) console.log(`  v1 superseded (informativo)`.padEnd(30) + ' ' + pct(buckets['v1 superseded']) + (supMisses.length ? ` fallan: ${supMisses.join(',')}` : ''));
  for (const [k, [o, t]] of Object.entries(stats).sort()) console.log(`  ${k.padEnd(28)} ${pct([o, t])}`);
  if (misses.length) console.log(` mismatches:\n${misses.join('\n')}`);
}
server.close();
process.exitCode = allOk ? 0 : 1;
