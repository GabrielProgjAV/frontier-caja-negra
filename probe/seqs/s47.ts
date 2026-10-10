// s47 (v2): third change? Amounts with decimals (v1: only "10.5" was tried -> E303, id 478; "10.50" never tried).
import { control } from '../../src/core/checksum.ts';
import { send, type Step } from '../send.ts';
import { local, closeLocal } from '../local.ts';
import { isDeepStrictEqual } from 'node:util';

const c = (p: string) => `${p};${control(p)}`;
const m = (hip: string, msg: string): Step => ({ hipotesis: `v2: ${hip}`, body: { m: msg } });
const seq = 's47';
const steps: Step[] = [
  { hipotesis: 'v2: reset', path: '/__reset' },
  m('cuenta Ana', c('ALTA;Ana')), m('cuenta Bob', c('ALTA;Bob')),
  m('monto con 2 decimales "10.50": ¿aceptado como 1050 céntimos? (v1 modelo: E303)', c('DEPOSITO;AC-0001;10.50')),
  m('saldo tras "10.50"', c('CONSULTA;AC-0001')),
  m('monto "0.01"', c('DEPOSITO;AC-0001;0.01')),
  m('monto "1.5" (1 decimal, v1 E303 id 478)', c('DEPOSITO;AC-0001;1.5')),
  m('monto "1,50" con coma', c('DEPOSITO;AC-0001;1,50')),
  m('monto "100.00"', c('DEPOSITO;AC-0001;100.00')),
  m('saldo tras los decimales', c('CONSULTA;AC-0001')),
  m('TRANSFER con decimales "5.25"', c('TRANSFER;AC-0001;AC-0002;5.25')),
  m('saldo de Bob', c('CONSULTA;AC-0002')),
];
let d = 0;
for (const s of steps) {
  const e = await local(s);
  const l = await send(seq, { ...s, conclude: (x) => (x.status === e.status && isDeepStrictEqual(x.response, e.response) ? 'igual que el modelo v2 (v1+A+B)' : `DISTINTO del modelo v2 (v1+A+B): ${e.status} ${JSON.stringify(e.response)}`) });
  const same = l.status === e.status && isDeepStrictEqual(l.response, e.response); if (!same) d++;
  console.log(l.id, JSON.stringify(l.request), l.status, JSON.stringify(l.response), same ? '' : `<-- modelo ${e.status} ${JSON.stringify(e.response)}`);
}
closeLocal(); console.log('diferencias', d);
