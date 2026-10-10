// seq s11: memory / state edge cases
import { run, v } from '../run.ts';
import { send } from '../send.ts';
await run('s11', [
  [v('ALTA;Ana'), 'setup AC-0001'],
  [v('ALTA;Ana'), 'nombre duplicado: crea AC-0002 o error?'],
  [v('ALTA;'), 'ALTA fallida (E104): consume número AC?'],
  [v('ALTA;X;Y'), 'ALTA fallida (E302): consume número AC?'],
  [v('ALTA;Beto'), 'contador AC tras fallos: AC-0003 si los fallos no consumen'],
  [v('DEPOSITO;AC-0001;1000'), 'OP-0001'],
  [v('DEPOSITO;AC-0001;0'), 'DEPOSITO fallido (E303): consume número OP?'],
  [v('DEPOSITO;AC-0009;100'), 'DEPOSITO a cuenta inexistente con monto válido -> E401; consume OP?'],
  [v('TRANSFER;AC-0001;AC-0003;2000'), 'saldo 1000 < 2000 -> E507 (repetición de TRA-6)'],
  [v('DEPOSITO;AC-0001;500'), 'contador OP tras fallos: OP-0002 si los fallos no consumen'],
  [v('TRANSFER;AC-0001;AC-0003;1500'), 'transferir exactamente el saldo (1500): permitido?'],
  [v('TRANSFER;AC-0001;AC-0003;1'), 'saldo 0 -> E507'],
  [v('ANULA;OP-0002'), 'ANULA de un depósito ya gastado'],
  [v('CONSULTA;AC-0001'), 'CONSULTA tras ANULA de depósito: esperado -500'],
  [v('DEPOSITO;AC-0003;10'), 'ANULA consume número OP? OP-0004 si no lo consume'],
  [v('TRANSFER;AC-0003;AC-0002;1500'), 'AC-0003 gasta lo recibido en OP-0003'],
  [v('ANULA;OP-0003'), 'ANULA de una transferencia cuyo destino ya gastó: permitido? destino negativo?'],
  [v('CONSULTA;AC-0001'), 'AC-0001 tras anular OP-0003 (esperado 1000)'],
  [v('CONSULTA;AC-0003'), 'AC-0003 tras anular OP-0003 (esperado 10 - 0 = -1490?)'],
  [v('ANULA;OP-0003'), 'ANULA repetida de transferencia -> ya anulada (repetición de ANU-2)'],
  [v('ANULA;op-0001'), 'id de operación en minúsculas'],
  [v('ANULA;OP-1'), 'id de operación sin ceros'],
  [v('DEPOSITO;ac-0001;100'), 'id de cuenta en minúsculas en DEPOSITO'],
  [v('TRANSFER;AC-0001;ac-0002;1'), 'destino en minúsculas en TRANSFER'],
  [v('CONSULTA; AC-0001'), 'espacio antes del argumento'],
  [v('CONSULTA;AC-0001 '), 'espacio después del argumento'],
  [v('CONSULTA;AC-1'), 'id de cuenta sin ceros'],
  [v('DEPOSITO;AC-0001;+100'), 'monto con signo +'],
  [v('CONSULTA;AC-0002'), 'saldo final AC-0002 (esperado 1500)'],
]);
for (const s of [
  { hipotesis: 'GET /health sin token: 200 o 401?', method: 'GET', path: '/health', auth: 'none' as const },
  { hipotesis: 'POST /__reset sin token: 200 o 401?', path: '/__reset', auth: 'none' as const },
  { hipotesis: 'tras /__reset sin token: el estado se reinició? (E401 = sí, 200 = no)', body: { m: v('CONSULTA;AC-0001') } },
]) { const l = await send('s11', s); console.log(l.id, '|', l.x_req, '|', s.method ?? 'POST', s.path ?? '/msg', s.auth ?? 'ok', '|', l.status, '|', JSON.stringify(l.response)); }
