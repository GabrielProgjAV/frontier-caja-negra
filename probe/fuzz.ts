// Differential fuzzer: random sequences are sent to the ORIGINAL (logged in experimentos.jsonl) and compared with our
// local handle() in the same process. Stops at the first difference and prints the whole sequence to reproduce it.
// Only session 1 runs this (it holds the probe turn).
// CLI: node --env-file=.env probe/fuzz.ts [--seqs N] [--seed S] [--business] [--keep-going] [--dry]
import { isDeepStrictEqual } from 'node:util';
import { send } from './send.ts'; // rate limit (5 req/s), probe/budget.json and the experiment log live there
import { control } from '../src/core/checksum.ts';
import { handle } from '../src/core/handle.ts';
import { initialState, type State } from '../src/core/state.ts';

const arg = (name: string, def: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? Number(process.argv[i + 1]) : def;
};
const seqs = arg('seqs', 30);
const seed = arg('seed', Date.now() % 1e9);
const business = process.argv.includes('--business'); // existing accounts, edge amounts, many ANULA, 6-12 steps
const keepGoing = process.argv.includes('--keep-going'); // on a difference, report it and continue with the next seq
const dry = process.argv.includes('--dry'); // no requests: only the local handle(), to preview the generator's outcome mix
const outcomes: Record<string, number> = {};

let s = seed; // mulberry32: same seed -> same sequences
const rnd = () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (n: number) => Math.floor(rnd() * n);
const pick = <T,>(xs: T[]): T => xs[int(xs.length)];

const pad = (p: string, n: number) => p + String(n).padStart(4, '0');
const NAMES = ['Ana', 'Beto', 'Lucia', 'Mateo', 'Juan Perez', 'Zoe', '123', 'Ñandú'];
const AMOUNTS = ['1', '50', '700', '1000', '99999', '100000', '100001', '120000', '250000', '0', '-5', '10.5', '0100', '1e3', 'abc', '+100', '99999999999999999999'];
// HALT is never sent: it is destructive and already characterized (SPEC HAL-*). HELP is safe (E301 + sugerencia HALT).
const TYPOS = ['PIGN', 'DEPOSITOS', 'TRANSFE', 'CONSULTAR', 'ANULAR', 'HELP', 'SALDOS', 'RETIRO', 'X'];

// A message is a list of segments, the control is appended afterwards.
function account(st: State) {
  const ids = Object.keys(st.cuentas);
  return ids.length && rnd() < 0.85 ? pick(ids) : pad('AC-', 1 + int(12)); // existing, or maybe-missing
}
function op(st: State) {
  const ids = Object.keys(st.ops);
  return ids.length && rnd() < 0.85 ? pick(ids) : pad('OP-', 1 + int(12));
}
function amount(st: State, from?: string) {
  const r = rnd();
  if (from && from in st.cuentas && r < 0.2) return String(st.cuentas[from]); // exact balance
  if (r < 0.5) return pick(['99999', '100000', '100001']); // around the transfer limit
  return pick(AMOUNTS);
}

function step(st: State): string {
  const r = rnd();
  const cmd = r < 0.2 ? 'ALTA' : r < 0.4 ? 'DEPOSITO' : r < 0.6 ? 'TRANSFER' : r < 0.78 ? 'CONSULTA' : r < 0.92 ? 'ANULA' : 'PING';
  let parts: string[];
  switch (cmd) {
    case 'ALTA': parts = [cmd, pick(NAMES)]; break;
    case 'DEPOSITO': { const a = account(st); parts = [cmd, a, rnd() < 0.5 ? String(1 + int(300000)) : amount(st)]; break; }
    case 'TRANSFER': { const a = account(st); parts = [cmd, a, rnd() < 0.1 ? a : account(st), amount(st, a)]; break; }
    case 'CONSULTA': parts = [cmd, account(st)]; break;
    case 'ANULA': parts = [cmd, op(st)]; break;
    default: parts = [cmd];
  }
  let validControl = true;
  if (rnd() < 0.2) { // 20 % mutations
    switch (int(6)) {
      case 0: validControl = false; break; // wrong control
      case 1: if (rnd() < 0.5 && parts.length > 1) parts.pop(); else parts.push(pick(['x', 'AC-0001', '5'])); break; // bad arity
      case 2: parts[0] = parts[0].toLowerCase(); if (parts[1]) parts[1] = parts[1].toLowerCase(); break; // lowercase
      case 3: parts[0] = pick(TYPOS); break; // typo / unknown command
      case 4: if (parts.length > 1) parts[parts.length - 1] = pick(AMOUNTS); break; // odd last argument
      case 5: if (parts.length > 1) parts[1] = pick(['AC-0099', 'OP-0099', 'AC-1', '']); break; // missing / empty id
    }
  }
  const payload = parts.join(';');
  if (/^halt$/i.test(parts[0].trim())) throw new Error('refusing to send HALT to the original');
  const c = control(payload);
  return `${payload};${validControl ? c : c === 98 ? 1 : c + 1}`;
}

// --business: each sequence opens 3-4 accounts with colliding holder names and funds them, then runs 4-8 random
// steps biased to successful TRANSFER (destination != origin 95 %) and ANULA of funded transfers. No mutations.
// (v1 of this mode, seeds 404/505, generated differently; those runs are in experimentos.jsonl.)
const BIZ_NAMES = ['Ana', 'Ana', 'ana', 'ANA', 'Ana ', ' Ana', 'José', 'Jose', 'JOSÉ', '123', '0123', 'Juan Perez', 'JuanPerez', 'x'.repeat(60)];
function businessSetup(): string[] {
  const n = 3 + int(2);
  const plan = Array.from({ length: n }, () => `ALTA;${pick(BIZ_NAMES)}`);
  for (let k = 1; k <= n; k++) if (rnd() < 0.85) plan.push(`DEPOSITO;${pad('AC-', k)};${pick([50000, 100000, 150000, 250000, 1 + int(300000)])}`);
  return plan.map((p) => `${p};${control(p)}`);
}
function businessStep(st: State): string {
  const ids = Object.keys(st.cuentas);
  const ops = Object.keys(st.ops);
  const acct = () => (ids.length && rnd() < 0.9 ? pick(ids) : pad('AC-', ids.length + 1 + int(3)));
  const other = (a: string) => { const o = ids.filter((x) => x !== a); return o.length && rnd() < 0.95 ? pick(o) : a; };
  const amt = (from: string) => {
    const saldo = st.cuentas[from] ?? 0, r = rnd();
    if (saldo > 0 && r < 0.4) return String(1 + int(Math.min(saldo, 9999999999))); // fits the balance
    if (r < 0.65) return String(Math.max(1, saldo + pick([-1, 0, 1]))); // balance edges
    if (r < 0.85) return pick(['99999', '100000', '100001']); // transfer limit
    return String(1 + int(50000));
  };
  const anulaTarget = () => {
    if (!ops.length || rnd() < 0.05) return pad('OP-', ops.length + 1 + int(3)); // missing
    const live = ops.filter((o) => st.ops[o].from && !st.ops[o].anulada), done = ops.filter((o) => st.ops[o].anulada);
    const r = rnd();
    if (live.length && r < 0.55) return pick(live); // funded transfer
    if (done.length && r < 0.7) return pick(done); // double ANULA
    return pick([ops[ops.length - 1], ops[0], pick(ops)]); // last, oldest, any (deposits included)
  };
  const r = rnd();
  let parts: string[];
  if (r < 0.05) parts = ['ALTA', pick(BIZ_NAMES)];
  else if (r < 0.17) parts = ['DEPOSITO', acct(), String(1 + int(200000))];
  else if (r < 0.62) { const a = acct(); parts = ['TRANSFER', a, other(a), amt(a)]; }
  else if (r < 0.9) parts = ['ANULA', anulaTarget()];
  else parts = ['CONSULTA', acct()];
  const payload = parts.join(';');
  if (/^halt$/i.test(parts[0].trim())) throw new Error('refusing to send HALT to the original');
  return `${payload};${control(payload)}`;
}

console.log(`fuzz: seed=${seed} seqs=${seqs}${business ? ' business' : ''}${keepGoing ? ' keep-going' : ''}`);
const run = `${business ? 'b' : ''}${seed.toString(36)}`;
let diffs = 0;
for (let n = 1; n <= seqs; n++) {
  const seq = `fuzz${run}_${n}`;
  const hipotesis = `fuzz ${business ? 'negocio' : 'diferencial'} seq ${n}`;
  if (!dry) await send(seq, { hipotesis: `${hipotesis}: reset`, path: '/__reset' });
  let st = initialState();
  const sent: string[] = [];
  let failed = false;
  const plan = business ? businessSetup() : [];
  for (let i = 0, len = business ? plan.length + 4 + int(5) : 1 + int(12); i < len && !failed; i++) {
    const m = i < plan.length ? plan[i] : business ? businessStep(st) : step(st);
    sent.push(m);
    const want = handle(st, JSON.stringify({ m }));
    st = want.state;
    const wantBody = JSON.parse(JSON.stringify(want.body));
    const b = wantBody as { error?: string; ok?: boolean };
    const k = `${want.status} ${b.error ?? m.split(';')[0].toUpperCase()}${b.ok === false ? ' ok:false' : ''}`;
    outcomes[k] = (outcomes[k] ?? 0) + 1;
    const got = dry ? { id: 0, status: want.status, response: wantBody } : await send(seq, { hipotesis: `${hipotesis}, paso ${i + 1}`, body: { m } });
    if (got.status !== want.status || !isDeepStrictEqual(got.response, wantBody)) {
      console.log(`\nDIFFERENCE in ${seq} (log id ${got.id}), step ${i + 1}: ${m}`);
      console.log(`  original: ${got.status} ${JSON.stringify(got.response)}`);
      console.log(`  ours:     ${want.status} ${JSON.stringify(wantBody)}`);
      console.log(`  reproduce (after POST /__reset): ${JSON.stringify(sent)}`);
      if (!keepGoing) process.exit(1);
      diffs++;
      failed = true; // local state no longer mirrors the original: move on to the next sequence
    }
  }
  if (!failed) console.log(`${seq}: ${sent.length} steps ok`);
}
console.log(Object.entries(outcomes).sort((x, y) => y[1] - x[1]).map(([k, c]) => `${k}: ${c}`).join(' | '));
console.log(diffs ? `\n${diffs} of ${seqs} sequences with a difference` : `\n${seqs} sequences without differences`);
if (diffs) process.exit(1);
