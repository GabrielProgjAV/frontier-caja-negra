// Differential fuzzer: random sequences are sent to the ORIGINAL (logged in experimentos.jsonl) and compared with our
// local handle() in the same process. Stops at the first difference and prints the whole sequence to reproduce it.
// Only session 1 runs this (it holds the probe turn). CLI: node --env-file=.env probe/fuzz.ts [--seqs N] [--seed S]
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
const TYPOS = ['PIGN', 'DEPOSITOS', 'TRANSFE', 'CONSULTAR', 'ANULAR', 'HELP', 'HALT', 'SALDOS', 'RETIRO', 'X'];

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
  const c = control(payload);
  return `${payload};${validControl ? c : c === 98 ? 1 : c + 1}`;
}

console.log(`fuzz: seed=${seed} seqs=${seqs}`);
const run = `${seed.toString(36)}`;
for (let n = 1; n <= seqs; n++) {
  const seq = `fuzz${run}_${n}`;
  const hipotesis = `fuzz diferencial seq ${n}`;
  await send(seq, { hipotesis: `${hipotesis}: reset`, path: '/__reset' });
  let st = initialState();
  const sent: string[] = [];
  for (let i = 0, len = 1 + int(12); i < len; i++) {
    const m = step(st);
    sent.push(m);
    const got = await send(seq, { hipotesis: `${hipotesis}, paso ${i + 1}`, body: { m } });
    const want = handle(st, JSON.stringify({ m }));
    st = want.state;
    const wantBody = JSON.parse(JSON.stringify(want.body));
    if (got.status !== want.status || !isDeepStrictEqual(got.response, wantBody)) {
      console.log(`\nDIFFERENCE in ${seq} (log id ${got.id}), step ${i + 1}: ${m}`);
      console.log(`  original: ${got.status} ${JSON.stringify(got.response)}`);
      console.log(`  ours:     ${want.status} ${JSON.stringify(wantBody)}`);
      console.log(`  reproduce (after POST /__reset): ${JSON.stringify(sent)}`);
      process.exit(1);
    }
  }
  console.log(`${seq}: ${sent.length} steps ok`);
}
console.log(`\n${seqs} sequences without differences`);
