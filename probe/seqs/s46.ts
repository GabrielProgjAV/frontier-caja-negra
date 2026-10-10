// s46 (v2): characterize change B (new TRANSFER limit between different holders) and change A (CONSULTA saldo format).
// CLI: node --env-file=.env probe/seqs/s46.ts
import { control } from '../../src/core/checksum.ts';
import { send, type Step } from '../send.ts';

const c = (p: string) => `${p};${control(p)}`;
const m = (hip: string, msg: string): Step => ({ hipotesis: `v2: ${hip}`, body: { m: msg } });
const run = async (seq: string, steps: Step[]) => {
  await send(seq, { hipotesis: 'v2: reset', path: '/__reset' });
  for (const s of steps) { const l = await send(seq, s); console.log(l.id, seq, (l.request as { m: string }).m, l.status, JSON.stringify(l.response)); }
};
// B: limit. a=AC-0001 (Ana) with a lot of money, b=AC-0002 (Bob): distinct holders
const setup = [m('cuenta Ana', c('ALTA;Ana')), m('cuenta Bob', c('ALTA;Bob')), m('fondos en Ana', c('DEPOSITO;AC-0001;9999999999'))];
await run('s46a', [...setup, ...[99999, 50001, 50000, 10001, 10000, 5000, 1000, 1].map((n) =>
  m(`límite B: TRANSFER ${n} entre titulares distintos: ¿E506 o pasa? (v1 pasaba hasta 100000)`, c(`TRANSFER;AC-0001;AC-0002;${n}`)))]);
// A: saldo format, small values and negatives
await run('s46b', [
  m('cuenta Ana', c('ALTA;Ana')), m('cuenta Bob', c('ALTA;Bob')),
  m('formato A: saldo 0 -> "0.00"', c('CONSULTA;AC-0001')),
  m('formato A: depositar 1', c('DEPOSITO;AC-0001;1')),
  m('formato A: saldo 1 -> "0.01"?', c('CONSULTA;AC-0001')),
  m('formato A: depositar 9', c('DEPOSITO;AC-0001;9')),
  m('formato A: saldo 10 -> "0.10"?', c('CONSULTA;AC-0001')),
  m('formato A: depositar 90', c('DEPOSITO;AC-0001;90')),
  m('formato A: saldo 100 -> "1.00"?', c('CONSULTA;AC-0001')),
  m('formato A: depositar 23456', c('DEPOSITO;AC-0001;23456')),
  m('formato A: saldo 23556 -> "235.56"? (sin separador de miles)', c('CONSULTA;AC-0001')),
  m('formato A: depósito 7 en Bob', c('DEPOSITO;AC-0002;7')),
  m('formato A: anular el depósito 1 de Ana (OP-0001)', c('ANULA;OP-0001')),
  m('formato A: saldo 23555 -> "235.55"', c('CONSULTA;AC-0001')),
  m('formato A: anular OP-0005 (7 de Bob)', c('ANULA;OP-0005')),
  m('formato A: saldo 0 tras anular -> "0.00"', c('CONSULTA;AC-0002')),
  m('formato A: depósito 3 en Bob', c('DEPOSITO;AC-0002;3')),
  m('formato A: transferir los 3 de Bob a Ana', c('TRANSFER;AC-0002;AC-0001;3')),
  m('formato A: anular el depósito de 3 (OP-0006): Bob queda en -3', c('ANULA;OP-0006')),
  m('formato A: saldo -3 -> "-0.03"?', c('CONSULTA;AC-0002')),
  m('formato A: DEPOSITO responde igual que v1 (sin montos)', c('DEPOSITO;AC-0002;9999999999')),
  m('formato A: saldo 9999999996 -> "99999999.96"', c('CONSULTA;AC-0002')),
]);
