// Sends requests to the ORIGINAL service and appends one line per request to experimentos.jsonl.
// CLI: node --env-file=.env probe/send.ts <seq> <steps.json>   (does POST /__reset first)
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

const BASE = process.env.ORIGINAL_URL;
const TOKEN = process.env.ORIGINAL_TOKEN;
if (!BASE || !TOKEN) throw new Error('ORIGINAL_URL / ORIGINAL_TOKEN missing (run with --env-file=.env)');

const LOG = 'experimentos.jsonl';
const BUDGET = 'probe/budget.json';
const DAILY_LIMIT = 8000;
const GAP_MS = 200; // 5 req/s

export type Auth = 'ok' | 'none' | 'wrong';
export type Step = {
  hipotesis: string;
  method?: string;
  path?: string;
  auth?: Auth;
  body?: unknown; // sent as JSON
  raw?: string; // sent verbatim (for malformed bodies)
  conclusion?: string;
  conclude?: (line: Record<string, unknown>) => string; // conclusion derived from the response
  expect?: { status: number; response: unknown };
};

let nextId = existsSync(LOG) ? readFileSync(LOG, 'utf8').split('\n').filter(Boolean).length + 1 : 1;
let last = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ponytail: UTC day boundary; switch if the service's quota resets on another clock
function spend() {
  const today = new Date().toISOString().slice(0, 10);
  let b = existsSync(BUDGET) ? JSON.parse(readFileSync(BUDGET, 'utf8')) : { date: today, used: 0 };
  if (b.date !== today) b = { date: today, used: 0 };
  if (b.used >= DAILY_LIMIT) throw new Error('daily budget exhausted');
  b.used++;
  writeFileSync(BUDGET, JSON.stringify(b) + '\n');
}

export async function send(seq: string, s: Step) {
  const method = s.method ?? 'POST';
  const path = s.path ?? '/msg';
  const auth = s.auth ?? 'ok';
  const headers: Record<string, string> = {};
  if (auth === 'ok') headers.authorization = `Bearer ${TOKEN}`;
  if (auth === 'wrong') headers.authorization = 'Bearer wrong-token';
  const payload = s.raw ?? (s.body === undefined ? undefined : JSON.stringify(s.body));
  if (payload !== undefined) headers['content-type'] = 'application/json';

  for (let tries = 0; ; tries++) {
    await sleep(Math.max(0, last + GAP_MS - Date.now()));
    last = Date.now();
    spend();
    const res = await fetch(BASE + path, { method, headers, body: payload });
    const text = await res.text();
    if (res.headers.get('x-frontier-infra') === 'rate-limit') {
      // infra, not the service: never logged as behavior
      if (tries >= 5) throw new Error('infra rate-limit persists');
      await sleep(2000 * (tries + 1));
      continue;
    }
    let response: unknown;
    try { response = JSON.parse(text); } catch { response = text; }
    const xr = res.headers.get('x-req');
    const x_req = xr !== null && xr.trim() !== '' && !Number.isNaN(Number(xr)) ? Number(xr) : xr;
    const line: Record<string, unknown> = {
      id: nextId++, seq, x_req, hipotesis: s.hipotesis,
      request: s.raw ?? s.body ?? null, status: res.status, response,
    };
    if (method !== 'POST' || path !== '/msg' || auth !== 'ok') Object.assign(line, { method, path, auth });
    const conclusion = s.conclusion ?? s.conclude?.(line);
    if (conclusion) line.conclusion = conclusion;
    appendFileSync(LOG, JSON.stringify(line) + '\n');
    return line;
  }
}

if (import.meta.main) {
  const [seq, file] = process.argv.slice(2);
  if (!seq || !file) throw new Error('usage: probe/send.ts <seq> <steps.json>');
  const steps: Step[] = JSON.parse(readFileSync(file, 'utf8'));
  const show = (l: Record<string, unknown>, s: Step) => {
    const diff = s.expect && !(l.status === s.expect.status && isDeepStrictEqual(l.response, s.expect.response));
    console.log([l.id, `${l.method ?? 'POST'} ${l.path ?? '/msg'} ${l.auth ?? ''}`, JSON.stringify(l.request),
      l.status, JSON.stringify(l.response), diff ? `DIFF expected ${s.expect!.status} ${JSON.stringify(s.expect!.response)}` : ''].join(' | '));
  };
  const reset: Step = { hipotesis: 'reset: inicio de secuencia', path: '/__reset' };
  show(await send(seq, reset), reset);
  for (const s of steps) show(await send(seq, s), s);
}
