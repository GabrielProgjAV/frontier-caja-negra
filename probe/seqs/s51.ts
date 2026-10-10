// s51 (v2): directed search for the third change. Exact saldo text at edge values (negatives under 1.00, -1.00, 0 after a
// negative, .99, 10000.00), decimal amounts in TRANSFER, dots in names (control), and ~30 new command names (a command
// added in v2 would show up as a new `sugerencia`). Compared with the local v2 model (v1 + A + B).
import { isDeepStrictEqual } from 'node:util';
import { control } from '../../src/core/checksum.ts';
import { send, type Step } from '../send.ts';
import { local, closeLocal } from '../local.ts';
const c = (p: string) => `${p};${control(p)}`;
const m = (hip: string, msg: string): Step => ({ hipotesis: `v2: ${hip}`, body: { m: msg } });
const q = (n: string, want: string) => m(`saldo exacto de ${n}: ¿"${want}"?`, c(`CONSULTA;${n}`));
const A = 'AC-0001', B = 'AC-0002';
const steps: Step[] = [
  { hipotesis: 'v2: reset', path: '/__reset' },
  m('cuenta A', c('ALTA;Ana')), m('cuenta B', c('ALTA;Bob')),
  m('A += 5', c(`DEPOSITO;${A};5`)), q(A, '0.05'),
  m('A += 94', c(`DEPOSITO;${A};94`)), q(A, '0.99'),
  m('A += 900', c(`DEPOSITO;${A};900`)), q(A, '9.99'),
  m('A += 999001', c(`DEPOSITO;${A};999001`)), q(A, '10000.00'),
  m('B += 101 (OP-0005)', c(`DEPOSITO;${B};101`)),
  m('B -> A 101 (OP-0006)', c(`TRANSFER;${B};${A};101`)),
  m('ANULA OP-0005: B queda en -101', c('ANULA;OP-0005')), q(B, '-1.01'),
  m('B += 2 -> -99', c(`DEPOSITO;${B};2`)), q(B, '-0.99'),
  m('B += 98 -> -1', c(`DEPOSITO;${B};98`)), q(B, '-0.01'),
  m('B += 1 -> 0 tras negativo', c(`DEPOSITO;${B};1`)), q(B, '0.00 (no -0.00)'),
  m('B += 100 (OP-0010)', c(`DEPOSITO;${B};100`)),
  m('B -> A 100 (OP-0011)', c(`TRANSFER;${B};${A};100`)),
  m('ANULA OP-0010: B queda en -100', c('ANULA;OP-0010')), q(B, '-1.00'),
  m('ANULA OP-0011 (transferencia): B vuelve a 0, A pierde 100', c('ANULA;OP-0011')), q(B, '0.00'), q(A, '10000.01'),
  m('TRANSFER con monto "100.50" -> E303?', c(`TRANSFER;${A};${B};100.50`)),
  m('TRANSFER con monto "50000.00" -> E303?', c(`TRANSFER;${A};${B};50000.00`)),
  m('DEPOSITO con monto "1.00" -> E303?', c(`DEPOSITO;${A};1.00`)),
  m('nombre con puntos (el control ignora ".")', c('ALTA;J.R. Smith')),
  m('CONSULTA de la cuenta con puntos', c('CONSULTA;AC-0003')),
  ...['RETIROS', 'ABONO', 'CARGO', 'COBRAR', 'TOTAL', 'REPORTE', 'INFORME', 'LIMITES', 'CONFIG', 'MOVER', 'ENVIAR', 'RECIBIR',
    'PAGOS', 'TITULAR', 'NOMBRE', 'BORRAR', 'ELIMINAR', 'CANCELAR', 'DESHACER', 'REVERTIR', 'UNDO', 'EXPORTAR', 'WITHDRAW',
    'REFUND', 'CANCEL', 'LIST', 'ACCOUNTS', 'HISTORY', 'STATEMENT', 'SUMMARY'].map((n) => m(`comando nuevo en v2? ${n}: E301 con o sin sugerencia como el modelo`, c(n))),
];
let d = 0;
for (const s of steps) {
  const e = await local(s);
  const l = await send('s51', { ...s, conclude: (x) => (x.status === e.status && isDeepStrictEqual(x.response, e.response) ? 'igual que el modelo v2 (v1+A+B)' : `DISTINTO del modelo v2: ${e.status} ${JSON.stringify(e.response)}`) });
  const same = l.status === e.status && isDeepStrictEqual(l.response, e.response); if (!same) d++;
  console.log(l.id, JSON.stringify(l.request), l.status, JSON.stringify(l.response), same ? '' : `<-- modelo ${e.status} ${JSON.stringify(e.response)}`);
}
closeLocal(); console.log('diferencias', d);
