// Canario de cambios: ~60 requests que tocan CADA comando y CADA error conocido (E001, E100-E104, E201, E202,
// E301 con y sin sugerencia, E302-E304, E401, E402, E404, E506, E507, E520, E599/halted, TRA-7, límites).
// Cada request va al ORIGINAL (registrado en experimentos.jsonl) y al reemplazo LOCAL en proceso (src/server.ts,
// es decir handle()), y se compara status + cuerpo. Cualquier diferencia = el servicio cambió o nuestro modelo falla.
// CLI: node --env-file=.env probe/canary.ts [--dry]   (--dry: solo local, no gasta presupuesto). Exit 1 si hay diferencias.
import type { AddressInfo } from 'node:net';
import { isDeepStrictEqual } from 'node:util';
import { control } from '../src/core/checksum.ts';
import { server } from '../src/server.ts';
import type { Step } from './send.ts';

const DRY = process.argv.includes('--dry');
const LOCAL_TOKEN = 'canary-local-token';
process.env.TEAM_TOKEN = LOCAL_TOKEN; // el reemplazo local acepta solo este token (no se usa el del equipo)

const c = (p: string) => `${p};${control(p)}`; // mensaje con su control correcto
const bad = (p: string) => `${p};${control(p) === 50 ? 51 : 50}`; // control numérico incorrecto
const m = (hip: string, msg: string): Step => ({ hipotesis: hip, body: { m: msg } });
const reset = (hip: string): Step => ({ hipotesis: hip, path: '/__reset' });
const pad = (n: number, base: string) => { const b = JSON.stringify({ m: base, p: '' }); return JSON.stringify({ m: base, p: 'x'.repeat(n - b.length) }); };

const SEQS: [string, Step[]][] = [
  ['A', [
    reset('canario A: reset'),
    { hipotesis: 'GET /health -> 200 ok', method: 'GET', path: '/health' },
    { hipotesis: 'GET /msg -> 404 E404', method: 'GET', path: '/msg' },
    { hipotesis: 'ruta inexistente sin token -> 404 (ruta antes que auth)', path: '/x', auth: 'none', body: { m: 'PING;64' } },
    { hipotesis: 'sin token -> 401 E001', auth: 'none', body: { m: 'PING;64' } },
    { hipotesis: 'token malo -> 401 E001', auth: 'wrong', body: { m: 'PING;64' } },
    { hipotesis: 'cuerpo 8193 bytes -> 413 E101', raw: pad(8193, 'PING;64') },
    { hipotesis: 'cuerpo de 8192 bytes exactos -> se procesa (pong)', raw: pad(8192, 'PING;64') },
    { hipotesis: 'JSON inválido -> E100', raw: '{"m":' },
    { hipotesis: 'sin m -> E102', body: {} },
    { hipotesis: 'm numérica -> E102', body: { m: 5 } },
    m('sin ; -> E103', 'PING'),
    m('control vacío -> E104', 'PING;'),
    m('nombre vacío -> E104', c('ALTA;')),
    m('control no numérico -> E201', 'ALTA;Ana;5X'),
    m('control de 3 dígitos -> E201 (T3)', 'ALTA;Ana;050'),
    m('control incorrecto -> E202', bad('ALTA;Ana')),
    m('control 03 en lugar de 3 -> E202 (ALTA;Zoe tiene control 3)', 'ALTA;Zoe;03'),
    m('PING con control cualquiera -> pong', 'PING;XX'),
    m('ping minúsculas -> pong', 'ping;64'),
    m('E301 sin sugerencia (distancia >= 3)', c('XYZW')),
    m('E301 sugerencia HALT (HELP)', c('HELP')),
    m('E301 sugerencia ANULA, más cercano (AULA)', c('AULA')),
    m('E301 empate alfabético ALTA (AINA)', c('AINA')),
    m('E301 empate ANULA vs HALT (HULA)', c('HULA')),
    m('E202 gana a E301', bad('XYZW')),
    m('PING con argumento -> E302', c('PING;x')),
    m('ALTA con 2 args -> E302', c('ALTA;a;b')),
  ]],
  ['B', [
    reset('canario B: reset'),
    m('ALTA Ana -> AC-0001', c('ALTA;Ana')),
    m('ALTA Ana repetida -> AC-0002 (mismo titular)', c('ALTA;Ana')),
    m('ALTA Bob -> AC-0003', c('ALTA;Bob')),
    m('ALTA con ñ y tilde en el nombre -> AC-0004', c('ALTA;Íñigo')),
    m('CONSULTA saldo 0', c('CONSULTA;AC-0001')),
    m('CONSULTA inexistente -> E401', c('CONSULTA;AC-0099')),
    m('CONSULTA minúsculas -> E401', c('CONSULTA;ac-0001')),
    m('CONSULTA constructor -> E401 (B1)', c('CONSULTA;constructor')),
    m('DEPOSITO 0 -> E303', c('DEPOSITO;AC-0001;0')),
    m('DEPOSITO 11 dígitos -> E303', c('DEPOSITO;AC-0001;10000000000')),
    m('DEPOSITO 0100 -> E303', c('DEPOSITO;AC-0001;0100')),
    m('DEPOSITO monto inválido gana a E401', c('DEPOSITO;AC-0099;abc')),
    m('DEPOSITO 10 dígitos -> OP-0001', c('DEPOSITO;AC-0001;9999999999')),
    m('DEPOSITO cuenta inexistente -> E401', c('DEPOSITO;AC-0099;5')),
    m('TRANSFER misma cuenta -> E304', c('TRANSFER;AC-0001;AC-0001;5')),
    m('TRANSFER destino inexistente -> E401', c('TRANSFER;AC-0001;AC-0099;5')),
    m('TRANSFER 100001 a otro titular -> E506', c('TRANSFER;AC-0001;AC-0003;100001')),
    m('TRANSFER 100000 a otro titular -> OP-0002 (límite inclusivo)', c('TRANSFER;AC-0001;AC-0003;100000')),
    m('TRANSFER 150000 mismo titular -> OP-0003 (TRA-7)', c('TRANSFER;AC-0001;AC-0002;150000')),
    m('TRANSFER 100001 sin saldo suficiente a otro titular -> E506 gana a E507', c('TRANSFER;AC-0003;AC-0004;100001')),
    m('TRANSFER del saldo exacto -> OP-0004', c('TRANSFER;AC-0003;AC-0001;100000')),
    m('TRANSFER sin saldo -> E507', c('TRANSFER;AC-0003;AC-0001;1')),
    m('TRANSFER mismo titular sin saldo -> E507 (TRA-7, sin E506)', c('TRANSFER;AC-0002;AC-0001;99999999')),
    m('TRANSFER con aridad mala -> E302', c('TRANSFER;AC-0001;AC-0002')),
    m('ANULA depósito -> ok', c('ANULA;OP-0001')),
    m('ANULA repetida -> ya anulada', c('ANULA;OP-0001')),
    m('ANULA inexistente -> E402', c('ANULA;OP-0099')),
    m('ANULA de un id de cuenta -> E402', c('ANULA;AC-0001')),
    m('CONSULTA saldo negativo tras ANULA', c('CONSULTA;AC-0001')),
    m('CONSULTA destino de la transferencia mismo titular', c('CONSULTA;AC-0002')),
    m('DEPOSITO tras ANULA -> OP-0005 (ANULA no consume id)', c('DEPOSITO;AC-0004;7')),
    m('HALT sin args -> E302', c('HALT')),
    m('HALT;0 -> 409 E520', c('HALT;0')),
    m('HALT;1 -> 503 E599 y halted', c('HALT;1')),
    m('halted: PING -> E599', 'PING;64'),
    { hipotesis: 'halted: JSON inválido -> E599', raw: '{' },
    { hipotesis: 'halted: GET /health -> 200', method: 'GET', path: '/health' },
    { hipotesis: 'halted: sin token -> 401', auth: 'none', body: { m: 'PING;64' } },
    reset('halted: reset -> 200 y limpia'),
    m('tras reset: PING -> pong', 'PING;64'),
    m('tras reset: ALTA -> AC-0001', c('ALTA;Zoe')),
  ]],
];

// ---- reemplazo local (en proceso, sin red externa) ----
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const LOCAL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
async function local(s: Step) {
  const headers: Record<string, string> = {};
  const auth = s.auth ?? 'ok';
  if (auth === 'ok') headers.authorization = `Bearer ${LOCAL_TOKEN}`;
  if (auth === 'wrong') headers.authorization = 'Bearer wrong-token';
  if (s.authHeader !== undefined) headers.authorization = s.authHeader.replace('{T}', LOCAL_TOKEN);
  const payload = s.raw ?? (s.body === undefined ? undefined : JSON.stringify(s.body));
  if (payload !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(LOCAL + (s.path ?? '/msg'), { method: s.method ?? 'POST', headers, body: payload });
  const text = await res.text();
  let response: unknown; try { response = JSON.parse(text); } catch { response = text; }
  return { status: res.status, response };
}

const send = DRY ? null : (await import('./send.ts')).send;
const stamp = new Date(Date.now() - 5 * 3600e3).toISOString().slice(11, 16).replace(':', ''); // hora UTC-5
const diffs: string[] = [];
let n = 0;
for (const [name, steps] of SEQS) {
  const seq = `canary-${stamp}-${name}`;
  for (const s of steps) {
    const exp = await local(s);
    const expTxt = `${exp.status} ${JSON.stringify(exp.response)}`;
    n++;
    if (!send) { console.log(`${seq} | ${s.hipotesis} | ${expTxt}`); continue; }
    const g = await send(seq, {
      ...s, hipotesis: `canario: ${s.hipotesis}; handle() espera ${expTxt}`,
      conclude: (l) => (l.status === exp.status && isDeepStrictEqual(l.response, exp.response) ? 'igual que handle()' : `CAMBIO o fallo del modelo: handle() esperaba ${expTxt}`),
    });
    if (g.status !== exp.status || !isDeepStrictEqual(g.response, exp.response))
      diffs.push(`  id ${g.id} [${seq}] ${s.hipotesis}\n    handle(): ${expTxt}\n    original: ${g.status} ${JSON.stringify(g.response)}`);
  }
}
server.close();
console.log(DRY ? `dry: ${n} pasos` : diffs.length ? `CANARIO: ${diffs.length}/${n} diferencias\n${diffs.join('\n')}` : `canario ${stamp}: ${n}/${n} iguales a handle()`);
process.exitCode = diffs.length ? 1 : 0;
