// s48 (v2): third change? (a) never probed in v1: 10+ accounts and 10+ operations (id format AC-0010 / OP-0010);
// compared with the local v2 model (v1 + A + B).
import { control } from '../../src/core/checksum.ts';
import { send, type Step } from '../send.ts';
import { local, closeLocal } from '../local.ts';
import { isDeepStrictEqual } from 'node:util';

const c = (p: string) => `${p};${control(p)}`;
const m = (hip: string, msg: string): Step => ({ hipotesis: `v2: ${hip}`, body: { m: msg } });
const seq = 's48';
const steps: Step[] = [
  { hipotesis: 'v2: reset', path: '/__reset' },
  ...Array.from({ length: 11 }, (_, i) => m(`cuenta ${i + 1}: ¿AC-${String(i + 1).padStart(4, '0')}? (v1 nunca pasó de 7 cuentas)`, c(`ALTA;N${i + 1}`))),
  m('CONSULTA AC-0010', c('CONSULTA;AC-0010')),
  m('DEPOSITO en AC-0011', c('DEPOSITO;AC-0011;100')),
  m('TRANSFER AC-0011 -> AC-0010', c('TRANSFER;AC-0011;AC-0010;40')),
  m('CONSULTA AC-0010 tras recibir 40', c('CONSULTA;AC-0010')),
];
let d = 0;
for (const s of steps) {
  const e = await local(s);
  const l = await send(seq, { ...s, conclude: (x) => (x.status === e.status && isDeepStrictEqual(x.response, e.response) ? 'igual que el modelo v2 (v1+A+B)' : `DISTINTO del modelo v2 (v1+A+B): ${e.status} ${JSON.stringify(e.response)}`) });
  const same = l.status === e.status && isDeepStrictEqual(l.response, e.response); if (!same) d++;
  console.log(l.id, JSON.stringify(l.request), l.status, JSON.stringify(l.response), same ? '' : `<-- modelo ${e.status} ${JSON.stringify(e.response)}`);
}
closeLocal(); console.log('diferencias', d);
