// Regression battery (v1 -> v2): for EVERY rule of SPEC.md (rows `| ID | ... | Evidencia | Confianza |`) pick ONE v1 evidence id,
// and replay its prefix (from the last /__reset of that seq up to the id) exactly, comparing with the recorded status + body.
// Cover: start with each rule's shortest prefix, then re-assign every rule to the option with the lowest MARGINAL cost given the
// others (an id already inside another rule's prefix costs 0) until stable. Prefixes from the same reset are replayed once.
// At the end it prints the rules whose responses changed (a changed log id is charged to every rule that cites it, and to the
// rules of the same prefix after it, since state may carry the change).
// CLI: node --env-file=.env probe/regression.ts [--dry] [--plan] [--max-id 5553]
//   --dry   replay against the LOCAL replacement (handle()) instead of the original: 0 requests, checks the battery is well built
//   --plan  only print the cover (rules -> prefixes) and its cost
//   --max-id  last id that is v1 (default 5553 = last id before the organizers' "v2 not active yet" notice)
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import type { Step, Auth } from './send.ts';

const arg = (k: string, d: number) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
const DRY = process.argv.includes('--dry'), PLAN = process.argv.includes('--plan');
const MAX_ID = arg('max-id', 5553);
type Line = { id: number; seq: string; request: unknown; status: number; response: unknown; method?: string; path?: string; auth?: string; content_type?: string | null; raw_b64?: string };
const log: Line[] = readFileSync('experimentos.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const byId = new Map(log.map((l) => [l.id, l]));

function resetOf(id: number): number | null { // last /__reset of the same seq, contiguous lines only
  const seq = byId.get(id)!.seq;
  for (let j = id; j >= 1; j--) {
    const l = byId.get(j);
    if (!l || l.seq !== seq) return null;
    if (l.path === '/__reset' && l.status === 200) return j; // an unauthenticated reset (401) does not reset
  }
  return null;
}

// ---- rules and their replayable evidence ----
type Opt = { r: number; id: number };
const rules: { rule: string; cited: Set<number>; opts: Opt[] }[] = [];
const uncovered: string[] = [];
for (const row of readFileSync('SPEC.md', 'utf8').split('\n')) {
  const cells = row.split('|').map((x) => x.trim());
  if (cells.length < 6 || !/^[A-Z]+-[0-9A-Za-z]+$/.test(cells[1])) continue;
  const ids: number[] = [];
  for (const part of cells[3].split(/,\s*/)) {
    const rg = part.match(/^(\d+)\s*[–-]\s*(\d+)$/), one = part.match(/^(\d+)$/);
    if (rg) for (let i = +rg[1]; i <= +rg[2]; i++) ids.push(i); else if (one) ids.push(+one[1]);
  }
  const opts: Opt[] = [];
  for (const id of ids) {
    if (id > MAX_ID || !byId.has(id)) continue;
    const r = resetOf(id);
    if (r !== null && (byId.get(id)!.path !== '/__reset' || ids.length === 1)) opts.push({ r, id });
  }
  if (!opts.length) { uncovered.push(cells[1]); continue; }
  rules.push({ rule: cells[1], cited: new Set(ids), opts });
}

// ---- cover with minimum cost ----
const pick = new Map<string, Opt>();
for (const R of rules) pick.set(R.rule, R.opts.reduce((a, b) => (b.id - b.r < a.id - a.r ? b : a)));
const ends = (skip?: string) => { const e = new Map<number, number>(); for (const [k, o] of pick) if (k !== skip) e.set(o.r, Math.max(e.get(o.r) ?? 0, o.id)); return e; };
for (let pass = 0, changed = true; changed && pass < 20; pass++) {
  changed = false;
  for (const R of rules) {
    const e = ends(R.rule);
    const cost = (o: Opt) => (e.has(o.r) ? Math.max(0, o.id - e.get(o.r)!) : o.id - o.r + 1);
    const best = R.opts.reduce((a, b) => (cost(b) < cost(a) || (cost(b) === cost(a) && b.id < a.id) ? b : a));
    const cur = pick.get(R.rule)!;
    if (cost(best) < cost(cur)) { pick.set(R.rule, best); changed = true; }
  }
}
const groups = [...ends()].sort((a, b) => a[0] - b[0]).map(([r, end]) => ({ r, end, rules: rules.filter((R) => pick.get(R.rule)!.r === r).map((R) => R.rule) }));
const cost = groups.reduce((a, g) => a + g.end - g.r + 1, 0);
console.log(`${rules.length} reglas cubiertas con ${groups.length} secuencias y ${cost} requests (incluidos los resets)`);
console.log(`sin evidencia repetible (supuestos / sin ids <= ${MAX_ID}): ${uncovered.join(' ') || 'ninguna'}`);
if (PLAN) { for (const g of groups) console.log(`  ${byId.get(g.r)!.seq} ${g.r}-${g.end} (${g.end - g.r + 1}): ${g.rules.join(' ')}`); process.exit(0); }

// ---- replay ----
const target = DRY ? await import('./local.ts') : null;
const send = DRY ? null : (await import('./send.ts')).send;
const changedRules = new Set<string>();
const diffs: string[] = [];
for (const g of groups) {
  const orig = byId.get(g.r)!.seq, seq = `reg_${orig}_${g.r}`;
  for (let id = g.r; id <= g.end; id++) {
    const l = byId.get(id)!;
    const st: Step = { hipotesis: `v2: regresión de ${g.rules.join(',')}: repetición exacta del id ${id} (${orig}, v1)`, method: l.method, path: l.path };
    if (l.auth?.startsWith('header:')) st.authHeader = l.auth.slice(7); else if (l.auth) st.auth = l.auth as Auth;
    if (l.content_type !== undefined) st.contentType = l.content_type;
    if (l.raw_b64 !== undefined) st.rawB64 = l.raw_b64;
    else if (typeof l.request === 'string') st.raw = l.request; else if (l.request !== null) st.body = l.request;
    let got: { status: unknown; response: unknown; id?: unknown };
    if (target) got = await target.local(st);
    else {
      st.conclude = (x) => (x.status === l.status && isDeepStrictEqual(x.response, l.response) ? `igual que v1 (id ${id})` : `CAMBIO frente al id ${id} (v1): ${l.status} ${JSON.stringify(l.response)}`);
      got = (await send!(seq, st)) as typeof got;
    }
    if (got.status !== l.status || !isDeepStrictEqual(got.response, l.response)) {
      const hit = rules.filter((R) => R.cited.has(id) || (g.rules.includes(R.rule) && pick.get(R.rule)!.id > id)).map((R) => R.rule);
      hit.forEach((x) => changedRules.add(x));
      diffs.push(`  id ${id} [${hit.join(',') || 'sin regla'}] ${JSON.stringify(l.request)?.slice(0, 100)}\n    grabado: ${l.status} ${JSON.stringify(l.response)}\n    ahora:   ${got.status} ${JSON.stringify(got.response)}${got.id ? ` (id ${got.id})` : ''}`);
    }
  }
}
target?.closeLocal();
console.log(`${DRY ? 'DRY contra handle() local' : 'contra el ORIGINAL'}: ${groups.length} secuencias, ${cost} requests, ${diffs.length} diferencias`);
if (diffs.length) console.log(diffs.join('\n'));
console.log(`reglas con respuestas cambiadas: ${[...changedRules].join(' ') || 'ninguna'}`);
process.exitCode = diffs.length ? 1 : 0;
