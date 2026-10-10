// seq s33-s36: trap hypotheses, one thing at a time
import { run, v } from '../run.ts';
// H1 DEPOSITO: special rule by name or amount?
await run('s33', [
  ...['Ana', 'ADMIN', 'BANCO', 'SISTEMA', 'HALT', '0', 'Ana'].map((n): [string, string] => [v(`ALTA;${n}`), `H1 setup: cuenta con nombre ${n}`]),
  ...[1, 2, 3, 4, 5, 6, 7].map((k): [string, string] => [v(`DEPOSITO;AC-000${k};100001`), `H1: DEPOSITO 100001 a la cuenta ${k}: igual para todos los nombres?`]),
  [v('DEPOSITO;AC-0001;1'), 'H1: monto mínimo 1'],
  [v('CONSULTA;AC-0001'), 'H1: AC-0001 = 100002'],
]);
// H3: cumulative limit per origin / per holder?
await run('s34', [
  [v('ALTA;Zoe'), 'AC-0001 Zoe'], [v('ALTA;Zoe'), 'AC-0002 Zoe'], [v('ALTA;Ana'), 'AC-0003 Ana'],
  [v('DEPOSITO;AC-0001;300000'), 'fondos AC-0001'], [v('DEPOSITO;AC-0002;300000'), 'fondos AC-0002'],
  [v('TRANSFER;AC-0001;AC-0003;100000'), 'H3: 1ª de 100000 desde AC-0001 a otro titular'],
  [v('TRANSFER;AC-0001;AC-0003;100000'), 'H3: 2ª (acumulado 200000 desde el mismo origen): límite acumulado?'],
  [v('TRANSFER;AC-0001;AC-0003;100000'), 'H3: 3ª (acumulado 300000)'],
  [v('TRANSFER;AC-0002;AC-0003;100000'), 'H3: desde otra cuenta del mismo titular Zoe (acumulado por titular 400000)'],
  [v('CONSULTA;AC-0003'), 'H3: AC-0003 = 400000 si todas pasaron'],
  ...['Zoe', 'Zoe', 'Zoe', 'Zoe'].map((n, i): [string, string] => [v(`ALTA;${n}`), `límite de cuentas por titular? ALTA Zoe nº ${i + 3}`]),
]);
// H2: ANULA of a same-owner transfer whose destination already spent the money
await run('s35', [
  [v('ALTA;Zoe'), 'AC-0001 Zoe'], [v('ALTA;Zoe'), 'AC-0002 Zoe'], [v('ALTA;Ana'), 'AC-0003 Ana'],
  [v('DEPOSITO;AC-0001;200000'), 'OP-0001'],
  [v('TRANSFER;AC-0001;AC-0002;150000'), 'OP-0002 mismo titular 150000 (sin límite, TRA-7)'],
  [v('TRANSFER;AC-0002;AC-0003;100000'), 'OP-0003 AC-0002 gasta 100000'],
  [v('ANULA;OP-0002'), 'H2: ANULA de la transferencia mismo titular con destino gastado: permitido como ANU-3b?'],
  [v('CONSULTA;AC-0002'), 'H2: AC-0002 = 150000-100000-150000 = -100000?'],
  [v('CONSULTA;AC-0001'), 'H2: AC-0001 = 50000+150000 = 200000?'],
  [v('ANULA;OP-0002'), 'H2: segunda ANULA -> ya anulada'],
]);
// H4: ANULA of an account id, of an op from a previous sequence, of the reset-erased ops
await run('s36', [
  [v('ANULA;AC-0001'), 'H4: ANULA de un id de cuenta (no existen cuentas) -> E402?'],
  [v('ANULA;OP-0001'), 'H4: ANULA de OP-0001, que existía en s35 antes del reset -> E402 (el reset borra las ops)?'],
  [v('ALTA;Ana'), 'AC-0001'], [v('DEPOSITO;AC-0001;10'), 'OP-0001'],
  [v('ANULA;AC-0001'), 'H4: ANULA de un id de cuenta existente -> E402?'],
  [v('ANULA;OP-0002'), 'H4: ANULA de OP-0002 (existía en s35, no en esta secuencia) -> E402'],
  [v('ANULA;OP-0001'), 'control: ANULA de OP-0001 de esta secuencia -> ok'],
]);
