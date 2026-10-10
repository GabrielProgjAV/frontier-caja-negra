// Redeploy detector, 1 request per tick. Setup (only with --setup): reset, ALTA;Marcador -> AC-0001, DEPOSITO 777.
// Each tick: CONSULTA;AC-0001 must answer saldo 777 and X-Req must be exactly previous+1 (only we use this token).
// A lost marker (E401 / other saldo) or an X-Req jump = the process restarted (new deploy). Exit 2 on detection.
// CLI: node --env-file=.env probe/heartbeat.ts [--setup] [--minutes 10] [--every 60]
import { isDeepStrictEqual } from 'node:util';
import { readFileSync } from 'node:fs';
import { control } from '../src/core/checksum.ts';
import { send } from './send.ts';

const arg = (k: string, d: number) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
const minutes = arg('minutes', 10), every = arg('every', 60);
const c = (p: string) => `${p};${control(p)}`;
const seq = 'heartbeat';
const hhmm = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(11, 19);
const lastX = () => { const L = readFileSync('experimentos.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l)); return L.filter((l) => typeof l.x_req === 'number').at(-1)?.x_req as number; };
let prevX = lastX();
if (process.argv.includes('--setup')) {
  await send(seq, { hipotesis: 'v2: latido: reset antes de crear el marcador', path: '/__reset' });
  await send(seq, { hipotesis: 'v2: latido: crear cuenta marcador', body: { m: c('ALTA;Marcador') } });
  const d = await send(seq, { hipotesis: 'v2: latido: depositar 777 en el marcador', body: { m: c('DEPOSITO;AC-0001;777') } });
  prevX = d.x_req as number;
}
const want = { cuenta_id: 'AC-0001', saldo: 777 };
const end = Date.now() + minutes * 60e3;
while (Date.now() < end) {
  const l = await send(seq, {
    hipotesis: `v2: latido ${hhmm()}: el marcador AC-0001 sigue con saldo 777 y X-Req = ${prevX + 1} si el proceso no se reinició`,
    body: { m: c('CONSULTA;AC-0001') },
    conclude: (x) => (x.status === 200 && isDeepStrictEqual(x.response, want) && x.x_req === prevX + 1 ? 'mismo proceso: estado y contador intactos' : `POSIBLE REDESPLIEGUE: estado o contador cambiaron (X-Req esperado ${prevX + 1})`),
  });
  const ok = l.status === 200 && isDeepStrictEqual(l.response, want) && l.x_req === prevX + 1;
  console.log(`${hhmm()} id ${l.id} x_req ${l.x_req} ${l.status} ${JSON.stringify(l.response)} ${ok ? 'ok' : 'CAMBIO'}`);
  if (!ok) { process.exitCode = 2; break; }
  prevX = l.x_req as number;
  await new Promise((r) => setTimeout(r, every * 1000));
}
