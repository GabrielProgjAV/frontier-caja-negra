// Replays recorded sequences against our LOCAL replacement (in-process server, never the original)
// and reports % exact match (status + body) per command. A new seq starts with POST /__reset.
// CLI: node probe/diff.ts [file.jsonl ...]   (default: pruebas/ejemplos.jsonl experimentos.jsonl)
import { readFileSync } from 'node:fs';
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
  const body = request == null || method === 'GET' ? undefined : typeof request === 'string' ? request : JSON.stringify(request);
  const res = await fetch(base + path, { method, headers, body });
  const text = await res.text();
  let response: unknown;
  try { response = JSON.parse(text); } catch { response = text; }
  return { status: res.status, response };
}

const files = process.argv.length > 2 ? process.argv.slice(2) : ['pruebas/ejemplos.jsonl', 'experimentos.jsonl'];
let allOk = true;
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const stats: Record<string, [ok: number, total: number]> = {};
  const misses: string[] = [];
  let seq: string | undefined;
  for (const l of lines) {
    if (l.seq !== seq) { seq = l.seq; await call('POST', '/__reset', 'ok', null); }
    const method = l.method ?? 'POST', path = l.path ?? '/msg', auth = l.auth ?? 'ok';
    const m = l.request?.m;
    const key = path !== '/msg' || method !== 'POST' || auth !== 'ok' ? `${method} ${path} auth=${auth}`
      : typeof l.request === 'string' ? '(raw body)' : typeof m === 'string' ? m.split(';')[0].toUpperCase() : '(m no string)';
    const got = await call(method, path, auth, l.request);
    const hit = got.status === l.status && isDeepStrictEqual(got.response, l.response);
    (stats[key] ??= [0, 0])[1]++;
    if (hit) stats[key][0]++;
    else misses.push(`  #${l.id} ${JSON.stringify(l.request)} expected ${l.status} ${JSON.stringify(l.response)} got ${got.status} ${JSON.stringify(got.response)}`);
  }
  const [ok, total] = Object.values(stats).reduce(([a, b], [c, d]) => [a + c, b + d], [0, 0]);
  if (ok !== total) allOk = false;
  console.log(`\n${file}: ${ok}/${total} (${((100 * ok) / total).toFixed(1)}%)`);
  for (const [k, [o, t]] of Object.entries(stats).sort()) console.log(`  ${k.padEnd(28)} ${o}/${t} (${((100 * o) / t).toFixed(1)}%)`);
  if (misses.length) console.log(` mismatches:\n${misses.join('\n')}`);
}
server.close();
process.exitCode = allOk ? 0 : 1;
