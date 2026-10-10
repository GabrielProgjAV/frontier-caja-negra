// seq s7: command limits. Controls computed with checksum.ts so answers reflect command rules, not E202.
import { send } from '../send.ts';
import { control } from '../../src/core/checksum.ts';
const seq = 's7';
const v = (p: string) => `${p};${control(p)}`;
const steps: [string, string][] = [
  [v('ALTA;Ana'), 'setup: ALTA crea AC-0001'],
  [v('ALTA;Beto'), 'setup: ALTA crea AC-0002'],
  [v('DEPOSITO;AC-0001;500000'), 'DEPOSITO > 100000: el límite E506 aplica también a depósitos?'],
  [v('CONSULTA;AC-0001'), 'saldo tras depósito grande'],
  [v('DEPOSITO;AC-0001;0'), 'monto 0: aceptado o error?'],
  [v('DEPOSITO;AC-0001;-100'), 'monto negativo: error?'],
  [v('DEPOSITO;AC-0001;10.5'), 'monto decimal: aceptado, truncado o error?'],
  [v('DEPOSITO;AC-0001;0100'), 'monto con cero a la izquierda: aceptado como 100?'],
  [v('DEPOSITO;AC-0001;1e3'), 'monto en notación exponencial'],
  [v('DEPOSITO;AC-0001;99999999999999999999'), 'monto enorme (más allá de 2^53)'],
  [v('DEPOSITO;AC-0001;abc'), 'monto no numérico'],
  [v('DEPOSITO;AC-0001; 100'), 'monto con espacio inicial'],
  [v('CONSULTA;AC-0001'), 'saldo tras montos raros: cuáles se aplicaron'],
  [v('TRANSFER;AC-0001;AC-0002;100000'), 'límite: 100000 exacto aceptado?'],
  [v('TRANSFER;AC-0001;AC-0002;100001'), 'límite: 100001 rechazado con E506?'],
  [v('TRANSFER;AC-0001;AC-0001;100'), 'transferencia a la misma cuenta'],
  [v('TRANSFER;AC-0001;AC-0009;100'), 'destino inexistente -> E401?'],
  [v('TRANSFER;AC-0009;AC-0001;100'), 'origen inexistente -> E401?'],
  [v('TRANSFER;AC-0009;AC-0001;200000'), 'orden: origen inexistente + límite -> E401 o E506?'],
  [v('TRANSFER;AC-0002;AC-0001;150000'), 'orden: saldo insuficiente + límite -> E506 o E507?'],
  [v('TRANSFER;AC-0002;AC-0001;0'), 'transferencia de 0'],
  [v('TRANSFER;AC-0002;AC-0001;-5'), 'transferencia negativa'],
  [v('CONSULTA;AC-0002'), 'saldo AC-0002 tras transferencias'],
  [v('ANULA;OP-0001'), 'ANULA de un depósito: permitido?'],
  [v('CONSULTA;AC-0001'), 'saldo tras anular depósito (puede quedar negativo?)'],
  [v('ANULA;OP-0099'), 'ANULA de operación inexistente'],
  [v('ANULA;XYZ'), 'ANULA con id mal formado'],
  [v('PING;extra'), 'aridad: PING con argumento extra'],
  [v('CONSULTA'), 'aridad: CONSULTA sin argumento'],
  [v('DEPOSITO;AC-0001'), 'aridad: DEPOSITO sin monto'],
  [v('TRANSFER;AC-0001;AC-0002'), 'aridad: TRANSFER sin monto'],
  [v('ANULA'), 'aridad: ANULA sin argumento'],
  [v('CONSULTA;AC-0009;extra'), 'orden: aridad + cuenta inexistente -> E302 o E401?'],
  [v('ALTA;'), 'ALTA con nombre vacío (segmento vacío con control válido)'],
  [v('ALTA;' + 'a'.repeat(200)), 'ALTA con nombre de 200 caracteres'],
  [v('ALTA;123'), 'ALTA con nombre numérico'],
  [v('ALTA;Ñandú'), 'control con no ASCII: hipótesis checksum ignora Ñ y ú'],
  [v('DEPOSITO;AC-0001;;100'), 'segmento vacío intermedio con control válido -> E104?'],
  ['DEPOSITO;AC-0001;;100;1', 'orden: segmento vacío + control incorrecto -> E104 o E202?'],
  ['DEPOSITO;AC-0001;;100;5X', 'orden: segmento vacío + control mal formado -> E104 o E201?'],
];
await send(seq, { hipotesis: 'reset: inicio de secuencia', path: '/__reset' });
for (const [m, h] of steps) {
  const l = await send(seq, { hipotesis: h, body: { m } });
  console.log(l.id, '|', m.length > 45 ? m.slice(0, 42) + '...' : m, '|', l.status, '|', JSON.stringify(l.response));
}
