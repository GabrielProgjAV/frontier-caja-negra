// s49 (v2): third change? Dimensions never exercised after 16:16: request RATE and elapsed TIME.
// a) s41 (v1 burst at ~8 req/s, ids 3919-3929) replayed at ~8 req/s, compared with the local v2 model.
// b) time: ANULA 70 s after the deposit; halted state 70 s after HALT;1.
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { control } from '../../src/core/checksum.ts';
import { send, setGap, type Step } from '../send.ts';
import { local, closeLocal } from '../local.ts';

const c = (p: string) => `${p};${control(p)}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let d = 0;
async function step(seq: string, s: Step) {
  const e = await local(s);
  const l = await send(seq, { ...s, conclude: (x) => (x.status === e.status && isDeepStrictEqual(x.response, e.response) ? 'igual que el modelo v2 (v1+A+B)' : `DISTINTO del modelo v2: ${e.status} ${JSON.stringify(e.response)}`) });
  const same = l.status === e.status && isDeepStrictEqual(l.response, e.response); if (!same) d++;
  console.log(l.id, seq, JSON.stringify(l.request), l.status, JSON.stringify(l.response), same ? '' : `<-- modelo ${e.status} ${JSON.stringify(e.response)}`);
}
// a) burst
const log = readFileSync('experimentos.jsonl', 'utf8').trim().split('\n').map((x) => JSON.parse(x));
const s41 = log.filter((l) => l.seq === 's41');
setGap(120);
for (const l of s41) await step('s49a', l.path === '/__reset' ? { hipotesis: 'v2: ritmo: reset', path: '/__reset' } : { hipotesis: `v2: ritmo: repetición de s41 (id ${l.id}) a ~8 req/s: ¿límite de frecuencia nuevo en v2?`, body: l.request });
setGap(200);
// b) time
const b: Step[] = [
  { hipotesis: 'v2: tiempo: reset', path: '/__reset' },
  { hipotesis: 'v2: tiempo: cuenta', body: { m: c('ALTA;Ana') } },
  { hipotesis: 'v2: tiempo: depósito', body: { m: c('DEPOSITO;AC-0001;500') } },
];
for (const s of b) await step('s49b', s);
console.log('esperando 70 s...'); await sleep(70e3);
await step('s49b', { hipotesis: 'v2: tiempo: ANULA 70 s después del depósito: ¿ventana de tiempo nueva?', body: { m: c('ANULA;OP-0001') } });
await step('s49b', { hipotesis: 'v2: tiempo: saldo tras la ANULA tardía', body: { m: c('CONSULTA;AC-0001') } });
await step('s49b', { hipotesis: 'v2: tiempo: HALT;1', body: { m: c('HALT;1') } });
console.log('esperando 70 s...'); await sleep(70e3);
await step('s49b', { hipotesis: 'v2: tiempo: 70 s después de HALT;1, ¿sigue halted (E599) o se recupera solo?', body: { m: 'PING;64' } });
await step('s49b', { hipotesis: 'v2: tiempo: reset sale del halt', path: '/__reset' });
await step('s49b', { hipotesis: 'v2: tiempo: PING tras reset', body: { m: 'PING;64' } });
closeLocal(); console.log('diferencias', d);
