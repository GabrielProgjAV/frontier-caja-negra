// Pure core: handle(state, rawBody) -> { state, status, body }. Validation order (ids = experimentos.jsonl):
// E101 body > 8192 bytes (after auth) -> E100 json -> E102 m -> E103 ';' -> E104 empty segment (509-511: before E201/E302) -> [not PING] E201 -> E202
// (41, 42: before E301/E302) -> E301 -> E302 -> E303 monto (515, 517) -> E304 (516, 518) -> E401 (490) / E402
// -> E506 (491: before E507) -> E507.
import { control } from './checksum.ts';
import type { State } from './state.ts';

export type Result = { state: State; status: number; body: unknown };

const ERRORS: Record<string, [number, string]> = {
  E100: [400, 'json inválido'],
  E101: [413, 'cuerpo demasiado grande'],
  E102: [400, 'falta m'],
  E103: [400, 'falta control'],
  E104: [400, 'segmento vacío'],
  E201: [400, 'control mal formado'],
  E202: [400, 'control inválido'],
  E301: [400, 'comando desconocido '],
  E302: [400, 'aridad inválida'],
  E303: [400, 'monto inválido'],
  E304: [400, 'origen y destino iguales'],
  E401: [404, 'cuenta inexistente'],
  E402: [404, 'operación inexistente'],
  E506: [422, 'límite excedido'],
  E507: [422, 'saldo insuficiente'],
  E520: [409, 'operación destructiva: detiene el servicio; reenvía con confirmación'],
  E599: [503, 'service halted'],
};
// Arguments between the command and the control.
const ARITY: Record<string, number> = { PING: 0, ALTA: 1, CONSULTA: 1, DEPOSITO: 2, TRANSFER: 3, ANULA: 1, HALT: 1 };
// ponytail: counts BYTES (assumed, not probed with multibyte chars); body limit exact value tested by 716-726
const MAX_BODY = 8192;
const LIMITE_TRANSFER = 50000; // T6 (v2, 16:16): 50000 ok (5943), 50001 E506 (5942); v1 was 100000

// T5 (v2, 16:16): CONSULTA saldo = internal integer / 100 as string with exactly 2 decimals, '-' if negative (5952-5971, 5833)
const fmt = (n: number) => (n < 0 ? '-' : '') + Math.floor(Math.abs(n) / 100) + '.' + String(Math.abs(n) % 100).padStart(2, '0');
const fail = (state: State, code: string, extra?: object): Result =>
  ({ state, status: ERRORS[code][0], body: { error: code, mensaje: ERRORS[code][1], ...extra } });
const nextId = (prefix: string, o: object) => prefix + String(Object.keys(o).length + 1).padStart(4, '0');
// Positive integer, no leading zeros, no sign/decimals/exponent/spaces (476-483).
// Max 10 digits: 9999999999 accepted (771, 815), 10000000000 and 99999999999 -> E303 (769, 814).
const monto = (s: string) => (/^[1-9][0-9]{0,9}$/.test(s) ? Number(s) : null);

// T1: suggestion = closest known command within Levenshtein 2; ties -> first in alphabetical order (3592-3606, s38-s39).
const SUGERIBLES = Object.keys(ARITY);
function suggest(cmd: string) {
  const dist = (sa: string, sb: string) => {
    const a = [...sa], b = [...sb]; // T4: distance in code points ('PING😀😀' -> PING, 4668)
    let row = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const next = [i];
      for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      row = next;
    }
    return row[b.length];
  };
  let best: string | undefined, bd = 3;
  for (const k of [...SUGERIBLES].sort()) { const d = dist(cmd, k); if (d < bd) { bd = d; best = k; } }
  return best;
}

// B1: own keys only, so 'constructor', 'toString', '__proto__' are not accounts/operations
// (Object.create(null) would not survive structuredClone).
const has = (o: object, k: string) => Object.hasOwn(o, k);

export function handle(prev: State, raw: string): Result {
  if (Buffer.byteLength(raw) > MAX_BODY) return fail(prev, 'E101'); // 702-726, 728: before JSON parse
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { return fail(prev, 'E100'); }
  const m = parsed?.m;
  if (typeof m !== 'string') return fail(prev, 'E102');
  if (!m.includes(';')) return fail(prev, 'E103');
  const seg = m.split(';');
  if (seg.includes('')) return fail(prev, 'E104');
  const cmd = seg[0].replace(/[a-z]+/g, (x) => x.toUpperCase()); // T4: ASCII-only uppercase ('pıng', 'CONſULTA', 'ß' stay unknown: 4641-4645, 4670)
  if (cmd !== 'PING') { // PING skips the control entirely (458, 459, README "PING;XX")
    const c = seg[seg.length - 1];
    if (!/^\d{1,2}$/.test(c)) return fail(prev, 'E201');
    if (String(control(m.slice(0, m.lastIndexOf(';')))) !== c) return fail(prev, 'E202');
  }
  if (!has(ARITY, cmd)) { const s = suggest(cmd); return fail(prev, 'E301', s ? { sugerencia: s } : undefined); }
  const args = seg.slice(1, -1);
  if (args.length !== ARITY[cmd]) return fail(prev, 'E302');

  const state = structuredClone(prev);
  const { cuentas, nombres, ops } = state;
  const ok = (status: number, body: unknown): Result => ({ state, status, body });

  switch (cmd) {
    case 'HALT': // hidden command (540, 612, 613, 617). T2: exactly '1' halts the token (3980, 3991); any other arg -> E520, no change (3994-4023)
      if (args[0] !== '1') return fail(prev, 'E520');
      state.halted = true;
      return fail(state, 'E599');
    case 'PING':
      return ok(200, { pong: true });
    case 'ALTA': {
      const id = nextId('AC-', cuentas);
      cuentas[id] = 0;
      nombres[id] = args[0];
      return ok(201, { cuentaId: id });
    }
    case 'CONSULTA': {
      const [c] = args;
      if (!has(cuentas, c)) return fail(prev, 'E401');
      return ok(200, { cuenta_id: c, saldo: fmt(cuentas[c]) });
    }
    case 'DEPOSITO': {
      const [to, s] = args;
      const n = monto(s);
      if (n === null) return fail(prev, 'E303');
      if (!has(cuentas, to)) return fail(prev, 'E401');
      const id = nextId('OP-', ops);
      cuentas[to] += n;
      ops[id] = { to, monto: n, anulada: false };
      return ok(200, { status: 'recieved', operacionId: id });
    }
    case 'TRANSFER': {
      const [from, to, s] = args;
      const n = monto(s);
      if (n === null) return fail(prev, 'E303');
      if (from === to) return fail(prev, 'E304');
      if (!has(cuentas, from) || !has(cuentas, to)) return fail(prev, 'E401');
      if (n > LIMITE_TRANSFER && nombres[from] !== nombres[to]) return fail(prev, 'E506'); // TRA-7: same holder (exact name) has no limit
      if (n > cuentas[from]) return fail(prev, 'E507'); // ponytail: n == saldo assumed allowed, not probed
      const id = nextId('OP-', ops);
      cuentas[from] -= n;
      cuentas[to] += n;
      ops[id] = { from, to, monto: n, anulada: false };
      return ok(200, { status: 'recieved', operacionId: id });
    }
    case 'ANULA': {
      const op = has(ops, args[0]) ? ops[args[0]] : undefined;
      if (!op) return fail(prev, 'E402');
      if (op.anulada) return ok(200, { ok: false, motivo: 'ya anulada' });
      op.anulada = true;
      cuentas[op.to] -= op.monto; // no balance check: a reverted deposit can go negative (496)
      if (op.from) cuentas[op.from] += op.monto;
      return ok(200, { ok: true, anulada: args[0] });
    }
  }
  throw new Error('unreachable');
}
