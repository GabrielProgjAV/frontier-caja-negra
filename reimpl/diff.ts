// Copia adaptada de probe/diff.ts: reproduce secuencias grabadas contra reimpl/handle.ts (en proceso, sin red).
// CLI: node reimpl/diff.ts [file.jsonl ...]   (por defecto: pruebas/ejemplos.jsonl experimentos.jsonl)
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { initialState, route, type State } from './handle.ts';

const TOKEN = 'diff-token';
let state: State = initialState();

function call(method: string, path: string, auth: string, request: unknown) {
  let authorization: string | undefined;
  if (auth === 'ok') authorization = `Bearer ${TOKEN}`;
  if (auth === 'wrong') authorization = 'Bearer wrong-token';
  if (auth.startsWith('header:')) authorization = auth.slice(7).replaceAll('{T}', TOKEN);
  const body = request == null || method === 'GET' ? undefined : typeof request === 'string' ? request : JSON.stringify(request);
  const r = route(state, TOKEN, { method, path, authorization, body });
  state = r.state;
  // Misma ruta que el diff original: serializar a texto y volver a parsear.
  const text = typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
  let response: unknown;
  try { response = JSON.parse(text); } catch { response = text; }
  return { status: r.status, response };
}

const files = process.argv.length > 2 ? process.argv.slice(2) : ['pruebas/ejemplos.jsonl', 'experimentos.jsonl'];
const total: Record<string, [number, number]> = {};
let allOk = true;
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const stats: Record<string, [ok: number, total: number]> = {};
  const misses: string[] = [];
  let seq: string | undefined;
  for (const l of lines) {
    if (l.seq !== seq) { seq = l.seq; call('POST', '/__reset', 'ok', null); }
    const method = l.method ?? 'POST', path = l.path ?? '/msg', auth = l.auth ?? 'ok';
    const m = l.request?.m;
    const key = path !== '/msg' || method !== 'POST' || auth !== 'ok' ? `${method} ${path} auth=${auth}`
      : typeof l.request === 'string' ? '(raw body)' : typeof m === 'string' ? m.split(';')[0].toUpperCase() : '(m no string)';
    const got = call(method, path, auth, l.request);
    const hit = got.status === l.status && isDeepStrictEqual(got.response, l.response);
    for (const t of [stats, total]) { (t[key] ??= [0, 0])[1]++; if (hit) t[key][0]++; }
    if (!hit) misses.push(`  #${l.id} ${JSON.stringify(l.request)} expected ${l.status} ${JSON.stringify(l.response)} got ${got.status} ${JSON.stringify(got.response)}`);
  }
  const [ok, tot] = Object.values(stats).reduce(([a, b], [c, d]) => [a + c, b + d], [0, 0]);
  if (ok !== tot) allOk = false;
  console.log(`\n${file}: ${ok}/${tot} (${((100 * ok) / tot).toFixed(1)}%)`);
  for (const [k, [o, t]] of Object.entries(stats).sort()) console.log(`  ${k.padEnd(28)} ${o}/${t} (${((100 * o) / t).toFixed(1)}%)`);
  if (misses.length) console.log(` mismatches (${misses.length}):\n${misses.join('\n')}`);
}
if (files.length > 1) {
  const [ok, tot] = Object.values(total).reduce(([a, b], [c, d]) => [a + c, b + d], [0, 0]);
  console.log(`\nTOTAL: ${ok}/${tot} (${((100 * ok) / tot).toFixed(1)}%)`);
}
process.exitCode = allOk ? 0 : 1;
